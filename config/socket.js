'use strict';
/**
 * Start Socket.io server.
 *
 * @file
 * @license MPL-2.0
 */
const socketIo = require('socket.io');
const log      = require('debug')('lav:config/socket');
const User     = require('../app/models/User').Model;
const Signal   = require('../app/models/Signal');
const auth     = require('./middlewares/socketAuth');

module.exports = ({server}) => {
    const io = socketIo(server);

    // Use authentication middleware
    io.use(auth);

    io.on('connection', socket => {
        log(`connected ${socket.handshake.query.username}`);

        User.findByName({username: socket.handshake.query.username})
        .then(user => {
            new Signal({socket, io, user});
        });
    });
};
