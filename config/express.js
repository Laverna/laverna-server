'use strict';
/**
 * Express.js configs.
 *
 * @file
 * @license MPL-2.0
 */
// const express     = require('express');
const logger     = require('morgan');
const bodyParser = require('body-parser');
const helmet     = require('helmet');
const cors       = require('cors');

module.exports = ({app}) => {
    // Security
    app.use(helmet({
        hidePoweredBy      : true,
        // Prevent any website from putting the website in a frame
        frameguard         : {
            action         : 'deny',
        },
        // Content-security-policy
        csp                : {
            /* eslint-disable quotes */
            directives     : {
                defaultSrc : ["'self'"],
                objectSrc  : ["'none'"],
            },
            /* eslint-enable quotes */
        },
    }));

    // Enable CORS
    app.use(cors());

    // Logging
    app.use(logger('dev'));

    // Body parser
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: false}));
};
