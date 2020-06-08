const fs = require('fs');
const path = require('path');

export const expTime = 60 * 20;
export const rememberTime = 60 * 60 * 24 * 2;
export const accessTokenName = 'token';
export const refreshTokenName = 'rememberme';
export const iss = 'auth.devclub.in';
export const privateKey = fs.readFileSync(
    path.resolve(__dirname, './private.pem')
);
export const publicKey = fs.readFileSync(
    path.resolve(__dirname, './public.pem')
);
export const profileNotFoundMsg =
    'Sorry. We do not recognize this account. Maybe you would like to create a new account';
