import express from 'express';
import User from '../models/user';

const router = express.Router();

router.get('/login', (req, res) => {
    res.render('login');
});

router.get('/register', (req, res) => {
    res.render('register');
});

router.post('/login', (req, res) => {
    res.send('Login the User');
});

router.post('./register', (req, res) => {
    res.send('Register the User');
});

export default router;
