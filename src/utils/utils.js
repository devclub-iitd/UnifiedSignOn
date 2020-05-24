import jwt, { verify } from 'jsonwebtoken';
import * as keys from '../config/keys';

const createJWTCookie = (user, res, tokenName = keys.accessTokenName) => {
    const payload = {
        user: {
            id: user.id,
            email: user.email,
            firstname: user.firstname,
            lastname: user.lastname,
            username: user.username,
            role: user.role,
        },
    };
    const exp =
        tokenName === keys.refreshTokenName ? keys.rememberTime : keys.expTime;
    // create a token
    const token = jwt.sign(payload, keys.privateKey, {
        expiresIn: exp, // in seconds
        issuer: keys.iss,
        algorithm: 'RS256',
    });

    // set the cookie with token with the same age as that of token
    res.cookie(tokenName, token, {
        maxAge: exp * 1000, // in milli seconds
        secure: false, // set to true if your using https
        httpOnly: true,
        sameSite: 'lax',
    });
};

const verifyToken = (token, res, tokenName = keys.accessTokenName) => {
    try {
        const decoded = verify(token, keys.publicKey, {
            algorithms: ['RS256'],
        });
        const { user } = decoded;

        // Set a new cookie which will extend the session a further {expTime} amount of time.
        // So essentially whenever any auth request is made the user session will be extended.
        if (tokenName === keys.refreshTokenName) {
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
            err: true,
            msg: 'Error, token not valid',
        });
    }
};
export { createJWTCookie, verifyToken };
