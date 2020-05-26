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
    // Check if user has entered password
    if (password) {
        // Find the current user from the database
        try {
            const user = await User.findOne({ email });
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                res.render('settings', {
                    message: 'Incorrect Password',
                    error: true,
                });
            } else {
                // Update changed fields
                if (firstName) {
                    user.firstname = firstName;
                }
                if (lastName) {
                    user.lastname = lastName;
                }
                if (newUsername) {
                    user.username = newUsername;
                }
                if (newPassword) {
                    const hash = await bcrypt.hash(newPassword, 10);
                    user.password = hash;
                }

                // Save the user to take advantage of inbuilt validation
                await user.save({}, (err) => {
                    // Display an error message if their
                    if (err) {
                        res.render('settings', {
                            // TODO : Filter the error messages based on error code and display a user-friendly message
                            message: err.message,
                            error: true,
                        });
                    } else {
                        // Clear old JWT and create a new one based on the updated information
                        res.clearCookie(accessTokenName);
                        createJWTCookie(user, res);
                        res.render('settings', {
                            message: 'Fields updated successfully',
                            error: false,
                        });
                    }
                });
            }
        } catch (error) {
            res.render('settings', {
                message: 'Seems like an error occured!',
                error: true,
            });
        }
    } else {
        res.render('settings', {
            message: 'Please enter your password to modify fields',
            error: true,
        });
    }
});

export default router;
