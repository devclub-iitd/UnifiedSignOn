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
} from '../config/keys';

const router = express.Router();
const passport = require('passport');
const axios = require('axios');

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
    (req, res) => {
        createJWTCookie(req.user, res);
        if (req.authInfo.message === profileNotFoundMsg) {
            return res.render('confirm');
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
        const { access_token } = await axios.post(
            'https://oauth.iitd.ac.in/resource.php',
            {
                client_id: process.env.IITD_CLIENT_ID,
                client_secret: process.env.IITD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: req.query.code,
            }
        );
        const userData = await axios.post(
            'https://oauth.iitd.ac.in/resource.php',
            {
                access_token,
            }
        );
        const iitdCallback = async (
            err = null,
            user = null,
            // authInfo = { message: '' },
            request = req,
            response = res
        ) => {
            if (!err || !user) return response.status(500);

            if (!user.role.includes('iitd_user')) {
                user.role.push('iitd_user');
                await user.save();
            }
            createJWTCookie(user, response);
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
