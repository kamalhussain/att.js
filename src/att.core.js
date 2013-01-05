function Att(options) {
    var self = this,
        opts = options || {},
        config = this.config = {
            apiKey: '',
            user: _.uuid(),
            jid: '',
            log: true,
            ringTone: '',
            ringbackTone: '',
            dependencyBaseUrl: '//js.att.io'
        },
        availableCallbacks = {
            'onReady': 'ready',
            'onUnReady': 'unready',
            'onError': 'error',
            'onCallBegin': 'callBegin',
            'onCallEnd': 'callEnd',
            'onOutgoingCall': 'outgoingCall',
            'onCalling': 'calling'
        },
        phonoAPICallbacks = {
            'onError': 'error',
            'onCallBegin': 'callBegin',
            'onCallEnd': 'callEnd'
        },
        incomingCallHandler = function () {
            if (_.isFunc(options.onIncomingCall)) {
                return options.onIncomingCall;
            } else if (options.phone && _.isFunc(options.phone.onIncomingCall)) {
                return options.phone.onIncomingCall;
            } else {
                return function () {};
            }
        }();

    // inherit wildemitter properties
    WildEmitter.call(this);

    // extend our defaults
    _.extend(this.config, opts);

    // store a reference to or main incoming call handler
    this.config.incomingCallHandler = incomingCallHandler;
    // delete the original
    delete this.config.onIncomingCall;
    if (this.config.phone) {
        delete this.config.phone.onIncomingCall;
    }

    // support att.phone.dial() api
    this.phone = this;

    // register the real incoming call handler
    this.on('incomingCall', incomingCallHandler);

    // register handlers passed in on init
    _.each(availableCallbacks, function (key, value) {
        if (_.isFunc(self.config[key])) {
            self.on(value, self.config[key]);
            self.config[key] = function (event) {
                self.emit(value, event);
            };
        }
    });    

    // support phono api
    if (opts.phone) {
        _.each(phonoAPICallbacks, function (key, value) {
            if (_.isFunc(self.config.phone[key])) {
                self.on(value, self.config.phone[key]);
                self.config.phone[key] = function (event) {
                    self.emit(value, event);
                };
            }
        });
    }

    if (this.config.log) {
        this.on('*', function (eventName, payload) {
            console.log('att.js event:', eventName, payload);
        });
    }

    // attempt to get me and determine version
    this.getMe(function (me) {
        // make it possible to override guessed version
        me.version = config.version || _.getQueryParam('version') || me.version;
        config.version = me.version;

        self.emit('user', me);

        if (config.version === 'a1' || config.version === 'a2') {
            $.getScript(config.dependencyBaseUrl + '/js/att.' + config.version + '.js', function () {
                self.fetchDependencies(config.version);    
            });    
        } else {
            $.getScript(config.dependencyBaseUrl + '/js/phono.06.js', function () {
                config.token = config.apiKey;
                config.apiKey = "7826110523f1241fcfd001859a67128d";
                config.connectionUrl = "http://gw.att.io:8080/http-bind";
                self.fetchDependencies();    
            });
        }        
    });

    return self;
}

// set our prototype to be a new emitter instance
Att.prototype = new WildEmitter();

