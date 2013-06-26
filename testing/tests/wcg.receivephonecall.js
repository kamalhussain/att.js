module('wcg.receivephonecall');

test("Basic init and event tests for WCG plugin: receive a call", function () {
    // how many assertions to expect
    var client_id = "bnaetrgxhg1hwcqqgczteolaokbugmvg";
    var redirect_uri = "http://localhost/testing";
    var nb_to_dial = '1-804-222-1111';
    //N.B.: Before running this test, make sure that index.html page is located under http://localhost/testing.
    //If not, change the client_id and the redirect_uri accordingly.

    att = new ATT({
        clientID: client_id,
        scope: 'profile,webrtc',
        redirectURI: redirect_uri,
    });
    ok(att, "att is instantiated");


    //before starting the test, make sure we have the access token.
    //
    var oauthParams = {},
        regex = /([^&=]+)=([^&]*)/g,
        m;
    while (m = regex.exec(location.hash.substring(1))) {
        oauthParams[decodeURIComponent(m[1].replace(/^\//, ''))] = decodeURIComponent(m[2]);
    }


    if (oauthParams['access_token']) {
        stop();
        att.oauth2.login(function me() {
        });

        att.on("phoneReady", function () {
            //check if user has been registered
            ok("phoneReady", "phoneReady: Phone is ready");
            ok(att.wcgBackend.wcgService._sessionID, "User has a session id: registered");
            //make a call to a test number that automatically reads your phone number and ends the call: callBegin should be raised.
        });

        att.on("incomingCall", function (call) {
            ok("incomingCall", "incomingCall: Call from " + call.remotePeer);
            setTimeout(function () {
                call.answer();
            }, 10000);
        });

        att.on("callBegin", function (call) {

            setTimeout(function () {
                call.hangup();
            }, 15000);
        });

        att.on("callEnd", function (call) {
            ok("callEnd", "callEnd: Call has ended");
            att.logout();
        });

        att.on("phoneClose", function () {
            ok("phoneClose", "phoneClose: Phone is close");
            //check if user has logged out
            equal(att.wcgBackend.wcgService, null, "User has logged out");
            start();
        });

        att.on("callError", function (call) {
            ok(false, "callError: this should not happen");

        });

        att.on("phoneError", function () {
            ok(false, "phoneError: this should not happen");

        });

    }
    else {
        window.location.href = att.oauth2.authorizeURL();
    }


});
