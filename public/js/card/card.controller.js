(function() {
'use strict';

  angular
  .module('card')
  .controller('cardController', ['$mdToast', '$mdBottomSheet', '$mdSidenav', '$timeout', '$mdDialog','$rootScope', '$scope', '$state', '$sessionStorage', 'cardService', 'syncService',
  function ($mdToast, $mdBottomSheet, $mdSidenav, $timeout, $mdDialog, $rootScope, $scope, $state, $sessionStorage, cardService, syncService){

    console.log("Module card loaded");

    $scope.items = [
      { name: 'item1', icon: 'img/ic_chat_24px.svg', what: 'what1', notes: 'notes1', action1: 'action1', action2: 'action2' },
      { name: 'item2', icon: 'img/ic_chat_24px.svg', what: 'what2', notes: 'notes2', action1: 'action1', action2: 'action2' },
      { name: 'item3', icon: 'img/ic_chat_24px.svg', what: 'what3', notes: 'notes3', action1: 'action1', action2: 'action2' },
      { name: 'item4', icon: 'img/ic_chat_24px.svg', what: 'what4', notes: 'notes4', action1: 'action1', action2: 'action2' },
      { name: 'item5', icon: 'img/ic_chat_24px.svg', what: 'what5', notes: 'notes5', action1: 'action1', action2: 'action2' },
      { name: 'item6', icon: 'img/ic_chat_24px.svg', what: 'what6', notes: 'notes6', action1: 'action1', action2: 'action2' },
      { name: 'item7', icon: 'img/ic_chat_24px.svg', what: 'what7', notes: 'notes7', action1: 'action1', action2: 'action2' },
      { name: 'item8', icon: 'img/ic_chat_24px.svg', what: 'what8', notes: 'notes8', action1: 'action1', action2: 'action2' },
      { name: 'item9', icon: 'img/ic_chat_24px.svg', what: 'what9', notes: 'notes9', action1: 'action1', action2: 'action2' },
      { name: 'item10', icon: 'img/ic_chat_24px.svg', what: 'what10', notes: 'notes10', action1: 'action1', action2: 'action2' }
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
