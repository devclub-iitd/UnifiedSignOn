import express from 'express';
import { verify } from 'jsonwebtoken';
import { secretkey } from '../config/keys';

const router = express.Router();

router.post('/', (req, res) => {
    // extract token from cookie
    const token = req.cookies.token;

    // no token present
    if (!token) {
        return res.status(401).json({ msg: 'Error, token is not present' });
    }

    try {
        const decoded = verify(token, secretkey);

        const { user } = decoded;

        res.send({ user });
    } catch (err) {
        //clear the cookie also
        res.clearCookie('token');

        return res.status(401).json({
            err: true,
            message: 'Whoops!! Invalid login attempt...',
        });
    }
});

export default router;
