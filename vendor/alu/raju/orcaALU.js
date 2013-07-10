/*
 * orca.js
 *
 * Copyright 2012, ALU 5900 Media Server team (http://www.alcatel-lucent.com)
 *
 * https://acos.alcatel-lucent.com/wiki/g/flashgateway/HomePage
 *   
 * $Id: orca.js 167 2013-04-24 19:01:35Z skapauan $
 */

/*jslint devel: true */

(function() {
    /*global SessionStatus, SessionError, CallStatus, CallError, WebSocket, Call, sip, localStorage, orca, setTimeout, 
     webkitRTCPeerConnection, webkitPeerConnection00, RTCSessionDescription, SessionDescription, window, DOMParser,
     XMLSerializer, ActiveXObject, document, ResourceList, Multipart*/

    var previousCall = null;

    // ManagedStream is implemented in orca.js

    /** 
     *
     * @classdesc Session objects are obtained by calling the createSession method of the global {@Link orca} object
     * @summary Manages communications for a given user identity
     * @constructor
     * @param {Userid} userid The user's unique identifier
     * @param {Token} token An authorization token associated with the provided userid
     * @param {SessionConfig} sessionConfig session initialization parameters
     * @memberOf orca
     */
    function Session(userId, token, config, callback) {
        this.callback = callback;

        /**
         *
         * @summary Possible states of a WebSocket connection
         * @typedef WebSocketStatus
         * @type enum 
         * @property {string} CONNECTED The WebSocket connection is established
         * @property {string} CONNECTING The WebSocket connection is in the process of being established
         * @property {string} DISCONNECTED The WebSocket connection has been torn down
         */

        this.WebSocketStatus = {};
        this.WebSocketStatus.DISCONNECTED = '0';
        this.WebSocketStatus.CONNECTING = '1';
        this.WebSocketStatus.CONNECTED = '2';

        /**
         *
         * @summary Possible states of a WebSocket connection
         * @typedef RegisterStatus
         * @type enum 
         * @property {string} UNREGISTERED The web user is not registered on IMS core.
         * @property {string} WAITING The web user registration is in a waiting state.
         * @property {string} REGISTERED The web user is registered on IMS core.
         */

        this.RegisterStatus = {};
        this.RegisterStatus.UNREGISTERED = '0';
        this.RegisterStatus.WAITING = '1';
        this.RegisterStatus.REGISTERING = '2';
        this.RegisterStatus.REGISTERED = '3';

        /**
         * The user's unique identifier.
         * @type string
         * @private 
         */
        this.userId = userId;

        /**
         * An authorization token associated with the provided userid.
         * @type {object}
         * @private 
         */
        this.token = token;

        /**
         * Session initialization parameters.
         * @type {SessionConfig}
         * @private 
         */
        this.config = config;

        /**
         * Session status.
         * @type {SessionStatus}
         * @private 
         */
        this.sessionStatus = SessionStatus.DISCONNECTED;

        /**
         * WebSocket connection status.
         * @type {SocketStatus}
         * @private 
         */
        this.socketStatus = this.WebSocketStatus.DISCONNECTED;


        /**
         * WebSocket connection.
         * @type {WebSocket}
         * @private 
         */
        this.ws = undefined;

        /**
         * Local Address Of Record (AOR).
         * @type string
         * @private 
         */
        this.localAOR = userId;


        /**
         * Internal SIP stack.
         * @type {sip.Stack}
         * @private 
         */
        this.stack = undefined;

        /**
         * SIP User Agent used for registration.
         * @type {sip.UserAgent}
         * @private 
         */
        this.uaReg = null;

        /**
         * SIP Transport protocol.
         * @type string
         * @private 
         */
        this.transport = "ws";

        /**
         * SIP Transport protocol.
         * @type string
         * @private 
         */
        this.userAgent = "ALU ORCA Agent v1";

        /**
         * Listen IP.
         * @type string
         * @private 
         */
        this.listenIp = 'r' + Math.floor(Math.random() * 10000000000) + ".invalid";

        /**
         * Listen Port.
         * @type number
         * @private 
         */
        this.listenPort = 0;

        /**
         * Instance ID
         * @type string
         * @private 
         */
        this.instanceId = undefined;

        /**
         * Session expiration, expressed by seconds.
         * @type number
         * @private 
         */
        this.sessionExpires = 3600;

        /**
         * List of calls.
         * @type Call[]
         * @private 
         */
        this.calls = [];

        var self = this;

        /**
         * Activates the communications session with a gateway server
         * @method
         */
        this.connect = function() {
            console.debug("Session.connect()");
            if (this.socketStatus === this.WebSocketStatus.DISCONNECTED) {
                this.createWebSocket();
            } else {
                console.error("your session is already connecting or connected to the gateway");
            }
        };


        this.createWebSocket = function() {
            console.debug("Session.createWebSocket()");
            var uri = this.config.uri;
            if ((uri.substr(0, 2) !== "ws") && (uri.substr(0, 3) !== "wss")) {
                console.error("URI of the gateway is malformed.");
                return;
            }

            console.debug("connect to " + uri);
            this.ws = new WebSocket(uri, ["sip"]);
            this.socketStatus = this.WebSocketStatus.CONNECTING;

            this.ws.onopen = function(evt) {
                self.onWebSocketOpen(evt);
            };
            this.ws.onclose = function(evt) {
                self.onWebSocketClose(evt);
            };
            this.ws.onerror = function(evt) {
                self.onWebSocketError(evt);
            };
            this.ws.onmessage = function(evt) {
                self.onWebSocketMessage(evt);
            };
        };

        /**
         * Creates a new call instance for communication with the specified recipient
         * @param {string[]} to list of user identifier of the call recipients
         * @param {string} mediatypes Comma separated list of media stream types to be used during the call Eg. "audio,video"
         * @returns {orca.Call}
         */
        this.createCall = function(to, mediatypes, session, callback) {
            console.debug("Session.createCall()");
            var call = new Call(to, mediatypes, session, callback);
            this.calls.push(call);
            return call;
        };

        /**
         * Ends and active communications session with a gateway server
         *
         */
        this.disconnect = function() {
            console.debug("Session.disconnect()");
            if (this.socketStatus !== this.WebSocketStatus.DISCONNECTED) {
                this.unregister();
            } else {
                console.warn("Session.disconnect() Ignoring in this state : " + this.socketStatus);
            }
        };

        /**
         * @summary Retrieves the current status of this session
         * @returns String
         */
        this.getStatus = function() {
            return this.sessionStatus;
        };

        /**
         * @summary Triggered when the WebSocket connection is opened
         * @event
         * @param {Event} evt event
         * @private
         */
        this.onWebSocketOpen = function(evt) {
            console.debug("Session.onWebSocketOpen()");
            this.socketStatus = this.WebSocketStatus.CONNECTED;
            this.sessionStatus = SessionStatus.CONNECTING;
            this.createStack();
            this.register();
        };

        /**
         * @summary Triggered when the WebSocket connection is closed
         * @event
         * @param {Event} evt event
         * @private
         */
        this.onWebSocketClose = function(evt) {
            console.debug("Session.onWebSocketClose(), evt = " + evt);
            var event = {name: evt.data};

            this.sessionStatus = SessionStatus.DISCONNECTED;
            if (this.socketStatus !== this.WebSocketStatus.CONNECTED) {
                console.error("Network failure");
                this.callback.onError(SessionError.NETWORK_ERROR, event);
            } else {
                // TODO How to distinguish the closing of WebSocket connection done by the client or by the server. 
                event = {name: this.sessionStatus};
                this.callback.onStatus(this.sessionStatus, event);
                this.callback.onDisconnected(event);
            }
            this.socketStatus = this.WebSocketStatus.DISCONNECTED;
        };

        /**
         * @summary Triggered when an error occurs on the WebSocket connection
         * @event
         * @param {Event} evt event
         * @private
         */
        this.onWebSocketError = function(evt) {
            console.error("Network failure");
            console.debug("Session.onWebSocketError() network failure, evt = " + evt);
            var event = {name: SessionError.NETWORK_ERROR};
            this.callback.onError(SessionError.NETWORK_ERROR, event);
        };

        /**
         * @summary Triggered when a message is received through the WebSocket connection
         * @event
         * @param {MessageEvent} evt event
         * @private
         */
        this.onWebSocketMessage = function(evt) {
            console.debug("Session.onWebSocketMessage() message = " + evt.data);
            this.stack.received(evt.data, ["127.0.0.1", 0]);
        };

        /**
         * @summary Creates the SIP stack
         * @private
         */
        this.createStack = function() {
            console.debug("Session.createStack()");
            var transportInfo = new sip.TransportInfo(this.listenIp, this.listenPort, this.transport, false, true, true);
            this.stack = new sip.Stack(this, transportInfo);
        };

        /**
         * @summary Sends a SIP request REGISTER to register the web user into the IMS Core.
         * @private
         */
        this.register = function() {
            var outboundProxy, request, event;

            console.debug("Session.register()");
            this.uaReg = new sip.UserAgent(this.stack);
            this.uaReg.localParty = new sip.Address(this.localAOR);
            this.uaReg.remoteParty = new sip.Address(this.localAOR);

            outboundProxy = this.getRouteHeader();
            outboundProxy.value.uri.param.transport = this.transport;
            this.uaReg.routeSet = [outboundProxy];

            request = this.createRegister();
            request.setItem('Expires', new sip.Header(this.sessionExpires.toString(), 'Expires'));
            request.setItem('User-Agent', new sip.Header(this.userAgent, 'User-Agent'));
            console.debug("Session.register() request = " + request);
            //this.params.registerStatus = this.RegisterStatus.REGISTERING;
            this.uaReg.sendRequest(request);
            event = {name: this.sessionStatus};
            this.callback.onStatus(this.sessionStatus, event);
        };

        /**
         * @summary Sends a SIP request REGISTER to unregister the web user into the IMS Core.
         * @private
         */
        this.unregister = function() {
            console.debug("Session.unregister()");
            var request = this.createRegister();
            request.setItem('Expires', new sip.Header("0", 'Expires'));
            request.setItem('User-Agent', new sip.Header(this.userAgent, 'User-Agent'));
            console.debug("Session.unregister() request = " + request);
            //this.params.registerStatus = "unregistering";
            this.uaReg.sendRequest(request);
        };

        /**
         * @summary Creates a SIP request REGISTER.
         * @private
         */
        this.createRegister = function() {
            var request, c;
            console.debug("Session.createRegister()");
            request = this.uaReg.createRequest('REGISTER');
            c = new sip.Header(this.stack.uri.toString(), 'Contact');
            c.value.uri.user = this.getUsername(this.userId);
            this.createInstanceId();
            c.setItem('reg-id', '1');
            c.setItem('+sip.instance', this.instanceId);
            request.setItem('Supported', new sip.Header('path, gruu', 'Supported'));
            request.setItem('Contact', c);
            // Raju:sso-token
            if (this.token.imsauth != undefined && this.token.imsauth == "sso-token") {
                console.debug("this.token.imsauth is set to 'sso-token'\n");
                request.setItem('Authorization', new sip.Header("SSO  " + "token=\"" + this.token.key + "\"", 'Authorization'));
                //request.setItem('Authorization', new sip.Header("SSO " + "username=\"" + this.token.key + "\",token=" + this.token.key, 'Authorization'));
            }
            return request;
        };

        /**
         * @summary Extracts the username part of a URI.
         * @param {string} uri URI
         * @returns {string}
         * @private
         */
        this.getUsername = function(uri) {
            var username1, username2, username3, username4;
            username1 = uri.split('<')[1];
            // remove display name + '<'
            if (username1 === undefined) {
                username1 = uri;
            }
            username2 = username1.split('>')[0];
            // remove '>' + params
            if (username2 === undefined) {
                username2 = username1;
            }
            username3 = username2.split(':')[1];
            // remove 'sip:' scheme
            if (username3 === undefined) {
                username3 = username2;
            }
            username4 = username3.split('@')[0];
            // remove '@' + domain
            if (username4 === undefined) {
                username4 = username3;
            }
            return username4;
        };

        /**
         * @summary Creates a header 'Route' from the username, for a SIP messsage.
         * @param {string} username username
         * @returns {sip.Header}
         * @private
         */
        this.getRouteHeader = function(username) {
            var outboundProxyAddress = this.config.uri.split('/')[2].trim() + ';transport=' + this.transport;
            return new sip.Header("<sip:" + (username ? username + "@" : "") + outboundProxyAddress + ";lr>", 'Route');
        };

        /**
         * @summary Creates a random UUID.
         * @returns {string}
         * @private
         */
        this.createUUID4 = function() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        };

        /**
         * @summary Creates a unique instance ID for the Session.
         * @private
         */
        this.createInstanceId = function() {
            if (!this.instanceId && localStorage !== "undefined") {
                this.instanceId = localStorage.getItem("instance_id");
                if (!this.instanceId) {
                    this.instanceId = "<urn:uuid:" + this.createUUID4() + ">";
                    localStorage.setItem("instance_id", this.instanceId);
                }
            }
        };

        /**
         * @summary Creates a new timer instance.
         * @private
         */
        this.createTimer = function(obj, stack) {
            return new sip.TimerImpl(obj);
        };

        /**
         * @summary Sends data into the WebSocket connection.
         * @private
         */
        this.send = function(data, addr, stack) {
            var message = "=> " + addr[0] + ":" + addr[1] + "\n" + data;
            console.debug("Session.send() message = " + message);
            try {
                this.ws.send(data, addr[0], addr[1]);
            } catch (e) {
                this.ws.send(data);
            }
        };

        /**
         * @summary Writes to console a log message pushed from SIP stack.
         * @private
         */
        this.debug = function(msg) {
            console.debug("[SIP] " + msg);
        };

        /**
         * @summary Receives a SIP response
         * @param {sip.UserAgent} ua User agent instance
         * @param {sip.Message} response SIP response
         * @param {sip.Stack} stack SIP stack instance
         * @private
         */
        this.receivedResponse = function(ua, response, stack) {
            console.debug("Session.receivedResponse()");
            var method, callId, call;
            method = ua.request.method;
            if (method === 'REGISTER') {
                this.receivedRegisterResponse(ua, response);
            } else {
                callId = response.getItem("call-id").value;
                call = this.getCall(callId);
                if (call !== null) {
                    if (method === "INVITE") {
                        call.receivedInviteResponse(ua, response);
                    } else if (method === "BYE") {
                        call.receivedByeResponse(ua, response);
                    } else {
                        console.warn("Session.receivedResponse() Ignoring SIP response for method=" + method);
                    }
                } else {
                    console.warn("Session.ReceivedResponse() Receive a SIP response for a unknow call. Ignore it.");
                }
            }
        };

        /**
         * @summary Receives a SIP REGISTER response
         * @param {sip.UserAgent} ua User agent instance
         * @param {sip.Message} response SIP response
         * @private
         */
        this.receivedRegisterResponse = function(ua, response) {
            //TODO How handle registration refresh (session expiration) ?
            console.debug("Session.receivedRegisterResponse() ua=" + ua);
            var event;
            if (response.isfinal()) {
                if (response.is2xx()) {
                    if (this.sessionStatus === SessionStatus.CONNECTING) {
                        this.sessionStatus = SessionStatus.CONNECTED;
                        event = {name: SessionStatus.CONNECTED};
                        this.callback.onConnected(event);
                        this.callback.onStatus(SessionStatus.CONNECTED, event);
                    } else if (this.sessionStatus === SessionStatus.CONNECTED) {
                        this.ws.close();
                    } else {
                        console.warn("Session.receivedRegisterResponse() Ignore SIP REGISTER response (session status = " + this.sessionStatus + ")");
                    }
                } else {
                    console.debug("Session.receivedRegisterResponse() failed response = " + response.response + " " + response.responsetext);
                    event = {name: SessionStatus.DISCONNECTED};
                    this.callback.onError(SessionError.AUTHENTICATION_FAILED, event);
                    this.callback.onStatus(SessionStatus.DISCONNECTED, event);
                }
            }
        };

        /**
         * @summary Authenticates the web user.
         * @param {sip.UserAgent} ua User agent instance
         * @param {sip.header} header SIP Header
         * @param {sip.Stack} stack SIP stack
         * @private
         */
        this.authenticate = function(ua, header, stack) {
            console.debug("authenticate() username = " + this.token.id + ", password = " + this.token.key);
            header.username = this.token.id;
            header.password = this.token.key;
            return true;
        };


        /**
         * @summary Creates an UAS instance.
         * @param {sip.Message} request received request
         * @param {sip.URI} uri SIP URI
         * @param {sip.Stack} stack SIP stack
         * @private
         */
        this.createServer = function(request, uri, stack) {
            console.debug("createServer() create new UAS instance for method = " + request.method);
            return (request.method !== "CANCEL" ? new sip.UserAgent(stack, request) : null);
        };


        /**
         * @summary Received a SIP request.
         * @param {sip.UserAgent} ua User agent instance
         * @param {sip.Message} request SIP received request
         * @param {sip.Stack} stack SIP stack
         * @private
         */
        this.receivedRequest = function(ua, request, stack) {
            console.debug("Session.receivedRequest()");
            var callId, call, method, event;
            callId = request.getItem("call-id").value;
            call = this.getCall(callId);
            if (call === null) {
                previousCall = true;
                this.callback.createCall(null, null, this);
                call = previousCall;
                previousCall = null;
                this.calls.push(call);
            }

            method = request.method;
            if (method === "INVITE") {
                //event = {}; //TODO event data
                //this.callback.onIncoming(call, event);
                call.receivedInvite(ua, request);
            } else if (method === "BYE") {
                call.receivedBye(ua, request);
                //} else if(method === "MESSAGE") {
                //this.receivedMessage(ua, request);
            } else if (method === "ACK") {
                call.receivedAck(ua, request);
            } else if (method === "INFO") {
                call.receivedInfo(ua, request);
            } else if (method === "NOTIFY") {
                call.receivedNotify(ua, request);
            } else {
                console.warn("Session.receivedRequest() ignoring received request [method= " + method + ", callID = " + request.getItem("call-id").value + "]");
                if (method !== 'ACK') {
                    ua.sendResponse(ua.createResponse(501, "Not Implemented"));
                }
            }
        };


        /**
         * @summary Retrieves the Call instance referenced by it call Id
         * @param {string} callId Call ID
         * @param {orca.Call} Call instance
         * @private
         */
        this.getCall = function(callId) {
            var call = null, i;
            for (i = 0; i < this.calls.length; i += 1) {
                if (this.calls[i].callId === callId) {
                    call = this.calls[i];
                    break;
                }
            }
            return call;
        };


        /**
         * @summary A SIP Dialog has been created. User agent becomes Dialog
         * @param {sip.Dialog} dialog SIP dialog
         * @param {sip.UserAgent} ua SIP user agent
         * @param {sip.Stack} stack SIP stack
         * @private
         */
        this.dialogCreated = function(dialog, ua, stack) {
            var callId, call;
            callId = dialog.callId;
            call = this.getCall(callId);
            if (call !== null) {
                call.dialogCreated(dialog, ua);
                if (ua === call.uaCall) {
                    call.uaCall = dialog;
                }
            } else {
                console.warn("Session.dialogCreated() A dialog has been created but it's not linked with any created Call instance");
            }
        };

        /**
         * @summary SIP request has been canceled.
         * @param {sip.UserAgent} ua SIP user agent
         * @param {sip.Message} request SIP request
         * @param {sip.Stack} stack SIP stack
         * @private
         */
        this.cancelled = function(ua, request, stack) {
            console.debug("Session.cancelled()");
            var callId, call;
            callId = request.getItem("call-id").value;
            call = this.getCall(callId);
            if (call !== null) {
                call.cancelled(ua, request, stack);
            } else {
                console.warn("Session.canceled() A request has been canceled, but it's not linked with any created Call instance");
            }
        };
    }



    /**
     * @summary Provides access to methods for managing an outgoing or incoming call
     * @classdesc Calls objects are obtained by calling the createCall method or handling the onIncoming event of a connected {@Link orca.Session} instance
     * @Constructor
     * @memberOf orca
     */
    function Call(to, mediaTypes, session, callback) {
        this.callback = callback;
        if (previousCall)
            previousCall = this;

        /**
         *
         * @summary Possible internal states of a Call
         * @typedef CallStatus
         * @type enum 
         * @property {string} IDLE Call is idle
         * @property {string} PREPARING_OFFER Call's SDP offer is preparing (waiting for ICE canditates)
         * @property {string} CALLING Call is establishing 
         * @property {string} PREPARING_ANSWER Call's SDP answer is preparing (waiting for ICE canditates)
         * @property {string} ACCEPTED Call is accepted
         * @property {string} CONFIRMED Call is established
         * @property {string} CANCELING Call is canceling
         * @property {string} CANCELED Call is canceled
         * @property {string} FAILED An error occurs during the call establishment
         */

        this.CallStatus = {};
        this.CallStatus.IDLE = 'idle';
        this.CallStatus.PREPARING_OFFER = 'prep-offer';
        this.CallStatus.CALLING = 'calling';
        this.CallStatus.PREPARING_ANSWER = 'prep-answer';
        this.CallStatus.ACCEPTED = 'accepted';
        this.CallStatus.CONFIRMED = 'confirmed';
        this.CallStatus.CANCELING = 'canceling';
        this.CallStatus.CANCELED = 'canceled';
        this.CallStatus.FAILED = 'failed';
        this.CallStatus.REFUSED = 'refused';
        this.CallStatus.TERMINATING = 'terminating';

        /**
         *
         * @summary Possible call direction
         * @typedef CallStatus
         * @type enum 
         * @property {string} INCOMING incoming call
         * @property {string} OUTGOING outgoing call
         */

        this.CallDirection = {};
        this.CallDirection.INCOMING = 'i';
        this.CallDirection.OUTGOING = 'o';

        /**
         *
         * @summary Possible media direction
         * @typedef MediaDirection
         * @type enum 
         * @property {string} SENDRECV Receives and sends media stream
         * @property {string} SENDONLY Sends only media stream
         * @property {string} RECVONLY Receives only media stream
         */

        this.MediaDirection = {};
        this.MediaDirection.SENDRECV = 'sendrecv';
        this.MediaDirection.SENDONLY = 'sendonly';
        this.MediaDirection.RECVONLY = 'recvonly';

        /**
         * List of remote streams associated with this call. 
         * @type {orca.ManagedStream[]}
         * @private
         */
        this.managedStreams = [];

        /**
         * List of ICE Servers.
         * @type {object}
         * @private 
         */
        //this.iceServers = [{"url": "STUN stun.l.google.com:19302"}];
        this.iceServers = null;

        /**
         * Peer connection.
         * @type {RTCPeerConnection}
         * @private 
         */
        this.pc = null;

        /**
         * Parent session.
         * @type {orca.Session}
         * @private 
         */
        this.session = session;

        /**
         * Call status.
         * @type {CallStatus}
         * @private 
         */
        this.callStatus = this.CallStatus.IDLE;

        /**
         * Call direction.
         * @type {CallDirection}
         * @private 
         */
        this.callDirection = undefined;

        /**
         * Saved SDP Offer.
         * @type {string}
         * @private 
         */
        this.sdpOffer = undefined;

        /**
         * Call unique ID.
         * @private 
         */
        this.callId = undefined;

        /**
         * Flag indicating that the call is established.
         * @type {string}
         * @private 
         */
        this.activeCall = false;

        /**
         * SIP User Agent used for calling.
         * @type {sip.UserAgent}
         * @private 
         */
        this.uaCall = null;

        /**
         * Local Address Of Record (AOR).
         * @type string
         * @private 
         */
        this.localAOR = session.localAOR;

        /**
         * Target Address Of Record (AOR).
         * @type string[]
         * @private 
         */
        this.targetAOR = to;

        /**
         * Media types.
         * @type string
         * @private 
         */
        this.mediaTypes = mediaTypes;

        /**
         * Audio media direction.
         * @type string
         * @private 
         */
        this.audioMediaDirection = undefined;

        /**
         * Video media direction.
         * @type string
         * @private 
         */
        this.videoMediaDirection = undefined;

        /**
         * Flag indicating end of ICE candidates.
         * @type string
         * @private 
         */
        this.moreIceComing = true;

        /**
         * Remote peers attached to this call.
         * @type PeerIdentity[]
         */
        this.remotePeerIds = [];

        var self = this;

        // Call.id() is implemented in orca.js

        /**
         * Gets the identities of the remote peers attached to this call
         * @returns {PeerIdentity[]}
         */
        this.remoteIdentities = function() {
            return this.remotePeerIds;
        };

        // Call.addStream() is implemented in orca.js

        /**
         * Attempts to reach the call recipient and establish a connection
         * For an incoming call, calling this method explicitly joins/accepts the call
         */
        this.connect = function() {
            console.debug("Call.connect()");
            if (this.pc) {
                var localStreams = this.callback.streams('local');
                this.pc.addStream(localStreams[0].stream());
                if (this.callDirection === this.CallDirection.INCOMING) {
                    this.accept();
                } else {
                    this.invite();
                }
            } else {
                console.warn("Call.connect() Peer connexion is not created");
            }
        };

        /**
         * Ends an active call
         *
         */
        this.disconnect = function() {
            console.debug("Call.disconnect()");
            if ((this.callDirection === this.CallDirection.OUTGOING) && ((this.callStatus === this.CallStatus.IDLE) || (this.callStatus === this.CallStatus.RINGING))) {
                this.cancel();
            } else if ((this.callDirection === this.CallDirection.INCOMING) && ((this.callStatus === this.CallStatus.IDLE) || (this.callStatus === this.CallStatus.RINGING))) {
                this.sendInviteResponse(480, 'Temporarily Unavailable');
            } else if ((this.callStatus === this.CallStatus.CONFIRMED) || (this.callStatus === this.CallStatus.ACCEPTED)) {
                this.bye();
            } else {
                console.debug("Call.disconnect() Ignore it [callStatus = " + this.callStatus + ", callDirection = " + this.callDirection + "]");
            }
        };

        /**
         * Called when a user does not wish to accept an incoming call
         *
         */
        this.reject = function() {
            console.debug("Call.reject()");
            this.callStatus = this.CallStatus.REFUSED;
            this.sendInviteResponse(480, 'Temporarily Unavailable');
        };

        // Call.streams() is implemented in orca.js


        /**
         * IMPLEMENTATION LAYER ONLY Retrieves a list of remote streams associated with this call.
         * @returns {orca.ManagedStream[]}
         */
        this.remoteStreams = function() {
            return this.managedStreams;
        }

        /**
         * Retrieves the current status of this call
         * @returns {CallStatus}
         */
        this.getStatus = function() {
            return this.callStatus;
        };

        /**
         * Add a new participant to a group call of which you are the initiator.
         * @param {string} target The user to add
         */
        //TODO: discuss API change with Orca working group
        this.addParticipant = function(target) {
            this.doRefer(target, true);
        };

        /**
         * Remove a participant from a group call of which you are the initiator.
         * @param {string} target The user to remove
         */
        //TODO: discuss API change with Orca working group
        this.removeParticipant = function(target) {
            this.doRefer(target, false);
        };

        /**
         * Send DTMF.
         * @param {string} dtmf The DTMF to send
         */
        //TODO: discuss API change with Orca working group
        this.sendDTMF = function(dtmf) {
            console.debug("sendDTMF " + dtmf);
            if (this.uaCall) {
                var request = this.uaCall.createRequest('INFO');
                var contact = new sip.Header((new sip.Address(this.localAOR)).uri.toString(), 'Contact');
                request.setItem('Contact', contact);
                if (this.userAgent)
                    request.setItem('User-Agent', new sip.Header(this.userAgent, 'User-Agent'));
                request.setItem('Content-Type', new sip.Header("application/dtmf-relay", 'Content-Type'));
                body = "Signal=" + dtmf + "\r\n";
                body = body + "Duration=250\r\n";
                request.setBody(body);

                this.uaCall.sendRequest(request);
            }
        };

        /**
         * Blind transfer a call via SIP REFER request.
         * @param {string} target the user identifier to transfer the call to
         */
        //TODO: discuss API change with Orca working group
        this.transfer = function(target) {
            if (target === undefined || target === null) {
                //target = this.localAOR;
                console.warn("Call.transfer() target is not defined");
                return;
            }
            console.debug("transfer() to: " + target);
            if (this.uaCall) {
                var request = this.uaCall.createRequest('REFER');
                request.setItem('Referred-By', new sip.Header(this.localAOR, 'Referred-By'));
                request.setItem('Refer-To', new sip.Header(target, 'Refer-To'));
//                request.setItem('Supported', new sip.Header('norefersub, replaces', 'Supported'));
//                request.setItem('Refer-Sub', new sip.Header('false', 'Refer-Sub'));
//                request.setItem('Accept-Contact', new sip.Header('*;+g.3gpp.icsi-ref="urn%3Aurn-7%3A3gpp-service.ims.icsi.mmtel"', 'Accept-Contact'));
//                request.setItem('P-Preferred-Identity', new sip.Header(this.localAOR, 'P-Preferred-Identity'));
                this.uaCall.sendRequest(request);
                this.callStatus = this.CallStatus.TERMINATING;
            } else {
                console.warn("Call.transfer() user agent is not instancied");
            }
        };

        /**
         * @summary Sends a SIP request INVITE to make a call.
         * @private
         */
        this.invite = function() {
            console.debug("Call.invite()");
            this.callDirection = this.CallDirection.OUTGOING;
            this.markActionNeeded();
        };



        /**
         * @private
         */
        this.markActionNeeded = function() {
            this.actionNeeded = true;
            var self = this;
            this.doLater(function() {
                self.onStableStatus();
            });
        };

        /**
         * @summary Post an event to myself so that I get called a while later.
         * @param {function} what Function to run later
         * @private
         */
        this.doLater = function(what) {
            setTimeout(what, 1);
        };


        /**
         * @summary Internal function called when a stable state is entered by the browser (to allow for multiple AddStream calls or
         * other interesting actions).
         * @private
         */
        this.onStableStatus = function() {
            console.debug("Call.onStableStatus() [actionNeeded = " + this.actionNeeded + ", moreIceComing = " + this.moreIceComing + ", status = " + this.callStatus + ", callDirection = " + this.callDirection + ", activeCall = " + this.activeCall + "]");
            var mySDP, sdp, self;
            if (this.actionNeeded) {
                switch (this.callStatus) {
                    case this.CallStatus.IDLE:
                        this.createSDPOffer();
                        break;

                    case this.CallStatus.PREPARING_OFFER:
                        if (this.moreIceComing) {
                            return;
                        }

                        if (webkitRTCPeerConnection !== undefined) {
                            sdp = this.pc.localDescription.sdp;
                        } else if (webkitPeerConnection00 !== undefined) {
                            sdp = this.pc.localDescription.toSdp();
                        }

                        if (this.callDirection === this.CallDirection.INCOMING) {
                            this.createAndSendInviteResponse(sdp);
                        } else {
                            //this.sdpOffer = sdp;
                            this.createAndSendInviteRequest(sdp);
                            //TODO Not done: Retransmission on non-response.
                        }
                        break;

                    case this.CallStatus.ACCEPTED:
                        if (this.sdpOffer !== undefined) {
                            // we already received a SDP offer
                            console.debug("Raju:onStableStatus() " + this.session.mediaOptions.iceType);
                            if (this.session.mediaOptions.iceType === "google-ice") {
                                this.sdpOffer = this.updateSDPMediaIceOption(this.sdpOffer, "offer", "google-ice");
                            }

                            if (webkitRTCPeerConnection !== undefined) {
                                console.debug("onStableStatus() setRemoteDescription sdp = " + this.sdpOffer);
                                this.pc.setRemoteDescription(new RTCSessionDescription({type: 'offer', sdp: this.sdpOffer}));
                                try {
                                    self = this;
                                    this.pc.createAnswer(function(sessionDescription) {
                                        if (self.session.mediaOptions.crypto === "sdes-sbc") {
                                            sessionDescription = self.updateSDPRemoveCrypto(sessionDescription);
                                        }
                                        if (self.session.mediaOptions.bundle === false) {
                                            sessionDescription = self.updateSDPOfferMediaBundle(sessionDescription);
                                        }
                                        if (self.session.mediaOptions.iceType === "google-ice") {
                                            sessionDescription = self.updateSDPMediaIceOption(sessionDescription, "answer", "google-ice");
                                        }
                                        console.debug("onStableStatus() setLocalDescription sdp = " + sessionDescription.sdp);
                                        self.pc.setLocalDescription(sessionDescription);
                                    });
                                } catch (e) {
                                    console.error('Call.onStableStatus() webkitRTCPeerConnection can not create a SDP answer, exception = ' + e);
                                }
                            } // else if (webkitPeerConnection00 !== undefined) {
                            // var sdp = new SessionDescription(this.sdpOffer);
                            // this.pc.setRemoteDescription(webkitPeerConnection00.SDP_OFFER, sdp);
                            // try {
                            // mySDP = pc.createAnswer(this.sdpOffer, 'audio,video');
                            // } catch (e) {
                            // mySDP = pc.createAnswer(this.sdpOffer, {audio: true, video: true})
                            // }
                            // pc.setLocalDescription(webkitPeerConnection00.SDP_ANSWER, mySDP);
                            // if (isDebugEnabled() === true)  onDebug('onStableStatus() setLocalDescription 2 (answer)');
                            //}
                            this.callStatus = this.CallStatus.PREPARING_ANSWER;
                            this.markActionNeeded();
                        } else {
                            this.createSDPOffer();
                        }
                        break;

                    case this.CallStatus.PREPARING_ANSWER:
                        if (this.moreIceComing) {
                            return;
                        }
                        if (webkitRTCPeerConnection !== undefined) {
                            sdp = this.pc.localDescription.sdp;
                        } //else if (webkitPeerConnection00 !== undefined) {
                        //sdp = pc.localDescription.toSdp();
                        //}
                        if (this.session.mediaOptions.iceType === "google-ice") {
                            sdp = this.updateSDPMediaIceOption(sdp, "answer", "google-ice");
                        }
                        this.createAndSendInviteResponse(sdp);
                        break;

                    case this.CallStatus.CONFIRMED:
                        if (this.activeCall === false) {
                            this.activeCall = true;
                        } else if ((this.activeCall === true) && (this.callDirection === this.CallDirection.OUTGOING)) {
                            this.createSDPOffer();
                        }
                        break;
                    case this.CallStatus.FAILED:
                        if (this.activeCall === true) {
                            this.callStatus = this.CallStatus.CONFIRMED;
                        }
                        break;
                    default:
                        console.warn('Call.onStableStatus() Dazed and confused in state ' + this.callStatus + ', stopping here');
                        break;
                }
            }
        };


        /**
         * @summary Function called when RTCPeerConnection onaddstream event is fired.
         * @param {MediaStreamEvent} evt
         * @private
         */
        this.onRTCPeerConnectionOnAddStream = function(evt) {
            console.debug("Call.onRTCPeerConnectionOnAddStream()");
            var managedSteam, event;
            managedSteam = orca.createManagedStream(evt.stream);
            self.managedStreams.push(managedSteam);
            event = {}; //TODO define event data
            self.callback.onAddStream(managedSteam, event);
        };

        /**
         * @summary Function called when RTCPeerConnection onconnecting event is fired.
         * @param {Event} evt
         * @private
         */
        this.onRTCPeerConnectionOnConnecting = function(evt) {
            console.debug("Call.onRTCPeerConnectionConnecting()");
        };

        /**
         *  Callback for ongatheringchange RTCPeerConnection event.
         * @param {Event} evt
         */
        this.onRTCPeerConnectionOnGatheringChange = function(evt) {
            console.debug("onRTCPeerConnectionOnGatheringChange()");
            if (evt.currentTarget !== undefined) {
                console.debug("onRTCPeerConnectionOnGatheringChange() evt.currentTarget.iceGatheringState = " + evt.currentTarget.iceGatheringState);
                if (evt.currentTarget.iceGatheringState === "complete") {
                    if ((self.callStatus === self.CallStatus.PREPARING_OFFER) || (self.callStatus === self.CallStatus.PREPARING_ANSWER)) {
                        self.moreIceComing = false;
                        self.markActionNeeded();
                    } else {
                        console.debug("onRTCPeerConnectionOnGatheringChange() Event reveived event is dropped");
                    }
                }
            }
        };

        /**
         * @summary Function called when RTCPeerConnection onicecandidate event is fired.
         * @param {RTCPeerConnectionIceEvent} evt
         * @private
         */
        this.onRTCPeerConnectionOnIceCandidate = function(evt) {
            if (evt.candidate === null) {
                console.debug("Call.onRTCPeerConnectionIceCandidate() end of candidates [status = " + self.callStatus + ", callDirection = " + self.callDirection + ", activeCall = " + self.activeCall + "]");
                if ((self.callStatus === self.CallStatus.PREPARING_OFFER) || (self.callStatus === self.CallStatus.PREPARING_ANSWER)) {
                    self.moreIceComing = false;
                    self.markActionNeeded();
                } else {
                    console.debug("Call.onRTCPeerConnectionOnIceCandidate() RTCPeerConnectionIceEvent reveived event is dropped");
                }
            } else {
                console.debug("Call.onRTCPeerConnectionIceCandidate() received candidate = " + evt.candidate.candidate);
            }
        };

        /**
         * @summary Function called when RTCPeerConnection onicechange event is fired.
         * @param {Event} evt
         * @private
         */
        this.onRTCPeerConnectionOnIceChange = function(evt) {
            console.debug("Call.onRTCPeerConnectionIceChange()");
        };

        /**
         * @summary Function called when RTCPeerConnection onnegotiatoinneeded event is fired.
         * @param {Event} evt
         * @private
         */
        this.onRTCPeerConnectionOnNegotiationNeeded = function(evt) {
            console.debug("Call.onRTCPeerConnectionNegotiationNeeded()");
        };

        /**
         * @summary Function called when RTCPeerConnection onopen event is fired.
         * @param {Event} evt
         * @private
         */
        this.onRTCPeerConnectionOnOpen = function(evt) {
            console.debug("Call.onRTCPeerConnectionOnOpen()");
        };

        /**
         * @summary Function called when RTCPeerConnection onremovestream event is fired.
         * @param {MediaStreamEvent} evt
         * @private
         */
        this.onRTCPeerConnectionOnRemoveStream = function(evt) {
            console.debug("Call.onRTCPeerConnectionRemoveStream()");
        };

        /**
         * @summary Function called when RTCPeerConnection onstatechange event is fired.
         * @param {Event} evt
         * @private
         */
        this.onRTCPeerConnectionOnStatusChange = function(evt) {
            console.debug("Call.onRTCPeerConnectionStatusChange() [readyStatus=" + evt.currentTarget.readyStatus + ', iceStatus=' + evt.currentTarget.iceStatus + "]");
        };

        /**
         * @summary Creates and sends a SIP INVITE request.
         * @param {string} sdp SDP offer
         * @private
         */
        this.createAndSendInviteRequest = function(sdp) {
            console.debug("Call.createAndSendInviteRequest() moreIceComing= " + this.moreIceComing);
            var request, contact, rls, idx, mtp;
            if (this.uaCall === null) {
                this.uaCall = new sip.UserAgent(this.session.stack);
                if (this.targetAOR.length === 1) {
                    this.uaCall.remoteParty = new sip.Address(this.targetAOR[0]);
                } else {
                    this.uaCall.remoteParty = new sip.Address(this.session.conferenceFactoryURI);
                }
                this.uaCall.localParty = new sip.Address(this.localAOR);
                this.uaCall.routeSet = [this.getRouteHeader()];
                for (idx = 0; idx < this.targetAOR.length; idx += 1) {
                    this.remotePeerIds.push({id: this.targetAOR[idx]});
                }
            }

            request = this.uaCall.createRequest('INVITE');
            this.callId = request.getItem("call-id").value;
            contact = new sip.Header((new sip.Address(this.localAOR)).uri.toString(), 'Contact');
            contact.setItem('gr', this.session.instanceId);
            request.setItem('User-Agent', new sip.Header(this.session.userAgent, 'User-Agent'));

            if (sdp !== undefined) {
                if (this.targetAOR.length === 1) {
                    // we have a unique callee
                    request.setItem('Content-Type', new sip.Header("application/sdp", 'Content-Type'));
                    request.setBody(sdp);
                    //    callParams.isConferenceCall = false;
                } else {
                    rls = new ResourceList();
                    for (idx = 0; idx < this.targetAOR.length; idx += 1) {
                        rls.addResource({uri: this.targetAOR[idx]});
                    }
                    // conferenceParams.rls = rls;
                    // callParams.isConferenceCall = true;
                    // we have to establish a conference call
                    mtp = new Multipart();
                    mtp.addPart({contentType: "application/sdp", data: sdp});
                    mtp.addPart({contentType: "application/resource-lists+xml", contentDisposition: "recipient-list", data: rls.toString()});
                    request.setItem('Content-Type', new sip.Header('multipart/mixed;boundary=' + mtp.getBoundary(), 'Content-Type'));
                    request.setItem('Require', new sip.Header("recipient-list-invite", 'Require'));
                    request.setBody(mtp.toString());
                }
            }
            this.uaCall.sendRequest(request);
            this.callStatus = this.CallStatus.CALLING;
        };

        /**
         * @summary Creates and sends a SIP INVITE 200 OK response.
         * @param {string} sdp SDP offer
         * @private
         */
        this.createAndSendInviteResponse = function(sdp) {
            console.debug("createAndSendInviteResponse() moreIceComing= " + this.moreIceComing);
            var response, contact;
            response = this.uaCall.createResponse(200, 'OK');
            contact = new sip.Header((new sip.Address(this.localAOR)).uri.toString(), 'Contact');
            response.setItem('Contact', contact);
            response.setItem('Content-Type', new sip.Header("application/sdp", 'Content-Type'));
            response.setItem('User-Agent', new sip.Header(this.session.userAgent, 'User-Agent'));
            if (sdp !== undefined) {
                response.setItem('Content-Type', new sip.Header("application/sdp", 'Content-Type'));
                response.setBody(sdp);
            }
            this.uaCall.sendResponse(response);
        };

        /**
         * @summary Creates the SDP offer.
         * @return {string} SDP offer
         * @private
         */
        this.createSDPOffer = function() {
            console.debug("Call.createSDPOffer()");
            var constraint, constraint1, constraint2, audio = false, video = false, sdpOffer;

            if (this.mediaTypes.indexOf('audio') !== -1) {
                audio = true;
            }

            if (this.mediaTypes.indexOf('video') !== -1) {
                video = true;
            }

            constraint1 = {audio: audio, video: video};
            constraint2 = {'mandatory': {'OfferToReceiveAudio': audio, 'OfferToReceiveVideo': video}};

            // if ((this.mediaTypes === undefined) && (callParams.callDirection === "incoming")) {
            // this.mediaTypes = "audiovideo";
            // if(!callParams.videoMediaDirection){
            // callParams.videoMediaDirection = "sendrecv";
            // }
            // if(!callParams.audioMediaDirection){
            // callParams.audioMediaDirection = "sendrecv";
            // }
            this.videoMediaDirection = this.MediaDirection.SENDRECV;
            this.audioMediaDirection = this.MediaDirection.SENDRECV;
            // }


            if (webkitRTCPeerConnection !== undefined) {
                try {
                    this.pc.createOffer(function(sdp) {
                        sdpOffer = self.updateSDPOfferMediaDirection(sdp, {audio: self.audioMediaDirection, video: self.videoMediaDirection});
                        if (self.session.mediaOptions.crypto === "sdes-sbc") {
                            sdpOffer = self.updateSDPRemoveCrypto(sdpOffer);
                        }
                        if (self.session.mediaOptions.bundle === false) {
                            sdpOffer = self.updateSDPOfferMediaBundle(sdpOffer);
                        }
                        if (self.session.mediaOptions.iceType === "google-ice") {
                            sdpOffer = self.updateSDPMediaIceOption(sdpOffer, "offer", "google-ice");
                        }
                        if (sdpOffer.sdp !== self.sdpOffer) {
                            console.debug("createSDPOffer() setLocalDescription sdp = " + sdpOffer.sdp);
                            self.pc.setLocalDescription(sdpOffer);
                            self.callStatus = self.CallStatus.PREPARING_OFFER;
                            self.sdpOffer = sdpOffer.sdp;
                            self.markActionNeeded();
                            return;
                        }
                        console.debug('createSDPOffer() Not sending a new offer');
                    }, null, constraint1);
                } catch (e1) {
                    try {
                        this.pc.createOffer(function(sdp) {
                            sdpOffer = self.updateSDPOfferMediaDirection(sdp, {audio: self.audioMediaDirection, video: self.videoMediaDirection});
                            if (self.session.mediaOptions.crypto === "sdes-sbc") {
                                sdpOffer = self.updateSDPRemoveCrypto(sdpOffer);
                            }
                            if (self.session.mediaOptions.bundle === false) {
                                sdpOffer = self.updateSDPOfferMediaBundle(sdpOffer);
                            }
                            if (self.session.mediaOptions.iceType === "google-ice") {
                                sdpOffer = self.updateSDPMediaIceOption(sdpOffer, "offer", "google-ice");
                            }
                            if (sdpOffer.sdp !== self.sdpOffer) {
                                console.debug("createSDPOffer() setLocalDescription sdp = " + sdpOffer.sdp);
                                self.pc.setLocalDescription(sdpOffer);
                                self.callStatus = self.CallStatus.PREPARING_OFFER;
                                self.sdpOffer = sdpOffer.sdp;
                                self.markActionNeeded();
                                return;
                            }
                            console.debug('createSDPOffer() Not sending a new offer');
                        }, null, constraint2);
                    } catch (e2) {
                        console.error('Call.createSDPOffer() webkitRTCPeerConnection can not create a SDP offer, exception = ' + e2);
                    }
                }
            } //else if (webkitPeerConnection00 !== undefined) {
            // try {
            // sdpOffer = pc.createOffer(constraint1);
            // } catch (e) {
            // sdpOffer = pc.createOffer(constraint2);
            // }
            // var sdpOffer1 = updateSDPOfferMediaDirection(sdpOffer, {audio:callParams.audioMediaDirection, video:callParams.videoMediaDirection});                  
            // // See if the current offer is the same as what we already sent. If not, no change is needed.
            // if(sdpOffer1.toSdp() !== prevOffer) {
            // pc.setLocalDescription(webkitPeerConnection00.SDP_OFFER, sdpOffer1);
            // if (isDebugEnabled() === true)  onDebug('createSDPOffer() setLocalDescription 2 (offer)');
            // this.callStatus = 'preparing-offer';
            // this.sdpOffer = sdpOffer1.toSdp();
            // markActionNeeded();
            // return;
            // } else {
            // if (isDebugEnabled() === true) onInfo('createSDPOffer() Not sending a new offer');
            // }   
            //}
        };

        /**
         * @summary Updates a SDP.
         * @param {string} sdp SDP 
         * @param {object} medias constraints on the media
         * @private
         */
        this.updateSDPOfferMediaDirection = function(sdpoffer, medias) {
            var sdp, sdpstr1, sdpstr2, idx, changed;

            if (window.RTCSessionDescription && sdpoffer instanceof RTCSessionDescription) {
                sdp = sdpoffer.sdp;
            } else if (window.SessionDescription && sdp instanceof SessionDescription) {
                sdp = sdpoffer.toSdp();
            } else {
                sdp = sdpoffer;
            }

            sdpstr1 = sdp;
            idx = -1;
            changed = false;

            if (medias.audio !== undefined) {
                idx = sdp.indexOf("a=sendrecv");
                if (idx === -1) {
                    idx = sdp.indexOf("a=sendonly");
                    if (idx === -1) {
                        idx = sdp.indexOf("a=recvonly");
                    }
                }

                if (idx !== -1) {
                    sdpstr1 = sdp.substring(0, idx);
                    sdpstr1 = sdpstr1 + "a=" + medias.audio;
                    sdpstr1 = sdpstr1 + sdp.substring(idx + 10);
                    changed = true;
                }
            }

            if (medias.video !== undefined) {
                idx = sdp.lastIndexOf("a=sendrecv");
                if (idx === -1) {
                    idx = sdp.lastIndexOf("a=sendonly");
                    if (idx === -1) {
                        idx = sdp.lastIndexOf("a=recvonly");
                    }
                }

                if (idx !== -1) {
                    sdpstr2 = sdpstr1.substring(0, idx);
                    sdpstr2 = sdpstr2 + "a=" + medias.video;
                    sdpstr2 = sdpstr2 + sdpstr1.substring(idx + 10);
                    changed = true;
                }

            } else {
                sdpstr2 = sdpstr1;
            }

            if (changed === true) {
                console.debug("Call.updateSDPOfferMediaDirection() medias = " + medias, ", SDP has been updated:= " + sdpstr2);
                if (window.RTCSessionDescription && sdpoffer instanceof RTCSessionDescription) {
                    return new RTCSessionDescription({type: 'offer', sdp: sdpstr2});
                }
                if (window.SessionDescription && sdp instanceof SessionDescription) {
                    return new SessionDescription(sdpstr2);
                }
                return sdpstr2;
            }
            console.debug("Call.updateSDPOfferMediaDirection() medias = " + medias, ", SDP has not been updated)");
            return sdpoffer;
        };

        /**
         * @summary Updates a SDP.
         * @param {string} sdp SDP 
         * @private
         */
        this.updateSDPOfferMediaBundle = function(sdpoffer) {
            console.debug('updateSDPOfferMediaBundle()');
            var sdp, changed, idx;
            if (window.RTCSessionDescription && sdpoffer instanceof RTCSessionDescription) {
                sdp = sdpoffer.sdp;
            } else if (window.SessionDescription && sdpoffer instanceof SessionDescription) {
                sdp = sdpoffer.toSdp();
            } else {
                sdp = sdpoffer;
            }

            changed = false;

            idx = sdp.indexOf("a=group:BUNDLE audio video");
            if (idx !== -1) {
                changed = true;
                sdp = sdp.replace("a=group:BUNDLE audio video\r\n", "");
            } else {
                idx = sdp.indexOf("a=group:BUNDLE audio");
                if (idx !== -1) {
                    changed = true;
                    sdp = sdp.replace("a=group:BUNDLE audio\r\n", "");
                } else {
                    idx = sdp.indexOf("a=group:BUNDLE video");
                    if (idx !== -1) {
                        changed = true;
                        sdp = sdp.replace("a=group:BUNDLE video\r\n", "");
                    }
                }
            }

            if (changed === true) {
                console.debug("updateSDPOfferMediaBundle() SDP has been updated:" + sdp);
                if (window.RTCSessionDescription && sdpoffer instanceof RTCSessionDescription) {
                    return new RTCSessionDescription({type: 'offer', sdp: sdp});
                }
                if (window.SessionDescription && sdpoffer instanceof SessionDescription) {
                    return new SessionDescription(sdp);
                }
                return sdp;
            }
            console.debug("updateSDPOfferMediaBundle() SDP has not been updated)");
            return sdpoffer;
        };

        /**
         * @summary Updates a SDP.
         * @param {string} sdp SDP 
         * @private
         */
        this.updateSDPRemoveCrypto = function(sdpoffer) {
            console.debug('updateSDPRemoveCrypto()');
            var sdp, changed, idx;
            if (window.RTCSessionDescription && sdpoffer instanceof RTCSessionDescription) {
                sdp = sdpoffer.sdp;
            } else if (window.SessionDescription && sdpoffer instanceof SessionDescription) {
                sdp = sdpoffer.toSdp();
            } else {
                sdp = sdpoffer;
            }

            changed = false;

            idx = sdp.indexOf("a=crypto:0 ");
            if (idx !== -1) {
                changed = true;
                sdp = sdp.replace(/a=crypto:0.*\r\n/g, "");
            }

            if (changed === true) {
                console.debug("updateSDPRemoveCrypto() SDP has been updated:" + sdp);
                if (window.RTCSessionDescription && sdpoffer instanceof RTCSessionDescription) {
                    return new RTCSessionDescription({type: 'offer', sdp: sdp});
                }
                if (window.SessionDescription && sdpoffer instanceof SessionDescription) {
                    return new SessionDescription(sdp);
                }
                return sdp;
            }
            console.debug("updateSDPRemoveCrypto() SDP has not been updated)");
            return sdpoffer;
        };

        /**
         * @summary Updates a SDP.
         * @param {string} type Type of SDP (offer or answer)
         * @param {string} iceoption Ice option to force in the SDP
         * @private
         */
        this.updateSDPMediaIceOption = function(sdp, type, iceoption) {
            console.debug('updateSDPMediaIceOption()');
            var outsdp, idx;
            if (window.RTCSessionDescription && sdp instanceof RTCSessionDescription) {
                outsdp = sdp.sdp;
            } else if (window.SessionDescription && sdp instanceof SessionDescription) {
                outsdp = sdp.toSdp();
            } else {
                outsdp = sdp;
            }

            /* Raju: Always gets google-ice
             idx = outsdp.indexOf("a=ice-options:google-ice");
             if (idx === -1) {
             outsdp = outsdp.replace(/\r\na=ice-ufrag/g, "\x0d\x0aa=ice-options:"+ iceoption + "\x0d\x0aa=ice-ufrag");
             // remove "a=ice-lite" string
             //outsdp = outsdp.replace("a=ice-lite\r\n", ""); 
             } 
             */
            console.debug("Raju: Not doing google-ice");
            // Raju: Begin
            // Quick change!
            // Chrom26 is strict about getting RTP/SAVPF in SDP answer. if RTP/SAVP is received
            // replace it with RTP/SAVPF.
            outsdp = outsdp.replace(/SAVP /g, "SAVPF ");
            // Adding explicit a=rtpmap lines for a-law and u-law
            if (outsdp.indexOf("m=audio") != -1 && outsdp.indexOf("rtpmap:0 ") == -1) {
                outsdp = outsdp.replace("telephone-event/8000\r\n", "telephone-event/8000\r\na=rtpmap:0 PCMU/8000\r\na=rtpmap:8 PCMA/8000\r\n");
            }
            // Raju: End

            console.debug('updateSDPMediaIceOption() SDP has been updated:' + outsdp);

            if (window.RTCSessionDescription && sdp instanceof RTCSessionDescription) {
                return new RTCSessionDescription({type: type, sdp: outsdp});
            }
            if (window.SessionDescription && sdp instanceof SessionDescription) {
                return new SessionDescription(outsdp);
            }
            return outsdp;
        };


        /**
         * @summary Creates a header 'Route' from the username, for a SIP messsage.
         * @param {string} username username
         * @returns {sip.Header}
         * @private
         */
        this.getRouteHeader = function(username) {
            var outboundProxyAddress = this.session.config.uri.split('/')[2].trim() + ';transport=' + this.session.transport;
            return new sip.Header("<sip:" + (username ? username + "@" : "") + outboundProxyAddress + ";lr>", 'Route');
        };

        /**
         * @summary Receives a SIP INVITE request
         * @param {sip.UserAgent} ua User agent instance
         * @param {sip.Message} requset SIP request
         * @private
         */
        this.receivedInvite = function(ua, request, callapi) {
            console.debug("Call.receivedInvite");
            var from, res, event, rls, resources, idx;
            if ((this.callStatus === this.CallStatus.IDLE) || ((this.activeCall === true) && (this.callStatus === this.CallStatus.CONFIRMED))) {
                this.uaCall = ua;
                this.callDirection = this.CallDirection.INCOMING;
                //this.callStatus = "receiving";
                from = request.first('From').value;
                this.targetAOR = from.uri.toString();
                this.callId = request.first("Call-ID").value;
                this.remotePeerIds = [{id: this.targetAOR}];
                //this.isCallUpdate = false;
                //this.isConferenceCall = false;

                if (request.body !== null) {
                    var contentType = request.getItem("Content-Type");
                    if (contentType !== null) {
                        if (contentType.value === "application/sdp") {
                            // we received a SDP offer
                            this.sdpOffer = request.body;
                            res = this.parseSDP();
                            if (res === false) {
                                console.warn("Call.receivedInvite() received a SDP offer with unsupported media");
                                ua.sendResponse(ua.createResponse(488, 'Not Acceptable Here'));
                            }
                        }
                        if (contentType.value === "application/resource-lists+xml") {
                            // we received a resources list
                            rls = new ResourceList(request.body);
                            resources = rls.getResources();
                            for (idx = 0; idx < resources.length; idx += 1) {
                                if (resources[idx].uri !== this.localAOR) {
                                    this.remotePeerIds.push({id: resources[idx].uri});
                                }
                            }

                            this.mediaTypes = 'audio, video';
                            this.audioMediaDirection = 'sendrecv';
                            this.videoMediaDirection = 'sendrecv';

                            // conferenceParams.rls = rls;
                            // callParams.isConferenceCall = true;
                            // plugin.settings.onConferenceStatus.call(this, conferenceParams);                
                        }
                    } else {
                        this.mediaTypes = 'audio, video';
                        this.audioMediaDirection = 'sendrecv';
                        this.videoMediaDirection = 'sendrecv';
                    }
                } else {
                    this.mediaTypes = 'audio, video';
                    this.audioMediaDirection = 'sendrecv';
                    this.videoMediaDirection = 'sendrecv';
                }

                event = {name: SessionStatus.INCOMINGCALL}; //TODO Define event data
                this.session.callback.onIncoming(this.callback, event);

                ua.sendResponse(ua.createResponse(180, 'Ringing'));
                this.callStatus = this.CallStatus.RINGING;
                event = {name: CallStatus.CONNECTING}; // TODO Define event data
                this.callback.onStatus(CallStatus.CONNECTING, event);
            } else {
                console.debug("receivedInvite() received INVITE in state " + this.callStatus);
                ua.sendResponse(ua.createResponse(486, 'Busy Here'));
            }

        };

        /**
         * @summary Parses the SDP.
         * @returns {boolean} Flag indicating that the parsing of SDP is successful
         * @private
         */
        this.parseSDP = function() {
            var sdp, sdpstr, sdpstr2, idx;
            if (this.sdpOffer.search("m=message") !== -1) {
                if ((this.sdpOffer.search("TCP/MSRP") !== -1) || (this.sdpOffer.search("TCP/TLS/MSRP") !== -1)) {
                    return false;
                }
            }

            if (this.sdpOffer.search("m=audio") !== -1) {
                if (this.sdpOffer.search("m=video") !== -1) {
                    this.mediaTypes = 'audio,video';
                } else {
                    this.mediaTypes = 'audio';
                }
            } else {
                if (this.sdpOffer.search("m=video") !== -1) {
                    this.mediaTypes = 'video';
                } else {
                    this.mediaTypes = undefined;
                }
            }


            sdp = this.sdpOffer;
            sdpstr = this.sdpOffer;
            idx = -1;

            if (this.mediaTypes === 'audio' || this.mediaTypes === 'audio,video') {
                idx = sdp.indexOf("a=sendrecv");
                if (idx === -1) {
                    idx = sdp.indexOf("a=sendonly");
                    if (idx === -1) {
                        idx = sdp.indexOf("a=recvonly");
                    }
                }
                if (idx !== -1) {
                    this.audioMediaDirection = sdp.substr(idx + 2, 8);
                }
            }

            if (this.mediaTypes === 'video' || this.mediaTypes === 'audiovideo') {
                idx = sdp.indexOf("a=sendrecv");
                if (idx === -1) {
                    idx = sdp.indexOf("a=sendonly");
                    if (idx === -1) {
                        idx = sdp.indexOf("a=recvonly");
                    }
                }
                if (idx !== -1) {
                    this.videoMediaDirection = sdp.substr(idx + 2, 8);
                }
            }
            return true;
        };

        /**
         * @summary Receives a SIP ACK request
         * @param {sip.UserAgent} ua User agent instance
         * @param {sip.Message} request SIP request
         * @private
         */
        this.receivedAck = function(ua, request) {
            console.debug("Call.receivedAck()");
            var event, sdp;
            if (this.callStatus === this.CallStatus.CANCELED || (this.callStatus === this.CallStatus.REFUSED)) {
                this.clean();
                event = {name: CallStatus.DISCONNECTED};
                this.callback.onDisconnected(event);
                this.callStatus = this.CallStatus.IDLE;
            } else {
                this.callStatus = this.CallStatus.CONFIRMED;
                event = {name: CallStatus.CONNECTED}; // TODO validate event data
                this.callback.onConnected(event);
                // if (rls !== undefined) {
                // conferenceParams.status = 'active';
                // plugin.settings.onConferenceStatus.call(this, conferenceParams);                    
                // }


                // if no body found then request.body is not set by Message.prototype._parse, 
                // so it is 'undefined' rather than 'null'
                if (request.body !== undefined && request.body !== null) {
                    // we receive the SDP answer in ACK
                    sdp = request.body;
                    if (this.session.mediaOptions.iceType === "google-ice") {
                        sdp = this.updateSDPMediaIceOption(sdp, "answer", "google-ice");
                    }

                    if (webkitRTCPeerConnection !== undefined) {
                        console.debug("receivedAck() setRemoteDescription sdp = " + sdp);
                        this.pc.setRemoteDescription(new RTCSessionDescription({type: 'answer', sdp: sdp}));
                    } else if (webkitPeerConnection00 !== undefined) {
                        console.debug("receivedAck() setRemoteDescription sdp = " + sdp);
                        this.pc.setRemoteDescription(webkitPeerConnection00.SDP_ANSWER, new SessionDescription(sdp));
                    }
                }
                this.activeCall = true;
            }
        };

        /**
         * @summary Receives a SIP NOTIFY request
         * @param {sip.UserAgent} ua User agent instance
         * @param {sip.Message} request SIP request
         * @private
         */
        this.receivedNotify = function(ua, request) {
            if (this.uaCall && this.CallStatus != this.CallStatus.IDLE) {
                ua.sendResponse(ua.createResponse(200, 'OK'));
                var event = request.getItem('event').value;
                switch (event) {
                    case "refer" :
                        break;
                    case "conference" :
                        break;
                    default:
                        if (isDebugEnabled() == true)
                            onDebug("receivedNotify() event not supported: " + event);
                        break;
                }
            }
        };

        /**
         * @summary Receives a SIP BYE request
         * @param {sip.UserAgent} ua User agent instance
         * @param {sip.Message} request SIP request
         * @private
         */
        this.receivedBye = function(ua, request) {
            console.debug("Call.receivedBye()");
            if (this.uaCall && this.callStatus !== this.CallStatus.IDLE) {
                ua.sendResponse(ua.createResponse(200, 'OK'));
                this.callStatus = this.CallStatus.CLOSED;
                var event = {name: CallStatus.DISCONNECTED};
                this.callback.onDisconnected(event);
                this.clean();
            }
        };

        /**
         * @summary Receives a SIP INVITE Response
         * @param {sip.UserAgent} ua User agent instance
         * @param {sip.Message} response SIP response
         * @private
         */
        this.receivedInviteResponse = function(ua, response) {
            console.debug("Call.receivedInviteResponse()");
            var event, sdp, remoteStream;
            if (response.isfinal()) {
                if (!response.is2xx()) {
                    if (this.activeCall === false) {
                        if (this.callDirection === this.CallDirection.OUTGOING) {
                            console.debug("Call.receivedInviteResponse() response is failed [response = " + response.response + ", text = " + response.responsetext + "]");
                            if (this.callStatus === this.CallStatus.CANCELED) {
                                event = {name: CallStatus.DISCONNECTED}; //TODO define event data
                                this.callback.onDisconnected(event);
                            } else {
                                this.callStatus = this.CallStatus.FAILED;
                                event = {name: CallStatus.REJECTED}; //TODO define event data
                                this.callback.onStatus(CallStatus.REJECTED, event);
                            }
                            ua.autoack = true;
                            this.clean();
                        }
                    } //else {
                    // re-invite failed 
                    // markActionNeeded();
                    //}
                } else {
                    if (this.pc) {
                        if ((this.callDirection === this.CallDirection.OUTGOING) && ((this.callStatus === this.CallStatus.CALLING) || (this.callStatus === this.CallStatus.RINGING))) {
                            this.callStatus = this.CallStatus.ACCEPTED;
                            // send ACK automatically
                            ua.autoack = true;
                            if (response.body !== undefined) {
                                sdp = response.body;
                                if (this.pc.remoteStreams !== undefined) {
                                    remoteStream = this.pc.remoteStreams[0];
                                    if (remoteStream !== undefined) {
                                        this.pc.removeStream(remoteStream);
                                        console.debug("Call.receivedInviteResponse() remove remote stream (label=)" + remoteStream.label + ")");
                                    }
                                }
                                if (this.session.mediaOptions.iceType === "google-ice") {
                                    sdp = this.updateSDPMediaIceOption(sdp, "answer", "google-ice");
                                }

                                if (webkitRTCPeerConnection !== undefined) {
                                    console.debug("receivedInviteResponse() setRemoteDescription sdp = " + sdp);
                                    this.pc.setRemoteDescription(new RTCSessionDescription({type: 'answer', sdp: sdp}));
                                } else if (webkitPeerConnection00 !== undefined) {
                                    console.debug("receivedInviteResponse() setRemoteDescription sdp = " + sdp);
                                    this.pc.setRemoteDescription(webkitPeerConnection00.SDP_ANSWER, new SessionDescription(sdp));
                                }
                            }
                            this.callStatus = this.CallStatus.CONFIRMED;
                            this.activeCall = true;
                            event = {name: CallStatus.CONNECTED}; //TODO define event data
                            this.callback.onConnected(event);
                            // if (conferees !== undefined && conferees.length > 1) {
                            // conferenceParams.status = 'active';
                            // plugin.settings.onConferenceStatus.call(this, conferenceParams);                
                            // }

                        } else if ((this.callDirection === this.CallDirection.OUTGOING) && (this.callStatus === this.CallStatus.CANCELING)) {
                            this.callStatus = this.CallStatus.CANCELED;
                        } else {
                            ua.autoack = true;
                        }
                    } else {
                        // failed to get peer-connection
                        console.warn("Call.receivedInviteResponse() no peer connection found.");
                        this.callStatus = this.CallStatus.IDLE;
                        //TODO onStatus() or onError()
                        //plugin.settings.onCallStatus.call(this, callParams);
                        this.sendBye();
                    }
                }
            } else if (response.is1xx()) {
                if (response.response !== 100) {
                    console.debug("Call.receivedInviteResponse() Progressing [response = " + response.response + ", text = " + response.responsetext + "]");
                    if (response.response >= 180) {
                        this.callStatus = this.CallStatus.RINGING;
                        event = {name: CallStatus.CONNECTING}; //TODO define event data
                        this.callback.onStatus(CallStatus.CONNECTING, event);
                    }
                }
            }
        };


        /**
         * @summary Receives a SIP BYE Response
         * @param {sip.UserAgent} ua User agent instance
         * @param {sip.Message} response SIP response
         * @private
         */
        this.receivedByeResponse = function(ua, response) {
            console.debug("receivedByeResponse()");
            this.callStatus = this.CallStatus.CLOSED;
            var event = {name: CallStatus.DISCONNECTED}; //TODO define event data
            this.callback.onDisconnected(event);
            // if (conferees !== undefined) {
            // conferenceParams.status = 'inactive';
            // plugin.settings.onConferenceStatus.call(this, callParams);                    
            // }
            this.clean();
        };


        /**
         * @summary Send a SIP REFER to add or remove a conference participant
         * @param {String} uri User to add or remove
         * @param {boolean} isAdded True to add, false to remove
         * @private
         */
        this.doRefer = function(uri, isAdded) {
            console.debug("doRefer() uri=" + uri + ", isAdded=" + isAdded);
            if (this.uaCall != null) {
                var request = this.uaCall.createRequest('REFER');
                if (this.userAgent)
                    request.setItem('User-Agent', new sip.Header(this.userAgent, 'User-Agent'));
                if (isAdded == true) {
                    request.setItem('Refer-To', new sip.Header(uri, 'Refer-To'));
                } else {
                    request.setItem('Refer-To', new sip.Header(uri + "; method=BYE", 'Refer-To'));
                }
                this.uaCall.sendRequest(request);
            }
        };


        /**
         * @summary A SIP Dialog has been created. User agent becomes Dialog
         * @param {sip.Dialog} dialog SIP dialog
         * @param {sip.UserAgent} ua SIP user agent
         * @private
         */
        this.dialogCreated = function(dialog, ua) {
            if (ua === this.uaCall) {
                this.uaCall = dialog;
            }
        };

        /**
         * @summary SIP request has been canceled.
         * @param {sip.UserAgent} SIP user agent
         * @private
         */
        this.cancelled = function(ua) {
            console.debug("Call.cancelled()");
            if (this.uaCall && this.callStatus === this.CallStatus.RINGING && this.callDirection === this.CallDirection.INCOMING) {
                // ALU begin
                // ALU : dialog is created : uaCall pointed now directly on the Dialog instance
                //if(ua === uaCall) {
                if (this.uaCall.servers[0] && ua === this.uaCall.servers[0].app) {
                    // ALU end
                    this.callStatus = this.CallStatus.CANCELED;
                    //TODO onStatus() ?
                } else {
                    console.warn("Call.canceled() Invalid User Agent for cancel");
                }
            } else {
                console.debug("Call.cancelled() Ignore It.");
            }
        };

        /**
         * @summary Accept an incoming call.
         * @private
         */
        this.accept = function() {
            console.debug("Call.accept()");
            // if (params) {
            // // update call's audio stream
            // if (params.audio !== callParams.audioMediaDirection) {
            // if (isDebugEnabled() === true)  onDebug("acceptCall() audio: " + callParams.audioMediaDirection + " => " + params.audio);
            // callParams.audioMediaDirection = params.audio;
            // }
            // // update call's video stream
            // if (params.video !== callParams.videoMediaDirection) {
            // if (isDebugEnabled() === true)  onDebug("acceptCall() video: " + callParams.videoMediaDirection + " => " + params.video);
            // callParams.videoMediaDirection = params.video;
            // }
            // }

            this.callStatus = this.CallStatus.ACCEPTED;
            this.sendInviteResponse(200, 'OK');
        };

        /**
         * @summary Sends a SIP INVITE response.
         * @param {string} code Response code.
         * @param {string} text Response text.
         * @private
         */
        this.sendInviteResponse = function(code, text) {
            console.debug("Call.sendInviteResponse()");
            if (this.uaCall) {
                if (code >= 200 && code < 300) {
//                    this.createPeerConnection();
                    this.markActionNeeded();
                } else if (code >= 300) {
                    this.uaCall.sendResponse(this.uaCall.createResponse(code, text));
                    this.clean();
                }
            }
        };

        /**
         * @summary Sends a SIP CANCEL request.
         * @private
         */
        this.cancel = function() {
            console.debug("Call.cancel()");
            if (this.uaCall) {
                this.uaCall.sendCancel();
                this.callDirection = this.CallDirection.OUTGOING;
                this.callStatus = this.CallStatus.CANCELING;
            } else {
                console.warn("Call.cancel() user agent is not instancied");
            }
        };

        /**
         * @summary Sends a SIP BYE request.
         * @private
         */
        this.bye = function() {
            console.debug("bye()");
            if (this.uaCall) {
                var request = this.uaCall.createRequest('BYE');
                this.uaCall.sendRequest(request);
                this.callStatus = this.CallStatus.TERMINATING;
            } else {
                console.warn("Call.bye() user agent is not instancied");
            }
        };

        /**
         * @summary Deletes allocated resources associated to this Call.
         * @private
         */
        this.clean = function() {
            console.debug("Call.clean()");
            if (this.uaCall !== null) {
                if (this.uaCall instanceof sip.Dialog) {
                    this.uaCall.close();
                }
                this.uaCall = null;
            }

            if (this.pc) {
                this.pc.close();
                this.pc = null;
            }
        };


        try {
            if (session.mediaOptions && typeof session.mediaOptions.stun == 'string') {
                var s = session.mediaOptions.stun.replace(/^\s+|\s+$/g, '');
                if (s !== '') {
                    this.iceServers = [{"url": "stun:" + s}];
                }
            }
            if (this.iceServers === null) {
                this.pc = new webkitRTCPeerConnection(null);
            } else {
                this.pc = new webkitRTCPeerConnection({"iceServers": this.iceServers});
            }

            //var self = this;
            this.pc.onaddstream = this.onRTCPeerConnectionOnAddStream;
            this.pc.onconnecting = this.onRTCPeerConnectionOnConnecting;
            //this.pc.ongatheringchange = onRTCPeerConnectionOnGatheringChange;
            this.pc.onicecandidate = this.onRTCPeerConnectionOnIceCandidate;
            this.pc.onicechange = this.onRTCPeerConnectionOnIceChange;
            this.pc.onnegotiationneeded = this.onRTCPeerConnectionOnNegotiationNeeded;
            this.pc.onopen = this.onRTCPeerConnectionOnOpen;
            this.pc.onremovestream = this.onRTCPeerConnectionOnRemoveStream;
            this.pc.onstatechange = this.onRTCPeerConnectionOnStatusChange;
        } catch (exception) {
            console.debug("Call() Can not create a RTCPeerConnection instance, exception = " + exception);
            console.error("Call() Can not create a RTCPeerConnection instance");
        }
    }

    /** 
     * @summary Manages a resources list for conference call.
     * @constructor
     * @param {string} XML resource list according to RFC5366.
     * @memberOf orca
     * @private 
     */
    function ResourceList(rls) {
        var copyControlTo = "to",
                copyControlCc = "cc",
                copyControlBcc = "bcc",
                resources = [];

        /**
         * @summary Parses a resource list XML string.
         * @param {string} XML string of the resource list.
         * @private
         */
        this.parse = function(xmlstr) {
            var idx, anonymized, resource, parser, xmlDoc, entries;
            if (window.DOMParser) {
                parser = new DOMParser();
                xmlDoc = parser.parseFromString(xmlstr, "text/xml");
                entries = xmlDoc.getElementsByTagName("entry");
                for (idx = 0; idx < entries.length; idx += 1) {
                    anonymized = false;
                    if (entries[idx].getAttribute('cp:anonymize') === 'true') {
                        anonymized = true;
                    }
                    if (anonymized !== true) {
                        resource = {uri: entries[idx].getAttribute('uri'), copyControl: entries[idx].getAttribute('cp:copyControl'), anonymous: anonymized};
                        resources.push(resource);
                    }
                }
            }
        };

        /**
         * @summary Adds a resource in the resource list.
         * @param {Object} resource Resource.
         * @param {string} uri Resource URI.
         * @param {string} copyControl copy control marker: 'to', 'cc' or 'bcc'. <strong>Optional</strong> (default value is 'to').
         * @param {Boolean} anonymous Anonymous flag. <strong>Optional</strong> (default value is false).
         * @private
         */
        this.addResource = function(resource) {
            if (resource.copyControl === undefined) {
                resource.copyControl = 'to';
            }

            if (resource.anonymous === undefined) {
                resource.anonymous = false;
            }
            resources.push(resource);
        };

        /**
         * @summary Gets the list of resources.
         * @private 
         * @returns {Object[]}
         */
        this.getResources = function() {
            return resources;
        };

        /**
         * @summary Deletes a resource in the resource list.
         * @private
         */
        this.delResource = function(resource) {
            var idx, uri;
            for (idx = 0; idx < resources.length; idx += 1) {
                uri = resources[idx].uri;
                if (resource.uri === uri) {
                    resources.splice(idx, 1);
                    return;
                }
            }
        };

        /**
         * @summary Returns a XML string representation of a resource list.
         * @returns {string}
         * @private
         */
        this.toString = function() {
            var strdoc = '',
                    xmldoc = this.toXML();

            if (xmldoc.xml) {
                strdoc = xmldoc.xml;
            } else {
                strdoc = (new XMLSerializer()).serializeToString(xmldoc);
            }

            return strdoc;
        };

        /**
         * @summary Returns XML document of the resource list.
         * @returns {XMLDocument}
         * @private
         */
        this.toXML = function() {
            var data, xmlDoc, parser, idx, entry, uri, copyControl, anonymous, node;

            data = '<?xml version=\"1.0\" encoding=\"UTF-8\"?>';
            data = data + '<resource-lists xmlns="urn:ietf:params:xml:ns:resource-lists" xmlns:cp="urn:ietf:params:xml:ns:copyControl">';
            data = data + '<list>';
            data = data + '</list>';
            data = data + '</resource-lists>';

            if (window.DOMParser) {
                parser = new DOMParser();
                xmlDoc = parser.parseFromString(data, "text/xml");
            }
            else {
                // Internet Explorer     
                xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
                xmlDoc.async = false;
                xmlDoc.loadXML(data);
            }

            for (idx = 0; idx < resources.length; idx += 1) {
                entry = xmlDoc.createElement('entry');
                uri = document.createAttribute('uri');
                uri.value = resources[idx].uri;
                entry.setAttributeNode(uri);
                copyControl = document.createAttribute('cp:copyControl');
                copyControl.value = resources[idx].copyControl;
                entry.setAttributeNode(copyControl);

                if (resources[idx].anonymous === true) {
                    anonymous = document.createAttribute('cp:anonymize');
                    anonymous.value = "true";
                    entry.setAttributeNode(anonymous);
                }

                node = xmlDoc.getElementsByTagName("list")[0];
                node.appendChild(entry);
            }

            return xmlDoc;
        };

        if (rls !== undefined) {
            this.parse(rls);
        }
    }




    /** 
     * @summary Creates a multi-parts content, according to RFC1521.
     * @constructor
     * @memberOf orca
     * @private 
     */
    function Multipart() {
        var boundary, parts = [];

        /**
         * @summary Create a boundary string.
         * @param {string} boundary string.
         * @private
         */
        this.createBoundary = function() {
            var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz",
                    string_length = 16,
                    boundary = '',
                    i, rnum;

            for (i = 0; i < string_length; i += 1) {
                rnum = Math.floor(Math.random() * chars.length);
                boundary += chars.substring(rnum, rnum + 1);
            }
            return boundary;
        };


        /**
         * @summary Returns the boundary string.
         * @return {string}
         * @private
         */
        this.getBoundary = function() {
            return boundary;
        };

        /**
         * @summary Return the multi-parts content string data.
         * @return {string} 
         * @private
         */
        this.toString = function() {
            var mtp, idx;
            mtp = '';
            if (parts.length !== 0) {
                mtp = '--' + boundary + '\r\n';

                for (idx = 0; idx < parts.length; idx += 1) {
                    mtp = mtp + 'Content-Type: ' + parts[idx].contentType;
                    if (parts[idx].contentDisposition !== undefined) {
                        mtp = mtp + '\r\nContent-Disposition: ' + parts[idx].contentDisposition;
                    }
                    mtp = mtp + '\r\n\r\n';
                    mtp = mtp + parts[idx].data;

                    if (idx === parts.length - 1) {
                        // it's the last part
                        mtp = mtp + '\r\n--' + boundary + '--\r\n';
                    } else {
                        // it's not last part
                        mtp = mtp + '\r\n\r\n--' + boundary + '\r\n';
                    }
                }
            }
            return mtp;
        };

        /**
         * @summary Adds a part in the multi-parts content.
         * @param {Object} part Part
         * @param {string} part.contentType Part content type
         * @param {string} part.data Part data
         * @private
         */
        this.addPart = function(part) {
            var err;
            if (part.contentType === undefined) {
                err = new Error();
                err.message = "Content-Type not defined";
                throw err;
            }

            if (part.data === undefined) {
                err = new Error();
                err.message = "data not defined";
                throw err;
            }

            parts.push(part);
        };

        boundary = this.createBoundary();
    }






































    /**
     *
     * @summary Possible errors associated with a orca.Call
     * @typedef CallError
     * @type enum 
     * @property {string} NETWORK_ERROR An error has occurred 
     * 
     */
    CallError = {};
    CallError.NETWORK_FAILURE = '0';

    /**
     *
     * @summary Possible states of a orca.Call
     * @typedef CallStatus
     * @type enum 
     * @property {string} CONNECTING The call is in the process of connecting to the remote party
     * @property {string} HOLD The call has been placed on hold
     * @property {string} UNHOLD The call has been taken out of the "on hold" state
     * @property {string} REJECTED The call refused by the remote party
     * @property {string} CONNECTED The call is connected with the remote party
     * @property {string} DISCONNECT The call is disconnect from the remote party
     */
    CallStatus = {};
    CallStatus.CONNECTING = '0';
    CallStatus.HOLD = '1';
    CallStatus.UNHOLD = '2';
    CallStatus.REJECTED = '3';
    CallStatus.CONNECTED = '4'; // TODO : to validate with ORCA working group
    CallStatus.DISCONNECTED = '5'; // TODO : to validate with ORCA working group

    /**
     *
     * @summary Provides information about an event
     * @typedef Event
     * @type object 
     * @property {string} name Gets the name/type indicator of the event
     */
    //Event;

    /**
     *
     * @summary Provides information about the identity of a communications peer
     * @typedef PeerIdentity
     * @type object 
     * @property {string} id the unique identifier or address string of the associated user
     * 
     */
    //PeerIdentity;

    /**
     *
     * @summary Provides information about the identity of an user
     * @typedef UserId
     * @type object 
     * @property {string} id the unique identifier or address string of the user
     * 
     */
    //UserId;

    /**
     *
     * @summary Provides information about a token
     * @typedef Token
     * @type object 
     * 
     */
    //Token;

    /**
     *
     * @summary Possible errors associated with a orca.Session
     * @typedef SessionError
     * @type enum 
     * @property {string} AUTHENTICATION_FAILED User credentials are invalid
     * @property {string} NETWORK_ERROR No response recieved within maximum expected time
     * 
     */

    SessionError = {};
    SessionError.AUTHENTICATION_FAILED = '0';
    SessionError.NETWORK_ERROR = '1';

    /**
     *
     * @summary Possible states of a orca.Session
     * @typedef SessionStatus
     * @type enum 
     * @property {string} CONNECTED The session has been successfully established
     * @property {string} CONNECTING The session is in the process of being established
     * @property {string} DISCONNECTED The session has been torn down
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
     * @property {string} uri The address of the gateway server
     * @property {object} provider Reference to implementation providing actual functionality
     * @property {string} mediatypes The types of media streams that the created session will support; defaults if not provided
     * 
     */
    //SessionConfig;

    /** 
     * @summary root namespace of the call control SDK
     * @global
     * @namespace 
     */
    var orcaALU = {
        /**
         * allow creation of multiple sessions in a single page; 
         * possibly limit repeated registrations using the same identity
         * @param {Userid} userid The user's unique identifier
         * @param {Token} token An authorization token associated with the provided userid
         * @param {SessionConfig} sessionConfig session initialization parameters
         * @returns {orca.Session}
         */
        createSession: function(userid, token, sessionConfig, callback) {
            var session = new Session(userid, token, sessionConfig, callback);
            if (this.mediaOptions !== undefined) {
                session.mediaOptions = this.mediaOptions;
                session.conferenceFactoryURI = this.conferenceFactoryURI;
            }
            return session;
        },
        // orca.createManagedStream() is implemented in orca.js

        /**
         * Media options for ALU solution.
         * @private 
         */
        mediaOptions: {stun: "", bundle: false, iceType: "google-ice", crypto: 'sdes-sbc'},
        /**
         * Conference Factory URI.
         * @private 
         */
        conferenceFactoryURI: "sip:conference@example.com"
    };

    this.orcaALU = orcaALU;


}());
