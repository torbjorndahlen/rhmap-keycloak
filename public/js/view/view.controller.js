(function() {
'use strict';

  angular
  .module('view')
  .controller('viewController', ['$mdToast', '$mdBottomSheet', '$mdSidenav', '$timeout', '$mdDialog','$rootScope', '$scope', '$state', '$sessionStorage', 'viewService','authService',
  function ($mdToast, $mdBottomSheet, $mdSidenav, $timeout, $mdDialog, $rootScope, $scope, $state, $sessionStorage, viewService, authService){

    console.log("Module view loaded");

    // Decide which elements to show
    $scope.showToolbar = true;
    $scope.showSidenav = true;
    $scope.showAnalytics = false;
    // The below are mutually exclusive
    $scope.showCard = true;
    $scope.showList = false;
    $scope.showForm = false;
    // Will never be shown
    $scope.showPush = false;
    $scope.showSync = false;
    $scope.showAuth = false;

    // Call a protected CloudApp service
    
        viewService.callProtected().then(
            function successCallback(response) {

              alert('response from protected resource: ' + JSON.stringify(response));

          },
        function errorCallback(response) {
            alert('ERROR: response from protected resource: ' + response.status + " " + response.statusText);
        });


    $scope.toolbarButton = function(event) {

      console.log("toolbarButton(" + event + ")");

      $mdDialog.show(
        $mdDialog.alert()
        .title('Toolbar button')
        .textContent('Toolbar button was clicked')
        .ariaLabel('Work in progress')
        .ok('Awesome!')
        .targetEvent(event)
      );

    };





  }]);
})();
