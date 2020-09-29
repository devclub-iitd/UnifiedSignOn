import express from 'express';
import { verify, decode } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import {
    verifyToken,
    createJWTCookie,
    socialAuthenticate,
    sendVerificationEmail,
    sendPassResetEmail,
    linkSocial,
} from '../utils/utils';
import {
    accessTokenName,
    refreshTokenName,
    profileNotFoundMsg,
    accountExists,
    publicKey,
} from '../config/keys';
import { Client, User } from '../models/user';

const router = express.Router();
const passport = require('passport');
const HttpsProxyAgent = require('https-proxy-agent');

const axiosDefaultConfig = {
    proxy: false,
    httpsAgent: new HttpsProxyAgent('http://devclub.iitd.ac.in:3128'),
};
const axios = require('axios').create(axiosDefaultConfig);
const qs = require('qs');
// post route to check validity of tokens, clients will hit this route.
router.post('/refresh-token', async (req, res) => {
    const token = req.body[accessTokenName];
    const refreshToken = req.body[refreshTokenName];
    try {
        const user = await verifyToken(req, res, true, 0, token, refreshToken);
        return res.status(200).json({
            user,
        });
    } catch (error) {
        return res.status(401).json({
            err: true,
            msg: 'Error, token not valid',
        });
    }
});

router.get('/email/verify/token', async (req, res) => {
    try {
        const { token } = req.query;
        const decoded = await verify(token, publicKey, {
            algorithms: ['RS256'],
        });
        const user = await User.findById(decoded.id);
        user.isverified = true;
        await user.save();
        res.render('account_verified');
    } catch (error) {
        console.log(error);
        res.clearCookie(accessTokenName);
        res.clearCookie(refreshTokenName);
        res.render('account_verified', { error: true });
    }
});

router.get('/email/verify', (req, res) => {
    res.render('email_verify');
});

router.post('/email/verify', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({
            email,
        });
        if (!user)
            return res.render('email_verify', {
                message: 'Email Address not registered',
                error: true,
            });
        if (user.isverified) {
            return res.render('email_verify', {
                message:
                    'Your account is already verified, Please login to continue',
                error: true,
            });
        }
        sendVerificationEmail(user);
        return res.render('email_verify', {
            message: 'A verification email has been sent to your inbox!',
            error: true,
        });
    } catch (error) {
        res.render('email_verify', {
            message: 'Email Address not registered',
            error: true,
        });
    }
});

router.get('/password/reset/token', async (req, res) => {
    try {
        const { token } = req.query;
        const decoded = await verify(token, publicKey, {
            algorithms: ['RS256'],
        });
        const user = await User.findById(decoded.id);
        user.password = await bcrypt.hash(decoded.newPass, 10);
        await user.save();
        res.render('login', {
            message: 'Password reset successfully!',
            error: false,
            serviceURL: '',
        });
    } catch (error) {
        console.log(error);
        res.clearCookie(accessTokenName);
        res.clearCookie(refreshTokenName);
        res.render('login', {
            message: 'Invalid Token. Please try resetting your password again',
            error: true,
            serviceURL: '',
        });
    }
});
router.get('/password/reset', (req, res) => {
    res.render('pass_forgot');
});
router.post('/password/reset', async (req, res) => {
    try {
        const { email, newPass } = req.body;
        const user = await User.findOne({
            email,
        });
        if (!user)
            return res.render('pass_forgot', {
                message: 'Email Address not registered',
                error: true,
            });
        if (!newPass)
            return res.render('pass_forgot', {
                message: 'New Password not supplied',
                error: true,
            });
        sendPassResetEmail(user, newPass);
        return res.render('pass_forgot', {
            message: 'A password reset email has been sent to your inbox!',
            error: false,
        });
    } catch (error) {
        res.render('pass_forgot', {
            message: 'Email Address not registered',
            error: true,
        });
    }
});

export default router;

router.get('/google', (req, res, next) => {
    passport.authenticate('google', {
        scope: ['profile', 'email'],
        state: req.query.serviceURL,
    })(req, res, next);
});

router.get('/facebook', (req, res, next) => {
    passport.authenticate('facebook', {
        authType: 'rerequest',
        state: req.query.serviceURL,
        scope: 'email',
    })(req, res, next);
});

router.get('/github', (req, res, next) => {
    passport.authenticate('github', {
        state: req.query.serviceURL,
        scope: 'user:email',
    })(req, res, next);
});

