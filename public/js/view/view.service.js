(function(){
'use strict';

angular
    .module('view', ['ui.router', 'ngStorage', 'ngFeedHenry', 'ngMaterial','config'])
    .service('viewService', ['$http', 'FHCloud', 'authService', 'ENV',
    function($http, FHCloud, authService, ENV) {

    var service = {};

    // Will require authentication
    service.callProtected = function () {

        if(ENV.name === 'local') {
          return $http.get('/api/protected',
          {headers:{'Accept': 'application/json', 'Authorization': 'bearer ' + authService.token}});
        } else {
          return FHCloud.get('/api/protected', {headers:{'Accept': 'application/json', 'Authorization': 'bearer ' + authService.token}});
        }

    };


    return service;
}]);
})();
