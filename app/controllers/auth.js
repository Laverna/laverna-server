'use strict';
/**
 * @module controllers/auth
 * @license MPL-2.0
 */
const User = require('../models/User').Model;

/**
 * Generate a session token.
 * The api is available at /api/token/username/:username
 */
module.exports.token = (req, res) => {
    const username = req.params.username.trim();

    User.getSessionToken({username})
    .then(sessionToken => {
        if (!sessionToken) {
            return res.status(404).send('User not found');
        }

        res.json({sessionToken});
    });
};

/**
 * Authenticate a user.
 * The api is available at /api/auth
 */
module.exports.auth = (req, res) => {
    const {username, fingerprint, signature} = req.body;

    User.findByName({username})
    .then(user => {
        if (!user) {
            return res.json({success: false, message: 'User not found'});
        }
        else if (user.fingerprint !== fingerprint) {
            return res.json({success: false, message: 'Wrong fingerprint'});
        }

        return user.authenticate({signature})
        .then(token => {
            if (!token) {
                return res.json({success: false, message: 'Invalid signature'});
            }

            return res.json({success: true, token});
        });
    });
};
