'use strict';
/**
 * Routers.
 *
 * @file
 * @license MPL-2.0
 */
const express = require('express');
const users   = require('../app/controllers/users');
const auth    = require('../app/controllers/auth');

module.exports = ({app}) => {
    const api = express.Router();
    app.use('/api', api);

    // Users API
    api.get('/users/name/:username', users.findByName);
    api.get('/users/fingerprint/:fingerprint', users.findByFingerprint);
    api.post('/users', users.create);

    // Auth
    api.get('/token/:username', auth.token);
    api.post('/auth', auth.auth);
};
