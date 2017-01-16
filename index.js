'use strict';

var ldapAuthUser = require('./lib/ldapAuthUser');
var errors = require('restify-errors');
//var lruCache = require('./')

module.exports = function (options) {
  return function (req, res, next) {
    // Check http headers
    if (!req.headers.authorization) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Basic realm"');
      return next(new errors.UnauthorizedError());            
    }
    let header = req.headers.authorization.split(' ');
    if(header[0] != 'Basic') {
      res.setHeader('WWW-Authenticate', 'Basic realm="Basic realm"');
      return next(new errors.UnauthorizedError());
    }
    let auth = new Buffer(header[1], 'base64').toString().split(':');
    if (auth.length != 2) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Basic realm"');
      return next(new errors.UnauthorizedError());
    }

    // Use username and password sent in authenticate header...
    var username = auth[0];
    var password = auth[1];

    ldapAuthUser.authorize(username, password, options)
      .then(user => {
        req.user = user;
        return next();
      })
      .catch(err => {
        return next(err);
      });
  };
};
