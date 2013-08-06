/**
 *  Copyright (c) 2013 Alcatel-Lucent
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

(function(ATT, $) {

    function Call(att, param) {
        var self = this;

        WildEmitter.call(this);

        self.att = att;
        self.localMediaStream = null;
        self.remoteMediaStream = null;

        if (param.constructor.name === 'Call') {
            self._call = param;
        } else if (att.aluBackend.session) {
            var mediaTypes = 'audio, video';
            self._call = att.aluBackend.session.createCall(param, mediaTypes);
        } else {
            self.emit('phoneError');
            return;
        }

        self._call.onConnecting = function(event) {
            console.debug("Call::onConnecting() trigerred");
            console.debug(event);
            self.emit('ring');
        };

        self._call.onConnected = function(event) {
            console.debug("Call::onConnected() trigerred");
            console.debug(event);
        };

        self._call.onDisconnected = function(event) {
            console.debug("Call::onDisconnected() trigerred");
            console.debug(event);

            // Stops local and remote streams
            var strms = self._call.streams();
            for (var i = 0; i < strms.length; i++) {
                if (typeof strms[i].stream().stop == 'function')
                    strms[i].stream().stop();
                else
                    strms[i].stop();
            }
            ;
            self.emit('callEnd');
        };

        self._call.onError = function(error, event) {
            console.debug("Call::onError() trigerred");
            console.debug(error);
            console.debug(event);
            self.emit('error');
        };

        self._call.onStatus = function(status, event) {
            console.debug("Call::onStatus() trigerred");
            console.debug(status);
            console.debug(event);
            switch (status) {
                case CallStatus.CONNECTING:
                    self.emit('ring');
                    break;
                case CallStatus.REJECTED:
                    // Stops local and remote streams
                    var strms = self._call.streams();
                    for (var i = 0; i < strms.length; i++) {
                        if (typeof strms[i].stream().stop == 'function')
                            strms[i].stream().stop();
                        else
                            strms[i].stop();
                    }
                    ;
                    self.emit('callEnd');
                    break;
                case CallStatus.HOLD:
                    self.emit('hold'); //do these events corespond?
                    break;
                case CallStatus.UNHOLD:
                    self.emit('retrieve'); //do these events corespond?
                    break;
            }
        };

        self._call.onAddStream = function(managedStream, event) {
            console.log("[ALU Plug] Receive new remote stream");
            console.debug("Call::onAddSteam() trigerred");
            console.debug(managedStream);
            console.debug(event);
            self.remoteMediaStream = managedStream.stream();
            self.emit('callBegin');
        };


        self.on('*', function(eventName, payload) {
            if (eventName === 'outgoingCall') {
                self.localMediaStream = payload; // payload = local stream
            }
            self.att.emit(eventName, self);
        });

        self.getUserMedia = function() {
            try {
                mediaStreamConstraints = {video: true, audio: true};
                navigator.webkitGetUserMedia(mediaStreamConstraints, onUserMediaSuccess, onMediaError);
            } catch (e) {
                console.error("Call::getUserMedia() error");
            }
        };

        var onUserMediaSuccess = function(stream) {
            console.debug("Call::onUserMediaSuccess() trigerred");
            console.debug(stream);
            managedStream = orca.createManagedStream(stream);
            self._call.addStream(managedStream);
            self._call.isIncoming = false;
            self._call.connect();
            self.emit('outgoingCall', stream);
        }

        var onMediaError = function(error) {
            console.error("Can not get access to your local media devices");
            console.debug("Call::onMediaError() trigerred");
            console.debug(error);
            //TODO: what is desired behavior if user does not allow user media?
            self.emit('error');
            self.hangup();
        }

        if (param.constructor.name !== 'Call') {
            self.getUserMedia();
        }
        return self;
    }

    Call.prototype = Object.create(WildEmitter.prototype, {
        constructor: {
            value: Call
        }
    });

    Call.prototype.answer = function() {
        this.getUserMedia();
    };

    Call.prototype.hangup = function() {
        if (this._call.isIncoming)
            this._call.reject();
        else
            this._call.disconnect();
    };

    Call.prototype.mute = function(mediaTypes) {
        if (this._call) {
            this._call.mute(mediaTypes);
        }
    };

    Call.prototype.unmute = function(mediaTypes) {
        if (this._call) {
            this._call.unmute(mediaTypes);
        }
    };

    Call.prototype.__defineGetter__("initiator", function() {
        return this._call.initiator;
    });


    ATT.fn.dial = function(numbers) {
        var self = this,
                callable = this.phoneNumber.getCallable(numbers);

        var toListRaw = numbers.split(',');

        var toList = [];

        for (var i = 0; i < toListRaw.length; i++) {
            if (toListRaw[i].trim() !== '')
                toList.push(this.config.puidPrefix + toListRaw[i].trim() + this.config.puidSuffix);
        }

        if (!toList.length) {
            console.log("[ALU Plugin] cannot make call. No call recipients found");
            self.emit("phoneError");
            return;

        } else {
            self.emit('calling', toList);

            var call = new Call(self, toList);

            //self.emit('outgoingCall', call);
            //call.emit('ring');
            return call;
        }
    };

    ATT.fn.disconnect = function() {
        this.aluBackend.session.disconnect();
    };

    ATT.fn.connected = function() {
        return this.aluBackend.connected;
    };

    ATT.fn.aluBackend = {
        session: null,
        call: null,
        sessionId: null,
        normalizeHandlers: function(call, event) {
            var attCall;
            if (call) {
                attCall = new Call(this, call);
                this.emit('incomingCall', attCall, call.remoteIdentities()[0].id);
            }
        },
        bindNumberToSession: function(number, session, cb) {
            // ALU stub begin
            // ALU stub end
            cb();
            /*            $.ajax({
             url: 'http://binder.api.tfoundry.com/session/' + number + '/' + session,
             type: "POST",
             success: function (data) {
             cb();
             }
             });
             */            // ALU stub end
        },
        connected: false
    };

    ATT.initPlugin(function(att) {
        console.log('[ALU Plug] Load Alcatel-Lucent Plugin');
        att.on('user', function(user) {
            console.log('Setting up ALU ORCA');

            att.config.puidPrefix = 'sip:+1';
            att.config.puidSuffix = '@foundry.att.com';

            var token = {};

            if (att.config.accessToken) {
                token = {
                    id: att.config.accessToken,
                    imsauth: 'sso-token',
                    key: att.config.accessToken
                }

            } else {
                token = {
                    id: user.privateId,
                    key: user.key
                }
            }

            var mediaOptions = {
                stun: '',
                bundle: '',
                iceType: 'standard-ice',
                crypto: 'sdes-sbc',
                conferenceFactoryURI: 'sip:ALU_CONF@foundry.att.com'
            };

            if (typeof att.config.settings.sessionConfig === 'undefined') {
                var uri = "ws://12.230.212.85:8080/ws";
                var mediaTypes = 'audio,video';
                att.config.settings.sessionConfig = {
                    'uri': uri,
                    'provider': orcaALU,
                    'mediaTypes': mediaTypes,
                    'providerConfig': mediaOptions
                };
            }

            att.aluBackend.session = orca.createSession(user.publicId, token, att.config.settings.sessionConfig);
            var sessionBind = att.aluBackend.bindNumberToSession.bind(att);
            att.aluBackend.sessionId = this.sessionId;

            sessionBind(user.number, att.aluBackend.sessionId, function() {
                att.aluBackend.session.connect();
            });

            att.aluBackend.session.onConnected = function(event) {
                console.log("[ALU Plug] ALU ORCA Session Ready");
                att.aluBackend.connected = true;
                att.emit('phoneReady');
            }

            att.aluBackend.session.onDisconnected = function(event) {
                console.log("[ALU Plug] ALU ORCA Session closed");
                att.aluBackend.connected = false;
                att.emit("callEnd");
            }

            att.aluBackend.session.onError = function(status, event) {
                console.log("[ALU Plug] ALU ORCA Session failure");
                console.debug("att.aluBackend.session::onError() trigerred.");
                att.aluBackend.connected = false;
                console.debug(status);
                console.debug(event);
                att.emit("phoneError")
            }

            att.aluBackend.session.onStatus = function(status, event) {
                console.debug("att.aluBackend.session::onStatus() trigerred")
                console.debug(status);
                console.debug(event);
            }

            att.aluBackend.session.onIncoming = function(call, event) {
                console.log('[ALU Plug] Receive new incoming call')
                console.debug("att.aluBackend.session::onIncoming() trigerred")
                console.debug(call);
                console.debug(event);
                call.isIncoming = true;
                var normalizeHandlers = att.aluBackend.normalizeHandlers.bind(att);
                normalizeHandlers(call, event);
            }

        });
    });

})(ATT, jQuery);
