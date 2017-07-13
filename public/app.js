(function(){
  'use strict';
var cmsapp = angular.module('rhmap-keycloak', [
  'ui.router',
  'sidenav',
  'list',
  'card',
  'analytics',
  'toolbar',
  'form',
  'view',
  'push',
  'sync',
  'auth',
  'config'
]);

cmsapp.config(function($mdThemingProvider) {
  $mdThemingProvider.theme('md-boilerplate-theme')
    .primaryPalette('red')
    .accentPalette('indigo')
    .warnPalette('deep-purple')
    .backgroundPalette('grey');

  //$mdThemingProvider.theme('dark-red').dark();

  //$mdThemingProvider.setDefaultTheme('md-boilerplate-theme');

  $mdThemingProvider.disableTheming();
});

cmsapp.config(function($stateProvider, $urlRouterProvider){
  $urlRouterProvider.otherwise("/view");

   $stateProvider
     .state('view', {
       url: "/view",
       views: {
         '': {
           templateUrl: "js/view/view.html",
           controller: "viewController"
         },
         'toolbar@view': {
           templateUrl: "js/toolbar/toolbar.html",
           controller: "toolbarController"
         },
         'sidenav@view': {
           templateUrl: "js/sidenav/sidenav.html",
           controller: "sidenavController"
         },
         'list@view': {
           templateUrl: "js/list/list.html",
           controller: "listController"
         },
         'card@view': {
           templateUrl: "js/card/card.html",
           controller: "cardController"
         },
         'analytics@view': {
           templateUrl: "js/analytics/analytics.html",
           controller: "analyticsController"
         },
         'form@view': {
           templateUrl: "js/form/form.html",
           controller: "formController"
         },
         'push@view': {
           templateUrl: "js/push/push.html",
           controller: "pushController"
         },
         'sync@view': {
           templateUrl: "js/sync/sync.html",
           controller: "syncController"
         },
         'auth@view': {
           templateUrl: "js/auth/auth.html",
           controller: "authController"
         }
       }

     });

   });

})();
