import express from 'express';
import { verify } from 'jsonwebtoken';
import { secretkey } from '../config/keys';

const router = express.Router();

// Clients will hit this Route to see if they are logged in or not.
router.get('/', (req, res) => {

    // pull out the service URL
    const { serviceURL } = req.query;

    // pull out the token from the header for now
    // later we will extract from the cookie
    const token = req.header('x-auth-token');

    // if no token is present in header
    // then make the user login first
    if (!token) {
        // add service URL in the query
        return res.redirect('/user/login?' + serviceURL)
    }

    // So the token is present, so lets verify it
    try {

        const decoded = verify(token, secretkey);

        req.user = decoded.user; // this will give us the user:id in req.user.id

        // Set the token in the header
        res.setHeader('x-auth-token', token);

        // if there is a service URL redirect to there
        if (serviceURL) {
            return res.status(200).redirect('http://' + serviceURL)
        }

        // else redirect to SSO homepage
        return res.redirect('/');

    } catch (err) {

        // I wasn't able to verify the token as it was invalid
        // So in any case I should redirect to login
        // add service URL in the query
        return res.redirect('/user/login?' + serviceURL)
    }
})

export default router;
