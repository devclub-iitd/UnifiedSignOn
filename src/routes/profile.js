import express from 'express';
import { verifyToken } from '../utils/utils';
import { tokenName, rememberTokenName } from '../config/keys';

const router = express.Router();

router.get('/settings', (req, res) => {
    res.render('settings', { message: '', error: false });
});

router.post('/', (req, res) => {
    // extract token from cookie
    const token = req.cookies[tokenName];
    const rememberme = req.cookies[rememberTokenName];
    if (!token) {
        if (!rememberme) {
            return res.status(401).json({
                err: true,
                msg: '',
            });
        }

        return verifyToken(rememberme, res, rememberTokenName);
    }

    return verifyToken(token, res);
});

router.post('/logout', (req, res) => {
    try {
        res.clearCookie(tokenName);
        res.clearCookie(rememberTokenName);
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
