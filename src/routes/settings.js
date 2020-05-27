import bcrypt from 'bcryptjs';
import { accessTokenName } from '../config/keys';
import { User } from '../models/user';
import { createJWTCookie } from '../utils/utils';

const router = require('express').Router();

router.get('/', (req, res) => {
    res.render('settings', { messages: [{ message: '', error: false }] });
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
        // Initialize an empty messages array that stores message related to each change, error and successfull changes, etc.
        // This is done in order to ensure that the user gets a comprehensive detail about the changes made
        // Also ensures that even if there was some error changing the password, the other fields get updated
        const messages = [];

        // Extract user from the database
        const user = await User.findOne({ email });

        // If the user has entered a newPassword check for the old password
        if (newPassword) {
            if (password) {
                const isMatch = await bcrypt.compare(password, user.password);
                if (!isMatch) {
                    messages.push({
                        message: 'Incorrect password',
                        error: true,
                    });
                } else {
                    // If the old password has been given and is correct, update the password field on the user
                    const passwordHash = await bcrypt.hash(newPassword, 10);
                    user.password = passwordHash;
                    messages.push({
                        message: 'Password updated successfully',
                        error: false,
                    });
                }
            } else {
                messages.push({
                    message:
                        'Please enter your current password to update password',
                    error: true,
                });
            }
        }

        // Update personal info fields
        if (firstName && firstName !== user.firstname) {
            user.firstname = firstName;
            messages.push({
                message: 'First name updated successfuly',
                error: false,
            });
        }
        if (lastName && lastName !== user.lastname) {
            user.lastname = lastName;
            messages.push({
                message: 'Last name updated successfuly',
                error: false,
            });
        }
        if (newUsername && newUsername !== user.username) {
            user.username = newUsername;
            messages.push({
                message: 'Username updated successfuly',
                error: false,
            });
        }

        // Save the user and validate inputs
        await user.save((err) => {
            // TODO : Add user friendly errors for invalid inputs
            if (err) {
                messages.push({ message: err.message, error: true });
                res.render('settings', { messages });
            } else {
                // If the validation was successful, update the user and create a new JWT for the updated credentials
                res.clearCookie(accessTokenName);
                createJWTCookie(user, res);
                res.render('settings', { messages });
            }
        });
    } catch (error) {
        res.render('settings', {
            messages: [
                { message: 'Seems like an error occurred', error: true },
            ],
        });
    }
});

export default router;
