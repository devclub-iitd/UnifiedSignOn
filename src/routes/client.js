/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
/* eslint-disable import/named */
import express from 'express';
import { verifyToken, getRoleData, assignRoleToUsers } from '../utils/utils';
import { Client, User, Role } from '../models/user';

const router = express.Router();
const safe = require('safe-regex');

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
    res.render('client/clients', { clients });
});

router.get('/register', (req, res) => {
    res.render('client/client_register.ejs', {
        err: false,
        msg: '',
    });
});

router.post('/register', async (req, res) => {
    try {
        const { domain, description } = req.body;
        let { custom_roles } = req.body;
        if (!custom_roles) custom_roles = [];
        for (let index = 0; index < custom_roles.length; index += 1) {
            const element = custom_roles[index];
            if (
                await Role.findOne({
                    name: element.name,
                })
            ) {
                return res.status(400).json({
                    err: true,
                    msg: `A role with name ${element.name} already exists`,
                });
            }
            // eslint-disable-next-line no-unused-vars
            for (const [key, value] of Object.entries(element.regex)) {
                if (!safe(value)) {
                    return res.status(400).json({
                        err: true,
                        msg: `The regex ${value} entered is potentially destructive, Try changing it`,
                    });
                }
            }
        }

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
        return res.status(201).json({
            err: false,
            msg: 'Client Registered successfully',
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
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
            return res.status(401).json({
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
        return res.status(500).json({
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
        let { custom_roles } = req.body;
        if (domain) client.domain = domain;
        if (description) client.description = description;

        if (!custom_roles) custom_roles = {};
        for (let index = 0; index < client.custom_roles.length; index += 1) {
            const element = client.custom_roles[index];
            if (custom_roles[element]) {
                let role = await Role.findOne({ name: element });
                const newRegexObj = custom_roles[element];
                for (const [key, regex] of Object.entries(newRegexObj)) {
                    role.regex[key] = regex;
                }
                role = await role.save();
                await assignRoleToUsers(role);
            }
        }
        await client.save();
        return res.status(201).json({
            err: false,
            msg: 'Update Successfull',
        });
    } catch (error) {
        return res.status(500).json({
            err: true,
            msg: 'Whoops! A server error occured',
        });
    }
});
export default router;
