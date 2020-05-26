// User Model Schema

// Import mongoose
const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    username: {
        type: String,
        // required: true,
        minlength: 6,
        maxlength: 30,
    },
    firstname: {
        type: String,
        maxlength: 30,
    },
    lastname: {
        type: String,
        maxlength: 30,
    },
    password: {
        type: String,
        // required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    role: {
        type: String,
        enum: ['admin', 'external_user', 'dc_core', 'dc_member', 'iitd_user'],
    },
});

const SocialAccountSchema = mongoose.Schema({
    provider: {
        type: String,
        enum: ['google', 'facebook', 'github'],
    },
    uid: String,
    email: String,
    primary_account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
});
module.exports = {
    SocialAccount: mongoose.model('SocialAccount', SocialAccountSchema),
    User: mongoose.model('User', userSchema),
};
