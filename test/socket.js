'use strict';

/* global sockTokens */
const test     = require('tape');
const io       = require('socket.io-client');
const {Model}  = require('../app/models/User');
const jwt      = require('jsonwebtoken');
const {server} = require('../server');
const port     = process.env.TESTPORT || 3600;
const url      = `http://localhost:${port}`;

const {cleanup, generateKey} = require('./util');

test('socket: clean up', cleanup);

test('socket: before: create users', t => {
    server.listen(port);

    return Promise.all([
        generateKey({name: 'alice', email: ''}),
        generateKey({name: 'bob', email: ''}),
    ])
    .then(res => {
        const user  = new Model(Object.assign({username: 'alice'}, res[0]));
        const user2 = new Model(Object.assign({username: 'bob'}, res[1]));
        return Promise.all([user.save(), user2.save()]);
    })
    .then(() => t.end());
});

test('socket: before: create auth tokens', t => {
    const payload  = {loggedInAs: 'alice'};
    const payload2 = {loggedInAs: 'bob'};

    return Promise.all([
        jwt.sign(payload,  process.env.JWT_SECRET, {expiresIn: '24h'}),
        jwt.sign(payload2, process.env.JWT_SECRET, {expiresIn: '24h'}),
    ])
    .then(res => {
        global.sockTokens = {
            alice: res[0],
            bob  : res[1],
        };
        t.end();
    });
});

/**
 * Connect to the socket server.
 *
 * @param {String} username
 * @param {String} token
 * @returns {Promise}
 */
function connect(username, token) {
    return new Promise((resolve, reject) => {
        const client = io(url, {
            query      : `username=${username}&deviceId=1&token=${token}`,
            transports : ['websocket'],
            forceNew   : true,
        });

        client.once('connect', () => resolve(client));
        client.on('error', err  => reject(err));
    });
}

test('socket: username cannot be empty', t => {
    connect('', sockTokens.alice)
    .catch(err => {
        t.pass(err, 'Username/token/deviceId is empty');
        t.end();
    });
});

test('socket: token cannot be empty', t => {
    connect('alice', '')
    .catch(err => {
        t.pass(err, 'Username/token/deviceId is empty');
        t.end();
    });
});

test('socket: throws an error if the token is incorrect', t => {
    connect('alice', 'wrong token')
    .catch(err => {
        t.pass(err, 'Authentication error');
        t.end();
    });
});

test('socket: can connect', t => {
    Promise.all([
        connect('alice', sockTokens.alice),
        connect('bob', sockTokens.bob, t),
    ])
    .then(() => t.end())
    .catch(err => {
        t.fail(`Connection error ${err}`);
        t.end();
    });
});

test('socket: after', t => {
    server.close();
    t.end();
});

test('/api/auth: clean up', cleanup);
test.onFinish(() => process.exit(0));
