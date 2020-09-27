/* eslint-disable prefer-destructuring */
import express from 'express';
import { verifyToken, getUserPrivilege } from '../utils/utils';
import { Client, User } from '../models/user';

const router = express.Router();

router.use(async (req, res, next) => {
    try {
        const user = await verifyToken(req, res, true);
        const access_token = req.headers.authorization;
        if (!access_token) {
            return res.status(400).json({
                err: true,
                msg: 'Access-Token missing in authorization header',
            });
        }
        const client = await Client.find({ access_token });
        if (!client) {
            return res.sendStatus(403);
        }
        req.user = user;
        req.user_privilege = getUserPrivilege(user);
        req.client_privilege = getUserPrivilege(
            await User.findById(client[0].owner)
        );
        next();
    } catch (error) {
        console.log(error);
        return res.sendStatus(401);
    }
});

const adminAccess = (req, res, next) => {
    if (req.user_privilege >= 4 && req.client_privilege >= 4) {
        next();
    } else {
        console.log('Unauthorized access to admin api');
        return res.sendStatus(401);
    }
};

router.get('/dcMemberList', adminAccess, async (req, res) => {
    let users = await User.find({});
    users = users.filter((user) => getUserPrivilege(user) >= 2);
    for (let index = 0; index < users.length; index += 1) {
        users[index].password = undefined;
    }
    return res.status(200).json(users);
});

router.post('/addUserRole', adminAccess, async (req, res) => {
    if (req.user_privilege < 4) {
        return res.sendStatus(403);
    }
    const { email, role } = req.body;
    let user = await User.find({ email });
    if (!user) {
        return res.status(400).json({
            err: true,
            msg: 'No such user found with the given email address',
        });
    }
    user = user[0];
    if (!user.roles.includes(role)) {
        user.roles.push(role);
        await user.save();
    }
    return res.sendStatus(200);
});

router.post('/deleteUserRole', adminAccess, async (req, res) => {
    if (req.user_privilege < 4) {
        return res.sendStatus(403);
    }
    const { email, role } = req.body;
    let user = await User.find({ email });
    if (!user) {
        return res.status(400).json({
            err: true,
            msg: 'No such user found with the given email address',
        });
    }
    user = user[0];
    if (user.roles.includes(role)) {
        user.roles = user.roles.filter((r) => r !== role);
        await user.save();
    }
    return res.sendStatus(200);
});

router.post('/queryDB', adminAccess, async (req, res) => {
    try {
        return res.status(200).json(await User.find(req.body));
    } catch (error) {
        return res.status(500).json({
            err: true,
            msg: error,
        });
    }
});

export default router;
