angular.module("app").controller('LoginController', function($rootScope, $location) {

	if(window.accessToken) {
		$location.path('/loggedin');
	} else {

		$rootScope.loginState = "Login";
		$rootScope.loginUrl = "/auth";

	}

});
