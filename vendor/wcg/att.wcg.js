(function (ATT, $) {


    /**
     * Occurs once a page has unloaded (or the browser window has been closed).
     */
    window.onbeforeunload = function () {
        ATT.fn.logout();
    };

    //////////////////////////////////////////////////////
    /**
     * Entry point to WCG Media Services
     */
    function WCGCall(att, callee, hasVideo) {
        var self = this;

        WildEmitter.call(this);

        self.att = att;
        self.remotePeer = callee;

        var media = (hasVideo) ? {
            audio: true,
            video: true
        } : {
            audio: true,
            video: false
        };
        console.log("WCGCall create call");
        //init the Media Services here
        self._call = att.wcgBackend.wcgService.createCall(callee, media);
        //call
        self._call.ring();

        self._bind();

        self.on('*', function (eventType) {
            att.emit(eventType, self);
        });

        return self;
    }

    /**
     * Create an instance of WCGCall that inherits from a WildEmitter class
     */
    WCGCall.prototype = Object.create(WildEmitter.prototype, {
        constructor: {
            value: WCGCall
        }
    });

    /**
     * Bind events to the call and propagate them through att emitter
     */
    WCGCall.prototype._bind = function () {
        var self = this;

        this._call.onaddstream = function (event) {
            if (event.call.mediaType.video && event.call.mediaType.video == true) {
                if (event.call.localStreams) {
                    self.att.emit('wcgLocalStream', event.call.localStreams[0]);
                }
                if (event.call.remoteStreams) {
                    //THAO TEMPORARY FIX FOR 203 server
                    self.att.emit('wcgRemoteStream', event.stream);
                }
            }

        };
        this._call.onbegin = function (event) {
            console.log("onbegin", event);
            self.emit('callBegin')
        };
        this._call.onend = function (event) {
            console.log("onend", event);
            self.emit('callEnd');
        };
        this._call.onerror = function (event) {
            console.log("onerror", event);
            self.emit('error');
        };
        this._call.onstatechange = function (event) {
            console.log("onstatechange", event);
            if (event.state == Call.State.RINGING) {
                self.emit('ring');
            }
            self.emit('wcgstateChange');
        };

    }
    /**
     * Answer to the call
     */
    WCGCall.prototype.answer = function () {
        this._call.answer();
    }
    /**
     * End the call
     */
    WCGCall.prototype.hangup = function () {
        if ((this._call.state == Call.State.ONGOING) || (this._call.state == Call.State.HOLDING) || (this._call.state == Call.State.WAITING)) {
            this._call.end();
        }
        else {
            console.log("Hangup");
            //go straight to the end event
            self.emit('callEnd');
        }
    }
    //////////////////////////////////////////////////////
    ATT.fn.WCGCall = function (att, call) {
        var self = this;
        var wcgCall = Object.create(WCGCall.prototype);
        wcgCall.att = att;

        WildEmitter.call(wcgCall);

        //call
        wcgCall._call = call;
        wcgCall.remotePeer = call.recipient

        wcgCall._bind();

        wcgCall.on('*', function (eventType) {
            wcgCall.att.emit(eventType, wcgCall);
        });

        return wcgCall;
    };
    /**
     * Logout from WCG
     */
    ATT.fn.logout = function () {
      if(this.wcgBackend.wcgService) {
        console.log("Logging out");
        this.wcgBackend.wcgService.unregister();
        this.wcgBackend.wcgService = null;
      }
    };

    /**
     * Make a video call
     */
    /*
    ATT.fn.videocall = function (callee) {
        var self = this;
        var call = new WCGCall(self, callee, true);
        self.emit('outgoingCall', call);

        return call;

    };
    ATT.fn.voicecall = function (callee) {
        var self = this;
        var call = new WCGCall(self, callee, false);
        self.emit('outgoingCall', call);

        return call;

    };
    */

    ATT.fn.wcgBackend = {
        wcgService: null
    };

    //////////////////////////////////////////////////////

    ATT.fn.dial = function (number) {
        var self = this;

        number = ATT.phoneNumber.parse(number);
        number = ATT.phoneNumber.getCallable(number);

        //using by default webims server
        var sipuser = "sip:" + number + "@vims1.com";

        if (att.config.server == 'alpha1') {
            sipuser = "sip:" + number + "@vims1.com";
        }
        else if (att.config.server == 'alpha2') {
            sipuser = "sip:" + number + "@vims1.com";
        }
        else if (att.config.server == 'webims') {
            sipuser = "sip:" + number + "@webims.tfoundry.com";
        }
        var call = new WCGCall(self, sipuser, false);

        var numberToMatch = call.remotePeer.match(/sip\:([^@]*)@/);
        var matchedNb = numberToMatch ? numberToMatch[1] : null;


        self.emit('calling', matchedNb);
        self.emit('outgoingCall', call);

    }

    ATT.fn.video = function (callee) {
        var self = this;
        var call = new WCGCall(self, callee, true);

        var numberToMatch = call.remotePeer.match(/sip\:([^@]*)@/);
        var matchedNb = numberToMatch ? numberToMatch[1] : null;

        self.emit('calling', matchedNb);
        self.emit('outgoingCall', call);
    };

    ATT.initPlugin(function (att) {
        console.log('Load WCG Plugin');

        att.on('user', function (user) {
            console.log('Setting up WCG');

            //set the default WCG values: using by default webims server
            var wcgUrl = 'http://64.124.154.204:38080/HaikuServlet/rest/v2/';
            var turn = 'STUN:64.125.154.203:3478';

            var accessToken = att.config.apiKey;
            var sipuser = user.first_name;
            var password = 'oauth' + accessToken;

            if (att.config.server == 'alpha1') {
                wcgUrl = 'http://64.124.154.204:38080/HaikuServlet/rest/v2/';
                turn = 'STUN:64.125.154.203:3478';
            }
            else if (att.config.server == 'alpha2') {
                wcgUrl = 'http://64.124.154.204:38080/HaikuServlet/rest/v2/';
                turn = 'STUN:64.125.154.203:3478';
                //TODO this should be removed once we are able to make a call to a real user
                user.first_name="sip:16509992361@vims.com";
            }
            else if (att.config.server == 'webims') {
                wcgUrl = 'http://wcg-dia.tfoundry.com:38080/HaikuServlet/rest/v2/';
                turn = 'STUN:206.18.171.164:5060';
                sipuser = "sip:" + user.first_name + "@webims.tfoundry.com";
                sipuser = sipuser.toLowerCase();

                var stringToMatch = sipuser.match(/sip\:([^@]*)@/);
                var string = stringToMatch ? stringToMatch[1] : null;

                password = string;

            }

            att.wcgBackend.wcgService = new MediaServices(wcgUrl, sipuser, password, "audio,video,chat");
            att.wcgBackend.wcgService.turnConfig = turn;

            att.wcgBackend.wcgService.onready = function () {

                att.emit('phoneReady');
            }
            att.wcgBackend.wcgService.onclose = function () {
                att.emit('phoneClose');
            }
            att.wcgBackend.wcgService.onerror = function (event) {
                att.emit('error', event.reason);
            }
            att.wcgBackend.wcgService.oninvite = function (event) {
                if (event.call) {
                    var call = event.call;
                    console.log("call media", call.mediaType);

                    //instantiage the WCGCall (incoming call)
                    var wcgCall = new ATT.fn.WCGCall(att, call);
                    att.emit('incomingCall', wcgCall, wcgCall.remotePeer);
                }
            }


        });
    });

})(ATT, jQuery);
