(function(){
'use strict';

angular
    .module('view', ['ui.router', 'ngStorage', 'ngFeedHenry', 'ngMaterial','config'])
    .service('viewService', ['$http', '$q', 'authService', 'ENV',
    function($http, $q, authService, ENV) {

    var service = {};

    // Will require authentication
    service.callProtected = function () {

        if(ENV.name === 'local') {
          return $http.get('/api/protected',
          {headers:{'Accept': 'application/json', 'Authorization': 'bearer ' + authService.token}});
        } else {
          // Doesn't work! Use $fh.cloud to pass headers required by keycloak
          //return FHCloud.get('/api/protected', {headers:{'Accept': 'application/json', 'Authorization': 'bearer ' + authService.token}});

          var deferred = $q.defer();

          deferred.notify('Calling protected resource...');

          $fh.cloud({
            "path": "/api/protected",
            "method": "GET",
            "contentType": "application/json",
            "headers": [{'Accept': 'application/json'}, {"Authorization": 'bearer ' + authService.token}],
            "timeout": 25000 // timeout value specified in milliseconds. Default: 60000 (60s)
          }, function(res) {
            deferred.resolve(res);
          }, function(msg,err) {
            console.log("viewService: Error " + err + "when calling protected resource: " + msg);
            deferred.reject({status: err, statusText: msg});
          });

          return deferred.promise;
        } // end else

    };

    return service;
}]);
})();
