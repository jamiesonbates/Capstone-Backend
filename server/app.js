'use strict';

const express = require('express');
const path = require('path');
const port = process.env.PORT || 3000;

const bodyParser = require('body-parser');

const app = express();

app.use(bodyParser.json());

app.use('/api', require('./routes/api'));

module.exports = app;
