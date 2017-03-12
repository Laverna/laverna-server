'use strict';

/* global keys */
const test    = require('tape');
const {app}   = require('../server');
const {Model} = require('../app/models/User');
const request = require('supertest');

const {cleanup, generateKey} = require('./util');

test('/api/users: clean up', cleanup);

test('/api/users: before()', t => {
    Promise.all([
        generateKey({name: 'alice', email: ''}),
        generateKey({name: 'bob', email: ''}),
    ])
    .then(res => {
        global.keys = {bob: res[0], alice: res[1]};
    })
    .then(() => {
        const user = new Model(Object.assign({username: 'bob'}, keys.bob));
        return user.save();
    })
    .then(() => t.end());
});

test('/api/users/name/bob', t => {
    request(app)
    .get('/api/users/name/bob')
    .set('Accept', 'application/json')
    .expect(200)
    .end(t.end);
});

test('/api/users/name/bob2 - should return 404 if a user does not exist', t => {
    request(app)
    .get('/api/users/name/bob2')
    .expect(404)
    .end(t.end);
});

test('/api/users/fingerprint/${fingerprint}', t => {
    request(app)
    .get(`/api/users/fingerprint/${keys.bob.fingerprint}`)
    .set('Accept', 'application/json')
    .expect(200)
    .end(t.end);
});

test('/api/users/fingerprint/${fingerprint} - 404 if a user does not exist', t => {
    request(app)
    .get('/api/users/fingerprint/fake-fingerprint')
    .expect(404)
    .end(t.end);
});

test('/api/users - POST - username cannot be empty', t => {
    request(app)
    .post('/api/users')
    .send({username: '', publicKey: keys.alice.publicKey})
    .expect(400)
    .end(t.end);
});

test('/api/users - POST - publicKey cannot be empty', t => {
    request(app)
    .post('/api/users')
    .send({username: 'alice', publicKey: ''})
    .expect(400)
    .end(t.end);
});

test('/api/users - POST - accepts only real public keys', t => {
    request(app)
    .post('/api/users')
    .send({username: 'alice', publicKey: 'not a public key'})
    .expect(400)
    .end(t.end);
});

test('/api/users - POST - creates a new user', t => {
    request(app)
    .post('/api/users')
    .send({username: 'alice', publicKey: keys.alice.publicKey})
    .expect('Content-Type', /json/)
    .expect(200, {message: 'Registered a new user.'})
    .end(t.end);
});

test('/api/users - POST - does not accept duplicate username', t => {
    request(app)
    .post('/api/users')
    .send({username: 'alice', publicKey: keys.alice.publicKey})
    .expect(400)
    .end(t.end);
});

test('/api/users - POST - does not accept duplicate fingerprint', t => {
    request(app)
    .post('/api/users')
    .send({username: 'alice2', publicKey: keys.alice.publicKey})
    .expect(400)
    .end(t.end);
});

test('/api/users: clean up', cleanup);
test.onFinish(() => process.exit(0));
