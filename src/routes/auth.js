import express from 'express';
import { verify } from 'jsonwebtoken';
import { secretkey } from '../config/keys';

const router = express.Router();

// post route to check validity of tokens, clients will hit this route.
router.post('/', (res, req) => {

    // pull out the token from the header for now
    // later we will extract from the cookie
    const token = req.header('x-auth-token');

    // So the token is present, so lets verify it
    try {
        const decoded = verify(token, secretkey);

        user = decoded.user;

        return res.status(200).json({ user: user });

    } catch (err) {
        // I wasn't able to verify the token as it was invalid
        return res.status(401).json({ msg: "Error, token not valid" });
    }
});

router.post('/getuser', (res, req) => {
    // pull out the token from the header for now
    // later we will extract from the cookie
    const token = req.header('x-auth-token');

    // So the token is present, so lets verify it
    try {
        const decoded = verify(token, secretkey);

        user = decoded.user;

        // sent the user data to the frontend
        return res.status(200).json({ user: user });

    } catch (err) {
        // I wasn't able to verify the token as it was invalid
        return res.status(401).json({ msg: "Error, token not valid" });
    }
})

export default router;
