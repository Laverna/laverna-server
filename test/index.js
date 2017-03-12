'use strict';

require('dotenv').config();
const glob = require('glob');
const path = require('path');
const dir  = path.join(__dirname, './');

glob.sync(`${dir}/**/*.js`)
.filter(file => {
    return file.indexOf('.js') !== -1 && file.indexOf('index.js') === -1;
})
.forEach(file => require(file));
