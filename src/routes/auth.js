import express from 'express';
import { verifyToken, createJWTCookie } from '../utils/utils';
import { accessTokenName, refreshTokenName } from '../config/keys';

const router = express.Router();
const passport = require('passport');

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

router.get(
    '/google/callback',
    passport.authenticate('google', {
        session: false,
        failureRedirect: '/user/login',
    }),
    (req, res) => {
        createJWTCookie(req.user, res);
        const { state: serviceURL } = req.query;

        if (typeof serviceURL !== 'undefined' && serviceURL) {
            // render homepage to store token and then redirect with serviceURL
            return res.redirect(`/redirecting?serviceURL=${serviceURL}`);
        }
        return res.redirect('/');
    }
);
