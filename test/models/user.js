'use strict';

/* global keys */
const test    = require('tape');
const sinon   = require('sinon');
const jwt     = require('jsonwebtoken');
const openpgp = require('openpgp');
require('sinon-mongoose');

const {schema, Model} = require('../../app/models/User');
const {generateKey}   = require('../util');

test('User: before()', t => {
    generateKey({name: 'bob', email: ''})
    .then(res => {
        global.keys = res;
        t.end();
    });
});

test('models/User', t => {
    t.equal(typeof schema, 'object', 'exports user schema');
    t.equal(typeof Model, 'function', 'exports the model');
    t.end();
});

test('User: schema', t => {
    t.equal(typeof schema.paths.username, 'object', 'username is in schema');
    t.equal(typeof schema.paths.fingerprint, 'object', 'fingerprint is in schema');
    t.equal(typeof schema.paths.publicKey, 'object', 'publicKey is in schema');
    t.end();
});

/*
 * Test statics.
 */
test('User: findByName()', t => {
    const Mock = sinon.mock(Model);
    const user = {username: 'bob', fingerprint: '1'};

    Mock
    .expects('findOne').withArgs({username: 'bob'})
    .chain('exec')
    .resolves(user);

    Model.findByName({username: 'bob'})
    .then(res => {
        t.equal(res, user, 'returns the result');

        Mock.restore();
        t.end();
    });
});

test('User: findByFingerprint()', t => {
    const Mock = sinon.mock(Model);
    const user = {username: 'bob', fingerprint: '1'};

    Mock
    .expects('findOne').withArgs({fingerprint: '1'})
    .chain('exec')
    .resolves(user);

    Model.findByFingerprint({fingerprint: '1'})
    .then(res => {
        t.equal(res, user, 'returns the result');

        Mock.restore();
        t.end();
    });
});

test('User: getSessionToken()', t => {
    const Mock = sinon.mock(Model);
    const user = {username: 'bob', fingerprint: '1'};

    Mock
    .expects('findByName').withArgs({username: 'bob'})
    .resolves(user);

    Model.getSessionToken({username: 'bob'})
    .then(token => {
        t.equal(typeof token, 'string', 'returns a string');
        t.notEqual(token.length, 0, 'the token is not empty');

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            t.equal(err, null, 'the token is verifiable');
            t.equal(decoded.sessionTokenFor, 'bob',
                'creates the session token for the user');

            Mock.restore();
            t.end();
        });
    });
});

test('User: getSessionToken() - returns false', t => {
    const Mock = sinon.mock(Model);

    Mock
    .expects('findByName').withArgs({username: 'bob'})
    .resolves(null);

    Model.getSessionToken({username: 'bob'})
    .then(res => {
        t.equal(res, false);

        Mock.restore();
        t.end();
    });
});

test('User: authToken()', t => {
    const Mock = sinon.mock(Model);
    const user = {username: 'alice', verifyAuthToken: sinon.stub()};

    Mock
    .expects('findByName').withArgs({username: 'alice'})
    .resolves(user);

    Model.authToken({username: 'alice', token: '1'})
    .then(() => {
        t.equal(user.verifyAuthToken.calledWith('1'), true,
            'calls "verifyAuthToken" method');

        Mock.restore();
        t.end();
    });
});

test('User: authToken() - returns false', t => {
    const Mock = sinon.mock(Model);

    Mock
    .expects('findByName').withArgs({username: 'alice'})
    .resolves(null);

    Model.authToken({username: 'alice', token: '1'})
    .then(res => {
        t.equal(res, false);
        Mock.restore();
        t.end();
    });
});

/*
 * Test methods.
 */
test('User: getPublicData()', t => {
    const pubData = {username: 'alice', fingerprint: '1', publicKey: '1'};
    const model   = new Model(Object.assign({
        pendingInvites: [],
    }, pubData));

    const res = model.getPublicData();
    t.deepEqual(res, pubData, 'returns an object');
    t.equal(res.pendingInvites, undefined, 'does not contain private information');

    t.end();
});

test('User: register()', t => {
    const model = new Model({username: 'bob2', publicKey: keys.publicKey});
    sinon.stub(model, 'save');

    model.register();
    t.equal(model.save.called, true, 'creates a new entry in the database');

    model.publicKey = 'not a key';

    model.register()
    .catch(() => {
        t.pass('throws an error');
        model.save.restore();
        t.end();
    });
});

test('User: checkSignature()', t => {
    const model = new Model({username: 'alice', publicKey: keys.publicKey});

    openpgp.sign({data: 'Test data', privateKeys: keys.privateKey})
    .then(sign => model.checkSignature({signature: sign.data}))
    .then(res       => {
        t.equal(res, 'Test data', 'returns the signature data');
        t.end();
    });
});

test('User: checkSignature() - resolves with false if it is not a signature', t => {
    const model = new Model({username: 'alice', publicKey: keys.publicKey});

    model.checkSignature({signature: 'wrong signature'})
    .then(res => {
        t.equal(res, false);
        t.end();
    });
});
