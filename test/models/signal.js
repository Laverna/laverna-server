'use strict';

/* global keys */
const test    = require('tape');
const sinon   = require('sinon');
const jwt     = require('jsonwebtoken');
const openpgp = require('openpgp');
const Signal  = require('../../app/models/Signal');

require('../../server');

const {Model}   = require('../../app/models/User');
const {cleanup} = require('../util');

// Test data
const invite = {
    signature   : 'signature',
    username    : 'bob2',
    fingerprint : 'fingerprint',
    publicKey   : 'publicKey',
};
const user   = new Model({
    username       : 'alice',
    fingerprint    : 'alices fingerprint',
    publicKey      : 'alices key',
    pendingInvites : [invite],
});

const emit   = sinon.stub();
const io     = {to: sinon.stub().returns({emit})};
const socket = {
    handshake : {query: {deviceId: 'my-device-id'}},
    on        : sinon.stub(),
    join      : sinon.stub(),
};

test('models/Signal: clean up', cleanup);

// Create a new user
test('models/Signal: before()', t => {
    const user2 = new Model({
        username    : 'bob',
        fingerprint : 'alices fingerprint',
        publicKey   : 'bobs key',
    });

    user2.save()
    .then(() => t.end());
});

test('models/Signal: constructor()', t => {
    const opt    = {socket, io, user};
    const stub   = sinon.stub(Signal.prototype, 'sendPendingInvites');
    const signal = new Signal(opt);

    t.equal(signal.options, opt, 'creates "options" property');
    t.equal(signal.deviceId, 'my-device-id', 'creates "deviceId" property');
    t.equal(signal.socket, socket, 'creates "socket" property');
    t.equal(signal.io, io, 'creates "io" property');
    t.equal(signal.user, user, 'creates "user" property');
    t.equal(signal.mySocketRoom, 'alice@my-device-id',
        'creates "mySocketRoom" property');

    t.equal(socket.on.calledWith('error'), true, 'catches socket errors');
    t.equal(socket.on.calledWith('disconnect'), true, 'listens to "disconnect" event');

    t.equal(socket.join.calledWith('alice'), true,
        'joins the room named after the users name');
    t.equal(socket.join.calledWith(signal.mySocketRoom), true,
        'joins the room named after the users name and deviceId');

    t.equal(socket.on.calledWith('sendInvite'), true, 'listens to "sendInvite"');
    t.equal(socket.on.calledWith('removeInvite'), true, 'listens to "removeInvite"');
    t.equal(socket.on.calledWith('requestOffers'), true, 'listens to "requestOffers"');
    t.equal(socket.on.calledWith('sendOffer'), true, 'listens to "sendOffer"');
    t.equal(socket.on.calledWith('sendSignal'), true, 'listens to "sendSignal"');

    t.equal(stub.called, true, 'sends all pending invites');

    stub.restore();
    t.end();
});

test('models/Signal: onError()', t => {
    const signal = new Signal({socket, io, user});
    signal.onError();
    t.end();
});

test('models/Signal: onDisconnect()', t => {
    const signal = new Signal({socket, io, user});
    signal.onDisconnect();
    t.end();
});

test('models/Signal: sendPendingInvites()', t => {
    const signal = new Signal({socket, io, user});
    signal.sendPendingInvites();

    t.equal(io.to.calledWith(signal.mySocketRoom), true,
        'sends an invite to the users room');
    t.equal(emit.calledWithMatch('invite', invite), true,
        'sends pending invites');

    t.end();
});

test('models/Signal: sendInvite()', t => {
    const signal = new Signal({socket, io, user});

    signal.sendInvite({username: 'bob', signature: 'signature'})
    .then(() => {
        t.equal(io.to.calledWith('bob'), true, 'sends the invite to the users room');

        t.equal(emit.calledWithMatch('invite', {
            signature   : 'signature',
            username    : 'alice',
            publicKey   : 'alices key',
            fingerprint : 'alices fingerprint',
        }), true, 'sends the invite to bob');

        return signal.sendInvite({username: 'bob', signature: 'signature'});
    })
    .then(()    => Model.findByName({username: 'bob'}))
    .then(model => {
        t.equal(model.pendingInvites.length, 1, 'saves the invite only 1 time');
        t.end();
    });
});

test('models/Signal: sendInvite() - a user cannot send an invite to themselves', t => {
    const signal = new Signal({socket, io, user});
    const stub   = sinon.stub(Model, 'findByName');

    signal.sendInvite({username: 'alice', signature: 'signature'})
    .then(() => {
        t.equal(stub.notCalled, true);
        stub.restore();
        t.end();
    });
});

test('models/Signal: removeInvite()', t => {
    const signal = new Signal({socket, io, user});

    Model.findByName({username: 'bob'})
    .then(user => {
        Object.defineProperty(signal, 'user', {get: () => user});
        return signal.removeInvite({username: 'alice'});
    })
    .then(() => {
        t.equal(signal.user.pendingInvites.length, 0, 'removes the invite');
        return signal.removeInvite({username: 'alice'});
    })
    .then(() => {
        t.equal(signal.user.pendingInvites.length, 0, 'removes the invite');
        t.end();
    });
});

test('models/Signal: requestOffers()', t => {
    const signal = new Signal({socket, io, user});
    const users  = ['alice', 'bob4'];
    signal.requestOffers({users});

    t.equal(io.to.calledWith('bob4'), true, 'requests an offer from bob4');

    users.forEach(username => {
        t.equal(io.to.calledWith(username), true, `requests an offer from ${username}`);
    });

    t.equal(emit.calledWith('requestOffer', {
        username: 'alice',
        deviceId: 'my-device-id',
    }), true, 'emits requestOffer');

    t.end();
});

test('models/Signal: sendOffer()', t => {
    const signal = new Signal({socket, io, user});
    signal.sendOffer({username: 'sendOfferUser', deviceId: 'my-device'});

    t.equal(io.to.calledWith('sendOfferUser@my-device'), true,
        'sends an offer to the channel named after the users name and device');

    t.equal(emit.calledWith('offer', {
        username: 'alice',
        deviceId: 'my-device-id',
    }), true, 'emits "offer"');

    t.end();
});

test('models/Signal: sendSignal()', t => {
    const signal = new Signal({socket, io, user});
    const data   = {
        to        : {username: 'sendSignalUser', deviceId: 'my-device'},
        signal    : 'signal-info',
        signature : 'my signature',
    };
    signal.sendSignal(data);

    t.equal(io.to.calledWith('sendSignalUser@my-device'), true,
        'sends an offer to the channel named after the users name and device');

    t.equal(emit.calledWith('signal', {
        signal    : data.signal,
        signature : data.signature,
        from      : {username: 'alice', deviceId: 'my-device-id'},
    }), true, 'emits "signal"');

    t.end();
});

test('models/Signal: clean up', cleanup);
test.onFinish(() => process.exit(0));
