(function(){
'use strict';

angular
    .module('view', ['ui.router', 'ngStorage', 'ngFeedHenry', 'ngMaterial'])
    .service('viewService', ['$http', 'FHCloud', 'authService',
    function($http, FHCloud, authService) {

    var service = {};

    // Will require authentication
    service.callProtected = function () {

        return $http.get('/api/protected',
        {headers:{'Accept': 'application/json', 'Authorization': 'bearer ' + authService.token}});
        //return FHCloud.get('api/protected');
    };


    return service;
}]);
})();
