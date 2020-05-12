const express = require('express');

const app = express();

app.set('view engine', 'ejs');
app.set('views', `${__dirname}/views`);
app.use(express.static(`${__dirname}/public`));

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.listen(process.env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on ${process.env.PORT}!`);
});
