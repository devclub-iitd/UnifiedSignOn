import bcrypt from 'bcryptjs';
import { accessTokenName } from '../config/keys';
import User from '../models/user';
import { createJWTCookie } from '../utils/utils';

const router = require('express').Router();

router.get('/', (req, res) => {
    res.render('settings', { message: '', error: false });
});

router.post('/', async (req, res) => {
    const {
        email,
        password,
        firstName,
        lastName,
        newUsername,
        newPassword,
    } = req.body;

    try {
        const user = await User.findOne({ email });
        if (newPassword) {
            if (password) {
                const isMatch = await bcrypt.compare(password, user.password);
                if (!isMatch) {
                    return res.render('settings', {
                        message: 'Incorrect Password',
                        error: true,
                    });
                }
                const passwordHash = await bcrypt.hash(newPassword, 10);
                user.password = passwordHash;
            } else {
                return res.render('settings', {
                    message:
                        'Please enter your old password to update your password',
                    error: true,
                });
            }
        }

        if (firstName) {
            user.firstname = firstName;
        }
        if (lastName) {
            user.lastname = lastName;
        }
        if (newUsername) {
            user.username = newUsername;
        }

        await user.save({}, (err) => {
            if (err) {
                console.log(err);
                return res.render('settings', {
                    message: err.message,
                    error: true,
                });
            }
            res.clearCookie(accessTokenName);
            createJWTCookie(user, res);
            res.render('settings', {
                message: 'Fields updated successfully',
                error: false,
            });
        });
    } catch (error) {
        console.log(error);
        res.render('settings', {
            message: 'Seems like an error occurred',
            error: true,
        });
    }
});

export default router;
