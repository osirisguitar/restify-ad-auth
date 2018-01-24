'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');

require('sinon-as-promised');
chai.use(require('sinon-chai'));

describe('#restify-ad-auth', () => {
  let ldapAuthUser;
  let restifyAdAuth

  beforeEach(() => {
    ldapAuthUser = {
      authenticate: sinon.stub()
    };

    restifyAdAuth = proxyquire(process.cwd() + '/index', {
      './lib/ldapAuthUser': ldapAuthUser
    });
  });

  describe('#createAuthenticationMiddleware', () => {
    it('returns a function that I can use as a middleware', () => {
      const middleware = restifyAdAuth.createAuthenticationMiddleware();

      expect(middleware).to.be.a('function');
    });

    describe('middleware function', () => {
      let middleware
      let req
      let res
      let next
      beforeEach(() => {
        middleware = restifyAdAuth.createAuthenticationMiddleware();
      });

      it(`returns an error if the request 
      does not contain a authorization header`, () => {
        next = sinon.spy();
        req = {
          headers: {}
        };
        res = {
          setHeader: sinon.spy()
        }
        middleware(req, res, next);

        expect(res.setHeader)
          .calledOnce
          .calledWith('WWW-Authenticate', 'Basic realm="Basic realm"');

        expect(next).calledOnce
        const error = next.firstCall.args[0]
        expect(error.name).to.eql('UnauthorizedError')
      });

      it(`returns an error if the authorization header 
      does not use Basic`, () => {
        next = sinon.spy();
        req = {
          headers: {
            authorization: 'foo bar herp derp'
          }
        };
        res = {
          setHeader: sinon.spy()
        }
        middleware(req, res, next);

        expect(res.setHeader)
          .calledOnce
          .calledWith('WWW-Authenticate', 'Basic realm="Basic realm"');

        expect(next).calledOnce
        const error = next.firstCall.args[0]
        expect(error.name).to.eql('UnauthorizedError')
      });

      it(`returns an error if the request 
      does not contain a proper Basic Authentication header`, () => {
        next = sinon.spy();
        req = {
          headers: {
            authorization: 'Basic 123456'
          }
        };
        res = {
          setHeader: sinon.spy()
        }
        middleware(req, res, next);

        expect(res.setHeader)
          .calledOnce
          .calledWith('WWW-Authenticate', 'Basic realm="Basic realm"');

        expect(next).calledOnce
        const error = next.firstCall.args[0]
        expect(error.name).to.eql('UnauthorizedError')
      });

      it('calls the ldap authenticate method if headers are correct', () => {
        next = sinon.spy();
        req = {
          headers: {
            authorization: 'Basic Zm9vYmFyOmhlcnBkZXJw'
          }
        };
        res = {
          setHeader: sinon.spy()
        }
        ldapAuthUser.authenticate.resolves()

        middleware(req, res, next);

        expect(ldapAuthUser.authenticate)
          .calledOnce
          .calledWith('foobar', 'herpderp')
      });

      it(`returns the promise chain so that I can integrate it 
      seamlessly with other midddleware`, () => {
        next = sinon.spy();
        req = {
          headers: {
            authorization: 'Basic Zm9vYmFyOmhlcnBkZXJw'
          }
        };
        res = {
          setHeader: sinon.spy()
        }
        ldapAuthUser.authenticate.resolves()

        expect(middleware(req, res, next)).to.be.a('Promise');
      });
    });
  });
});