Att.prototype.fetchDependencies = function (version) {
    var self = this,
        config = this.config;
    if (version === 'a1') {
        if (!_.h2sSupport()) {
            alert('Please use the special Ericsson build of Chromium. It can be downloaded from: http://js.att.io/browsers');
        } else {
            console.log('setting up wcgphono');
            // Henrik: I'm of the opinion that we should normalize all handling in this library
            // rather than in the dynamically loaded ones. That way we maintain one compatibility 
            // layer outside of the included (hopefully unmodified) libraries rather than have to
            // modify each one.
            this.phono = $.wcgphono(_.extend(config, {
                phone: {
                    onIncomingCall: self._normalizeNonPhonoCallHandlers.bind(self)
                },
                onReady: function () {
                    self.emit('ready');
                }
            }));
        }
    } else if (version === 'a2') {
        if (!_.h2sSupport()) {
            alert('Please use the special Ericsson build of Chromium. It can be downloaded from: http://js.att.io/browsers');
        } else {
            console.log('setting up h2sphono');
            this.phono = $.h2sphono(_.extend(config, {
                phone: {
                    onIncomingCall: self._normalizeNonPhonoCallHandlers.bind(self)
                },
                onReady: function () {
                    self.emit('ready');
                }
            }));
        }
    } else {
        console.log('setting up phono');
        this.phono = $.phono(_.extend(config, {
            phone: {
                onIncomingCall: self._normalizeNonPhonoCallHandlers.bind(self)
            },
            onReady: function () {
                self.sessionId = this.sessionId;
                self.getMe(function (me) {
                    self.bindNumberToPhonoSession(me.number, self.sessionId, function () {
                        self.emit('ready'); 
                    });
                });
            }
        }));
    }
};

Att.prototype.getMe = function (cb) {
    var self = this,
        baseUrl = "https://auth.tfoundry.com",
        data = {
            access_token: this.config.apiKey
        },
        version;

    // short circuit this if we've already done it
    if (this.config.me) {
        // the return is important for halting execution
        return cb(this.config.me);
    }

    // removes domain from number if exists
    function cleanNumber(num) {
        return num.split('@')[0];
    }

    // we try to figure out what endpoint this user
    // should be using based on a series of checks.
    
    console.log('this.config', this.config);

    console.log(data);

    // first we get the user object
    $.ajax({
        data: data,
        dataType: 'json',
        url: baseUrl + '/me.json',
        success: function (user) {
            // attempt to grab the external_id
            var externalId = function () {
                var val;
                try {
                    val = user.identifiers.external_id[0];
                } catch (e) {}
                return val;
            }();

            // store the user in the config
            self.config.me = user;
            
            // attempt to build an imsNumber
            user.imsNumber = user.ims_phone_number || externalId;

            // if we have one, remove the domain.
            if (user.imsNumber) {
                user.imsNumber = cleanNumber(user.imsNumber);
            }

            // attempt to build a virtualNumber
            user.virtualNumber = user.conference_phone_number;

            // if we have an explicit IMS number or an externalID
            // then it's IMS
            if (user.ims_phone_number || externalId) {
                version = 'a1';
            } else if (user.conference_phone_number) {
                // if not and we've got a conference number
                // we want that as our number and we know we're likely
                // using a3/phono.
                version = 'a3';
            }
            // now we check to see if we've got a webrtc.json specified for this
            // user.
            $.ajax({
                data: data,
                dataType: 'json',
                url: baseUrl + '/users/' + user.uid + '/api_services/webrtc.json',
                // if we get a 200
                success: function (res) {
                    // if we've got an explicit version use it.
                    var explicitVersion = res && res.version;
                    user.version = 'a' + explicitVersion;
                    if (user.version === 'a3') {
                        // use known phono number or main
                        user.number = user.virtualNumber || user.phone_number;
                    } else {
                        // for 'a1' or 'a2' we should have an IMS number, if not
                        // fallback to main phone.
                        user.number = user.imsNumber || user.phone_number;                        
                    }
                    cb(user);
                }, 
                // handle the 404 case (which means we don't have an explicit ver.)
                error: function () {
                    // keep any version we guessed from above or set to 'a3'
                    user.version = version || 'a3';
                    if (user.version === 'a3') {
                        // use known phono number or main
                        user.number = user.virtualNumber || user.phone_number;
                    } else {
                        // for 'a1' or 'a2' we should have an IMS number, if not
                        // fallback to main phone.
                        user.number = user.imsNumber || user.phone_number;
                    }
                    cb(user);
                }
            });
        }
    });
};

Att.prototype.bindNumberToPhonoSession = function (number, session, cb) {
    // For A3, we need to bind the session id with the phone number
    $.ajax({
        url: 'http://binder.api.tfoundry.com/session/' + number + '/' + session,
        //url: 'https://api.foundry.att.com/a3/webrtc/bind/' + number + '/' + session + "?access_token=" + this.config.token,
        type: "POST",
        success: function (data) {
            cb();
        }
    });
};

