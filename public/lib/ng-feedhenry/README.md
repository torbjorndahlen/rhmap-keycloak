ngFeedHenry
===================================

This project is dedicated to creating an Angular friendly way to use the
FeedHenry SDK.

## Why should you use this?

### The Basic but Important Answer
JavaScript applications handle events using callbacks, these callbacks can be
triggered at any time in the application life cycle. AngularJS applications
have their own lifecycle that manages the values of variables in different
Angular "scopes". If callbacks aren't executed correctly within the Angular
life cycle the values they update or create can be "lost" or take a long time 
to be reflected in your AngularJS component's $scope. 

This module overcomes the above problem when using the FeedHenry API and 
provides a nice promise based wrapper that follows AngularJS development 
standards.

### The More Exciting Answer
This module provides an AngularJS friendly wrapper around the 
FH JS SDK. It has some really neat features:

* SDK functions are wrapped to return promises.
* ExpressJS style middleware processors for outgoing $fh.cloud requests.
* ExpressJS style middleware processors for incoming $fh.cloud responses.
* Shortcuts for many SDK calls e.g FHCloud.get('/users').then(onOk, onFail)!

## Usage
Add this module as a dependency of your Angular app as with other libraries.

```javascript
angular.module('MyApp', [
  // The usual angular stuff
  'ng',
  // Our fh-js-sdk wrapper
  'ngFeedHenry'
]);
```
Most API calls are provided as an Angular service that you can inject into
your code. Add *ngFeedHenry* as a dependency of your application and then 
require *FHCloud*, *FHSec* etc. as a dependency of any Angular service, 
controller etc. as required.


## API
Currently the following API functions are wrapped:

* $fh.cloud (as FHCloud)
* $fh.hash (as FHHash)
* $fh.sec (as FHSec)


### FHCloud

