'use strict';

const User    = require('../app/models/User').Model;
const openpgp = require('openpgp');

/**
 * Clean up MongoDB.
 *
 * @param {Object} t
 */
exports.cleanup = t => {
    User.remove().exec()
    .then(() => t.end());
};

/**
 * Generate an OpenPGP key pair.
 *
 * @param {Object} userId
 * @param {Object} userId.name
 * @param {Object} userId.email
 * @returns {Promise} resolves with an object
 * containing {publicKey, privateKey, fingerprint}
 */
exports.generateKey = userId => {
    return openpgp.generateKey({
        numBits    : 1024, // Intentionally weak key for faster testing
        userIds    : [userId],
        passphrase : '1',
    })
    .then(res => {
        const key = openpgp.key.readArmored(res.privateKeyArmored).keys[0];
        key.decrypt('1');
        return {
            publicKey   : res.publicKeyArmored,
            privateKey  : key,
            fingerprint : key.primaryKey.fingerprint,
        };
    });
};

/**
 * Create auth signature for a user.
 *
 * @param {String} username
 * @param {Object} userKeys
 * @param {Object} t - test
 * @param {String} token
 * @returns {Promise} resolves with a signature
 */
exports.createAuthSignature = ({username, key, t, token}) => {
    (token ? Promise.resolve(token) : User.getSessionToken({username}))
    .then(sessionToken => {
        const data = JSON.stringify({
            sessionToken,
            username,
            msg       : 'SIGNAL_AUTH_REQUEST',
            publicKey : key.publicKey,
        });

        return openpgp.sign({data, privateKeys: [key.privateKey]})
        .then(sign => {
            global.authSignature = sign.data;
            t.end();
        });
    });
};
