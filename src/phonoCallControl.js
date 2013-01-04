function PhonoCallControl(phono, options) {
    var self = this,
        opts = options || {},
        config = this.config = {
            boshService: 'http://im.tfoundry.com:5280/http-bind',
            user: '',
            log: true
        };

    this.phono = phono;

    // extend our defaults
    _.extend(this.config, options);

    // register some handlers
    $(document).on('callStatus', this.handleRemoteCallStatus.bind(this));
    $(document).on('remoteCall', this.handleRemoteCall.bind(this));
}

PhonoCallControl.prototype.init = function () {
    var self = this,
        connection = this.callControlConnection = new Strophe.Connection(this.config.boshService);
    
    // initting connection
    connection.rawInput = function (elem) {
        console.warn('<< ' + elem);
    };

    connection.rawOutput = function (elem) {
        console.warn('>> ' + elem);
    };

    console.log('Phono is ready... ' + app.me.presenceJid() + 'rayorox!');

    connection.connect(app.me.presenceJid(), 'rayorox!', function (status) {
        var statusLookup = [
                'error',
                'connecting',
                'connectionFailed',
                'authenticating',
                'authenticationFailed',
                'connected',
                'disconnected',
                'disconnecting',
                'attached'
            ];
        console.log('STROPHE STATUS: ' + statusLookup[status]);
        
        if (statusLookup[status] === 'connected') {
            connection.att.sendInitialPresence(app.get('sipAddress'));
        }
    });
};

PhonoCallControl.prototype.endActiveCall = function () {
    this.activeCall.hangup();
    this.callControlConnection.att.sendPresenceUpdateAvailable(this.phono.sessionId);
    this._reset();
    this.emit('callEnded');
};

PhonoCallControl.prototype.answerIncomingCall = function () {
    console.log('answer incoming called');
    var call = this.incomingCall;

    this.incomingCall = null;
    this.activeCall = call;
    this.setCallStatus('local');
    this.activeCall.answer();
    this.callControlConnection.att.sendPresenceUpdateUnAvailable(this.phono.sessionId), this.activeCall.remoteJid);
    this.autoAnswer = false;
};

