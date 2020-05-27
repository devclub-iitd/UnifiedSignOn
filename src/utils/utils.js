import jwt, { verify } from 'jsonwebtoken';
import * as keys from '../config/keys';
import { User, SocialAccount } from '../models/user';

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

const makeid = (length) => {
    let result = '';
    const characters =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i += 1) {
        result += characters.charAt(
            Math.floor(Math.random() * charactersLength)
        );
    }
    return result;
};

const socialAuthenticate = async (
    provider,
    done,
    uid,
    firstname,
    lastname,
    email
) => {
    try {
        // Find if the social account already exists or not
        const existingSocial = await SocialAccount.findOne({
            provider,
            email,
            uid,
        });

        // If social account exists then log in as the primary account of the social account.
        if (existingSocial) {
            console.log('Social account exists');
            const user = await User.findOne(existingSocial.primary_account);
            return done(null, user);
        }
        console.log(
            'No matching social account found for the user\nTrying to find if a user with same email exists or not ...'
        );

        // Find if a primary_account exists with the same email or not
        let primary_account = await User.findOne({ email });
        if (!primary_account) {
            console.log(
                'No user found with the given email address\nCreating user ....'
            );

            // No such account found hence create a DB entry for this user
            primary_account = await User.create({
                firstname,
                lastname,
                email,
                username: makeid(10),
                password: makeid(32),
                role: 'external_user',
            });
        } else {
            console.log('Found a user with the same email address');
        }
        console.log('Linking the social account with this user');

        // Create and link the new social account with the primary_accoun found/created in the steps above.
        await SocialAccount.create({
            provider,
            uid,
            email,
            primary_account,
        });
        return done(null, primary_account);
    } catch (error) {
        console.log(error);
        return done(error);
    }
};

export { createJWTCookie, verifyToken, socialAuthenticate };
