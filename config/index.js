/**
 * Configuration file.
 *
 * @file
 * @license MPL-2.0
 */
const env    = process.env;
const denv   = env.NODE_ENV || 'development';
const dbHost = env.DB_HOST  || 'localhost';
const dbName = denv === 'production' ? 'laverna' : `lav-${denv}`;

const {DB_USER, DB_PASS} = env;

module.exports = {
    db         : `mongodb://${dbHost}/${dbName}`,
    dbOptions  : {
        bufferCommands    : false,
        bufferMaxEntries  : 0,
        promiseLibrary    : global.Promise,
        autoReconnect     : true,
        reconnectInterval : 500,
        connectTimeoutMS  : 1000,
        autoIndex         : true,
        user              : DB_USER,
        pass              : DB_PASS,
    },
};