/*
PhonoCallControl.prototype.


module.exports = {
    init: function () {
        var self = this;
        
        $(document).on('callStatus', _.bind(this.handleRemoteCallStatus, this));
        $(document).on('remoteCall', _.bind(this.handleRemoteCall, this));

        console.log("HEY");
        console.log(window.settings.gateway);
        console.log(window.settings.connectionUrl);

        // set up phono
        this.phono = $.phono({
            apiKey: "7826110523f1241fcfd001859a67128d",            
            gateway: window.settings.phonoGateway,
            connectionUrl: window.settings.phonoConnectionUrl,
            audio: {
                type: window.settings.cordova ? 'auto' : 'webrtc',
                localContainerId: "localVideo",
                remoteContainerId: "remoteVideo"
            },
            messaging: {
                onmessage: function (obj, message) {
                    $(document).trigger('message', message);
                }
            },
            onReady: function () {
                console.log('this.sessionId', this.sessionId);
                app.set('sipAddress', this.sessionId);
                self.initCallControl();
            },
            phone: {
                ringTone: window.settings.ringToneUrl,
                ringbackTone: window.settings.ringBackToneUrl,
                onIncomingCall: _(self.handleIncomingCall).bind(self),
                //onRing: _(self.handleRinging).bind(self),
                onHangup: _(self.handleHangup).bind(self),
                //onError: _(self.handlePhonoError).bind(self)
            },
            //onError: _(self.handlePhonoError).bind(self)
        });

        app.on('change:autoAnswer', this.handleAutoAnswerChange, this);
    },

    initCallControl: function () {
        var self = this,
            connection = app.callControlConnection = new Strophe.Connection(window.settings.boshService);
        
        // initting connection
        connection.rawInput = function (elem) {
            console.warn('<< ' + elem);
        };

        connection.rawOutput = function (elem) {
            console.warn('>> ' + elem);
        };

        console.log('Phono is ready... ' + app.me.presenceJid() + 'rayorox!');

        connection.connect(app.me.presenceJid(), 'rayorox!', function (status) {
            var statusLookup = [
                    'error',
                    'connecting',
                    'connectionFailed',
                    'authenticating',
                    'authenticationFailed',
                    'connected',
                    'disconnected',
                    'disconnecting',
                    'attached'
                ];
            console.log('STROPHE STATUS: ' + statusLookup[status]);
            // store our connection status for easy lookups
            //self.set('connectionStatus', statusLookup[status]);
            // turn strophe events into standard backbone events
            //app.trigger('connection:' + statusLookup[status], self.callControlConnection);

            if (statusLookup[status] === 'connected') {
                connection.att.sendInitialPresence(app.get('sipAddress'));
            }
        });
    },

    endActiveCall: function () {
        app.activeCall.hangup();
        app.callControlConnection.att.sendPresenceUpdateAvailable(app.get('sipAddress'));
        this._reset();
        // if we're on the video page, go back
        if (window.location.pathname === '/video') {
            window.history && window.history.back();    
        }
    },

    answerIncomingCall: function () {
        console.log('answer incoming called');
        var call = app.incomingCall;
        
        if (call.initiator.length > 13) {
            metrics.track('video call answered');
            app.navigate('video');    
        } else {
            metrics.track('call answered');
        }

        app.incomingCall = null;
        app.activeCall = call;
        app.set('callStatus', 'local');
        app.activeCall.answer();
        app.callControlConnection.att.sendPresenceUpdateUnAvailable(app.get('sipAddress'), app.activeCall.remoteJid);
        app.set('autoAnswer', false);
    },

    pushActiveCallToMobile: function () {
        app.set('callStatus', 'waiting');
        app.callControlConnection.att.pushCall();
        app.callControlConnection.att.sendPresenceUpdateAvailable(app.get('sipAddress'));
    },

    rejectIncomingCall: function () {
        app.incomingCall.hangup();
        this._reset();
    },

    putCallOnHold: function () {
        // TODO
    },

    takeRemoteCall: function () {
        app.set({
            autoAnswer: true,
            callStatus: 'waiting'
        });
        app.callControlConnection.att.takeCall();
        _.delay(_.bind(app.set, app, 'autoAnswer', false), 10000);
    },

    _clearCalls: function () {
        delete app.activeCall;
        delete app.incomingCall;
    },

    registerHandlersForCall: function (call) {
        console.log('in REGSITER HANDLERS FOR CALL');
        var self = this;
        Phono.events.bind(call, {
            onHangup: _(self.handleHangup).bind(self)
        });
    },
    
    handleHangup: function () {
        // if we're getting an incoming video call then we
        // assume this is an "upgrade" of the existing call
        // to video
        //if (app.activeCall && app.incomingCall.initiator.length > 13) return;
        if (app.activeCall) {
            console.log('DOING ACTIVE CALL HANGUP');
            this.handleActiveCallHangup();
        } else {
            console.log('DOING INACTIVE CALL HANGUP');
            this.handleInActiveHangup();
        }

        // if we're on the video page, go back
        if (window.location.pathname === '/video') {
            window.history && window.history.back();    
        }
    },

    // handler for a call where we are currently talking on the local device
    handleActiveCallHangup: function () {
        app.callControlConnection.att.sendPresenceUpdateAvailable(app.get('sipAddress'));
        app.set('callStatus', 'ending');
        if (window.location.pathname === '/video') {
            window.history && window.history.back();    
        }
        // after a bit, close it entirely
        _.delay(_.bind(this._reset, this), 500);

        metrics.track('call ended');

        this._clearState();
    },

    // handles hangup of remote caller if we never answered it locally
    handleInActiveHangup: function () {
        this.activeCall = null;
        this._clearState();
    },

    _reset: function () {
        this._clearState();
        this._clearCalls();
    },

    _clearState: function () {
        app.set({
            currentRemote: '',
            callStatus: '',
            currentCaller: '',
            currentCallerPic: '/img/fallback.png',
            autoAnswer: false
        });
    },

    handleIncomingCall: function (event) {
        console.log('GOT INCOMING CALL');
        var call = app.incomingCall = event.call,
            caller = app.contacts.findContact(call.initiator),
            self = this;

        app.set('callStatus', 'incoming');
       
        if (caller) {
            app.set({
                currentCaller: caller.fullName(),
                currentCallerPic: caller.toForm().picUrl
            });
        } else {
            app.set({
                currentCaller: 'Incoming call from: ' + phoney.stringify(call.initiator),
                currentCallerPic: '/img/fallback.png'
            });
        }

        if (app.get('autoAnswer')) {
            console.log("IS AUTO ANSWER");
            this.answerIncomingCall();
        }
    },

    handleAutoAnswerChange: function (model, val) {
        this.phono.phone.ringTone(val ? '' : window.settings.ringToneUrl);
    },

    handleRemoteCall: function (e, payload) {
        console.log("IN HANDLEREMOTECALL");
        var contact = app.contacts.findContact(payload.callerId);
        app.set({
            callStatus: 'remote',
            currentCaller: (contact && contact.fullName() || payload.callerId) + ' on remote',
            currentCallerPic: contact && contact.toForm().picUrl || '/img/fallback.png'
        });
    },

    handleRemoteCallStatus: function (e, payload) {
        console.log('GOT REMOTE CALL STATUS: ' + JSON.stringify(payload));
        // the caller ID comes in as "90902323@sip", this cleans it up a bit
        var contact = app.contacts.findContact(payload.callerId);
        
        console.log((payload.resource === 'mobile' || payload.resource !== app.me.resource()) && payload.show === 'dnd');

        // if it's dnd it means we've got a remote call going
        if ((payload.resource === 'mobile' || payload.resource !== app.me.resource()) && payload.show === 'dnd') {
            app.set('currentRemote', payload.resource);
            app.set({
                currentRemote: payload.resource,
                callStatus: 'remote',
                currentCaller: (contact && contact.fullName() || payload.callerId) + ' on ' + payload.resource,
                currentCallerPic: contact && contact.toForm().picUrl || '/img/fallback.png'
            });
        // if we get an "available" which is either an empty 'show' or the phrase 'available' from the resource that is currently identified
        // as the remote resource we're talking to. The remote call has ended and we need to reset everything.
        } else if (payload.resource !== app.me.resource() && (payload.show === 'available' || payload.show === '') && app.get('currentRemote') === payload.resource) {
            app.set({
                currentRemote: '',
                callStatus: '',
                currentCaller: '',
                currentCallerPic: '/img/fallback.png'
            });
        }
    },

    // initiate phone call
    //So far only two things call this, the dialer and the contact.
    //Need to be able to call with and without video (jid determines this)
    startPhoneCall: function (number) {
        var self = this,
            isVideoCall = false,
            phoneNumber, 
            contact;
        app.set({
            callStatus: 'calling',
            dialerVisible: false
        });
        if (typeof number === 'object') { //Contact object
            contact = number;
            app.set({
                currentCaller: contact.fullName(),
                currentCallerPic: contact.toForm().picUrl
            });
            phoneNumber = contact.xmppJid();
            if (phoneNumber) {
                isVideoCall = true;
            } else {
                phoneNumber = contact.getCallableNumber();
            }
        } else { //Dial pad
            if (number.indexOf('@') == -1) {
                if (number.length == 10) {
                    number = '1' + number;
                }
                phoneNumber = 'sip:+' + number + '@pb.tfoundry.com';
            } else {
                phoneNumber = "xmpp:" + number;
            }
            //Attempt to look up current caller
            contact = app.contacts.findContact(number);
            if (contact) {
                app.set({
                    currentCaller: contact.fullName(),
                    currentCallerPic: contact.toForm().picUrl
                });
            } else {
                //TODO maybe have a number prettyfier to complement the number cleaner in util
                app.set({
                    currentCaller: phoney.stringify(number),
                    currentCallerPic: '/img/fallback.png'
                });
            }
        }
        //Phone number technically could still be blank here
        app.activeCall = this.phono.phone.dial(phoneNumber, {
            onRing: function () {
                app.set('callStatus', 'calling');
            },
            onAnswer: function () {
                app.set('callStatus', 'local');
                if (isVideoCall) app.navigate('video');
            },
            headers: [{
                name: 'x-jid',
                value: Strophe.getBareJidFromJid(app.me.presenceJid())
            }],
            onHangup: _(self.handleHangup).bind(self)
        });
    },
};
*/