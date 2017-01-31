'use strict';

const chai = require('chai');
const expect = chai.expect;
const sinon = require('sinon');
const proxyquire = require('proxyquire');

require('sinon-as-promised');
chai.use(require('sinon-chai'));

describe('#ldapAuthUser', () => {
  let ldap;
  let ldapClient;
  let ldapAuthUser;

  beforeEach(() => {
    ldapClient = {
      bind: sinon.stub(),
      search: sinon.stub()
    };

    ldap = {
      createClient: sinon.stub().returns(ldapClient)
    };

    ldapAuthUser = proxyquire(process.cwd() + '/lib/ldapAuthUser', {
      ldapjs: ldap
    });
  });

  describe('#authenticate', () => {
    let authenticateOptions;

    beforeEach(() => {
      authenticateOptions = {
        ldapServerUrl: 'ldap://mydomain.local',
        ldapBaseDn: 'dc=mydomain,dc=local',
        serviceAccountDn: 'cn=usersearcher,ou=service-accounts,dc=mydomain,dc=local',
        serviceAccountPassword: 'aSekritPaws0rd123',
        authenticationGroupDns: ['CN=accounting,OU=staff,DC=mydomain,DC=local']
      }
    });

    it('creates an ldapClient with the provided server url', () => {
      ldapAuthUser.authenticate('foo', 'bar', authenticateOptions);
      expect(ldap.createClient).calledOnce;
    });

    it('binds to the service account', () => {
      ldapAuthUser.authenticate('foo', 'bar', authenticateOptions);
      expect(ldapClient.bind).calledOnce;
      expect(ldapClient.bind.firstCall.args[0]).to.eq(authenticateOptions.serviceAccountDn);
    });
  });
});
