(function (ATT, $) {

    function Call(att, phoneNumber) {
        var self = this

        WildEmitter.call(this);

        self.att = att;
        self._call = att.phonoBackend.phono.phone.dial('sip:' + phoneNumber + '@12.208.176.26', {
            callerId: att.config.myNumber + '@phono06.tfoundry.com'
        });

        self._call.bind({
            onRing: function () {
                self.emit('ring', self, phoneNumber);
            },
            onAnswer: function () {
                self.emit('callBegin');
            },
            onHangup: function () {
                self.emit('callEnd');
            },
            onHold: function () {
                self.emit('hold');
            },
            onRetrieve: function () {
                self.emit('retrieve');
            },
            onWaiting: function () {
                self.emit('waiting');
            },
            onError: function () {
                self.emit('error');
            }
        });

        self.on('*', function (eventType) {
            self.att.emit(eventType, self);
        });

        return self;
    }

    Call.prototype = Object.create(WildEmitter.prototype, {
        constructor: {
            value: Call
        }
    });

    Call.prototype.answer = function () {
        return this._call.answer();
    };

    Call.prototype.hangup = function () {
        return this._call.hangup();
    };

    Call.prototype.__defineGetter__("initiator", function () { 
        return this._call.initiator; 
    });


    ATT.fn.dial = function (number) {
        var self = this,
            callable = this.phoneNumber.getCallable(number);

        self.emit('calling', number);

        var call = new Call(self, number);

        self.emit('outgoingCall', call, number);
        call.emit('ring', call, number);

        return call;
    };

    ATT.fn.phonoBackend = {
        phono: null,
        sessionId: null,
        normalizeHandlers: function (event) {
            var call = event.call,
                attCall,
                number;
            if (call) {
                attCall = new ATT.fn.Call(this, call);
                number = attCall.initiator || call.recipient || '';
                number = number.replace('tel:', '').replace('sip:', '');
                number = number.split('@')[0];
                // silly fix to support phono API
                attCall.call = attCall;
                this.emit('incomingCall', attCall, self.phoneNumber.parse(number));
            }
        },
        bindNumberToSession: function (number, session, cb) {
            $.ajax({
                url: 'http://binder.api.tfoundry.com/session/' + number + '/' + session,
                type: "POST",
                success: function (data) {
                    cb();
                }
            });
        }
    };

    ATT.initPlugin(function (att) {
        console.log('Load Phono Plugin');
        att.on('user', function (user) {
            console.log('Setting up Phono');
            att.phonoBackend.phono = $.phono({
                token: att.config.accessToken,
                apiKey: '7826110523f1241fcfd001859a67128d',
                connectionUrl: 'http://gw.att.io:8080/http-bind',
                phone: {
                    onIncomingCall: att.phonoBackend.normalizeHandlers.bind(att),
                    ringTone: '',
                    ringbackTone: ''
                },
                onReady: function () {
                    console.log('Phono Ready');
                    var sessionBind = att.phonoBackend.bindNumberToSession.bind(att);
                    att.phonoBackend.sessionId = this.sessionId;
                    sessionBind(user.number, att.phonoBackend.sessionId, function () {
                        att.emit('phoneReady');
                    });
                }
            });
        });
    });

})(ATT, jQuery);
