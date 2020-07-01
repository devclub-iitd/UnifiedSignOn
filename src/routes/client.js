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

router.get('/', async (req, res) => {
    const clients = await Client.find({ owner: req.user });
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
        const client = new Client({
            domain,
            description,
        });
        // eslint-disable-next-line prefer-const
        let role_names = [];
        custom_roles.forEach((role) => {
            role_names.push(role.name);
        });
        client.custom_roles = role_names;
        client.owner = req.user;

        await client.save();
        return res.render('client/client_register.ejs', {
            err: false,
            msg: 'Client Registered successfully',
        });
    } catch (error) {
        console.log(error);
        return res.render('client/client_register.ejs', {
            err: true,
            msg: 'Whoops! A server error occured',
        });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);
        const owner = await User.findById(client.owner);
        if (JSON.stringify(req.user) !== JSON.stringify(owner)) {
            return res.render('client/clients.ejs', {
                err: true,
                msg: 'This client does not belong to you',
            });
        }

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

router.get('/:id/config', async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);
        const owner = await User.findById(client.owner);
        if (JSON.stringify(req.user) !== JSON.stringify(owner)) {
            return res.render('client/clients.ejs', {
                err: true,
                msg: 'This client does not belong to you',
            });
        }

        let vars = fs.readFileSync(
            path.resolve(__dirname, '../config/conf-vars')
        );
        vars += '\n';
        client.custom_roles.forEach((role) => {
            vars += `${role
                .toUpperCase()
                .replace(' ', '_')}_ROLE = '${role}'\n`;
        });

        const randomFile = path.resolve(__dirname, `./${makeid(10, true)}`);
        fs.writeFileSync(randomFile, vars);
        res.sendFile(randomFile, (err) => {
            if (err) console.log(err);
            fs.unlinkSync(randomFile);
        });
    } catch (error) {
        return res.render('client/clients.ejs', {
            err: true,
            msg: 'Whoops! A server error occured',
        });
    }
});

router.post('/:id/update', async (req, res) => {
    try {
        const client = await Client.findById(req.params.id);
        const owner = await User.findById(client.owner);
        if (JSON.stringify(req.user) !== JSON.stringify(owner)) {
            return res.status(401).json({
                err: true,
                msg: 'This client does not belong to you',
            });
        }

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
        console.log(error);
        return res.status(500).json({
            err: true,
            msg: 'Whoops! A server error occured',
        });
    }
});
export default router;
