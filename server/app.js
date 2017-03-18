'use strict';

const express = require('express');
const path = require('path');
const port = process.env.PORT || 3000;
const cookieParser = require('cookie-parser');

const bodyParser = require('body-parser');

const app = express();

if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

app.use(bodyParser.json());
app.use(cookieParser());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.use('/api', require('./routes/api'));

module.exports = app;
