import express from 'express';
import { verify } from 'jsonwebtoken';
import { secretkey } from '../config/keys';

const router = express.Router();

router.post('/', (req, res) => {
    const { token } = req.body;
    try {
        const decoded = verify(token, secretkey);
        const { user } = decoded;
        res.send({ user });
    } catch (err) {
        res.json({
            err: true,
            message: 'Whoops!! Invalid login attempt...',
        });
    }
});

export default router;