#### .request(opts)
Wrapper for [$fh.cloud](http://docs.feedhenry.com/v3/api/api_act.html). Takes 
the standard options object. Returns a promise.

#### .get/put/post/head/del(path, data)
Wrapper for $fh.cloud that performs a request of the specified method by 
providing a path and data. The default content-type (application/json) and 
timeout are used (30 seconds). A promise is returned.

```javascript
FHCloud.post('/phones', {
  model: 'S3',
  make: 'Samsung',
})
  .then(function (res) {
    // Do something...
  }, function (err) {
    // Oh no...
  })
```

#### .before([route, validators, ]fn)
Instruct FHCloud to run the specified _fn_ on the params of a request that 
matches a route pattern prior to sending it to the cloud. A similar concept to 
express middleware, except for outgoing requests. Very useful if you need to 
perform some form of wrapping or inject certain params into requests but want 
to do so in a DRY friendly manner. 

Functions are exectued in the order they are added and only executed if they 
match the _route_. If _route_ is omitted the function _fn_ will be executed 
for every call to _Cloud.request/get/put/head/delete/post_.

You can add as many of these as you please. If any of the functions fail the 
request will **not** be sent and the error callback of the promise is triggered.

The ideal location to add these is in the _run_ function of your AngularJS 
application.

Params: 

* **route** - Optional. A pattern to use to match the incoming path parameter.
* **validators** - Optional. An object containing RegExp or functions to 
inspect URL params.
* **fn** - The function that will be run to modify the data attribute before 
it's passed to $fh.cloud and sent over HTTPS to the cloud.

Internally this uses 
[route-matcher](https://github.com/cowboy/javascript-route-matcher) to match 
routes. The _route_ and _validators_ params are simply passed to an instance 
of _route-matcher_ so read the docs of that module for more info on route 
matching and to understand the _route_ and _validators_ params.


```javascript
angular.module('myApp', [
  'ngFeedHenry'
])
  .config()
  .run(function (FHCloud, Auth, Sec) {
    // Every function to users/:id e.g users/123abc will include your local id
    FHCloud.before('/users/:id', function (params) {
      var defer = $q.defer();

      // Let's assume get ID is defined above
      Auth.getId(function (id) {
        params.data = params.data || {}; // Ensure data is defined

        params.data.myId = id; // Add in our ID

        // IMPORTANT: You must pass the params object back to the resolve!
        defer.resolve(params);
      }, defer.reject);

      return defer.promise;
    });

    // After the first before function has run we'll encrypt the request data
    FHCloud.before(function (params) {
      var defer = $q.defer();

      Sec.encrypt(data).
        then(function (encryptedData) {
          params.data = encryptedData;
          defer.resolve(params);
        }, defer.reject);

      return defer.promise;
    });
  });
```

#### .after([route, validators, ]fn)
Almost the same as _before_, but instead of running the supplied _fn_ over the 
input params to $fh.cloud it will run _fn_ on the response received by 
$fh.cloud if the request was successful. 

Example usage of _after_:

```javascript
// Upon receiving a response from any request run the through a parser
Cloud.after('/data', function (response) {
  var defer = $q.defer();

  parseResponseData(response.data, function (parsedData) {
    response.parsedData = parsedData;

    defer.resolve(response);
  }, defer.reject);

  return defer.promise;
});
```

#### .afterError([route, validators, ]fn)
Almost the same as _after_, but it will run run _fn_ on the response 
received by $fh.cloud if the request failed. Also, the rejection 
object passed into _fn_ will contain any data in the failed response 
in rejection.data, the response's status as rejection.status as well 
as the original request's options in rejection.options.

If _fn_ resolves successfully, the Cloud call will be resolved successfully.
If _fn_ resolves unsuccessfully, the Cloud call will be resolved unsuccessfully.

Example usage of _afterError_:

```javascript
// Upon receiving a 401 response do something and try request again
Cloud.afterError('/data', function (rejection) {
  if (response.status === 401) {
    // Do something fancy then try again
    return fixAuthProblem().then(function() {
      Cloud.request(rejection.options);
    });
  }
  return $q.reject(rejection);
});
```

### FHHash
Promise based interface to FeedHenry SDK hashing functions. All calls return a 
promise. The injected variable _FHHash_ is a function with other shortcut 
functions bound. All _params_ to these functions are the _params_ detailed 
[here](http://docs.feedhenry.com/v3/api/api_security.html#api_security-app_api-_fh_hash) 
in the FeedHenry API docs.

#### FHHash(params)
Direct wrapper for the $fh.sec function.

#### FHHash.MD5(text)
Create an MD5 hash from text.
#### FHHash.SHA1(text)
Create an SHA1 hash from text.
#### FHHash.SHA256(text)
Create an SHA256 hash from text.
#### FHHash.SHA512(text)
Create an SHA512 hash from text.

#### Example

```javascript
angular.module('myApp').service('MySecurity', function (FHHash) {
  
  this.textToMD5 = function (text) {
    // Use the MD5 shortcut
    return FHHash.MD5(text);
  };

  this.createHash = function (algorithm, text) {
    return FHHash({
      algorithm: algorithm,
      text: text
    });
  };

});
```

### FHSec
Promise based interface to FeedHenry SDK security functions. All calls return a 
promise. The injected variable _FHSec_ is a function with other shortcut 
functions bound. All _params_ to these functions are the _params_ detailed 
[here](http://docs.feedhenry.com/v3/api/api_security.html#api_security-app_api-_fh_sec) 
in the FeedHenry API docs.

#### FHSec(params)
Direct wrapper for $fh.sec.
#### FHSec.encrypt(params)
Encrypt data using the given params.
#### FHSec.decrypt(params)
Decrypt data using the given params.
#### FHSec.keygen(params)
Generate a key using the given params.

#### Example

```javascript
angular.module('myApp').service('MySecurity', function (FHSec, SECRET_KEY) {

  this.encryptText = function (text) {
    // Use the MD5 shortcut
    return FHSec.encrypt({
      // The data to be encrypted
      plaintext: text,
      // The secret key used to do the encryption. (Hex format)
      key: SECRET_KEY,
      // The algorithm used for encryption. Should be either 'RSA' or 'AES'
      algorithm: 'AES',
      // IV only required if algorithm is 'AES'
      iv: iv
    });
  };

});
```
