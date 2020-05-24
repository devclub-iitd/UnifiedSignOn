import express from 'express';
import { verifyToken } from '../utils/utils';
import { accessTokenName, refreshTokenName } from '../config/keys';

const router = express.Router();

// post route to check validity of tokens, clients will hit this route.
router.post('/refresh-token', (req, res) => {
    // Extract tokens from request body
    const token = req.body[accessTokenName];
    const refreshToken = req.body[refreshTokenName];

    if (!token) {
        if (!refreshToken) {
            return res.status(401).json({
                msg: 'Error, token is not present',
            });
        }

        // Remember-Me token is present, so use it to authenticate the user and if verified, refresh the remember me token
        return verifyToken(refreshToken, res, refreshTokenName);
    }

    // Access token is present, so verify it and if verified refresh it.
    return verifyToken(token, res);
});

export default router;
