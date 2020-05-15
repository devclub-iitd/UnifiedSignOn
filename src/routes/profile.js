import express from 'express';
import { verify } from 'jsonwebtoken';
import { secretkey } from '../config/keys';

const router = express.Router();

router.get('/settings', (req, res) => {
    res.render('settings', { message: '', error: false });
});

router.post('/', (req, res) => {
    // extract token from cookie
    const { token } = req.cookies;

    // no token present
    if (!token) {
        return res.status(200).json({ err: true, message: '' });
    }

    try {
        const decoded = verify(token, secretkey);

        const { user } = decoded;

        res.send({ user });
    } catch (err) {
        // clear the cookie also
        res.clearCookie('token');

        return res.status(401).json({
            err: true,
            message: 'Whoops!! Invalid login attempt...',
        });
    }
});

router.post('/logout', (req, res) => {
    try {
        res.clearCookie('token');
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
