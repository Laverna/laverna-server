'use strict';

/* global authKeys, authSignature */
const test    = require('tape');
const request = require('supertest');
const {app}   = require('../server');
const {Model} = require('../app/models/User');

const {cleanup, generateKey, createAuthSignature} = require('./util');

test('/api/auth: clean up', cleanup);

test('/api/auth: before', t => {
    return Promise.all([
        generateKey({name: 'alice', email: ''}),
        generateKey({name: 'bob', email: ''}),
    ])
    .then(res => {
        const user      = new Model(Object.assign({username: 'alice'}, res[0]));
        global.authKeys = {alice: res[0], bob: res[1]};
        return user.save();
    })
    .then(() => t.end());
});

test('/api/token/alice', t => {
    request(app)
    .get('/api/token/alice')
    .set('Accept', 'application/json')
    .expect(200)
    .end(t.end);
});

test('/api/token/alice2 - 404 if a user does not exist', t => {
    request(app)
    .get('/api/token/alice2', 'User not found')
    .expect(404)
    .end(t.end);
});

test('/api/auth - before', t => {
    createAuthSignature({username: 'alice', key: authKeys.alice, t});
});

test('/api/auth - authenticates a user', t => {
    request(app)
    .post('/api/auth')
    .send({
        signature   : authSignature,
        fingerprint : authKeys.alice.fingerprint,
        username    : 'alice',
    })
    .expect('Content-Type', /json/)
    .expect(200)
    .end((err, res) => {
        t.equal(res.body.success, true, 'successfully authenticated');
        t.equal(typeof res.body.token, 'string', 'returns auth token');
        t.notEqual(res.body.token.length, 0, 'the token is not empty');
        t.end();
    });
});

test('/api/auth - user does not exist', t => {
    request(app)
    .post('/api/auth')
    .send({username: 'bob2', fingerprint: '', signature: ''})
    .expect('Content-Type', /json/)
    .expect(200)
    .end((err, res) => {
        t.equal(res.body.success, false,
            'does not authenticate if a user does not exist');
        t.equal(res.body.message, 'User not found');
        t.end();
    });
});

test('/api/auth - wrong fingerprint', t => {
    request(app)
    .post('/api/auth')
    .send({username: 'alice', fingerprint: 'wrong', signature: ''})
    .expect('Content-Type', /json/)
    .expect(200)
    .end((err, res) => {
        t.equal(res.body.success, false, 'does not authenticate');
        t.equal(res.body.message, 'Wrong fingerprint');
        t.end();
    });
});

test('/api/auth - invalid signature', t => {
    request(app)
    .post('/api/auth')
    .send({
        signature   : 'wrong signature',
        fingerprint : authKeys.alice.fingerprint,
        username    : 'alice',
    })
    .expect('Content-Type', /json/)
    .expect(200)
    .end((err, res) => {
        t.equal(res.body.success, false, 'does not authenticate');
        t.equal(res.body.message, 'Invalid signature');
        t.end();
    });
});

function testSignature(t) {
    request(app)
    .post('/api/auth')
    .send({
        signature   : authSignature,
        fingerprint : authKeys.alice.fingerprint,
        username    : 'alice',
    })
    .expect('Content-Type', /json/)
    .expect(200)
    .end((err, res) => {
        t.equal(res.body.success, false, 'does not authenticate');
        t.equal(res.body.message, 'Invalid signature');
        t.end();
    });
}

test('/api/auth - before - create signature with another users key', t => {
    createAuthSignature({username: 'alice', key: authKeys.bob, t});
});

test('/api/auth - signature was not created with another users key', testSignature);

test('/api/auth - before - sign an incorrect data', t => {
    createAuthSignature({username: 'bob', key: authKeys.alice, t});
});

test('/api/auth - signature contains wrong data', testSignature);

test('/api/auth - before - sign a wrong session token', t => {
    createAuthSignature({
        t,
        token    : 'wrong token',
        username : 'alice',
        key      : authKeys.alice,
    });
});

test('/api/auth - verifies the session token used in the signature', testSignature);

test('/api/auth: clean up', cleanup);
test.onFinish(() => process.exit(0));
