angular.module("app").config(function($routeProvider) {

  $routeProvider.when('/login', {
    templateUrl: 'templates/login.html',
    controller: 'LoginController'
  });

  $routeProvider.when('/loggedin', {
    templateUrl: 'templates/loggedin.html',
    controller: 'LoggedinController'
  });

  $routeProvider.otherwise({ redirectTo: '/login' });

});
