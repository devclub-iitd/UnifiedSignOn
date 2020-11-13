/* eslint-disable no-await-in-loop */
/* eslint-disable import/named */
import express from 'express';
import { verifyToken, getUserPrivilege } from '../utils/utils';
import { accessTokenName, refreshTokenName } from '../config/keys';
import settingsRoutes from './settings';
import { Client, SocialAccount, User } from '../models/user';

const router = express.Router();

router.use('/settings', settingsRoutes);

router.post('/', async (req, res) => {
    // extract token from cookie

    try {
        const user = await verifyToken(req, res);
        user.password = undefined;
        return res.status(200).json({ user });
    } catch (error) {
        return res.status(401).json({
            err: true,
            msg: 'Error, token not valid',
        });
    }
});

router.post('/logout', (req, res) => {
    try {
        res.clearCookie(accessTokenName, {
            domain: process.env.NODE_ENV !== 'DEV' ? 'devclub.in' : null,
        });
        res.clearCookie(refreshTokenName, {
            domain: process.env.NODE_ENV !== 'DEV' ? 'devclub.in' : null,
        });
        return res.json({
            err: false,
            message: 'Logged out successfully',
        });
    } catch (err) {
        return res.status(500).json({
            err: true,
            message: 'Unable to process request',
        });
    }
});

router.post('/delete', async (req, res) => {
    try {
        const user = await verifyToken(req, res, false);

        const clients = await Client.find({
            owner: user,
        });
        if (clients.length !== 0) {
            const allUsers = await User.find({});
            const superAdmins = [];
            allUsers.forEach((u) => {
                if (u.roles.includes('superadmin')) superAdmins.push(u);
            });

            if (superAdmins.length === 0) {
                return res.status(500).render('settings', {
                    messages: [
                        {
                            message:
                                'There is presently no superadmin to which the ownership of your clients can be transferred. Hence account deletion aborted',
                            error: true,
                        },
                    ],
                });
            }
            const superAdmin = superAdmins[0];
            for (let i = 0; i < clients.length; i += 1) {
                const client = clients[i];
                client.owner = superAdmin;
                await client.save();
            }
        }

        const socialConnections = SocialAccount.find({ primary_account: user });
        (await socialConnections).forEach((social) => {
            social.remove();
        });
        await user.remove();

        res.clearCookie(accessTokenName, {
            domain: process.env.NODE_ENV !== 'DEV' ? 'devclub.in' : null,
        });
        return res.redirect('/');
    } catch (error) {
        // now send a response
        return res.status(401).json({
            err: true,
            msg: 'Error, token not valid',
        });
    }
});

router.get('/connections', async (req, res) => {
    try {
        const user = await verifyToken(req, res);
        const socialConnections = await SocialAccount.find({
            primary_account: user,
        });
        return res.status(200).json({ connections: socialConnections });
    } catch (error) {
        // now send a response
        return res.status(401).json({
            err: true,
            msg: 'Error, token not valid',
        });
    }
});

router.post('/disconnect/:provider', async (req, res) => {
    try {
        const user = await verifyToken(req, res);
        const accounts = await SocialAccount.find({
            primary_account: user,
            provider: req.params.provider,
        });
        if (accounts) {
            (await accounts).forEach((account) => {
                account.remove();
            });
            return res.status(200).json({
                err: false,
                msg: 'Accounts unlinked successfully',
            });
        }
        return res.status(400).json({
            err: true,
            msg: 'Account Not Found',
        });
    } catch (error) {
        // now send a response
        return res.status(401).json({
            err: true,
            msg: 'Error, token not valid',
        });
    }
});

router.post('/privilege', async (req, res) => {
    try {
        const user = await verifyToken(req, res);
        const privilege = getUserPrivilege(user);
        return res.status(200).json({ privilege });
    } catch (error) {
        return res.status(401).send();
    }
});
export default router;
