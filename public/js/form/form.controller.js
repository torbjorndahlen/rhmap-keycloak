(function() {
'use strict';

  angular
  .module('form')
  .controller('formController', ['$q', '$mdToast', '$mdBottomSheet', '$mdSidenav', '$timeout', '$mdDialog','$rootScope', '$scope', '$state', '$sessionStorage', 'formService',
  function ($q, $mdToast, $mdBottomSheet, $mdSidenav, $timeout, $mdDialog, $rootScope, $scope, $state, $sessionStorage, formService){

    console.log("Module form loaded");

    $scope.country = null;

    $scope.countries = ['Denmark',"Finland","Norway","Sweden"];
    $scope.selectedCountry = null;
    $scope.getSelectedCustomerCountry = function() {
      if ($scope.selectedCountry !== undefined) {
        $scope.country = $scope.selectedCountry;
        return $scope.selectedCountry;
      } else {
        return "Please select a country";
      }
    };


    //
    // Autocomplete
    //


        $scope.ssnList = loadAll();
        $scope.selectedItem  = null;
        $scope.searchText    = null;
        $scope.querySearch   = querySearch;

        // ******************************
        // Internal methods
        // ******************************

        /**
         * Search for SSNs... use $timeout to simulate
         * remote dataservice call.
         */
        function querySearch (query) {
          var results = query ? $scope.ssnList.filter( createFilterFor(query) ) : $scope.ssnList;
          var deferred = $q.defer();
          $timeout(function () {
            deferred.resolve( results );
            console.log($scope.selectedItem);
            if($scope.selectedItem !== null && $scope.selectedItem.value === "660410") {
            $scope.name = "Torbjörn Dahlén";
            $scope.mobile = 1234567;
            $scope.phone = 1234567;
            $scope.email = "tdahlen@redhat.com";
            $scope.selectedCountry = "Sweden";
          } else {
            $scope.name = "";
            $scope.mobile = null;
            $scope.phone = null;
            $scope.email = "";
            $scope.country = "";
          }

          }, Math.random() * 1000, false);
          return deferred.promise;
        }

        /**
         * Build `SSN` list of key/value pairs
         */
        function loadAll() {
          var allSSNs = '650113 651231 660113 660410 671231 680101';

          return allSSNs.split(" ", 6).map( function (ssn) {
            return {
              value: ssn,
              display: ssn
            };
          });
        }

        /**
         * Create filter function for a query string
         */
        function createFilterFor(query) {

          return function filterFn(ssn) {
            return (ssn.value.indexOf(query) === 0);
          };

        }



  $scope.doPrimaryAction = function(event, caller) {
    console.log(JSON.stringify(caller));

          $mdDialog.show(
            $mdDialog.alert()
            .title('Not implemented yet!')
            .textContent('Try chat or contacts')
            .ariaLabel('Work in progress')
            .ok('Awesome!')
            .targetEvent(event)
          );
        };

        $scope.back = function() {
          // go back to previous state
          $mdDialog.show(
            $mdDialog.alert()
            .title('Not implemented yet!')
            .textContent('Try something else')
            .ariaLabel('Work in progress')
            .ok('Awesome!')
            .targetEvent(event)
          );
        };

        $scope.submit = function() {
          // go back to previous state
          $mdDialog.show(
            $mdDialog.alert()
            .title('Not implemented yet!')
            .textContent('Try something else')
            .ariaLabel('Work in progress')
            .ok('Awesome!')
            .targetEvent(event)
          );
        };

        $scope.cancel = function() {
          // go back to previous state
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
