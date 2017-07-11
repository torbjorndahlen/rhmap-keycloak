(function(){
'use strict';

angular
    .module('push', ['ui.router', 'ngStorage', 'ngFeedHenry', 'ngMaterial'])
    .service('pushService', ['FHCloud',
    function(FHCloud) {

    var service = {};

    return service;
}]);
})();
