'use strict';

const log  = require('debug')('lav:app/models/Signal');
const User = require('./User').Model;
const _    = require('underscore');

/**
 * Signaling server logic.
 *
 * @class
 * @license MPL-2.0
 */
class Signal {

    /**
     * Socket.io instance.
     *
     * @prop {Object}
     */
    get io() {
        return this.options.io;
    }

    /**
     * Socket connection instance.
     *
     * @prop {Object}
     */
    get socket() {
        return this.options.socket;
    }

    /**
     * User model.
     *
     * @prop {Object}
     */
    get user() {
        return this.options.user;
    }

    /**
     * Socket room named after a user's name and deviceId
     *
     * @prop {String}
     */
    get mySocketRoom() {
        return `${this.user.username}@${this.deviceId}`;
    }

    /**
     * @param {Object} options
     * @param {Object} options.io
     * @param {Object} options.socket
     * @param {Object} options.user - user model
     */
    constructor(options) {
        this.options = options;

        // Device ID
        this.deviceId = this.socket.handshake.query.deviceId.trim();

        // Socket events
        this.socket.on('error', this.onError.bind(this));
        this.socket.on('disconnect', this.onDisconnect.bind(this));

        // Join the room named after the user's name
        this.socket.join(this.user.username);

        // Join the room named after a user's name and deviceId
        this.socket.join(this.mySocketRoom);

        // Start listening to events
        this.socket.on('sendInvite', this.sendInvite.bind(this));
        this.socket.on('removeInvite', this.removeInvite.bind(this));
        this.socket.on('requestOffers', this.requestOffers.bind(this));
        this.socket.on('sendOffer', this.sendOffer.bind(this));
        this.socket.on('sendSignal', this.sendSignal.bind(this));

        this.sendPendingInvites();
    }

    onError(err) {
        log('error', err);
    }

    onDisconnect() {
        log('disconnected');
    }

    /**
     * Send the pending invites to the user as soon as they are connected.
     */
    sendPendingInvites() {
        _.each(this.user.pendingInvites, invite => {
            this.io.to(this.mySocketRoom).emit('invite', invite);
        });
    }

    /**
     * Invite a user to start collaborating on documents.
     *
     * @todo check if signature is not empty
     * @param {String} username
     * @param {String} signature
     */
    sendInvite({username, signature}) {
        if (username === this.user.username) {
            return Promise.resolve();
        }

        const data = _.extend({signature}, this.user.getPublicData());

        log('sending an invite');
        return User.findByName({username})
        .then(user => user.addInvite(data))
        .then(()   => this.io.to(username).emit('invite', data))
        .catch(err => log('error', err));
    }

    /**
     * Remove a user's invite from pending invites.
     *
     * @param {String} username
     * @returns {Promise}
     */
    removeInvite({username}) {
        log(`removing ${username}'s pending invite`);
        return this.user.removeInvite({username})
        .catch(err => log('error', err));
    }

    /**
     * Request peer offers from every user's devices.
     *
     * @param {Array} users
     */
    requestOffers({users}) {
        log('requesting offers...');
        users.forEach(user => {
            this.io.to(user).emit('requestOffer', {
                username : this.user.username,
                deviceId : this.deviceId,
            });
        });
    }

    /**
     * Send an offer to another peer.
     *
     * @param {String} username
     * @param {String} deviceId
     */
    sendOffer({username, deviceId}) {
        log('sending offer...', username, deviceId);

        this.io.to(`${username}@${deviceId}`).emit('offer', {
            username : this.user.username,
            deviceId : this.deviceId,
        });
    }

    /**
     * Send signal informatin to another peer.
     *
     * @param {Object} signal
     * @param {String} signature
     * @param {Object} to
     */
    sendSignal({signal, signature, to}) {
        log(`sending signal data to ${to.username}...`, typeof signal);

        this.io.to(`${to.username}@${to.deviceId}`)
        .emit('signal', {
            signal,
            signature,
            from: {username: this.user.username, deviceId: this.deviceId},
        });
    }

}

module.exports = Signal;
