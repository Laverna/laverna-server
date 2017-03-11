'use strict';
/**
 * @file
 * @license MPL-2.0
 */
require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const deb      = require('debug');
const http     = require('http');
const config   = require('./config');

const log        = deb('lav:server');
const app        = express();
const server     = http.createServer(app);
const port       = process.env.PORT || 3000;
mongoose.Promise = global.Promise;

// Enable logging
if (process.env.NODE_ENV === 'development') {
    deb.enable('lav:*');
}

if (!process.env.JWT_SECRET) {
    // eslint-disable-next-line
    console.log('Please configure the server by copying .env.example file to .env');
    process.exit(1);
}

// Bootstrap models
require('./app/models/User');

// Bootstrap routes
const data = {app, server};
require('./config/express')(data);
require('./config/routes')(data);
require('./config/socket')(data);

/**
 * Connect to mongodb server.
 */
function connect() {
    log('connecting to mongodb...');
    return mongoose.connect(config.db, config.dbOptions).connection;
}

/**
 * Start the server.
 */
function listen() {
    if (app.get('env') === 'test') {
        return;
    }

    server.listen(port);
    log(`Server started on port ${port}`);
}

connect()
.on('error', log)
.on('disconnected', connect)
.once('open', listen);

module.exports = {app, server};
