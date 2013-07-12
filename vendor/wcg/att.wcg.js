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
        //If user cancels the call right after having dialed the number, wait for the "RINGING" event.
        //If cancelling the call is done before the RINGING event, it would throw an exception because the WCGapi.js is
        //looking for a call session that doesn't exist.
        self.earlyHangup = false;

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
                    self.att.emit('localVideo', event.call.localStreams[0]);
                }
                if (event.call.remoteStreams) {
                    self.att.emit('remoteVideo', event.stream);
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
            self.emit('callError');
        };
        this._call.onstatechange = function (event) {
            console.log("onstatechange", event);
            if (event.state == Call.State.RINGING) {
                if (self.earlyHangup == true) {
                    //if user cancels the call before accepting/denying the controls
                    //wait until the call has actually reached the server ("RINGING")
                    self.earlyHangup = false;
                    self._call.end();
                }
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
        var self = this;

        if (this._call && this._call != null) {
            if ((this._call.state == Call.State.RINGING) || (this._call.state == Call.State.ONGOING) || (this._call.state == Call.State.HOLDING) || (this._call.state == Call.State.WAITING)) {
                this._call.end();
            }
            else {
                //if user cancels the call before accepting the controls
                //wait until the call has actually reached the server ("RINGING")
                self.earlyHangup = true;
            }

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
        if (this.wcgBackend.wcgService) {
            console.log("Logging out");
            this.wcgBackend.wcgService.unregister();
            this.wcgBackend.wcgService = null;
        }
    };


    ATT.fn.wcgBackend = {
        wcgService: null
    };

    //////////////////////////////////////////////////////

    ATT.fn.dial = function (number, video) {
        var self = this;

        var sipOccurence = number.match(/sip\:([^@]*)@/);
        var telOccurence = number.match(/tel\:\+(.*)/);
        //number or id to be called
        var tobecalled = null;

        if (sipOccurence) {
            //it's a sip address
            tobecalled = number;
        }
        else if (telOccurence) {
            //it's a telephone number
            tobecalled = number;
        }
        else {

            var pattern = /^[A-Za-z]/;
            var result = pattern.exec(number);

            if (result != null) {
                //it's a NoTN id
                tobecalled = number;
            }
            else {
                //it's most probably a phone number
                var callable_number = ATT.phoneNumber.parse(number);
                callable_number = ATT.phoneNumber.getCallable(callable_number);
                number = callable_number;
                tobecalled = "tel:+" + number;
            }
        }


        var call;
        //make a call (audio or video)
        if (!video) {
            call = new WCGCall(self, tobecalled, false);
        }
        else {
            call = new WCGCall(self, tobecalled, true);
        }


        self.emit('calling', tobecalled);
        self.emit('outgoingCall', call);


    }


    ATT.initPlugin(function (att) {
        console.log('Load WCG Plugin');

        var self = this;
        self.att = att;

        att.on('user', function (user) {
            console.log('Setting up WCG');


            wcgUrl = 'https://api.foundry.att.com/a1/webrtc';
            turn = 'STUN:206.18.171.164:5060';

            var accessToken = att.config.accessToken;
            var password = 'oauth' + accessToken;

            att.wcgBackend.wcgService = new MediaServices(wcgUrl, user.first_name, password, "audio,video,chat");
            att.wcgBackend.wcgService.turnConfig = turn;

            att.wcgBackend.wcgService.onready = function () {

                att.emit('phoneReady');
            }
            att.wcgBackend.wcgService.onclose = function () {
                att.emit('phoneClose');
            }
            att.wcgBackend.wcgService.onerror = function (event) {
                att.emit('phoneError', event.reason);
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
