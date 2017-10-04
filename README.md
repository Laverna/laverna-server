# Signaling Server for Laverna's P2P Differential Synchronization

[Wiki](https://github.com/Laverna/laverna/wiki) |
[IRC](https://webchat.freenode.net/?channels=laverna) |
[Gitter Chat](https://gitter.im/Laverna/laverna)

[![Build Status](https://travis-ci.org/Laverna/laverna-server.svg?branch=dev)](https://travis-ci.org/Laverna/laverna-server)
[![Coverage Status](https://coveralls.io/repos/github/Laverna/laverna-server/badge.svg?branch=dev)](https://coveralls.io/github/Laverna/laverna-server)
[![Code Climate](https://codeclimate.com/github/Laverna/laverna-server/badges/gpa.svg)](https://codeclimate.com/github/Laverna/laverna-server)


## Dependencies

1. [Git](https://git-scm.com/book/en/v2)
2. [Node.js](http://nodejs.org/)
3. [MongoDB](https://docs.mongodb.com/manual/installation/)


## Installation
---------------

1. Clone the repository

```bash
$ git clone git@github.com:Laverna/server.git
# navigate to the project directory
cd server
```

2. Install dependencies

```bash
$ npm install
```

3. Configure the signal server
Copy .env.example to .env and change configs in the new file.

4. Start the server

```bash
$ npm start
```


## Security
-----------

### Authentication
To authenticate a client on the server it uses token based authentication by using [JSON Web Tokens](https://jwt.io/) and [OpenPGP](https://github.com/openpgpjs/openpgpjs) signatures.

The authentication method is based on **[public key authentication method](https://tools.ietf.org/html/rfc4252#section-7)** where the possession of the private key serves as authentication.

How does it work?

1. A client requests a session token by sending a GET request to `/api/token/username/:username`
2. The server generates and sends a **JWT** token (HS256 algorithm) for the client which will expire after 8 minutes
3. The client signs the session token with their private OpenPGP key and sends a POST request to `/api/auth`
4. The server:
    1. Checks the authenticity of the signature
    2. Checks the signed **JWT** session token
    3. If there is no error, it generates an authentication token using JWT. The token will expire after 24 hours
5. The authentication token is used to authenticate the client on the signaling socket server.

### What Personal Information is Stored on the Server?
The server stores a minimum amount of information which includes your username and public OpenPGP key and fingerprint. Keep in mind if your OpenPGP key includes your email, it can be easily extracted.

### Personal Information which is Publicly Available
Some of your personal information will be available to the public. It is necessary for our REST API.

The following data should be considered public:

1. Your username
2. Your public OpenPGP key
3. Your OpenPGP key fingerprint

## Security Audit
-----------------
The authentication method used in this project was implemented by us and it hasn't been vetted nor audited by security experts. Use it at your own risk.


## License
----------

Published under [MPL-2.0 License](https://www.mozilla.org/en-US/MPL/2.0/).
