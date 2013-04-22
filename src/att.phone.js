(function (ATT) {

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

})(ATT);
