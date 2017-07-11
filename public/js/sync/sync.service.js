(function(){
'use strict';

angular
    .module('sync', ['ui.router', 'ngStorage', 'ngFeedHenry', 'ngMaterial'])
    .service('syncService', ['FHCloud',
    function(FHCloud) {

    var service = {};

    service.m_data = [];


    service.putData = function(data) {
      service.m_data = data;
    };

    service.getData = function() {
      return service.m_data;
    };

    return service;
}]);
})();
