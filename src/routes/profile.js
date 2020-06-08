import express from 'express';
import { verify } from 'jsonwebtoken';
import { verifyToken } from '../utils/utils';
import { accessTokenName, refreshTokenName, publicKey } from '../config/keys';
import settingsRoutes from './settings';
import { User, SocialAccount } from '../models/user';

const router = express.Router();

router.use('/settings', settingsRoutes);

router.post('/', (req, res) => {
    // extract token from cookie
    const token = req.cookies[accessTokenName];
    const refreshToken = req.cookies[refreshTokenName];
    if (!token) {
        if (!refreshToken) {
            return res.status(401).json({
                err: true,
                msg: '',
            });
        }

        return verifyToken(refreshToken, res, refreshTokenName);
    }

    return verifyToken(token, res);
});

router.post('/logout', (req, res) => {
    try {
        res.clearCookie(accessTokenName);
        res.clearCookie(refreshTokenName);
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
    const token = req.cookies[accessTokenName];
    try {
        const decoded = verify(token, publicKey, {
            algorithms: ['RS256'],
        });

        const user = await User.findById(decoded.user.id);
        const socialConnections = SocialAccount.find({ primary_account: user });
        (await socialConnections).forEach((social) => {
            social.remove();
        });
        await user.remove();

        res.clearCookie(accessTokenName);
        return res.status(200).json({
            err: false,
            msg: 'Account Deleted Successfully',
        });
    } catch (error) {
        res.clearCookie(accessTokenName);

        // now send a response
        return res.status(401).json({
            err: true,
            msg: 'Error, token not valid',
        });
    }
});

export default router;
