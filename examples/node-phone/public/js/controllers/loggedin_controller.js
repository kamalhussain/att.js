angular.module("app").controller('LoggedinController', function($scope, $rootScope, $location) {

	if(!window.accessToken) {
		$location.path('/login');
	} else {

		var att = new ATT({
			accessToken: accessToken,
			server: "alpha1"
		});

		att.on('init', function () {
		    console.log("init");
			// att.me.getMe(function (user) {
			// 	$rootScope.user = user;
			// 	$rootScope.loginState = "Logout " + $user.first_name;
			// 	$rootScope.loginUrl = "/logout";
			// 	$scope.callStatus = "Make a Call";
			// });
		});

		att.on('user', function (user) {
			$rootScope.user = user;
			$rootScope.loginState = "Logout " + $user.first_name;
			$rootScope.loginUrl = "/logout";
			$scope.callStatus = "Make a Call";
		});

		att.on('outgoingCall', function (call) {
		    console.log("outgoingCall");
		});

		att.on('ring', function () {
		    console.log("ring");
		});

		att.on('callBegin', function (call) {
		    console.log("callBegin");

		    //DO SOMETHING WITH THIS CALL
		    $("#dial").click(function () {
		    	if ($("#dial").html() == "Hangup") {
		    		call.hangup();
		    	}
		    });
		});

		att.on('callEnd', function (call) {
		    console.log("callEnd");
		});

		att.on('error', function (eventData) {
		    console.log("error");
		});

		att.on('phoneClose', function () {
		    console.log("phoneClose");
		});

		$rootScope.att = att;

	};

	$scope.dial = function() {

		$rootScope.att.dial($scope.phoneNumber);


	};

});
