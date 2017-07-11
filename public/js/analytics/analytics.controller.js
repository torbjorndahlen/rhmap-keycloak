(function() {
'use strict';

  angular
  .module('analytics')
  .controller('analyticsController', ['$mdToast', '$mdBottomSheet', '$mdSidenav', '$window', '$document', '$timeout', '$mdDialog','$rootScope', '$scope', '$state', '$sessionStorage', 'analyticsService',
  function ($mdToast, $mdBottomSheet, $mdSidenav, $window, $document, $timeout, $mdDialog, $rootScope, $scope, $state, $sessionStorage, analyticsService){

    console.log("Module analytics loaded");

    $scope.items = [
      { name: 'item1', icon: 'img/ic_chat_24px.svg', what: 'what1', notes: 'notes1', action1: 'action1', action2: 'action2' },
      { name: 'item2', icon: 'img/ic_chat_24px.svg', what: 'what2', notes: 'notes2', action1: 'action1', action2: 'action2' },
      { name: 'item3', icon: 'img/ic_chat_24px.svg', what: 'what3', notes: 'notes3', action1: 'action1', action2: 'action2' }
    ];


    var myCanvas0 = document.getElementById("myCanvas0");
    myCanvas0.width = 100;
    myCanvas0.height = 100;
    var ctx0 = myCanvas0.getContext("2d");


    $scope.dashData0 = {
        "Critical": 10,
        "Major": 14,
        "Normal": 2,
        "Low": 12
    };


    $scope.myPiechart0 = new Piechart(
    {
        "canvas":myCanvas0,
        "data":$scope.dashData0,
        "colors":["#fde23e","#f16e23", "#57d9ff","#937e88"],
        "doughnutHoleSize":0.9
    }
  );

  $scope.myPiechart0.draw();

  var myCanvas1 = document.getElementById("myCanvas1");
  myCanvas1.width = 100;
  myCanvas1.height = 100;
  var ctx1 = myCanvas1.getContext("2d");


  $scope.dashData1 = {
      "Critical": 2,
      "Major": 20,
      "Normal": 5,
      "Low": 10
  };


  $scope.myPiechart1 = new Piechart(
  {
      "canvas":myCanvas1,
      "data":$scope.dashData1,
      "colors":["#fde23e","#f16e23", "#57d9ff","#937e88"],
      "doughnutHoleSize":0.9
  }
);

$scope.myPiechart1.draw();

var myCanvas2 = document.getElementById("myCanvas2");
myCanvas2.width = 100;
myCanvas2.height = 100;
var ctx2 = myCanvas2.getContext("2d");


$scope.dashData2 = {
    "Critical": 2,
    "Major": 35,
    "Normal": 10,
    "Low": 5
};


$scope.myPiechart2 = new Piechart(
{
    "canvas":myCanvas2,
    "data":$scope.dashData2,
    "colors":["#fde23e","#f16e23", "#57d9ff","#937e88"],
    "doughnutHoleSize":0.9
}
);

$scope.myPiechart2.draw();


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
