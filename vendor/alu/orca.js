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

(function () {

    /** 
    * 
    * @summary Provides access to media control functions during a call
    * @constructor
    * @memberOf orca
    * @param {RTCMediaStream} rtcMediaStream the underlying WebRTC runtime MediaStream instance  
    */
    function ManagedStream(rtcMediaStream) {
        
        /**
        * @summary Gets the type of media associated with this instance
        * (Isn't 'type' at track level? Can't media streams contain both audio and video? )
        * @returns {String}
        */
        this.type = function() {
            var a = rtcMediaStream.getAudioTracks().length;
            var v = rtcMediaStream.getVideoTracks().length;
            if(a){
                if(v)
                    return 'audio,video';
                else
                    return 'audio';
            }else{
                if(v)
                    return 'video';
                else
                    return '';
            }
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
        this.stream = function() {
            return rtcMediaStream;
        };
    }

    /** 
    *
    * @classdesc Session objects are obtained by calling the createSession method of the global {@Link orca} object
    * @summary Manages communications for a given user identity
    * @constructor
    * @memberOf orca
    */
    function Session(userid, token, sessionConfig) {
        //TODO: cleanup to prevent memory leak from circular reference
        var sessionImp = sessionConfig.provider.createSession(userid, token, sessionConfig, this);
        var preConnect = true;
    
        /**
        * Activates the communications session with a gateway server
        * @method
        */
        this.connect = function () {
            if(preConnect){
                preConnect = false;
                return sessionImp.connect();
            }else{
                this.onError(SessionError.INVALID, {name: 'SessionError', value: SessionError.INVALID});
            }
        };

        /**
        * Creates a new call instance for communication with the specified recipient
        * @param {String} to the user identifier of the call recipient
        * @param {String} mediatypes Comma separated list of media stream types to be used during the call Eg. "audio,video"
        */
        this.createCall = function (to, mediatypes) {
            if(sessionImp){
                return new Call(to, mediatypes, sessionImp);
            }else{
                this.onError(SessionError.INVALID, {name: 'SessionError', value: SessionError.INVALID});
            }
        };

        /**
        * Ends and active communications session with a gateway server
        *
        */
        this.disconnect = function () {
            if(sessionImp){
                return sessionImp.disconnect();
            }else{
                this.onError(SessionError.INVALID, {name: 'SessionError', value: SessionError.INVALID});
            }
        };

        /**
        * @summary Retrieves the current status of this session
        * @returns {SessionStatus}
        */
        this.getStatus = function () {
            if(sessionImp){
                return sessionImp.getStatus();
            }else{
                return SessionStatus.DISCONNECTED;
            }
        };

        /**
        * @summary Triggered when the session is connected successfully
        * (Is this really a status change?)
        * @event
        * @param {Event} event event data
        *
        */
        this.onConnected = function (event) {
        };

        /**
        * @summary Triggered when the session is disconnected
        * (Is this really a status change?)
        * @event
        * @param {Event} event event data
        *
        */
        this.onDisconnected = function (event) {
        };

        /**
        * @Summary Triggered when an error condition occurs
        * Examples of error conditions are: TBD
        * @event
        * @param {SessionError} status Indicates the error that caused the event
        * @param {Event} event event data
        *
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
        * Examples of changes in call state are: Hold (call is placed on hold), Unhold (call is taken off cold)
        * @event
        * @param {SessionStatus} status Indicates the state that triggered the event
        * @param {Event} event event data
        */
        this.onStatus = function (status, event) {
        };
    }

    

    /**
    * @summary Provides access to methods for managing an outgoing or incoming call
    * @classdesc Calls objects are obtained by calling the createCall method or handling the onIncoming event of a connected {@Link orca.Session} instance
    * @Constructor
    * @memberOf orca
    */
    function Call(to, mediatypes, sessionImp) {
        //TODO: cleanup to prevent memory leak from circular reference
        var callImp = sessionImp.createCall(to, mediatypes, sessionImp, this);
        var id = generateCallId();
        var localStreams = [];
        var preConnect = true;

        /**
        * Gets a unique identifier for the call 
        * @type {String}
        */
        this.id = function() {
            return id;
        };
        
        /**
        * Gets the identities of the remote peers attached to this call
        * @returns {PeerIdentity[]}
        */
        this.remoteIdentities = function() {
            if(callImp){
                return callImp.remoteIdentities();
            }else{
                return [];
            }
        };
        
        /**
        * Adds a local media stream to the call
        * Media stream instances are obtained from the browser's getUserMedia() method.
        * Local media streams should be added using this method before the connect method 
        * is called to either initiate a new call or answer a received call.
        * (NOTE: Possible to accept RTCMediaStream as parameter to this method and
        * create ManagedStream internally)
        * @param {orca.ManagedStream} stream local media stream 
        */
        this.addStream = function (stream) {
            var managed = stream;
            if(stream !== null){
                if(stream.constructor.name !== 'ManagedStream'){
                    managed = orca.createManagedStream(stream);
                }
                localStreams.push(managed);
                if(typeof callImp.addStream == 'function'){
                    callImp.addStream(managed);
                }
                return managed;
            }
        };

        this.removeStream = function (stream) {
            var managed = stream;
            if(stream !== null){
                if(typeof callImp.removeStream == 'function'){
                    callImp.removeStream(managed);
                }
                localStreams.shift();//TODO: suppose it should be only one instance
                console.log('removeStream() localStream.length:' + localStreams.length);
            }
        };

        /**
        * Attempts to reach the call recipient and establish a connection
        * For an incoming call, calling this method explicitly joins/accepts the call
        */
        this.connect = function () {
            if(preConnect){
                //preConnect = false;
                return callImp.connect();
            }else{
                this.onError(CallError.INVALID, {name: 'CallError', value: CallError.INVALID});
            }
        };

        /**
        * Ends an active call
        *
        */
        this.disconnect = function () {
            if(callImp){
                return callImp.disconnect();
            }else{
                this.onError(CallError.INVALID, {name: 'CallError', value: CallError.INVALID});
            }
        };
        
        /**
        * Called when a user does not wish to accept an incoming call
        *
        */
        this.reject = function () {
            if(callImp){
                return callImp.reject();
            }else{
                this.onError(CallError.INVALID, {name: 'CallError', value: CallError.INVALID});
            }
        };

        /**
        * Retrieves a list of streams associated with this call.
        * The return value is an array of ManagedStream instances with undefined order
        * When no selector parameter is provided all local and remote streams are included
        * in the returned array.
        * The keywords *local* and *remote* can be specified to limit the results to local or 
        * remote streams respectively.
        * The *.* (period) symbol is used to prefix a keyword used to limit the results by the
        * stream type.  E.g. ".video" would be used to return a list of video streams only.
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
        this.streams = function(selector) {
			var result = [], el = '', id = '', audio = false, video = false;
            if(selector && typeof selector == 'string'){
				el = selector.match(/^[^#.\s]*/)[0].toLowerCase();
				id = selector.match(/#[^#.\s]*/);
				if(id)
					id = id[0].substring(1);
				else
					id = '';
				audio = selector.match(/\.audio([#.\s]|$)/) ? true : false;
				video = selector.match(/\.video([#.\s]|$)/) ? true : false;
			}
			if(el != 'local')
				selectStreams(callImp.remoteStreams(), result, id, audio, video);
			if(el != 'remote' && callImp && typeof callImp.remoteStreams == 'function')
				selectStreams(localStreams, result, id, audio, video);
			return result;
        };

        /**
        * Retrieves the current status of this call
        * @returns {CallStatus}
        */
        this.getStatus = function () {
            if(callImp){
                return callImp.getStatus();
            }else{
                return CallStatus.DISCONNECTED;
            }
        };
	
        /**
        * Gets the media stream types used in this call
        * @returns {string}
        */
        //TODO: discuss API change with Orca working group
        this.mediaTypes = function () {
            if (typeof callImp.mediaTypes != 'function') {
                warning('mediaTypes is not implemented');
                return '';
            }
            return callImp.mediaTypes.apply(callImp, arguments);
        };
        
        /**
        * Add a new participant to a group call of which you are the initiator.
        * @param {string} target The user to add
        */
        //TODO: discuss API change with Orca working group
        this.addParticipant = function (target) {
            if(callImp){
                return callImp.addParticipant(target);
            }
        };
        
        /**
        * Remove a participant from a group call of which you are the initiator.
        * @param {string} target The user to remove
        */
        //TODO: discuss API change with Orca working group
        this.removeParticipant = function (target) {
            if(callImp){
                return callImp.removeParticipant(target);
            }
        };
        
        /**
        * Send DTMF.
        * @param {string} dtmf The DTMF to send
        */
        //TODO: discuss API change with Orca working group
        this.sendDTMF = function (dtmf) {
            if(callImp){
                return callImp.sendDTMF(dtmf);
            }
        }

        /**
        * Blind transfer a call via SIP REFER request.
        * @param {string} target the user identifier to transfer the call to
        */
        //TODO: discuss API change with Orca working group
        this.transfer = function(target) {
            if(callImp){
                return callImp.transfer(target);
            }
        }

        /**
        * Upgrade to audiovideo call
        */
		//TODO: discuss API change with Orca working group
        this.startVideo = function() {
            if(callImp){
                return callImp.startVideo();
            }
        };

        /**
        * Downgrade to audio call
        */
		//TODO: discuss API change with Orca working group
        this.stopVideo = function() {
            if(callImp){
                return callImp.stopVideo();
            }
        };
        
		/**^
         *  Locally mute audio and/or video
         */
        this.mute = function( media_types ) {
				var streams = this.streams('local');

                if ( media_types === undefined )
                {
                        // no argument provided so mute both    
                        console.debug("Entered mute() no arguments, so muting both audio and video");
                        for ( i = 0; i < streams.length; i++ )
                        {
                                streams[i].stop();
                        }

                        return;
                }

                console.debug("Entered mute() media_types = " + media_types );

                if ( media_types.indexOf( "audio" ) >= 0 )
                {
                        console.debug("Muting audio");
                        for ( i = 0; i < streams.length; i++ )
                        {
                                setTrackListEnabled(streams[i].stream().getAudioTracks(), false);
                        }

                }

		        if ( media_types.indexOf( "video" ) >= 0 )
                {
                        console.debug("Muting video");
                        for ( i = 0; i < streams.length; i++ )
                        {
                                setTrackListEnabled(streams[i].stream().getVideoTracks(), false);
                        }

                }            
        }

        /**
         *  Locally un-mute audio and/or video
         */
        this.unmute = function( media_types ) {
         
				var streams = this.streams('local');

                if ( media_types === undefined )
                {
                        // no argument provided so mute both    
                        console.debug("Entered unmute() no arguments, so unmuting both audio and video");
                        for ( i = 0; i < streams.length; i++ )
                        {
                                streams[i].resume();
                        }

                        return;
                }

                console.debug("Entered unmute() media_types = " + media_types );

                if ( media_types.indexOf( "audio" ) >= 0 )
                {
                        console.debug("Un-Muting audio");
                        for ( i = 0; i < streams.length; i++ )
                        {
                                setTrackListEnabled(streams[i].stream().getAudioTracks(), true);
                        }

                }

                if ( media_types.indexOf( "video" ) >= 0 )
                {
                        console.debug("Un-Muting video");
                        for ( i = 0; i < streams.length; i++ )
                        {
                                setTrackListEnabled(streams[i].stream().getVideoTracks(), true);
                        }

                }	
				
        }

	/**
	* Places a call on hold
	*/
        this.hold = function( type ) {
		console.debug("Entered call.hold type =" + type );
		callImp.hold( type );
	}

	/**
	* Takes a call off hold
	*/
        this.resume = function( ) {
		console.debug("Entered call.resume");
		callImp.resume();
	}
		
        /**
        * @summary Triggered when a remote stream is added to the call
        * @event
        * @param {orca.ManagedStream} stream remote media stream
        * @param {Event} event event data
        *
        */
        this.onAddStream = function (stream, event) {
        };

        /**
        * @summary Triggered when a call is connected
        * 
        * @event
        * @param {Event} event event data
        *
        */
        this.onConnected = function (event) {
        };

        /**
        * @summary Triggered when a call is disconnected
        * 
        * @event
        * @param {Event} event event data
        *
        */
        this.onDisconnected = function (event) {
        };

        /**
        * @summary Triggered when an error condition occurs
        * Examples of error conditions are: TBD
        * @event
        * @param {CallError} status Indicates the error that caused the event
        * @param {Event} event event data
        *
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


    }

    /**
    * @private
    */
    var generateCallId = function(){
        var id = '';
        var an = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for(var i=0; i < 8; i++)
            id += an.charAt(Math.floor(Math.random() * an.length));
        return id;
    }

	/**
	* @private
	*/
	var setTrackListEnabled = function(tracklist, value){
		for(var i=0; i<tracklist.length; i++){
			tracklist[i].enabled = value;
		}
	};

	/**
	* @private
	*/
	var selectStreams = function(list, result, id, audio, video) {
		for(var i=0; i<list.length; i++){
			var stream = list[i].stream();
			if(id && stream.id != id)
				continue;
			if(audio && !stream.getAudioTracks().length)
				continue;
			if(video && !stream.getVideoTracks().length)
				continue;
			result.push(list[i]);
			if(id)
				break;
		}
	};

    /**
    *
    * @summary Possible errors associated with a orca.Call
    * @typedef CallError
    * @type enum 
    * @property {String} NETWORK_ERROR An error has occured 
    * 
    */
    CallError = {};
    CallError.NETWORK_FAILURE = '0';
    CallError.INVALID = '1';

    /**
    *
    * @summary Possible states of a orca.Call
    * @typedef CallStatus
    * @type enum 
    * @property {String} CONNECTING The call is in the process of connecting to the remote party
    * @property {String} HOLD The call has been placed on hold
    * @property {String} UNHOLD The call has been taken out of the "on hold" state
    * @property {String} REJECTED The call refused by the remote party
    * @property {String} CONNECTED The call is connected to the remote party
    * @property {String} DISCONNECTED The call is terminated
    */
    CallStatus = {};
    CallStatus.CONNECTING = '0';
    CallStatus.HOLD = '1';
    CallStatus.UNHOLD = '2';
    CallStatus.REJECTED = '3';
    CallStatus.CONNECTED = '4';
    CallStatus.DISCONNECTED = '5';
    
    /**
    *
    * @summary Provides information about an event
    * @typedef Event
    * @type object 
    * @property {String} name Gets the name/type indicator of the event
    */
    
    /**
    *
    * @summary Provides information about the identity of a communications peer
    * @typedef PeerIdentity
    * @type object 
    * @property {String} id the unique identifier or address string of the associated user
    * 
    */

    /**
    *
    * @summary Possible errors associated with a orca.Session
    * @typedef SessionError
    * @type enum 
    * @property {String} AUTHENTICATION_FAILED User credentials are invalid
    * @property {String} NETWORK_ERROR No response recieved within maximum expected time
    * @property {String} INVALID Insufficient information, or cannot reuse Session
    * 
    */
    SessionError = {};
    SessionError.AUTHENTICATION_FAILED = '0';
    SessionError.NETWORK_ERROR = '1';
    SessionError.INVALID = '2';

    /**
    *
    * @summary Possible states of a orca.Session
    * @typedef SessionStatus
    * @type enum 
    * @property {String} CONNECTED The session has been successfully established
    * @property {String} CONNECTING The session is in the process of being established
    * @property {String} DISCONNECTED The session has been torn down
    * @property {string} INCOMINGCALL The session has received an incoming call
    */
    SessionStatus = {};
    SessionStatus.CONNECTED = '0';
    SessionStatus.CONNECTING = '1';
    SessionStatus.DISCONNECTED = '2';
    SessionStatus.INCOMINGCALL = '3';

    /**
    *
    * @summary Configuration properties for a orca.Session
    * @typedef SessionConfig
    * @type object 
    * @property {String} uri The address of the gateway server
    * @property {Object} provider Reference to implementation providing actual functionality
    * @property {String} mediatypes The types of media streams that the created session will support; defaults if not provided
    */

    /** 
    * @summary root namespace of the call control SDK
    * @global
    * @namespace 
    */
    var orca = {
        /**
        * allow creation of multiple sessions in a single page; 
        * possibly limit repeated registrations using the same identity
        * @param {userid} userid The user's unique identifier
        * @param {token} token An authorization token associated with the provided userid
        * @param {SessionConfig} sessionConfig session initialization parameters
        * @returns {orca.Session}
        */
        createSession: function (userid, token, sessionConfig) {
            return new Session(userid, token, sessionConfig);
        },

        /**
        * Create a reference to a WebRTC media stream that can be attached 
        * to a call
        * @param {RTCMediaStream} rtcMediaStream Browser media stream
        * @returns {orca.ManagedStream}
        */
        createManagedStream: function(rtcMediaStream) {
            return new ManagedStream(rtcMediaStream);
        }

    };

    this.orca = orca;

})();
