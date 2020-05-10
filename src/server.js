const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('Welcome to the Auth Server !!');
});

app.listen(process.env["PORT"] , () => {
    console.log(`Server listening on ${process.env["PORT"]}!`)
});