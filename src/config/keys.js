const fs = require('fs');
const path = require('path');

export const expTime = 1000 * 60 * 20;
export const rememberTime = 1000 * 60 * 60 * 24 * 2;
export const tokenName = 'token';
export const rememberTokenName = 'rememberme';
export const iss = 'auth.devclub.in';
export const privateKey = fs.readFileSync(
    path.resolve(__dirname, './private.pem')
);
export const publicKey = fs.readFileSync(
    path.resolve(__dirname, './public.pem')
);
