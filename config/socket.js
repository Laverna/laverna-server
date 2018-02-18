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
    const connected = [];

    // Use authentication middleware
    io.use(auth);

    io.on('connection', async socket => {
        log(`connected ${socket.handshake.query.username}`);

        const user = await User.findByName({username: socket.handshake.query.username});
        new Signal({socket, io, user, connected});
    });
};
