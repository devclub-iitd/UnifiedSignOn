import express from 'express';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';
import user from './routes/user';
import auth from './routes/auth';

const app = express();

app.set('view engine', 'ejs');
app.set('views', `${__dirname}/views`);
app.use(express.static(`${__dirname}/public`));

// Body Parser Middleware
app.use(bodyParser.json());

// export the .env file
require('dotenv').config({ path: `${__dirname}/.env` })

// const db_url = process.env.DB_URL;

// Connect to database
mongoose
    .connect('mongodb+srv://jatin:jatin@cluster0-fyl7v.mongodb.net/test?retryWrites=true&w=majority', {
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

// About Page
app.get('/about', (req, res) => {
    res.render('about');
});

// Set Routes
app.use('/user', user);
app.use('/auth', auth);

const port = process.env.PORT;

app.listen(port, () => {
    console.log(`Server listening on ${3000}!`);
});
