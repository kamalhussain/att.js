(function (ATT, $) {

    function AttCall(att, call) {
        var self = this

        self.att = att;
        self._call = call;

        WildEmitter.call(this);

        self.on('*', function (eventType) {
            self.att.emit(eventType, self);
        });

        return self;
    }

    AttCall.prototype = Object.create(WildEmitter.prototype, {
        constructor: {
            value: AttCall
        }
    });

    AttCall.prototype.answer = function () {
        return this._call.answer();
    };

    AttCall.prototype.hangup = function () {
        return this._call.hangup();
    };

    AttCall.prototype.__defineGetter__("initiator", function () { 
        return this._call.initiator; 
    });

    ATT.fn.Call = AttCall;


    ATT.fn.dial = function (number) {
        var self = this,
            callable = this.phoneNumber.getCallable(number);

        self.emit('calling', number);

        var call = self._makeCall(callable);

        call.emit('ring');
        self.emit('outgoingCall', call);

        return call;
    };

    ATT.fn._makeCall = function (phoneNumber) {
        var self = this;

        var call = self.phonoBackend.phono.phone.dial('sip:' + phoneNumber + '@12.208.176.26', {
            callerId: self.config.myNumber + '@phono06.tfoundry.com'
        });

        var attCall = new ATT.fn.Call(self, call);

        call.bind({
            onRing: function () {
                attCall.emit('ring');
            },
            onAnswer: function () {
                attCall.emit('callBegin');
            },
            onHangup: function () {
                attCall.emit('callEnd');
            },
            onHold: function () {
                attCall.emit('hold');
            },
            onRetrieve: function () {
                attCall.emit('retrieve');
            },
            onWaiting: function () {
                attCall.emit('waiting');
            },
            onError: function () {
                attCall.emit('error');
            }
        });

        return attCall;
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
            att.phonoBackend.phono = $.phono(_.extend({
                token: att.config.apiKey,
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
            }));
        });
    });

})(ATT, jQuery);
