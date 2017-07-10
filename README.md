# rhmap-keycloak
## Preparation
```
1. Install RHSSO  [RHSSO](https://keycloak.gitbooks.io/documentation/content/server_installation/topics/installation.html)
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
