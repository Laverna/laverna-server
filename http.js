'use strict';
const fs = require('fs');

/**
 * Start HTTPS server if certificate files are available.
 *
 * @param {Object} app
 */
function createServer(app) {
    if (!process.env.SSL_KEY || !process.env.SSL_CERTIFICATE) {
        return require('http').createServer(app);
    }

    const options = {
        key  : fs.readFileSync(process.env.SSL_KEY),
        cert : fs.readFileSync(process.env.SSL_CERTIFICATE),
    };

    return require('https').createServer(options, app);
}

module.exports = {createServer};
