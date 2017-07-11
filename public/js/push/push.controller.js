(function() {
'use strict';

  angular
  .module('push')
  .controller('pushController', ['$mdToast', '$mdBottomSheet', '$mdSidenav', '$timeout', '$mdDialog','$rootScope', '$scope', '$state', '$sessionStorage', 'pushService',
  function ($mdToast, $mdBottomSheet, $mdSidenav, $timeout, $mdDialog, $rootScope, $scope, $state, $sessionStorage, pushService){

    console.log("Module push loaded");


    var alert;

    // Internal method
    var showAlert = function(msg) {
      alert = $mdDialog.alert({
        title: 'Push Notification',
        textContent: msg,
        ok: 'Close'
      });

      $mdDialog
        .show( alert )
        .finally(function() {
          alert = undefined;
        });
    };

      // register with the server to start receiving push notifications
      $fh.push(function(e) {

      if (e.coldstart) {
        // notification started the app
      }

      // show text content of the message
      showAlert(e.alert);

      // only on iOS
      if (e.badge) {
        push.setApplicationIconBadgeNumber(successHandler, e.badge);
    }
  }, function() {
    console.log("registered for push");
  }, function(err) {
    // handle errors
    console.log("register for push failed: " + err);
  });




  }]);
})();
