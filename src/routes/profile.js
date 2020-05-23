import express from 'express';
import { verifyToken } from '../utils/utils';
import { accessTokenName, refreshTokenName } from '../config/keys';

const router = express.Router();

router.get('/settings', (req, res) => {
    res.render('settings', { message: '', error: false });
});

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

export default router;
