angular.module("app").controller('LoginController', function($scope, $rootScope, $location, AuthenticationService) {
	att = new ATT({
		clientID: "lxj9a6rjiz2cv7q1immpybuf0r6jh9an",
		scope: 'profile,webrtc',
		server: 'alpha1'
            // redirectURI: "http://localhost:5000"
        });

	// $scope.oauthUrl = att.oauth2.authorizeURL();
	att.oauth2.login( function(me){} );
	att.on('authorized', function () {
		$("#dial").show();
		$("#dial").html('registering');
	})

	att.on('outgoingCall', function(call) {
		console.log("Outgoing call");
	});

	att.on('callBegin', function(call) {
		console.log("In a call");
	});

	att.on('callEnd', function(call) {
		console.log("Call ended");
	});


	var onLoginSuccess = function(response) {
		alert(response.message);
		$location.path('/home');
	};

	$scope.login = function() {
	};
});
