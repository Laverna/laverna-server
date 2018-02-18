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
module.exports.token = async (req, res) => {
    const username     = req.params.username.trim();
    const sessionToken = await User.getSessionToken({username});

    if (!sessionToken) {
        return res.status(404).send('User not found');
    }

    res.json({sessionToken});
};

/**
 * Authenticate a user.
 * The api is available at /api/auth
 */
module.exports.auth = async (req, res) => {
    const {username, fingerprint, signature} = req.body;
    const user = await User.findByName({username});

    if (!user) {
        return res.json({success: false, message: 'User not found'});
    }
    else if (user.fingerprint !== fingerprint) {
        return res.json({success: false, message: 'Wrong fingerprint'});
    }

    const token = await user.authenticate({signature});
    if (!token) {
        return res.json({success: false, message: 'Invalid signature'});
    }

    return res.json({success: true, token});
};
