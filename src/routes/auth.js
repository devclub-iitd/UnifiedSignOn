import express from 'express';
import { verifyToken } from '../utils/utils';

const router = express.Router();

// post route to check validity of tokens, clients will hit this route.
router.post('/verify-token', (req, res) => {
    // extract token from post request body
    const { token, rememberme } = req.body;

    if (!token) {
        if (!rememberme) {
            return res.status(401).json({
                msg: 'Error, token is not present',
            });
        }

        // Remember-Me token is present, so use it to authenticate the user
        return verifyToken(rememberme, res, 'rememberme');
    }

    // Access token is present, so verify it.
    return verifyToken(token, res);
});

export default router;
