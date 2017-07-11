(function() {
'use strict';

  angular
  .module('view')
  .controller('viewController', ['$mdToast', '$mdBottomSheet', '$mdSidenav', '$timeout', '$mdDialog','$rootScope', '$scope', '$state', '$sessionStorage', 'viewService',
  function ($mdToast, $mdBottomSheet, $mdSidenav, $timeout, $mdDialog, $rootScope, $scope, $state, $sessionStorage, viewService){

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
