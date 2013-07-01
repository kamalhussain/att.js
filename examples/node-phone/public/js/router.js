angular.module("app").config(function($routeProvider) {

  $routeProvider.when('/login', {
    templateUrl: 'templates/login.html',
    controller: 'LoginController'
  });

  $routeProvider.when('/loggedin', {
    templateUrl: 'templates/loggedin.html',
    controller: 'LoggedinController'
  });

  $routeProvider.when('/calling', {
    templateUrl: 'templates/calling.html'
  });

 $routeProvider.when('/speaking', {
    templateUrl: 'templates/speaking.html'
  });

 $routeProvider.when('/answering', {
    templateUrl: 'templates/answering.html'
  });

 $routeProvider.when('/about', {
    templateUrl: 'templates/about.html'
  });

  $routeProvider.otherwise({ redirectTo: '/login' });

});
