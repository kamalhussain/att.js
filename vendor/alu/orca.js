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

<<<<<<< HEAD
/* $Id: orca.js 299 2013-12-10 08:49:31Z xiangcwa $ */
=======
/* $Id: orca.js 265 2013-10-14 09:50:52Z xiangcwa $ */
>>>>>>> 24f75b01404601add022a72edf46deb1bbdeed7f
/*jslint browser: true, sloppy: true, undef: true */

(function () {
    var orca, SessionStatus, SessionError, CallStatus, CallError;

    /**
    * @summary Provides access to media control functions during a call
    * @classdesc ManagedStream objects are obtained by calling the
    * {@Link orca.createManagedStream} method or handling the onAddStream event of a
    * {@Link orca.Call} ({@Link orca.Call#event:onAddStream}). They are also created
    * implicitly when passing a raw RTCMediaStream to the {@Link orca.Call#addStream} method.
    * @constructor
    * @memberOf orca
    * @param {RTCMediaStream} rtcMediaStream the underlying WebRTC runtime MediaStream instance  
    */
    function ManagedStream(rtcMediaStream) {

        /**
        * @summary Gets the types of media associated with this instance as a comma-separated
        * list, e.g. "audio,video"
        * @returns {string}
        */
        this.type = function () {
            var a = rtcMediaStream.getAudioTracks().length > 0,
                v = rtcMediaStream.getVideoTracks().length > 0;
            if (a) {
                if (v) {
                    return 'audio,video';
                }
                return 'audio';
            }
            if (v) {
                return 'video';
            }
            return '';
        };

        /**
        * @summary Restarts transmission of the media content after it has been stopped
        */
        this.resume = function () {
            setTrackListEnabled(rtcMediaStream.getAudioTracks(), true);
            setTrackListEnabled(rtcMediaStream.getVideoTracks(), true);
        };

        /**
        * @summary Halts transmission of the media content during a call
        * 
        */
        this.stop = function () {
            setTrackListEnabled(rtcMediaStream.getAudioTracks(), false);
            setTrackListEnabled(rtcMediaStream.getVideoTracks(), false);
        };

        /**
        * Gets the underlying WebRTC MediaStream
        * @returns {RTCMediaStream}
        */
        this.stream = function () {
            return rtcMediaStream;
        };
    }

    /** 
    *
    * @classdesc Session objects are obtained by calling the {@Link orca.createSession} method
    * @summary Manages communications for a given user identity
    * @constructor
    * @memberOf orca
    */
    function Session(userid, token, sessionConfig) {
        var sessionImp = sessionConfig.provider.createSession(userid, token, sessionConfig, this);

        /**
        * Activates the communications session with a gateway server. In Orca ALU, this sends a
        * SIP REGISTER request.
        * @method
        */
        this.connect = function () {
            return sessionImp.connect();
        };

        /**
        * Creates a new call instance for communication with the specified recipient
        * @param {string} to the user identifier of the call recipient. In Orca ALU, this is the
        * user's public ID.
        * @param {string} mediatypes Comma-separated list of media stream types to be used during
        * the call e.g. "audio,video".
        */
        this.createCall = function (to, mediatypes) {
            return new Call(to, mediatypes, sessionImp);
        };

        /**
        * Ends and active communications session with a gateway server. In Orca ALU, this does an
        * unregister.
        */
        this.disconnect = function () {
            return sessionImp.disconnect();
        };

        /**
        * @summary Retrieves the current status of this session
        * @returns {SessionStatus}
        */
        this.getStatus = function () {
            return sessionImp.getStatus();
        };

        /**
        * @summary Triggered when the session is connected successfully
        * @event
        * @param {Event} event event data
        */
        this.onConnected = function (event) {
        };

        /**
        * @summary Triggered when the session is disconnected
        * @event
        * @param {Event} event event data
        *
        */
        this.onDisconnected = function (event) {
        };

        /**
        * @Summary Triggered when an error condition occurs
        * @event
        * @param {SessionError} status Indicates the error that caused the event
        * @param {Event} event event data
        */
        this.onError = function (error, event) {
        };

        /**
        * Triggered when an incoming communication is received during an active session
        * @event
        * @param {orca.Call} receivedCall incoming call object
        * @param {Event} event event data
        */
        this.onIncoming = function (receivedCall, event) {
        };

        /**
        * @summary Triggered when a change in the call state occurs
        * Examples of changes in call state are: Hold (call is placed on hold), Unhold (call is
        * taken off hold)
        * @event
        * @param {SessionStatus} status Indicates the state that triggered the event
        * @param {Event} event event data
        */
        this.onStatus = function (status, event) {
        };
    }



    /**
    * @summary Provides access to methods for managing an outgoing or incoming call
    * @classdesc Calls objects are obtained by calling the {@Link orca.Session#createCall}
    * method or handling the onIncoming event of a connected {@Link orca.Session} instance
    * ({@Link orca.Session#event:onIncoming})
    * @Constructor
    * @memberOf orca
    */
    function Call(to, mediatypes, sessionImp) {
        var callImp = sessionImp.createCall(to, mediatypes, sessionImp, this),
            id = generateCallId(),
            localStreams = [];

        /**
        * Gets a unique identifier for the call 
        * @type {string}
        */
        this.id = function () {
            return id;
        };

        /**
        * Gets the identities of the remote peers attached to this call
        * @returns {PeerIdentity[]}
        */
        this.remoteIdentities = function () {
            return callImp.remoteIdentities();
        };

        /**
        * Adds a local media stream to the call. 
        * Media stream instances are obtained from the browser's getUserMedia() method.
        * Local media streams should be added using this method before the connect method 
        * is called to either initiate a new call or answer a received call. 
        * If a RTCMediaStream is passed to this function, it will be converted to a ManagedStream.
        * In Orca ALU, this method may be used during an active call to replace the outgoing media 
        * stream with a new one, allowing an upgrade from an audio to a video call for example.
        * @param {(orca.ManagedStream|RTCMediaStream)} stream local media stream
        * @returns {orca.ManagedStream}
        */
        this.addStream = function (stream) {
            var managed = stream;
            if (stream !== null) {
                if (stream.constructor.name !== 'ManagedStream') {
                    managed = orca.createManagedStream(stream);
                }
                localStreams.push(managed);
                if (typeof callImp.addStream === 'function') {
                    callImp.addStream(managed);
                }
                return managed;
            }
        };

        /**
        * @private
        */
        this.removeStream = function (stream) {
            var managed = stream;
            if (stream !== null) {
                if (typeof callImp.removeStream === 'function') {
                    callImp.removeStream(managed);
                }
                localStreams.shift();
            }
        };

        /**
        * Attempts to reach the call recipient and establish a connection. 
        * For an incoming call, calling this method explicitly joins/accepts the call.
        */
        this.connect = function () {
            return callImp.connect();
        };

        /**
        * Ends an active call.
        */
        this.disconnect = function () {
            return callImp.disconnect();
        };

        /**
        * Called when a user does not wish to accept an incoming call. 
        */
        this.reject = function () {
            return callImp.reject();
        };

        /**
        * Retrieves a list of streams associated with this call.
        * The return value is an array of ManagedStream instances with undefined order
        * When no selector parameter is provided all local and remote streams are included
        * in the returned array.
        * The keywords *local* and *remote* can be specified to limit the results to local or 
        * remote streams respectively.
        * The *.* (period) symbol is used to prefix a keyword used to limit the results by the
        * stream type.  E.g. ".video" would be used to return a list of streams with video tracks.
        * The *#* (pound) symbol is used to prefix label text used to limit the results to a 
        * to a single stream with a label matching the specified text.
        * 
        * @param {string} selector optional query to filter the result list
        * @returns {orca.ManagedStream[]}
        * @example
        * // Get list of all local streams
        * var localStreams = call.streams("local");
        *
        * // Get list of all audio streams
        * var audioStreams = call.streams(".audio");
        * 
        * // Get stream with by its label name
        * // If successful only one match should be
        * // returned
        * var stream0 = call.streams("#stream_0");
        * if (stream0 && stream0.length == 1) {
        * ...
        * }
        * 
        * // Possible to support combined selections?
        * // Get list of local audio streams
        * var localAudio = call.streams("local.audio");
        */
        this.streams = function (selector) {
            var result = [], el = '', id = '', audio = false, video = false;
            if (selector && typeof selector === 'string') {
                el = selector.match(/^[0-9a-zA-Z]*/)[0].toLowerCase();
                id = selector.match(/#[0-9a-zA-Z]*/);
                if (id) {
                    id = id[0].substring(1);
                } else {
                    id = '';
                }
                audio = selector.match(/\.audio([#.\s]|$)/) ? true : false;
                video = selector.match(/\.video([#.\s]|$)/) ? true : false;
            }
            if (el !== 'local') {
                selectStreams(callImp.remoteStreams(), result, id, audio, video);
            }
            if (el !== 'remote') {
                selectStreams(localStreams, result, id, audio, video);
            }
            return result;
        };

        /**
        * Retrieves the current status of this call
        * @returns {CallStatus}
        */
        this.getStatus = function () {
            return callImp.getStatus();
        };

        /**
        * Gets the media stream types used in this call as a comma-separated list, e.g.
        * "audio,video". (Orca ALU feature, not in standard Orca.)
        * @returns {string}
        */
        this.getMediaTypes = function () {
            return callImp.getMediaTypes();
        };

        /**
        * Add a new participant to a group call of which you are the initiator. (Orca ALU
        * feature, not in standard Orca.)
        * @param {string} target The user to add
        */
        this.addParticipant = function (target) {
            return callImp.addParticipant(target);
        };

        /**
        * Remove a participant from a group call of which you are the initiator. (Orca ALU
        * feature, not in standard Orca.)
        * @param {string} target The user to remove
        */
        this.removeParticipant = function (target) {
            return callImp.removeParticipant(target);
        };

        /**
        * Send DTMF. (Orca ALU feature, not in standard Orca.)
        * @param {string} dtmf The DTMF to send
        */
        this.sendDTMF = function (dtmf) {
            return callImp.sendDTMF(dtmf);
        };

        /**
        * Blind transfer a call via SIP REFER request. (Orca ALU feature, not in standard Orca.)
        * @param {string} target the user identifier to transfer the call to
        */
        this.transfer = function (target) {
            return callImp.transfer(target);
        };

        /**
         *  Locally mute audio and/or video. (Orca ALU feature, not in standard Orca.)
         */
        this.mute = function (media_types) {
            var streams = this.streams('local'), i;
            if (media_types === undefined) {
                // no argument provided so mute both
                for (i = 0; i < streams.length; i += 1) {
                    streams[i].stop();
                }
                return;
            }
            if (media_types.indexOf('audio') >= 0) {
                // Muting audio
                for (i = 0; i < streams.length; i += 1) {
                    setTrackListEnabled(streams[i].stream().getAudioTracks(), false);
                }
            }
            if (media_types.indexOf('video') >= 0) {
                // Muting video
                for (i = 0; i < streams.length; i += 1) {
                    setTrackListEnabled(streams[i].stream().getVideoTracks(), false);
                }
            }
        };

        /**
         *  Locally un-mute audio and/or video. (Orca ALU feature, not in standard Orca.)
         */
        this.unmute = function (media_types) {
            var streams = this.streams('local'), i;
            if (media_types === undefined) {
                // no argument provided so mute both
                for (i = 0; i < streams.length; i += 1) {
                    streams[i].resume();
                }
                return;
            }
            if (media_types.indexOf('audio') >= 0) {
                // Un-Muting audio
                for (i = 0; i < streams.length; i += 1) {
                    setTrackListEnabled(streams[i].stream().getAudioTracks(), true);
                }
            }
            if (media_types.indexOf('video') >= 0) {
                // Un-Muting video
                for (i = 0; i < streams.length; i += 1) {
                    setTrackListEnabled(streams[i].stream().getVideoTracks(), true);
                }

            }
        };

        /**
        * Places a call on hold. (Orca ALU feature, not in standard Orca.)
        */
        this.hold = function (type) {
            callImp.hold(type);
        };

        /**
        * Takes a call off hold. (Orca ALU feature, not in standard Orca.)
        */
        this.resume = function () {
            callImp.resume();
        };

        /**
        * Create data channel. (Orca ALU feature, not in standard Orca.)
        */
        this.createDataChannel = function () {
            callImp.createDataChannel();
        };

        /**
        * Sends text message via data channel. (Orca ALU feature, not in standard Orca.)
        */
        this.sendMessage = function (msg) {
            callImp.sendMessage(msg);
        };

        /**
        * Sends binary file via data channel. (Orca ALU feature, not in standard Orca.)
        */
        this.sendFile = function (url) {
            callImp.sendFile(url);
        };

        /**
        * @summary Triggered when a remote stream is added to the call
        * @event
        * @param {orca.ManagedStream} stream remote media stream
        * @param {Event} event event data
        */
        this.onAddStream = function (stream, event) {
        };

        /**
        * @summary Triggered when a call is connected
        * @event
        * @param {Event} event event data
        */
        this.onConnected = function (event) {
        };

        /**
        * @summary Triggered when a call is disconnected
        * @event
        * @param {Event} event event data
        */
        this.onDisconnected = function (event) {
        };

        /**
        * @summary Triggered when an error condition occurs
        * @event
        * @param {CallError} status Indicates the error that caused the event
        * @param {Event} event event data
        */
        this.onError = function (error, event) {
        };

        /**
        * Triggered when a change in the session state occurs
        * @event
        * @param {CallStatus} status Indicates the state that caused the event
        * @param {Event} event event data
        */
        this.onStatus = function (status, event) {
        };

        /**
        * Triggered when a change in the session state occurs
        * @event
        * @param {Event} event event data
        */
        this.onMessage = function (event) {
        };
    }

    /**
    * @private
    */
    function generateCallId() {
        var id = '', i,
            an = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (i = 0; i < 8; i += 1) {
            id += an.charAt(Math.floor(Math.random() * an.length));
        }
        return id;
    }

    /**
    * @private
    */
    function setTrackListEnabled(tracklist, value) {
        var i;
        for (i = 0; i < tracklist.length; i += 1) {
            tracklist[i].enabled = value;
        }
    }

    /**
    * @private
    */
    function selectStreams(list, result, id, audio, video) {
        var i, stream;
        for (i = 0; i < list.length; i += 1) {
            stream = list[i].stream();
            if ((id === '' || stream.id === id) &&
                    (!audio || stream.getAudioTracks().length > 0) &&
                    (!video || stream.getVideoTracks().length > 0)) {
                result.push(list[i]);
            }
        }
    }

    /**
    * @summary Possible errors associated with an orca.Call
    * @typedef CallError
    * @type enum 
    * @property {string} NETWORK_ERROR An error has occured 
    */
    CallError = {};
    CallError.NETWORK_FAILURE = 'call_error_network_failure';

    /**
    * @summary Possible states of an orca.Call
    * @typedef CallStatus
    * @type enum 
    * @property {string} CONNECTING The call is in the process of connecting to the remote party
    * @property {string} HOLD The call has been placed on hold by the local party
    * @property {string} UNHOLD The call has been taken out of the "on hold" state (Not returned
    * by Call.getStatus, as not a persistent state)
    * @property {string} REJECTED The call refused by the remote party (Not returned by 
    * Call.getStatus, as not a persistent state)
    * @property {string} CONNECTED The call is connected to the remote party
    * @property {string} DISCONNECTED The call is terminated
    * @property {string} REMOTE_HOLD The call has been placed on hold by the remote party (Orca
    * ALU only, not in standard Orca)
    * @property {string} UPGRADING Received an invitation to upgrade to an audiovideo call. At
    * this point, an updated media stream should be attached using {@Link orca.Call#addStream}
    * (Not returned by Call.getStatus, as not a persistent state) (Orca ALU only, not in
    * standard Orca)
    * @property {string} DOWNGRADING Received an invitation to downgrade to an audio-only call.
    * At this point, an updated media stream should be attached using {@Link orca.Call#addStream}
    * (Not returned by Call.getStatus, as not a persistent state) (Orca ALU only, not in standard
    * Orca)
    * @property {string} ADDSTREAM Received a media stream from the remote party (Not returned by
    * Call.getStatus, as not a persistent state) (Orca ALU only, not in standard Orca)
    */
    CallStatus = {};
    CallStatus.CONNECTING = 'call_status_connecting';
    CallStatus.HOLD = 'call_status_hold';
    CallStatus.UNHOLD = 'call_status_unhold';
    CallStatus.REJECTED = 'call_status_rejected';
    CallStatus.CONNECTED = 'call_status_connected';
    CallStatus.DISCONNECTED = 'call_status_disconnected';
    CallStatus.REMOTE_HOLD = 'call_status_remote_hold';
    CallStatus.UPGRADING = 'call_status_upgrading';
    CallStatus.DOWNGRADING = 'call_status_downgrading';
    CallStatus.ADDSTREAM = 'call_status_add_stream';

    /**
    * @summary Provides information about an event. (This describes a data type. It is not
    * accessible as a global object.)
    * @typedef Event
    * @type object 
    * @property {(CallStatus|SessionStatus)} name Gets the name/type indicator of the event
    */

    /**
    * @summary Provides information about the identity of a communications peer. (This describes a
    * data type. It is not accessible as a global object.)
    * @typedef PeerIdentity
    * @type object 
    * @property {string} id the unique identifier or address string of the associated user
    */

    /**
    * @summary Possible errors associated with an orca.Session
    * @typedef SessionError
    * @type enum 
    * @property {string} AUTHENTICATION_FAILED User credentials are invalid
    * @property {string} NETWORK_ERROR No response recieved within maximum expected time
    */
    SessionError = {};
    SessionError.AUTHENTICATION_FAILED = 'session_error_authentication_failed';
    SessionError.NETWORK_ERROR = 'session_error_network_error';

    /**
    * @summary Possible states of an orca.Session
    * @typedef SessionStatus
    * @type enum 
    * @property {string} CONNECTED The session has been successfully established
    * @property {string} CONNECTING The session is in the process of being established
    * @property {string} DISCONNECTED The session has been torn down
    * @property {string} INCOMINGCALL The session has received an incoming call (Not returned by
    * Session.getStatus, as not a persistent state)
    */
    SessionStatus = {};
    SessionStatus.CONNECTED = 'session_status_connected';
    SessionStatus.CONNECTING = 'session_status_connecting';
    SessionStatus.DISCONNECTED = 'session_status_disconnected';
    SessionStatus.INCOMINGCALL = 'session_status_incoming_call';

    /**
    * @summary Configuration properties for an orca.Session. (This describes a data type. It is
    * not accessible as a global object.)
    * @typedef SessionConfig
    * @type object 
    * @property {string} uri The address of the gateway server
    * @property {object} provider Reference to implementation providing actual functionality
    * @property {string} mediatypes The types of media streams that the created session will
    * support; defaults if not provided
    * @property {ProviderConfig} providerConfig Provider-specific settings
    */

    /**
    * @summary Provider-specific configuration properties for an orca.Session. (This
    * describes a data type. It is not accessible as a global object.)
    * @typedef ProviderConfig
    * @type object 
    * @property {(string|number)} expires Value for the Expires header in the initial SIP
    * REGISTER. Default is '600'.
    * @property {string} conferenceFactoryURI Conference factory public ID, needed for conference
    * calling feature.
    * @property {string} stun The STUN server to use for calls. Defaults to blank (none).
    * @property {boolean} bundle If false, the line "a=group:BUNDLE" is removed from the SDP if
    * present. If true, no change is made. Defaults to true.
    * @property {string} iceType If set to 'google-ice', then the line "a=ice-options:google-ice"
    * is inserted into the SDP if missing. Otherwise no change is made. Default is blank.
    * @property {string} crypto If set to 'sdes-sbc', then a line beginning "a=crypto:0" is
    * removed from the SDP if present. Otherwise no change is made. Default is blank.
    * @property {boolean} addCodecs If set to true, then if VP8 codec is missing from incoming
    * SDP, then all codecs are replaced with the VP8, red, and ulpfec codecs. If false, no change
    * is made. Default is false.
    * @property {boolean} refreshTiled If set to true, then upon the beginning of any call that
    * may have tiled video, a quick hold and unhold are done to force a frame refresh. If false,
    * no special behavior is made. Default is false.
    * @property {string} dtmf Specify the DTMF method to use. Set as 'sip' for SIP INFO, 'inband'
    * for inband, or 'both' for both. Default is both.
    * @property {(string|number)} audioBandwidth The target bandwidth for audio in kilobits per
    * second. Default is unconstrained.
    * @property {(string|number)} videoBandwidth The target bandwidth for video in kilobits per
    * second. Default is unconstrained.
<<<<<<< HEAD
    * @property {boolean} persistentPC If set to false, then a new PeerConnection will be used any
    * time a new local MediaStream is attached. If true, the same PeerConnection will be reused.
    * Default is true.
=======
>>>>>>> 24f75b01404601add022a72edf46deb1bbdeed7f
    */

    /**
    * @summary A user's unique identifier. In Orca ALU, this is the user's public ID. (This
    * describes a data type. It is not accessible as a global object.)
    * @typedef userid
    * @type string
    */

    /**
    * @summary An authorization token associated with the provided userid. In Orca ALU, this is
    * an object containing authorization information for the SIP registration. (This describes a
    * data type. It is not accessible as a global object.)
    * @typedef token
    * @type object
    * @property {string} id The user's private ID
    * @property {string} key The user's password
    * @property {string} imsauth Set as 'sso-token' to add an Authorization header for single
    * sign-on applications. Otherwise the special header is not added. Default is undefined.
    */

    /** 
    * @summary root namespace of the call control SDK
    * @global
    * @namespace 
    */
    orca = {
        /**
        * Create a new session instance for a user to be in connection with the server. 
        * In Orca ALU, this corresponds to a REGISTER session.
        * @param {userid} userid The user's unique identifier. In Orca ALU, this is the user's
        * public ID.
        * @param {token} token An authorization token associated with the provided userid
        * @param {SessionConfig} sessionConfig Session initialization parameters
        * @returns {orca.Session}
        */
        createSession: function (userid, token, sessionConfig) {
            return new Session(userid, token, sessionConfig);
        },

        /**
        * Create a reference to a managed WebRTC media stream that can be attached 
        * to a call. Use of this method is optional, as the Call.addStream method will
        * automatically create a ManagedStream if a raw RTCMediaStream is passed to it.
        * @param {RTCMediaStream} rtcMediaStream Browser media stream
        * @returns {orca.ManagedStream}
        */
        createManagedStream: function (rtcMediaStream) {
            return new ManagedStream(rtcMediaStream);
        }
    };

    this.orca = orca;
    this.SessionStatus = SessionStatus;
    this.SessionError = SessionError;
    this.CallStatus = CallStatus;
    this.CallError = CallError;

}());
