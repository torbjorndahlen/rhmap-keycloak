(function() {
'use strict';

  angular
  .module('auth')
  .controller('authController', ['$rootScope', '$scope', '$state', '$sessionStorage', 'authService',
  function ($rootScope, $scope, $state, $sessionStorage, authService){

    console.log("Module auth loaded");

    authService.loadUserProfile().success(function(profile) {
        alert(JSON.stringify(profile));
    }).error(function() {
        alert('Failed to load user profile');
    });

  }]);
})();
