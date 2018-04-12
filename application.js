/**
(The MIT License)

Copyright (c) 2014 TJ Holowaychuk <tj@vision-media.ca>
Copyright (c) 2015 Douglas Christopher Wilson <doug@somethingdoug.com>

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
**/

// This application uses express as its web server
// for more info, see: http://expressjs.com

var express = require('express');
var bodyParser = require('body-parser');

// create a new express server
var app = express();

// Keycloak
var session = require('express-session');
var Keycloak = require('keycloak-connect');
var memoryStore = new session.MemoryStore();

app.use(session({
  secret: 'b06e7a82-e11e-4531-812b-01a0c3ebdf5c',
  resave: false,
  saveUninitialized: true,
  store: memoryStore
}));

var keycloak = new Keycloak({ store: memoryStore });


// RHMAP compatibility
var $fh = require('fh-mbaas-api');
var mbaasExpress = $fh.mbaasExpress();
var cors = require('cors');
var fs = require('fs');

// RHMAP compatibility
var securableEndpoints;
securableEndpoints = ['/api'];


// keycloak
app.use(keycloak.middleware());

app.use(function(req, res, next) {

  res.header('Access-Control-Allow-Origin', "*");
  res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();

});

// RHMAP compatibility
// Enable CORS for all requests
app.use(cors());

// Note: the order which we add middleware to Express here is important!
app.use('/sys', mbaasExpress.sys(securableEndpoints));
app.use('/mbaas', mbaasExpress.mbaas);

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

// Create a json body parser for POST requests
var jsonParser = bodyParser.json({limit: '50mb'});
app.use(bodyParser.urlencoded({limit: "50mb", extended: true, parameterLimit: 50000}));


// RHMAP compatibility
// Note: important that this is added just before your own Routes
app.use(mbaasExpress.fhmiddleware());

// Important that this is last!
app.use(mbaasExpress.errorHandler());

var port = process.env.FH_PORT || process.env.OPENSHIFT_NODEJS_PORT || 8000;
var host = process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0';
app.listen(port, host, function() {
  console.log("App started at: " + new Date().toLocaleString() + " on " + host + ":" + port);
});




//
// ping
//
app.get('/api/ping', function (req, res) {

		console.log('\n\n===========REQUEST===============');
		console.log('\n\nGET /api/ping');

    res.statusCode = 200;
    res.json('pong');

    console.log('\n\n=========REQUEST END===============');
});


//
// protected resource
//
app.get('/api/protected', keycloak.protect(), function (req, res) {

		console.log('\n\n===========REQUEST===============');
		console.log('\n\nGET /api/protected');
    console.log('\n\nAuthorization: ' + req.get('Authorization'));

    res.statusCode = 200;
    res.json('OK');

    console.log('\n\n=========REQUEST END===============');
});


module.exports = app;
