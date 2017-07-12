# rhmap-keycloak
## Preparation
In order for the demo to work, the following steps needs to be taken:
1. Install RHSSO 7.1.1 and create a realm
2. Create a RHSSO client for the CloudApp
3. Create a RHSSO client for the AngularJS application and create an application user
4. Download and install the nodejs and javascript keycloak adapters


```
1. Download and install RHSSO 7.1.1
(https://access.redhat.com/jbossnetwork/restricted/listSoftware.html?downloadType=distributions&product=core.service.rhsso) (https://keycloak.gitbooks.io/documentation/content/server_installation/topics/installation.html)
2. Login as admin to RHSSO
3. Create realm (e.g. rhmap-keycloak)
```

```
1. In the rhmap-keycloak realm, create a CloudApp client (e.g. rhmap-cloudapp)
2. In Settings, select Access-Type: bearer-only
3. Go to Installation
4. Select Keycloak OIDC JSON for Format
5. Download keycloak.json and store next to application.js (your express server)
6. Set up a valid redirect URI (e.g. https://localhost:8000/*)
7. Create a user in RHSSO
```

```
1. In the rhmap-keycloak realm, create an AngularJS app client (e.g. rhmap-angular)
2. In Settingsselect Access-Type: public-client
3. Go to Installation
4. Select Keycloak OIDC JSON for Format
5. Download keycloak.json and store in the app's public folder
6. In Settings, set up a valid redirect URI (e.g. https://localhost:8000/*)
7. In Settings, set up Web Origins (e.g. https://localhost:8000). This is necessary for CORS.
8. Create a user
```

```
1. Download and install Keycloak nodejs adapter 7.1.1 (https://access.redhat.com/jbossnetwork/restricted/listSoftware.html?downloadType=distributions&product=core.service.rhsso) or use `npm install keycloak-connect`
2. Download Keycloak Javascript adapter 7.1.1
3. Unzip and place under public/lib in your app directory
```

## Running the CloudApp
```
1. Install grunt `npm install grunt --save-dev`
2. Install grunt packages:
`npm install grunt-contrib-jshint --save-dev`
`npm install grunt-contrib-watch --save-dev`
`npm install grunt-env --save-dev`
`npm install grunt-nodemon --save-dev`
3. Run the server with `grunt`
```

## Adding Keycloak to the AngularJS app
The AngularJS app can use Keycloak to authenticate the user before making REST calls to the
Cloud App. Note that the app needs to be bootstrapped manually in order to prevent
constant reloading due to the redirect sent back from Keycloak after authentication.

```
<script>
angular.element(document).ready(() => {
  window._keycloak = Keycloak();

  window._keycloak
    .init({
      onLoad: 'login-required'
    })
    .success(() => {
      angular.bootstrap(document, ['rhmap-keycloak']); // manually bootstrap Angular app
    });
});
</script>
```

The `_keycloak`variable can be accessed by other modules by injecting a service:

```
angular
    .module('auth', ['ui.router'])
    .service('authService', ['$window',
    function($window) {

    return $window._keycloak;
}]);
```

When calling a protected resource in the Cloud App, the Authorization header must be added:

```
$http.get('http://localhost:8000/api/protected',
{headers:{'Accept': 'application/json', 'Authorization': 'bearer ' + authService.token}});
```

## Running the demo
Open a browser at the location of your CloudApp server, e.g. http://localhost:8000
If you haven't authenticated to Keycloak a login prompt served from Keycloak will be shown
After logging in with the user you created in the RHSSO Admin App you will be able to access the AngularJS App
The app will immediately try to access the protected resource /api/protected using the Access token
provided by the Javascript Keycloak adapter.

## Troubleshooting

### No "Access-Control-Allow-Origin"
If you're seeing No "Access-Control-Allow-Origin" in the browsers web console when the AngularJS app
tries to authenticate to Keycloak (look for requests to http://localhost:8080/auth/realms/rhmap-keycloak),
you should ensure you have added the AngularJS app as Web Origin when creating a client for AngularJS in RHSSO.

### Test for access tokens
Using curl to obtain an access token:

```
$ RESULT=`curl --data "grant_type=password&client_id=rhmap-keycloak&username=user&password=password" http://localhost:8080/auth/realms/rhmap-keycloak/protocol/openid-connect/token`

$ echo $RESULT

$ TOKEN=`echo $RESULT | sed 's/.*access_token":"//g' | sed 's/".*//g'`

$ curl http://localhost:8000/api/protected -H "Authorization: bearer $TOKEN"
```
First we authenticate with our realm in Keycloak. Note that Direct-Access-Grants must be enabled in the Realm Settings in order to authenticate with username and password parameters.
Next we parse out the access token and stores it in the TOKEN variable.
Finally we call the Cloud App's protected resource with the access token.
