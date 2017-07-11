(function() {
'use strict';

  angular
  .module('list')
  .controller('listController', ['$mdToast', '$mdBottomSheet', '$mdSidenav', '$timeout', '$mdDialog','$rootScope', '$scope', '$state', '$sessionStorage', 'listService','syncService',
  function ($mdToast, $mdBottomSheet, $mdSidenav, $timeout, $mdDialog, $rootScope, $scope, $state, $sessionStorage, listService, syncService){

    console.log("Module list loaded");

    $scope.items = [
      { name: 'item1', icon: 'img/ic_chat_24px.svg', what: 'what1', notes: 'notes1' },
      { name: 'item2', icon: 'img/ic_chat_24px.svg', what: 'what2', notes: 'notes2' },
      { name: 'item3', icon: 'img/ic_chat_24px.svg', what: 'what3', notes: 'notes3' },
      { name: 'item4', icon: 'img/ic_chat_24px.svg', what: 'what4', notes: 'notes4' },
      { name: 'item5', icon: 'img/ic_chat_24px.svg', what: 'what5', notes: 'notes5' },
      { name: 'item6', icon: 'img/ic_chat_24px.svg', what: 'what6', notes: 'notes6' },
      { name: 'item7', icon: 'img/ic_chat_24px.svg', what: 'what7', notes: 'notes7' },
      { name: 'item8', icon: 'img/ic_chat_24px.svg', what: 'what8', notes: 'notes8' },
      { name: 'item9', icon: 'img/ic_chat_24px.svg', what: 'what9', notes: 'notes9' },
      { name: 'item10', icon: 'img/ic_chat_24px.svg', what: 'what10', notes: 'notes10' }
    ];



    // Subscribe to new data returned from the sync service
    $scope.$on('sync', function (event, data) {
      $scope.items = syncService.getData();
      $scope.$apply();
    });



  $scope.doPrimaryAction = function(event, caller) {
    console.log(JSON.stringify(caller));

          $mdDialog.show(
            $mdDialog.alert()
            .title('Not implemented yet!')
            .textContent('Try something else')
            .ariaLabel('Work in progress')
            .ok('Awesome!')
            .targetEvent(event)
          );
        };



  }]);
})();
