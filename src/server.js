import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import user from './routes/user';
import auth from './routes/auth';
import profile from './routes/profile';

import { socialAuthenticate } from './utils/utils';

require('dotenv').config({
    path: `${__dirname}/../.env`,
});

const app = express();

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth').OAuth2Strategy;
const FbStrategy = require('passport-facebook').Strategy;
const GithubStrategy = require('passport-github2').Strategy;

passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: `http://localhost:${process.env.PORT}/auth/google/callback`,
        },
        (accessToken, refreshToken, googleProfile, done) => {
            console.log(googleProfile);
            const {
                sub: uid,
                family_name: lastname,
                given_name: firstname,
                email,
            } = googleProfile._json;
            console.log(`${uid}:${firstname}:${lastname}:${email}`);
            return socialAuthenticate(
                'google',
                done,
                uid,
                firstname,
                lastname,
                email
            );
        }
    )
);

passport.use(
    new FbStrategy(
        {
            clientID: process.env.FACEBOOK_CLIENT_ID,
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
            callbackURL: `http://localhost:${process.env.PORT}/auth/facebook/callback`,
            profileFields: ['id', 'displayName', 'email'],
            enableProof: true,
        },
        (accessToken, refreshToken, fbProfile, done) => {
            console.log(fbProfile);
            return socialAuthenticate(
                'facebook',
                done,
                fbProfile._json.id,
                fbProfile._json.name,
                '',
                fbProfile._json.email
            );
        }
    )
);

passport.use(
    new GithubStrategy(
        {
            clientID: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            callbackURL: `http://localhost:${process.env.PORT}/auth/github/callback`,
            scope: ['user:email'],
        },
        (accessToken, refreshToken, githubProfile, done) => {
            console.log(githubProfile);
            return socialAuthenticate(
                'github',
                done,
                githubProfile._json.id,
                githubProfile._json.name,
                '',
                githubProfile.emails[0].value
            );
        }
    )
);
app.use(passport.initialize());

app.use(cors());
app.use(cookieParser()); // pass a string inside function to encrypt cookies

app.set('view engine', 'ejs');
app.set('views', `${__dirname}/views`);
app.use(express.static(`${__dirname}/public`));

// Body Parser Middleware
// parse application/x-www-form-urlencoded (for ejs page requests)
app.use(bodyParser.urlencoded());
// parse json
app.use(bodyParser.json());

// export .env from previous folder

const db_url = process.env.DB_URL;

// Connect to database
mongoose
    .connect(db_url, {
        useNewUrlParser: true,
        useCreateIndex: true,
        useFindAndModify: false,
        useUnifiedTopology: true,
    })
    .then(() => {
        console.log('Connected to the database...');
    })
    .catch((err) => {
        console.log(err);
    });

// Root page
app.get('/', (req, res) => {
    res.render('index');
});

// middleware page used for redirecting and handeling the user token on our end
app.get('/redirecting', (req, res) => {
    const { serviceURL } = req.query;
    if (typeof serviceURL !== 'undefined' && serviceURL) {
        const finalServiceURL = `${serviceURL}`;
        return res.render('middleware', {
            serviceURL: finalServiceURL,
        });
    }
    res.render('middleware', {
        serviceURL,
    });
});

// About Page
app.get('/about', (req, res) => {
    res.render('about');
});

// Set Routes
app.use('/user', user);
app.use('/auth', auth);
app.use('/profile', profile);

const port = process.env.PORT;

app.listen(port, () => {
    console.log(`Server listening on ${port}!`);
});
