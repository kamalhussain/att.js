// The Muc object assumes you'll send it a strophe connection
function PhonoPhone(options) {
    var self = this,
        opts = options || {},
        config = this.config = {
            url: '',
            token: '',
            user: _.uuid(),
            log: true
        };

    // extend our defaults
    _.extend(this.config, options);

    // if we got auth credentials on init, we assume
    // they want to immediately log in.
    if (config.token) {
        this.login(config.token);
    }

    this.phono = $.phono({
        apiKey: "7826110523f1241fcfd001859a67128d",            
        gateway: 'gw.phono.com',
        connectionUrl: 'http://bosh.spectrum.tfoundry.com:8080/http-bind',
        audio: {
            type: 'webrtc';
        },
        onReady: function () {
            self.emit('ready', self);
        },
        onUnready: function () {
            self.emit('unready', self);
        },
        phone: {
            ringTone: window.settings.ringToneUrl,
            ringbackTone: window.settings.ringBackToneUrl,
            onIncomingCall: function (call) {
                self.emit('incomingCall', call);
            }
        },
        onError: function (err) {
            self.emit('error', err);
        }
    });

    // inherit wildemitter properties
    WildEmitter.call(this);

    if (this.config.log) {
        this.on('*', function (eventName, payload) {
            console.log('event:', eventName, payload);
        });
    }
}

// set our prototype to be a new emitter instance
Phone.prototype = new WildEmitter();

Phone.prototype.login = function (accessToken, cb) {
    var self = this,
        token = this.config.token = accessToken;
    this.ms = new MediaServices("https://api.foundry.att.com/a1/webrtc", this.config.user, "oauth " + token || this.config.token, "audio,video");
    this.ms.oninvite = function (event) {
        self.emit('incomingCall', event);
    };
    this.ms.onready = setTimeout(function () {
        self.emit('ready', self);
        self.ms.unregister();
    }, 500);
};

// send a message to a room
Phone.prototype.createCall = function (phoneNumber) {
    var call = this.ms.createCall(phoneNumber, {audio: true, video: false});
    call.ring();
    return call;
};

// attch it to root
att.Phone = Phone;