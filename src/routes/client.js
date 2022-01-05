/* eslint-disable guard-for-in */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
/* eslint-disable import/named */
import express from 'express';
import {
    verifyToken,
    getRoleData,
    assignRoleToUsers,
    makeid,
} from '../utils/utils';
import { Client, User, Role } from '../models/user';
import { r2p } from '../config/keys';

const router = express.Router();
const safe = require('safe-regex');
const fs = require('fs');
const path = require('path');

router.use(async (req, res, next) => {
    try {
        const user = await verifyToken(req, res, true, 2);
        req.user = user;
        next();
    } catch (error) {
        return res.redirect('/');
    }
});

const verifyClientOwner = async (req, res, next) => {
    try {
        const client = await Client.findById(req.params.id);
        const owner = await User.findById(client.owner);
        if (JSON.stringify(req.user) === JSON.stringify(owner)) {
            next();
        } else {
            throw Error('Unauthorized access');
        }
    } catch (error) {
        console.error(error);
        return res.status(401).render('client/clients.ejs', {
            err: true,
            msg: 'This client does not belong to you',
        });
    }
};

router.get('/', async (req, res) => {
    const clients = await Client.find({ owner: req.user });
    if (req.query.msg) {
        let err = '';
        switch (req.query.err) {
            case 'false':
                err = false;
                break;
            case 'true':
                err = true;
                break;
            default:
                err = '';
        }
        return res.render('client/clients', {
            clients,
            err,
            msg: req.query.msg,
        });
    }
    res.render('client/clients', { clients, err: false, msg: '' });
});

router.get('/public-key', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../config/public.pem'));
});

router.get('/register', (req, res) => {
    res.render('client/client_register.ejs', {
        err: false,
        msg: '',
    });
});

const validateRoles = async (roles) => {
    for (let index = 0; index < roles.length; index += 1) {
        const element = roles[index];
        if (!element.name) {
            return {
                message: {
                    err: true,
                    msg: 'Role name cannot be empty',
                },
            };
        }

        // Ensure role names are unique.
        if (
            await Role.findOne({
                name: element.name,
            })
        ) {
            return {
                message: {
                    err: true,
                    msg: `A role with name ${element.name} already exists`,
                },
            };
        }

        // Do not allow the client to take privileged role names.
        if (Object.keys(r2p).includes(element.name)) {
            return {
                message: {
                    err: true,
                    msg: `The role name ${element.name} is reserved, Please Choose another name`,
                },
            };
        }

        // Check for ReDOS attacks.

        // eslint-disable-next-line no-unused-vars
        for (const [key, value] of Object.entries(element.regex)) {
            if (!safe(value)) {
                return {
                    message: {
                        err: true,
                        msg: `The regex ${value} entered is potentially destructive, Try changing it`,
                    },
                };
            }
        }
    }
    return {
        message: {
            err: false,
        },
    };
};

router.post('/register', async (req, res) => {
    try {
        const { domain, description } = req.body;
        let { custom_roles } = req.body;
        const default_role = {
            name: makeid(8, true),
            regex: {
                email: '.*',
            },
        };
        if (!custom_roles) custom_roles = [];

        const { message } = await validateRoles(custom_roles);
        if (message.err)
            return res.render('client/clients.ejs', {
                err: true,
                msg: message.msg,
            });

        for (let index = 0; index < custom_roles.length; index += 1) {
            let role = custom_roles[index];
            role = await Role.create({
                name: role.name,
                regex: role.regex,
            });
            await assignRoleToUsers(role);
        }
        await assignRoleToUsers(default_role);
        const client = new Client({
            domain,
            description,
            access_token: makeid(64, true),
            default_role: default_role.name,
        });
        // eslint-disable-next-line prefer-const
        let role_names = [];
        custom_roles.forEach((role) => {
            role_names.push(role.name);
        });
        client.custom_roles = role_names;
        client.owner = req.user;

        await client.save();
        return res.redirect(`/client/${client.id}`);
    } catch (error) {
        console.error(error);
        return res.render('client/client_register.ejs', {
            err: true,
            msg: 'Whoops! A server error occured',
        });
    }
});

