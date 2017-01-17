'use strict';

var ldap = require('ldapjs');
let ldapClient = null;

function getUserAttribute (user, attributeName) {
  let attribute = user.attributes.filter(attribute => {
    return attribute.type === attributeName;
  });

  if (attribute[0]) {
    let stringValues = attribute[0]['_vals'].map(value => {
      return value.toString();
    });

    if (stringValues.length === 1) {
      return stringValues[0];
    } else {
      return stringValues;
    }
  }
}

module.exports = {
  authorize: function (userSAMAccountName, userPassword, options) {
    return new Promise((resolve, reject) => {
      // If groups are specified here, the user logging in must be a member of at least
      // one of those groups. If groups are not specified, a
      let authenticationGroupDns = options.authenticationGroupDns;
      let serviceAccountDn = options.serviceAccountDn;
      let serviceAccountPassword = options.serviceAccountPassword;
      let ldapServerUrl = options.ldapServerUrl;
      let ldapBaseDn = options.ldapBaseDn;

      ldapClient = ldap.createClient({ url: ldapServerUrl });
      ldapClient.bind(serviceAccountDn, serviceAccountPassword, err => {
        if (err) {
          console.error('Could not bind service account', serviceAccountDn, userSAMAccountName);
          return reject(err);
        }

        ldapClient.search(ldapBaseDn, { filter: `(sAMAccountName=${userSAMAccountName})`, scope: 'sub' }, (err, res) => {
          let users = [];

          if (err) {
            console.error('Could not find user', userSAMAccountName);
            return reject(err);
          }

          res.on('searchEntry', user => {
            users.push(user);
          });

          res.on('end', () => {
            if (users[0]) {
              // User found, map interesting properties.
              let userObject = {
                userId: getUserAttribute(users[0], 'sAMAccountName'),
                userDn: getUserAttribute(users[0], 'distinguishedName'),
                firstName: getUserAttribute(users[0], 'givenName'),
                lastName: getUserAttribute(users[0], 'sn'),
                email: getUserAttribute(users[0], 'mail'),
                groups: getUserAttribute(users[0], 'memberOf')
              };

              // If auth groups are specified, verify user is a member of at least one
              if (authenticationGroupDns) {
                if (!Array.isArray(authenticationGroupDns)) {
                  return reject(new Error('authenticationGroupDns must be an array of strings (distinguishedNames) or nothing'));
                }

                let userIsMember = authenticationGroupDns.some(groupDN => {
                  return userObject.groups.indexOf(groupDN) > 0;
                });

                if (!userIsMember) {
                  return reject(new Error('User found but is not a member of any of the required groups.'));
                }
              }

              // User is found and a member of required groups, now check password.
              ldapClient.bind(userObject.userDn, userPassword, err => {
                if (err) {
                  return reject(new Error('User not found or wrong password.'));
                }

                return resolve(userObject);
              });
            } else {
              return reject(new Error('User not found or wrong password'));
            }
          });
        });
      });
    });
  }
};
