# restify-ad-auth
LDAP authentication for Active Directory in Restify.

No caching, no tests - this is a pre-release, use at your own peril.


## Documentation

    npm install restify-ad-auth --save

This module contains two functions:

* createAuthenticationMiddleware - creates a middleware that will pop up a basic auth prompt in the browser and verify against an Active Directory using LDAP.
* createAuthorizationMiddleware - creates a middleware that verifies that the user belongs to at least one required group

To log in to an Active Directory (using LDAP bind) you need to know the distinguished name and the password of the user. The user normally only
knows their login name - i.e. their sAMAccountName. To be able to lookup the user's distinguishedName, this module needs a service account with
read access to the users (at least the fields sAMAccountName, distinguishedName, sn, givenName, mail, memberOf).

### createAuthenticationMiddleware

createAuthenticationMiddleware takes an options object with the following fields:

* ldapServerUrl: ldap url pointing to the Active Directory server
* ldapBaseDn: distinguishedName used as base for LDAP searches
* serviceAccountDn: distinguishedName fo the account used to lookup users' dns from their sAMAccountNames
* serviceAccountPassword: password for the service account
* authenticationGroupDns: an array of distinguishedNames of AD groups. If specified, any user logging in has to belong to at least one of these groups. If not specified, any user in the Active Directory will be able to log in.

Example:

    {
      ldapServerUrl: 'ldap://mydomain.local',
      ldapBaseDn: 'dc=mydomain,dc=local',
      serviceAccountDn: 'cn=usersearcher,ou=service-accounts,dc=mydomain,dc=local',
      serviceAccountPassword: 'aSekritPaws0rd123',
      authenticationGroupDns: ['CN=accounting,OU=staff,DC=mydomain,DC=local']
    }

The createAuthenticationMiddleware will use a basic auth header if present in the request, if not it will show a login dialog in the browser. The basic auth is verified
against the Active Directory and if authentication is successful a user object is appended to request. req.user has the following fields

* userId: sAMAccountName, the id the user input into the login dialog
* userDn: distinguishedName for the user
* firstName: givenName from AD
* lastName: sn from AD
* email: mail from AD
* groups: an array of distinguishedNames of all groups the user belongs to

Example:

    {
        userId: 'anders',
        userDn: 'CN=Anders Bornholm,DC=mydomain,DC=local',
        firstName: 'Anders',
        lastName: 'Bornholm,
        email: 'anders@bornholm.se',
        groups: ['CN=accounting,OU=staff,DC=mydomain,DC=local,CN=marketing,OU=staff,DC=mydomain,DC=local']
    }

createAuthenticationMiddleware can be placed explicitly on each route protected (before authorize, see below) or on all routes with server.use();

### createAuthorizationMiddleware

createAuthorizationMiddleware creates a middleware that uses the groups of the user object created by createAuthenticationMiddleware to verify if the user should have access
to a route or not. It needs to be placed after createAuthenticationMiddleware.

NOTE: createAuthorizationMiddleware uses only the common name (CN) of the groups. Look out if your Active Directory contains multiple groups with the same CN in different
OUs not create accidental security leaks.

createAuthorizationMiddleware takes one parameter: an array of common names of groups. A user needs to belong to at least one of these groups to be able to access a route.

## Example usage

    'use strict';

    const restify = require('restify');

    const restifyAdAuth = require('restify-ad-auth');

    const authOptions = {
        ldapServerUrl: 'ldap://mydomain.local',
        ldapBaseDn: 'ou=staff,dc=mydomain,dc=local',
        serviceAccountDn: 'CN=service-account,OU=service-accounts,DC=mydomain,DC=local',
        serviceAccountPassword: 'password',
        authenticationGroupDns: ['CN=marketing,OU=staff,DC=mydomain,DC=local','CN=accounting,OU=staff,DC=mydomain,DC=local']
    };

    const authenticationMiddleware = restifyAdAuth.createAuthenticationMiddleware(authOptions);
    const authorizationMiddleware = restifyAdAuth.createAuthorizationMiddleware(['marketing'])

    let server = restify.createServer();

    server.get('/', authenticationMiddleware, authorizationMiddleware, (req, res) => {
        res.end('Login successful! You are ' + JSON.stringify(req.user));
    });

    server.listen(8888);

## Todo

Caching results from LDAP. LDAP is queried on every request right now.
