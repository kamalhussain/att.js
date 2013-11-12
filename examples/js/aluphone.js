//            document.addEventListener('DOMContentLoaded', function () {
//              document.body.insertBefore(dialer.render(), document.body.firstChild);
//            }, false);

$(document).ready(function() {

    function getOAuthUrl() {
        var oauth_server = "https://auth.tfoundry.com";
        var authorize_path = "/oauth/authorize";
        var clientID = "ofanste7pmxbeviskmznuktmgt92n9sp";
        var scope = 'profile,webrtc';
        //var redirectURI = "http://work.localhost/att.js-kamal/att.js/examples/aluphone.html";
        var redirectURI = "http://webtest.ic.att.com/att.js/examples/aluphone2.html";
        return oauth_server + authorize_path + "?response_type=token&client_id=" +
                clientID + "&scope=" + scope + "&redirect_uri=" + redirectURI;
    }

    var oauthParams = {},
            queryString = window.parent.location.hash.substring(1),
            regex = /([^&=]+)=([^&]*)/g,
            m,
            html = '';
    while (m = regex.exec(queryString)) {
        oauthParams[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
    }

    var access_token = oauthParams['access_token'];
    var thecall, att;

    function resetUI() {
        $('.login-box').hide();
        $('.dialpad-box').hide();
        $('.local-video-box').hide();
        $('.call-actions-box').hide();
        $('.incoming-call-box').hide();
        $('.incall-video-box').hide();
        $('.nudge-box').hide();
        $('.incoming-call-actions-box').hide();
    }

    function startUI() {
        resetUI();
        $('.login-box').show();
    }

    function dialpadUI() {
        resetUI();
        $('.dialpad-box').show();
        
        //document.getElementsByClassName("dialpad-box")[0].appendChild(dialer.render());
    }

    function nudgeUI() {
        resetUI();
        $('.nudge-box').show();
        $('.call-actions-box').show();
    }

    function callingUI() {
        resetUI();
        $('.local-video-box').show();
        $('.call-actions-box').show();
    }

    function incallUI() {
        resetUI();
        $('.incall-video-box').show();
        $('.call-actions-box').show();
    }

    function incomingCallUI(number) {
        resetUI();
        $('.incall-video-box').show();
        $('.incoming-call-actions-box').show();

        var match = (/^(sip:|tel:)?\+1?([^@]*)@?(.*)$/g).exec(number);
        if (match && match.length) {
            number = match[2];
        }

        $('.incoming-call-actions-box .incoming-number').text('Call from ' + number);
    }

    function showAlert(msg) {
        $('#alert-msg').html('<div class="alert alert-danger alert-dismissable"><a class="close" data-dismiss="alert">×</a><span>' + msg + '</span></div>');
    }

    if (access_token) {
        resetUI();

        att = new ATT({'accessToken': access_token});

        att.on('user', function() {
            console.log("user event");
        });

        att.on('phoneReady', function() {
            console.log('phoneReady event');

            window.dialer = new Dialpad({
                onPress: function(key) {
                    console.log('a key was pressed', key);
                },
                onCallableNumber: function(number) {
                    console.log('we have a number that seems callable', number);
                },
                onHide: function() {
                    console.log('removed it');
                },
                onCall: function(number) {
                    console.log('The call button was pressed', number);
                    att.dial(number);
                }
            });

            dialpadUI();
            $('.dialpad-box').html(dialer.render());
        });

        att.on('calling', function(call) {
            // add hangup button and image pointing to the camera
            nudgeUI();
        });

        att.on('ring', function() {
            console.log('ring event');
        });

        att.on('outgoingCall', function(call) {
            console.log("outgoingCall event");
            callingUI();
            thecall = call;

            if (call.localMediaStream) {
                var url = webkitURL.createObjectURL(call.localMediaStream);
                $('.local-video-box .localVideo').attr('src', url);
            }
        });

        att.on('callBegin', function(call) {
            incallUI();

            if (call.remoteMediaStream) {
                var url = webkitURL.createObjectURL(call.remoteMediaStream);
                $('.call0 .remoteVideo').attr('src', url);
            }

            if (call.localMediaStream) {
                var url = webkitURL.createObjectURL(call.localMediaStream);
                $('.local-video-box .localVideo').attr('src', '');
                $('.call0 .localVideo').attr('src', url);
            }
        });

        att.on('callEnd', function(call) {
            console.log("callEnd event");
            $('.call0 .remoteVideo').attr('src', '');
            $('.call0 .localVideo').attr('src', '');

            dialpadUI();
        });

        att.on('incomingCall', function(call, phonenumber) {
            console.log("incomingCall event");
            thecall = call;

            if (call.localMediaStream) {
                var url = webkitURL.createObjectURL(call.localMediaStream);
                $('.call0 .localVideo').attr('src', url);
            }

            incomingCallUI(phonenumber);
        });

        att.on('phoneError', function(payload) {
            console.log("phoneError event");
            $(".call0 .localVideo").attr('src', '');
            $(".call0 .remoteVideo").attr('src', '');

            dialpadUI();
        });

        att.on('error', function(err) {
            console.log("error event");
            dialpadUI();
            
            if (err.status == "error") {
                showAlert("please setup webrtc.json for your profile");
            } else {
                showAlert("Media access error. Please give permission to access the camera");
            }
        });

    } else {

        startUI();
        //$('.call0 .login').show();
        //$('.call0 .call').hide();
    }

    $('.call0 .call').click(function() {
        var callee = $('.call0 .call_to').val();
        //var pub_id = "sip:+1" + callee + "@foundry.att.com";
        att.dial(callee);
    });

    $('.hangup').click(function() {
        if (thecall) {
            thecall.hangup();
        }

        dialpadUI();
    });

    $('.answer').click(function() {
        if (thecall) {
            thecall.answer();
        }
    });

    $('.login-box .login').click(function() {
        window.location.href = getOAuthUrl();
    });
});