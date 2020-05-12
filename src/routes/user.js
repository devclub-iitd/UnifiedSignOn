import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user';
import { secretkey } from '../config/keys';

const router = express.Router();

router.get('/login', (req, res) => {
    res.render('login');
});

router.get('/register', (req, res) => {
    res.render('register');
});

router.post('/login', async (req, res, next) => {
    try {
        // pull out the service URL
        const { serviceURL } = req.query;

        const { email, password } = req.body;

        // try to find the user in the database
        const user = await User.findOne({ email });

        // this means user doesn't exists, so throw an error TODO: add correct status to return
        if (!user) {
            return res
                .status(400)
                .json({ msg: 'Not a registered email address' });
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);

        // Incorrect password
        if (!isMatch) {
            return res
                .status(400)
                .json({ msg: 'Password seems to be incorrect' });
        }

        const payload = {
            user: {
                id: user._id,
                email: user.email,
            },
        };

        // create a token
        const token = jwt.sign(payload, secretkey, {
            expiresIn: 60 * 10,
        });

        // Set the token in the header
        res.setHeader('x-auth-token', token);

        if (serviceURL) {
            return res.redirect(`http://${serviceURL}`);
        }

        // where to redirect now, for now to SSO homepage
        return res.redirect('/');
    } catch (err) {
        next(err);
    }
});

router.post('/register', async (req, res) => {
    const { firstname, lastname, username, email, password } = req.body;

    try {
        // try to find the user in the database
        let user = await User.findOne({ email });

        // User already exists
        if (user) {
            return res
                .status(400)
                .json({ msg: 'User already exists with same email' });
        }

        // Create a new user of type `User`
        user = new User({
            first_name: firstname,
            last_name: lastname,
            username,
            email,
            password,
        });

        // encrypt the password using bcrypt
        const salt = await bcrypt.genSalt(10); // which to use 10 or more than that

        // update the password to encrypted one
        user.password = await bcrypt.hash(user.password, salt);

        // Save the updated the user in database
        await user.save();

        // Create payload to create a token
        const payload = {
            user: {
                id: user._id,
                email: user.email,
            },
        };

        // create a token
        const token = jwt.sign(payload, secretkey, {
            expiresIn: 60 * 10,
        });

        // Return the token
        return res.status(200).json({ token });
    } catch (err) {
        console.log(err);
    }
});

export default router;
