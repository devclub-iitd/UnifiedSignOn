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

    // TODO : Add multiple error messages, for example if the password is wrong but the other fields have been updated
    // Add an error for the password field but update the other fields regardless

    try {
        // Extract user from the database
        const user = await User.findOne({ email });

        // If the user has entered a newPassword check for the old password
        if (newPassword) {
            if (password) {
                const isMatch = await bcrypt.compare(password, user.password);
                if (!isMatch) {
                    return res.render('settings', {
                        message: 'Incorrect Password',
                        error: true,
                    });
                }

                // If the old password has been given and is correct, update the password field on the user
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

        // Update personal info fields
        if (firstName) {
            user.firstname = firstName;
        }
        if (lastName) {
            user.lastname = lastName;
        }
        if (newUsername) {
            user.username = newUsername;
        }

        // Save the user and validate inputs
        await user.save({}, (err) => {
            // TODO : Display a user friendly error for errors such as max username length
            if (err) {
                return res.render('settings', {
                    message: err.message,
                    error: true,
                });
            }

            // If their was no error, clear the existing token and create a new one with the updated user info
            res.clearCookie(accessTokenName);
            createJWTCookie(user, res);
            res.render('settings', {
                message: 'Fields updated successfully',
                error: false,
            });
        });
    } catch (error) {
        res.render('settings', {
            message: 'Seems like an error occurred',
            error: true,
        });
    }
});

export default router;