// Disconnect
Att.prototype.disconnect = function () {
    this.phono.disconnect();
    this.phono = null;
};

// Connected?
Att.prototype.connected = function () {
    return !!this.phono;
};

Att.prototype._normalizeNonPhonoCallHandlers = function (event) {
    var call = event.call,
        attCall,
        number;
    if (call) {
        attCall = new AttCall(this, call);
        number = attCall.initiator || attCall._call.recipient || '';
        number = number.replace('tel:', '').replace('sip:', '');
        number = number.split('@')[0];
        // silly fix to support phono API
        attCall.call = attCall;
        this.emit('incomingCall', attCall, att.phoneNumber.parse(number));
    }
};

// outgoing call
Att.prototype.dial = function (phoneNumber, callbackHash) {
    var self = this,
        callable = att.phoneNumber.getCallable(phoneNumber),
        callbacks = callbackHash || {},
        call,
        attCall;

    this.emit('calling', phoneNumber);
    
    // for 'a3' we need to set a full sip address
    if (this.config.version === 'a3') {
        call = this.phono.phone.dial('sip:' + callable + '@12.208.176.26', {
            callerId: self.config.myNumber + '@phono06.tfoundry.com'
        });
    } else {
        call = this.phono.phone.dial(callable, {});
    }

    attCall = new AttCall(this, call);
    attCall.bind(callbackHash);

    // FIXME: Short term fix, we auto-generate ring event - see FIXME in vendor/att.a1.js
    attCall.emit("ring");
        
    this.emit('outgoingCall', attCall);
    return attCall;
};


// The AttCall Object
function AttCall(att, call) {
    var self = this;
    
    // store references for convenience
    this._att = att;
    this._call = call;
    this.id = call.id;

    // inherit wildemitter properties
    WildEmitter.call(this);

    // this makes it so that emitting events from the call
    // object automatically emits them on underlying att
    // object.
    this.on('*', function (eventType) {
        self._att.emit(eventType, self);
    });

    this._call.bind({
        onRing: function () {
            self.emit('ring');
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

    return this;
}

AttCall.prototype = new WildEmitter();

// Support the phono call
AttCall.prototype.bind = function (callbacks) {
    // support phono call api
    var self = this,
        phonoCallAPICallbacks = {
            'onRing': 'ring',
            'onAnswer': 'callBegin',
            'onHangup': 'callEnd',
            'onHold': 'hold',
            'onRetrieve': 'retrieve',
            'onWaiting': 'waiting',
            'onError': 'error'
        },
        options = callbacks || {},
        att = this._att;

    _.each(phonoCallAPICallbacks, function (key, value) {
        if (_.isFunc(options[key])) {
            self.on(value, options[key]);     
        }
    });
};


AttCall.prototype.answer = function () {
    return this._call.answer();
};
  
AttCall.prototype.hangup = function () {
    return this._call.hangup();
};
  
AttCall.prototype.digit = function (digit) {
    return this._call.digit(digit);
};
  
AttCall.prototype.pushToTalk = function (flag) {
    return this._call.pushToTalk(flag);
};
  
AttCall.prototype.talking = function (flag) {
    return this._call.talking(flag);
};
  
AttCall.prototype.mute = function (flag) {
    return this._call.mute(flag);
};
  
AttCall.prototype.hold = function (flag) {
    return this._call.hold(flag);
};
  
AttCall.prototype.volume = function (level) {
    return this._call.volume(level);
};
  
AttCall.prototype.gain = function (level) {
    return this._call.gain(level);
};

AttCall.prototype.__defineGetter__("initiator", function () { return this._call.initiator; });

// additional IIP extensions to phono
AttCall.prototype.transferto = function (phoneNumber) {
    var callable = att.phoneNumber.getCallable(phoneNumber);
    this._call.transferto(callable);
};

// attch it to root
att.Phone = Att;
if (root.jQuery) {
    root.jQuery.att = function (opts) {
        return new Att(opts);
    };
}
