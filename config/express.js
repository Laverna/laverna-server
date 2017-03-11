'use strict';
/**
 * Express.js configs.
 *
 * @todo properly configure access control with .env
 * @file
 * @license MPL-2.0
 */
// const express     = require('express');
const logger     = require('morgan');
const bodyParser = require('body-parser');
const helmet     = require('helmet');

module.exports = ({app}) => {
    // Security
    app.use(helmet({
        // Prevent any website from putting the website in a frame
        frameguard: {
            action: 'deny',
        },
    }));

    app.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', 'http://localhost:9000');
        res.setHeader(
            'Access-Control-Allow-Methods',
            'GET, POST, OPTIONS, PUT, PATCH, DELETE'
        );
        res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
        res.setHeader('Access-Control-Allow-Credentials', true);
        next();
    });

    // Logging
    app.use(logger('dev'));

    // Body parser
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: false}));
};
