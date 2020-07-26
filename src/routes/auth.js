import express from 'express';
import {
    verifyToken,
    createJWTCookie,
    socialAuthenticate,
} from '../utils/utils';
import {
    accessTokenName,
    refreshTokenName,
    profileNotFoundMsg,
    accountExists,
} from '../config/keys';

const router = express.Router();
const passport = require('passport');
const axios = require('axios');

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
    })(req, res, next);
});

router.get('/github', (req, res, next) => {
    passport.authenticate('github', {
        state: req.query.serviceURL,
    })(req, res, next);
});

router.get(
    '/:provider/callback',
    (req, res, next) => {
        passport.authenticate(req.params.provider, {
            session: false,
            failureRedirect: '/user/login',
        })(req, res, next);
    },
    async (req, res) => {
        createJWTCookie(req.user, res);
        if (req.authInfo.message === profileNotFoundMsg) {
            return res.render('confirm');
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
    return res.redirect(
        `https://oauth.iitd.ac.in/authorize.php?response_type=code&client_id=${process.env.IITD_CLIENT_ID}&state=xyz`
    );
});

router.get('/auth/iitd/confirm', async (req, res) => {
    try {
        const { access_token } = (
            await axios.post('https://oauth.iitd.ac.in/resource.php', {
                client_id: process.env.IITD_CLIENT_ID,
                client_secret: process.env.IITD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: req.query.code,
            })
        ).data;
        const userData = (
            await axios.post('https://oauth.iitd.ac.in/resource.php', {
                access_token,
            })
        ).data;
        const iitdCallback = async (
            err = null,
            user = null,
            authInfo,
            request = req,
            response = res
        ) => {
            if (!err || !user) return response.status(500);

            if (!user.roles.includes('iitd_user')) {
                user.roles.push('iitd_user');
                await user.save();
            }
            createJWTCookie(user, response);
            if (req.authInfo.message === profileNotFoundMsg) {
                return res.render('confirm');
            }
            if (req.authInfo.message === accountExists) {
                return res.render('settings', {
                    messages: [
                        {
                            message: accountExists,
                            error: true,
                        },
                    ],
                });
            }
            const { serviceURL } = request.query;

            if (typeof serviceURL !== 'undefined' && serviceURL) {
                // render homepage to store token and then redirect with serviceURL
                return response.redirect(
                    `/redirecting?serviceURL=${serviceURL}`
                );
            }
            return response.redirect('/');
        };
        return socialAuthenticate(
            'iitd',
            iitdCallback,
            userData.uniqueiitd,
            userData.name,
            '',
            userData.email,
            'iitd_user'
        );
    } catch (error) {
        console.log(error);
        return res.status(500);
    }
});
