// add ES6 support
require('@babel/register')({
    presets: ['@babel/preset-env'],
});

// export the .env file
require('dotenv').config();

// Import the rest of our application.
module.exports = require('./src/server');
