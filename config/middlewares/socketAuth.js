'use strict';
/**
 * Prevent users from connecting to the socket server
 * if they are not authenticated.
 *
 * @file
 * @license MPL-2.0
 */
const log  = require('deb')('lav:config/middlewares/socketAuth');
const User = require('../../app/models/User').Model;

module.exports = (socket, next) => {
    const {username, token, deviceId} = socket.handshake.query;

    if (!username || !token || !deviceId) {
        log('username/deviceId/token was not provided!');
        return next(new Error('Username/token/deviceId is empty'));
    }

    User.authToken({username, token})
    .then(res => {
        if (!res) {
            return next(new Error('Authentication error'));
        }

        next();
    });
};
