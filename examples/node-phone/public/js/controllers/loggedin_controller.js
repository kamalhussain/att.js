angular.module("app").controller('LoggedinController', function($scope, $rootScope, $location) {

	if(!window.accessToken) {
		$location.path('/login');
	} else if (!$rootScope.att) {

		var att = new ATT({
			accessToken: accessToken,
			server: "alpha1"
		});

		// att.logout();

		// att = new ATT({
		// 	accessToken: accessToken,
		// 	server: "alpha1"
		// });

		att.on('init', function () {
		    console.log("att init");
		});

		att.on('user', function (user) {
		    console.log("on user event in LoggedinController");			
			$rootScope.user = user;
			$rootScope.loginState = "Logout " + user.first_name;
			// $scope.callStatus = "Make a Call";
			$scope.$apply();
		});

		att.on('outgoingCall', function (call) {
		    console.log("outgoingCall");
    		// $rootScope.call = call;
			$rootScope.changePage('/calling');
		});

		att.on('ring', function () {
		    console.log("ring");
		});

		att.on('callBegin', function (call) {
		    console.log("callBegin: " + ($rootScope.call == call));
    		$rootScope.call = call;
			$rootScope.changePage('/speaking');
		});


		att.on('callEnd', function (call) {
		    console.log("callEnd: " + ($rootScope.call == call));
			if($rootScope.call) {
				$rootScope.call.hangup();
				delete $rootScope.call;
			}
 			$rootScope.changePage('/loggedin');
 			showalert("Call End", "alert-info");
		});

		att.on('incomingCall', function (call) {
		    console.log("callBegin: " + ($rootScope.call == call));
		    if(rootScope.call) {
		    	console.warn("call already active - overwritten");
		    }
    		$rootScope.call = call;
			$rootScope.changePage('/answering');
		});

		att.on('error', function (eventData) {
		    console.log("error: " + eventData);
		    $rootScope.hangup();
		});

		att.on('phoneClose', function () {
		    console.log("phoneClose");
		    $rootScope.login();
		});

   		$rootScope.att = att;
	};

	$rootScope.dial = function() {
		var pn = $scope.phoneNumber;
		$rootScope.phoneNumber = $rootScope.att.phoneNumber.stringify(pn);		 
		$rootScope.att.dial(pn);
		$location.path('/calling');
	};

	$rootScope.answer = function() {
	    $rootScope.call.answer();
		$location.path('/speaking');
	}

	$rootScope.hangup = function() {
		if($rootScope.call) {
			$rootScope.call.hangup();
			delete $rootScope.call;
		}

		$location.path('/loggedin');
	};

	$scope.callStatus = "Make a Call";

	/**
	  Bootstrap Alerts -
	  Function Name - showalert()
	  Inputs - message,alerttype
	  Example - showalert("Invalid Login","alert-error")
	  Types of alerts -- "alert-error","alert-success","alert-info"
	  Required - You only need to add a alert_placeholder div in your html page wherever you want to display these alerts "<div id="alert_placeholder"></div>"
	  Written On - 14-Jun-2013
	**/

	  function showalert(message,alerttype) {

	    $('#alert_placeholder').append('<div id="alertdiv" class="alert ' +  alerttype + '"><a class="close" data-dismiss="alert">×</a><span>'+message+'</span></div>')

	    window.setTimeout(function() { // this will automatically close the alert and remove this if the users doesnt close it in 5 secs

		    $("#alertdiv").fadeTo(500, 0).slideUp(500, function(){
		        $(this).remove(); 
		    });

	    }, 2000);
	  };

});
