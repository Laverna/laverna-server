'use strict';
/**
 * @module controllers/users
 * @license MPL-2.0
 */
const _ = require('underscore');
const User = require('../models/User').Model;
const log  = require('debug')('lav:controllers/auth');

/**
 * Respond with user data.
 *
 * @param {Object} res
 * @param {Object} user
 */
function respondUser(res, user) {
    if (!user) {
        return res.status(404).send('User does not exist!');
    }

    res.json(user.getPublicData());
}

/**
 * Find a user by name.
 * Available at /api/users/name/:username
 */
module.exports.findByName = (req, res) => {
    User.findByName({username: req.params.username})
    .then(user => respondUser(res, user));
};

/**
 * Find a user by fingerprint.
 * Available at /api/users/fingerprint/:fingerprint
 */
module.exports.findByFingerprint = (req, res) => {
    User.findByFingerprint({fingerprint: req.params.fingerprint})
    .then(user => respondUser(res, user));
};

/**
 * Register a new user.
 * You should provide username and publicKey.
 * Available at /api/users
 */
module.exports.create = (req, res) => {
    const data = _.pick(req.body, 'username', 'publicKey');
    const user = new User(data);

    user.register()
    .then(()   => res.json({message: 'Registered a new user.'}))
    .catch(err => {
        log('error', err);
        res.status(400).send(err.message);
    });
};