router.get(
    '/:provider/callback',
    (req, res, next) => {
        passport.authenticate(req.params.provider, {
            session: false,
            failureRedirect: '/user/login',
            failWithError: true,
        })(req, res, next);
    },
    (err, req, res, next) => {
        if (err) return res.redirect('/user/login');
        next();
    },
    async (req, res) => {
        createJWTCookie(req.user, res);
        if (req.authInfo.message === profileNotFoundMsg) {
            return res.render('confirm', { user: req.user });
        }
        if (req.authInfo.message === accountExists) {
            return res.render('settings', {
                messages: [{ message: accountExists, error: true }],
            });
        }
        const { state: serviceURL } = req.query;

        if (typeof serviceURL !== 'undefined' && serviceURL) {
            // render homepage to store token and then redirect with serviceURL
            return res.redirect(`/redirecting?serviceURL=${serviceURL}`);
        }
        return res.redirect('/');
    }
);

router.get('/iitd', (req, res) => {
    const { serviceURL } = req.query;
    let state;
    if (!serviceURL) state = 'xyz';
    else state = serviceURL;
    return res.redirect(
        `https://oauth.iitd.ac.in/authorize.php?response_type=code&client_id=${process.env.IITD_CLIENT_ID}&state=${state}`
    );
});

router.get('/iitd/confirm', async (req, res) => {
    try {
        // console.log('Code: ', req.query.code);
        const res1 = await axios.post('https://oauth.iitd.ac.in/token.php', {
            client_id: process.env.IITD_CLIENT_ID,
            client_secret: process.env.IITD_CLIENT_SECRET,
            grant_type: 'authorization_code',
            code: req.query.code,
        });
        const { access_token } = res1.data;
        // console.log('Recieved access token: ', access_token);

        const res2 = await axios.post(
            'https://oauth.iitd.ac.in/resource.php',
            qs.stringify({
                access_token,
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
            }
        );
        const userData = res2.data;
        // console.log('Recieved User Data: ', userData);
        const iitdCallback = async (
            err = null,
            user = null,
            authInfo = null
        ) => {
            if (err || !user) {
                console.log(err, user);
                return res.sendStatus(500);
            }

            if (!user.roles.includes('iitd_user')) {
                user.roles.push('iitd_user');
                await user.save();
            }
            createJWTCookie(user, res);
            if (authInfo && authInfo.message === profileNotFoundMsg) {
                return res.render('confirm', { user });
            }
            if (authInfo && authInfo.message === accountExists) {
                return res.render('settings', {
                    messages: [
                        {
                            message: accountExists,
                            error: true,
                        },
                    ],
                });
            }
            const { state } = req.query;

            if (typeof state !== 'undefined' && state && state !== 'xyz') {
                // render homepage to store token and then redirect with serviceURL
                return res.redirect(`/redirecting?serviceURL=${state}`);
            }
            return res.redirect('/');
        };
        try {
            return await linkSocial(
                req.cookies[accessTokenName],
                'iitd',
                userData.uniqueiitdid,
                userData.email,
                iitdCallback
            );
        } catch (error) {
            return socialAuthenticate(
                'iitd',
                iitdCallback,
                userData.uniqueiitdid,
                userData.name,
                '',
                userData.email,
                'iitd_user'
            );
        }
    } catch (error) {
        console.log(error);
        return res.sendStatus(500);
    }
});

router.get('/clientVerify', async (req, res) => {
    const { q } = req.query;

    try {
        const user = await verifyToken(req, res);
        const { clientId } = decode(q).data;
        const client = await Client.findById(clientId);
        if (!client) {
            return res.status(400).json({
                err: true,
                msg: 'No client found',
            });
        }

        verify(q, client.access_token, {
            algorithms: ['HS256'],
        });

        const token = createJWTCookie(user, res);
        res.cookie('_token', token, {
            httpOnly: false,
            domain: 'devclub.in',
            secure: true,
        });
        return res.status(200).json({
            err: false,
            msg: 'Client verified successfully',
        });
    } catch (error) {
        console.log(error);
        return res.status(401).json({
            err: true,
            msg: 'Unauthorized Client',
        });
    }
});

router.post(`/sudoTestCommand/:secret/makeadminforclient`, async (req, res) => {
    if (req.params.secret === process.env.MY_SECRET) {
        try {
            const { email } = req.body;
            if (!email)
                return res.status(400).json({
                    message: 'Email not specified!',
                });
            const result = await User.findOne({ email });

            result.isverified = true;
            result.roles.push('admin');

            await User.findOneAndUpdate({ email }, result);
            res.status(200).json({
                message: 'action completed',
            });
        } catch (err) {
            res.status(500).json({
                message: 'unable to process request',
            });
        }
    } else {
        res.status(401).json({
            message: 'Unauthorized',
        });
    }
});
