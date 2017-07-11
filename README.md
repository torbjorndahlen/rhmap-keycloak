# rhmap-keycloak
## Preparation
```
1. Install RHSSO  (https://keycloak.gitbooks.io/documentation/content/server_installation/topics/installation.html)
2. Login as admin to RHSSO
3. Create realm (e.g. rhmap-keycloak)
4. Create client (e.g. rhmap-keycloak)
5. Go to Installation
6. Select Keycloak OIDC JSON for Format
7. Download keycloak.json and store next to application.js (your express server)
8. Set up a valid redirect URI (e.g. https://localhost:8000/*)
9. Create a user in RHSSO
```

## Running the demo
```
1. Install grunt `npm install grunt --save-dev`
2. Install grunt packages:
`npm install grunt-contrib-jshint --save-dev`
`npm install grunt-contrib-watch --save-dev`
`npm install grunt-env --save-dev`
`npm install grunt-nodemon --save-dev`
3. Run the server with `grunt`
4. Open a browser and navigate to `localhost:8000/api/protected`
5. Authenticate to RHSSO with the user and password you registered in RHSSO
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
