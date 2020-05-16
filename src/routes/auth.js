import express from 'express';
import { verify } from 'jsonwebtoken';
import { secretkey } from '../config/keys';

const router = express.Router();

// post route to check validity of tokens, clients will hit this route.
router.post('/', (req, res) => {
    // extract token from cookie
    const token = req.header('auth-token');

    if (!token) {
        return res.status(401).json({ msg: 'Error, token is not present' });
    }

    // So the token is present, so lets verify it
    try {
        const decoded = verify(token, secretkey);

        const { user } = decoded;

        return res.status(200).json({ user });
    } catch (err) {
        // I wasn't able to verify the token as it was invalid
        // clear the token, but somehow this doesn't work, so just to
        // be safe, do the same at client server as well.
        res.clearCookie('token');

        // now send a response
        return res.status(401).json({ msg: 'Error, token not valid' });
    }
});

export default router;
