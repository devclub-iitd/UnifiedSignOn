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
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    isverified: {
        type: Boolean,
        default: false,
    },
    entry_num: {
        type: String,
        maxlength: 15,
    },
    roles: {
        type: [String],
        default: ['external_user'],
    },
});

const SocialAccountSchema = mongoose.Schema({
    provider: {
        type: String,
        enum: ['google', 'facebook', 'github', 'iitd'],
    },
    uid: String,
    email: String,
    primary_account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
});

const roleSchema = mongoose.Schema({
    name: {
        type: String,
        maxlength: 30,
        unique: true,
    },

    regex: {
        entry_num: { type: String },
        username: { type: String },
        email: { type: String },
        firstname: { type: String },
        lastname: { type: String },
    },
});

const clientSchema = mongoose.Schema({
    domain: {
        type: String,
        maxlength: 50,
    },
    description: {
        type: String,
        maxlength: 4096,
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    access_token: {
        type: String,
    },
    default_role: {
        type: String,
    },
    custom_roles: {
        type: [String],
    },
});

module.exports = {
    SocialAccount: mongoose.model('SocialAccount', SocialAccountSchema),
    User: mongoose.model('User', userSchema),
    Role: mongoose.model('Role', roleSchema),
    Client: mongoose.model('Client', clientSchema),
};
