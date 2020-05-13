import express from 'express';
import { verify } from 'jsonwebtoken';
import { secretkey } from '../config/keys';

const router = express.Router();

router.get('/', (req, res) => {
    const { token } = req.data;

    try {
        const decoded = verify(token, secretkey);
        const { user } = decoded;
        res.json({ user });
    } catch (err) {
        res.json({
            err: true,
            message: 'Token is not valid',
        });
    }
});

export default router;
