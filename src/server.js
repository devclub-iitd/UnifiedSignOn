import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import user from './routes/user';
import auth from './routes/auth';
import profile from './routes/profile';

const app = express();

app.set('view engine', 'ejs');
app.set('views', `${__dirname}/views`);
app.use(express.static(`${__dirname}/public`));

// Body Parser Middleware
// parse application/x-www-form-urlencoded (for ejs page requests)
app.use(bodyParser.urlencoded());
// parse json
app.use(bodyParser.json());

// export .env from previous folder
require('dotenv').config({ path: `${__dirname}/../.env` });

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
    const { token, serviceURL } = req.query;
    if (typeof serviceURL !== 'undefined' && serviceURL) {
        const finalServiceURL = `${serviceURL}?token=${token}`;
        return res.render('middleware', { token, serviceURL: finalServiceURL });
    }
    res.render('middleware', { token, serviceURL });
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