router.get('/:id', verifyClientOwner, async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);
        const roles = await getRoleData(client.custom_roles);
        return res.render('client/client_page.ejs', {
            client_data: client,
            roles,
        });
    } catch (error) {
        return res.render('client/clients.ejs', {
            err: true,
            msg: 'Whoops! A server error occured',
        });
    }
});

router.get('/:id/config', verifyClientOwner, async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);
        let vars = fs.readFileSync(
            path.resolve(__dirname, '../config/conf-vars')
        );
        vars += '\n';
        vars += `CLIENT_ID = '${client.id}'\n`;
        vars += `CLIENT_ACCESS_TOKEN = '${client.access_token}'\n`;

        client.custom_roles.forEach((role) => {
            vars += `${role
                .toUpperCase()
                .replace(' ', '_')}_ROLE = '${role}'\n`;
        });
        vars += `\nDEFAULT_CLIENT_ROLE = '${client.default_role}'\n`;

        const randomFile = path.resolve(__dirname, `./${makeid(10, true)}`);
        fs.writeFileSync(randomFile, vars);
        res.sendFile(randomFile, (err) => {
            if (err) console.error(err);
            fs.unlinkSync(randomFile);
        });
    } catch (error) {
        return res.render('client/clients.ejs', {
            err: true,
            msg: 'Whoops! A server error occured',
        });
    }
});

router.post('/:id/update', verifyClientOwner, async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);
        const { domain, description } = req.body;
        let { custom_roles, new_roles, delete_roles } = req.body;
        if (domain) client.domain = domain;
        if (description) client.description = description;

        if (!custom_roles) custom_roles = {};
        if (!new_roles) new_roles = [];
        if (!delete_roles) delete_roles = [];

        for (const key in custom_roles) {
            const element = custom_roles[key];

            let role = await Role.findOne({ name: key });
            // eslint-disable-next-line no-continue
            if (!role) continue;

            let modified = false;
            const newRegexObj = element.regex;
            for (const [entry, regex] of Object.entries(newRegexObj)) {
                if (role.regex[entry] !== regex && safe(regex)) {
                    role.regex[entry] = regex;
                    modified = true;
                }
            }
            if (modified) {
                role = await role.save();
                await assignRoleToUsers(role);
            }
        }

        const { message } = await validateRoles(new_roles);

        if (message.err) {
            await client.save();
            return res.status(400).json(message);
        }

        // Addition of more roles
        for (let index = 0; index < new_roles.length; index += 1) {
            let role = new_roles[index];
            role = await Role.create({
                name: role.name,
                regex: role.regex,
            });
            await assignRoleToUsers(role);
            client.custom_roles.push(role.name);
        }

        // Deletion of requested roles
        for (let index = 0; index < delete_roles.length; index += 1) {
            const role = delete_roles[index];
            if (client.custom_roles.includes(role)) {
                const role_obj = await Role.findOne({
                    name: role,
                });
                assignRoleToUsers(role_obj, true);
                await Role.deleteOne({ _id: role_obj.id });
                const pos = client.custom_roles.findIndex((name) => {
                    return name === role;
                });
                client.custom_roles.splice(pos, 1);
            }
        }
        await client.save();

        return res.status(200).json({
            err: false,
            msg: 'Client Updated Successfully',
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            err: true,
            msg: 'Whoops! A server error occured',
        });
    }
});

router.post('/:id/delete', verifyClientOwner, async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);
        await assignRoleToUsers(
            {
                name: client.default_role,
                regex: {
                    email: '.*',
                },
            },
            true
        );
        const roles = client.custom_roles;
        for (let i = 0; i < roles.length; i += 1) {
            const r = roles[i];
            const role = await Role.findOne({
                name: r,
            });
            await assignRoleToUsers(role, true);
            await role.remove();
        }
        await client.remove();
        return res.redirect('/client?err=false&msg=Client+deleted+succesfully');
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            err: true,
            msg: 'Whoops! A server error occured',
        });
    }
});
export default router;
