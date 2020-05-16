import express from 'express';
import jwt, { verify } from 'jsonwebtoken';
import { secretkey, expTime, rememberTime } from '../config/keys';

const router = express.Router();

function createJWTCookie(user, res, tokenName = 'token') {
    const payload = {
        user: {
            id: user._id,
            email: user.email,
            firstname: user.firstname,
            lastname: user.lastname,
            username: user.username,
            role: user.role,
        },
    };
    const exp = tokenName === 'rememberme' ? rememberTime : expTime;
    // create a token
    const token = jwt.sign(payload, secretkey, {
        expiresIn: exp, // in ms
        issuer: 'auth.devclub.in',
    });

    // set the cookie with token with the same age as that of token
    res.cookie(tokenName, token, {
        maxAge: exp, // in ms
        secure: false, // set to true if your using https
        httpOnly: true,
        sameSite: 'lax',
    });
}

function verifyToken(token, res, tokenName = 'token') {
    try {
        const decoded = verify(token, secretkey);
        const { user } = decoded;

        // Set a new cookie which will extend the session a further {expTime} amount of time.
        // So essentially whenever any auth request is made the user session will be extended.
        if (tokenName === 'rememberme') {
            // Refresh the remember me cookie
            createJWTCookie(user, res, tokenName);
        }

        // Refresh the token cookie
        createJWTCookie(user, res);

        return res.status(200).json({
            user,
        });
    } catch (err) {
        // I wasn't able to verify the token as it was invalid
        // clear the token
        res.clearCookie(tokenName);

        // now send a response
        return res.status(401).json({
            msg: 'Error, token not valid',
        });
    }
}

// post route to check validity of tokens, clients will hit this route.
router.post('/verify', (req, res) => {
    // extract token from cookie
    const { token, rememberme } = req.cookies;

    if (!token) {
        if (!rememberme) {
            return res.status(401).json({
                msg: 'Error, token is not present',
            });
        }

        return verifyToken(rememberme, res, 'rememberme');
    }

    return verifyToken(token, res);
});

export default router;
export { createJWTCookie };
