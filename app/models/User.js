'use strict';
/**
 * @module app/models/User
 * @license MPL-2.0
 */
const mongoose = require('mongoose');
// const crypto   = require('crypto');
const openpgp  = require('openpgp');
const log      = require('debug')('lav:app/models/User');
const _        = require('underscore');
const jwt      = require('jsonwebtoken');

const jwtSecret = process.env.JWT_SECRET;
const {Schema}  = mongoose;

/**
 * User schema
 */
const userSchema = new Schema({

    username: {
        type     : String,
        unique   : true,
        required : true,
    },

    fingerprint: {
        type     : String,
        unique   : true,
        required : true,
    },

    publicKey: {
        type     : String,
        required : true,
    },

    pendingInvites: [
        {
            signature   : String,
            username    : String,
            fingerprint : String,
            publicKey   : String,
        },
    ],

});

/**
 * Statics.
 */
userSchema.static({

    /**
     * Find a user by name.
     *
     * @param {String} username
     * @returns {Promise}
     */
    findByName({username}) {
        const name = username.toLowerCase();
        log(`checking ${username}`);
        return this.findOne({username: name}).exec();
    },

    /**
     * Find a user by public key fingerprint.
     *
     * @param {String} fingerprint
     * @returns {Promise}
     */
    findByFingerprint({fingerprint}) {
        return this.findOne({fingerprint}).exec();
    },

    /**
     * Generate a session token which the user needs to sign with their private
     * key to auth on the server.
     *
     * @param {String} username
     * @returns {String|Boolean} - false if user does not exist
     */
    async getSessionToken({username}) {
        const user = await this.findByName({username});
        if (!user) {
            return false;
        }

        const payload = {sessionTokenFor: user.username};
        return jwt.sign(payload, jwtSecret, {
            expiresIn : '8m',
            algorithm : 'HS256',
        });
    },

    /**
     * Authenticate a user with a token.
     *
     * @param {String} username
     * @param {String} token
     * @returns {Promise}
     */
    async authToken({username, token}) {
        const user = await this.findByName({username});
        if (!user) {
            return false;
        }

        return user.verifyAuthToken(token);
    },

});

/**
 * Methods.
 */
userSchema.method({

    /**
     * Return model attributes that can be shared with others
     * (username, fingerprint, publicKey.)
     *
     * @returns {Object}
     */
    getPublicData() {
        return _.pick(this, 'username', 'fingerprint', 'publicKey');
    },

    /**
     * Register a new user.
     *
     * @todo sanitize fields before saving
     * @returns {Promise}
     */
    register() {
        try {
            this.username    = this.username.toLowerCase();
            const key        = this.readKey();
            this.fingerprint = key.primaryKey.fingerprint;
        }
        catch (e) {
            return Promise.reject(e);
        }
        log('registering a new user', this.fingerprint);

        return this.save();
    },

    /**
     * Read the key.
     *
     * @returns {Object}
     */
    readKey() {
        const {keys, err} = openpgp.key.readArmored(this.publicKey);

        // The public key is unreadable
        if (err) {
            throw new Error(err);
        }

        return keys[0];
    },

    /**
     * Check if a message is truly signed with the user's key.
     *
     * @param {String} signature
     * @returns {Promise} returns false or the message that was signed
     */
    async checkSignature({signature}) {
        let message;

        try {
            message = openpgp.cleartext.readArmored(signature);
        }
        catch (e) {
            return Promise.resolve(false);
        }

        const publicKeys = this.readKey();
        const res = await openpgp.verify({message, publicKeys});

        if (!res.signatures[0].valid) {
            return false;
        }

        return res.data;
    },

    /**
     * Authenticate the user by checking their signature.
     *
     * @param {String} signature
     * @param {String} sid - Session ID
     * @returns {Promise} - returns false or auth token
     */
    async authenticate({signature}) {
        const res = await this.checkSignature({signature});
        if (!res) {
            return false;
        }

        const data = JSON.parse(res);
        if (data.username !== this.username || data.msg !== 'SIGNAL_AUTH_REQUEST') {
            return false;
        }

        // Verify the session token and generate an auth token
        return this.generateAuthToken(data.sessionToken);
    },

    /**
     * Generate an auth token for a user which can be used to authenticate
     * on socket server.
     *
     * @param {String} sessionToken
     * @returns {Promise}
     */
    async generateAuthToken(sessionToken) {
        const decoded = await this.verifyToken(sessionToken);
        if (!decoded || decoded.sessionTokenFor !== this.username) {
            return false;
        }

        const payload = {loggedInAs: this.username};
        return jwt.sign(payload, jwtSecret, {
            expiresIn : '24h',
            algorithm : 'HS256',
        });
    },

    /**
     * Verify a token used for authenticating on the socket server.
     *
     * @param {String} token
     */
    async verifyAuthToken(token) {
        const decoded = await this.verifyToken(token);
        return (decoded && decoded.loggedInAs === this.username);
    },

    /**
     * Verify a token.
     *
     * @param {String} token
     * @returns {Promise|Boolean} - returns decoded data if the verification
     * is successful
     */
    verifyToken(token) {
        const options = {algorithms: ['HS256']};

        return new Promise(resolve => {
            jwt.verify(token, jwtSecret, options, (err, decoded) => {
                if (err) {
                    return resolve(false);
                }

                resolve(decoded);
            });
        });
    },

    /**
     * Add a pending invite.
     *
     * @param {Object} data
     * @param {String} data.username  - a user who sent the invite
     * @param {String} data.publicKey - a user's public key
     * @param {String} data.signature - the signature
     * @returns {Promise}
     */
    addInvite(data) {
        const username = data.username.toLowerCase();

        if (_.findWhere(this.pendingInvites, {username})) {
            log('found the invite!');
            return Promise.resolve();
        }

        log('did not find the invite');
        const sData         = _.extend({}, data, {username});
        this.pendingInvites = this.pendingInvites.concat([sData]);
        this.markModified('pendingInvites');
        return this.save();
    },

    /**
     * Remove a user's pending invite.
     *
     * @param {Object} data
     * @param {String} data.username
     * @returns {Promise}
     */
    removeInvite(data) {
        const username = data.username.toLowerCase();
        if (!_.findWhere(this.pendingInvites, {username})) {
            return Promise.resolve();
        }

        this.pendingInvites = _.filter(this.pendingInvites, invite => {
            return invite.username !== username;
        });
        this.markModified('pendingInvites');
        return this.save();
    },

});

module.exports.schema = userSchema;
module.exports.Model  = mongoose.model('User', userSchema);
