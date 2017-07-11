(function(){
'use strict';

angular
    .module('view', ['ui.router', 'ngStorage', 'ngFeedHenry', 'ngMaterial'])
    .service('viewService', ['$http', 'FHCloud',
    function($http, FHCloud) {

    var service = {};

    service.startProcess = function (loginName) {
      var dto = {
        "username": loginName
      };

      return FHCloud.post('api/process', dto);
    };


    return service;
}]);
})();
