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

/* $Id$ */
/*jslint devel: true */

console.trace = function (data) {
    console.debug("[" + new Date().toUTCString() + "] " + data + (new Error).stack.replace(/Error|http.*\//g,''));
};

(function () {
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
        this.sessionExpires = isNaN(this.config.providerConfig.expires) ? 600 : parseInt(this.config.providerConfig.expires);

        this.refreshInProgress = false;
        this.refresh_timer = 0;


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
        this.connect = function () {
            console.debug("[" + new Date().toUTCString() + "] " + "Session.connect()");
            if (this.socketStatus === this.WebSocketStatus.DISCONNECTED) {
                this.createWebSocket();
            } else {
                console.error("your session is already connecting or connected to the gateway");
            }
        };


        this.createWebSocket = function () {
            console.debug("[" + new Date().toUTCString() + "] " + "Session.createWebSocket()");
            var uri = this.config.uri;
            if ((uri.substr(0, 2) !== "ws") && (uri.substr(0, 3) !== "wss")) {
                console.error("URI of the gateway is malformed.");
                return;
            }

            console.debug("connect to " + uri);
            this.ws = new WebSocket(uri, ["sip"]);
            this.socketStatus = this.WebSocketStatus.CONNECTING;

            this.ws.onopen = function (evt) {
                self.onWebSocketOpen(evt);
            };
            this.ws.onclose = function (evt) {
                self.onWebSocketClose(evt);
            };
            this.ws.onerror = function (evt) {
                self.onWebSocketError(evt);
            };
            this.ws.onmessage = function (evt) {
                self.onWebSocketMessage(evt);
            };
        };

        /**
        * Creates a new call instance for communication with the specified recipient
        * @param {string[]} to list of user identifier of the call recipients
        * @param {string} mediatypes Comma separated list of media stream types to be used during the call Eg. "audio,video"
        * @returns {orca.Call}
        */
        this.createCall = function (to, mediatypes, session, callback) {
            console.debug("Session.createCall()");
            var call = new Call(to, mediatypes, session, callback);
            this.calls.push(call);
            return call;
        };

        /**
        * Ends and active communications session with a gateway server
        *
        */
        this.disconnect = function () {
            console.debug("Session.disconnect()");
            if (this.socketStatus !== this.WebSocketStatus.DISCONNECTED) {
                this.unregister();
            } else {
                console.warn("Session.disconnect() Ignoring in this state : " + this.socketStatus);
            }
            if (this.refresh_timer) {
                clearTimeout(this.refresh_timer);
            }
            this.savedCallId = undefined;
        };

        /**
        * @summary Retrieves the current status of this session
        * @returns String
        */
        this.getStatus = function () {
            return this.sessionStatus;
        };

        /**
        * @summary Triggered when the WebSocket connection is opened
        * @event
        * @param {Event} evt event
        * @private
        */
        this.onWebSocketOpen = function (evt) {
            console.debug("[" + new Date().toUTCString() + "] " + "Session.onWebSocketOpen()");
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
        this.onWebSocketClose = function (evt) {
            console.debug("[" + new Date().toUTCString() + "] " + "Session.onWebSocketClose(), evt = " + evt);
            var event = {name: evt.data};

            this.sessionStatus = SessionStatus.DISCONNECTED;
            if (this.socketStatus !== this.WebSocketStatus.CONNECTED) {
                console.error("Network failure");
                this.callback.onError(SessionError.NETWORK_ERROR, event);
            } else {
                //TODO How to distinguish the closing of WebSocket connection done by the client or by the server.
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
        this.onWebSocketError = function (evt) {
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
        this.onWebSocketMessage = function (evt) {
            console.debug("[" + new Date().toUTCString() + "] " + "Session.onWebSocketMessage() message:\n" + evt.data);
            this.stack.received(evt.data, ["127.0.0.1", 0]);
        };

        /**
        * @summary Creates the SIP stack
        * @private
        */
        this.createStack = function () {
            console.debug("Session.createStack()");
            var transportInfo = new sip.TransportInfo(this.listenIp, this.listenPort, this.transport, false, true, true);
            this.stack = new sip.Stack(this, transportInfo);
        };

        /**
        * @summary Sends a SIP request REGISTER to register the web user into the IMS Core.
        * @private
        */
        this.register = function () {
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
        * @summary Send a register refresh to maintain the current registration with the IMS core
        */
        this.register_refresh = function () {
            var outboundProxy, request, event;

            console.debug("[" + new Date().toUTCString() + "] " + "Session.register_refresh()");

            request = this.createRegister();
            request.setItem('Expires', new sip.Header(this.sessionExpires.toString(), 'Expires'));
            request.setItem('User-Agent', new sip.Header(this.userAgent, 'User-Agent'));
            request.setItem('Call-ID', new sip.Header(this.savedCallId.toString(), 'Call-ID'));
            console.debug("Session.register_refresh() request = " + request);

            this.uaReg.sendRequest(request);
            event = {name: this.sessionStatus};
            this.callback.onStatus(this.sessionStatus, event);

            console.debug("Register refresh sent");
            this.refreshInProgress = true;

        };


        /**
        * @summary Sends a SIP request REGISTER to unregister the web user into the IMS Core.
        * @private
        */
        this.unregister = function () {
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
        this.createRegister = function () {
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

            if (this.token.imsauth !== undefined && this.token.imsauth == "sso-token") {
                console.debug("this.token.imsauth is set to 'sso-token'\n");
                request.setItem('Authorization', new sip.Header("SSO  " + "token=\"" + this.token.key + "\"", 'Authorization'));
            }

            return request;
        };

        /**
        * @summary Extracts the username part of a URI.
        * @param {string} uri URI
        * @returns {string}
        * @private
        */
        this.getUsername = function (uri) {
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
        this.getRouteHeader = function (username) {
            var outboundProxyAddress = this.config.uri.split('/')[2].trim() + ';transport=' + this.transport;
            return new sip.Header("<sip:" + (username ? username + "@" : "") + outboundProxyAddress + ";lr>", 'Route');
        };

        /**
        * @summary Creates a random UUID.
        * @returns {string}
        * @private
        */
        this.createUUID4 = function () {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        };

        /**
        * @summary Creates a unique instance ID for the Session.
        * @private
        */
        this.createInstanceId = function () {
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
        this.createTimer = function (obj, stack) {
            return new sip.TimerImpl(obj);
        };

        /**
        * @summary Sends data into the WebSocket connection.
        * @private
        */
        this.send = function (data, addr, stack) {
            var message = "=> " + addr[0] + ":" + addr[1] + "\n" + data;
            console.debug("[" + new Date().toUTCString() + "] " + "Session.send() message " + message);
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
        this.debug = function (msg) {
            console.debug("[SIP] " + msg);
        };

        /**
        * @summary Receives a SIP response
        * @param {sip.UserAgent} ua User agent instance
        * @param {sip.Message} response SIP response
        * @param {sip.Stack} stack SIP stack instance
        * @private
        */
        this.receivedResponse = function (ua, response, stack) {
            console.debug("[" + new Date().toUTCString() + "] " + "Session.receivedResponse()");
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

        /*
         * Called to do dns resolution.  For now just provide the websocket ip address.
         *
         */
        this.resolve = function (host, type, callback, stack) {
                console.debug("Entered resolve() host = " + host + " type = " + type);

                var slash_position = this.config.uri.lastIndexOf("/");
                var colon_position = this.config.uri.lastIndexOf(":");
                var ip_address = this.config.uri.substring(slash_position + 1, colon_position);
                console.debug("resolve() ip_address = " + ip_address);

                dns_candidate = new Object();
                dns_candidate.address = ip_address;
                var values = new Array();
                values[0] = dns_candidate;
                callback(host, values);
        };


        /**
        * @summary Receives a SIP REGISTER response
        * @param {sip.UserAgent} ua User agent instance
        * @param {sip.Message} response SIP response
        * @private
        */
        this.receivedRegisterResponse = function (ua, response) {
            console.debug("Session.receivedRegisterResponse() ua=" + ua);
            var event, i_expires, refresh_time, min_expires, i, contact;
            if (response.isfinal()) {
                if (response.is2xx()) {
                    if (this.sessionStatus === SessionStatus.CONNECTING || this.refreshInProgress) {
                        this.sessionStatus = SessionStatus.CONNECTED;
                        event = {name:SessionStatus.CONNECTED};

                        if (!this.savedCallId) {
                            if (response.hasItem("call-id")) {
                                this.savedCallId = response.getItem("call-id").value;
                                console.debug("Saving initial register call id = " + this.savedCallId);
                            }
                        }
                        if (!this.refreshInProgress) {
                            // don't prompt again for use of camera/microphone on refresh
                            this.callback.onConnected(event);
                            this.callback.onStatus(SessionStatus.CONNECTED, event);
                        }
                        if (this.refreshInProgress) {
                            this.refreshInProgress = false;
                            console.debug("Register refresh completed successfully");
                        }

                        // Check to see if expires header is present
                        if (response.hasItem("expires").value) {
                            i_expires = parseInt(response.getItem("expires").value);
                        } else {
                            // Expires header not present, check contact
                            contact = response.getItem("contact");
                            if (contact instanceof Array) {
                                i_expires = this.sessionExpires;
                                for (i = 0; i < contact.length; i += 1) {
                                    if (contact[i]['+sip.instance'] === this.instanceId) {
                                        i_expires = parseInt(contact[i].expires);
                                        break;
                                    }
                                }
                            } else {
                                i_expires = parseInt(contact.expires);
                            }
                        }
                        console.debug("i_expires = " + i_expires);

                        if (i_expires > 0) {

                            // Calculate the refresh time.  Per 3GPP TS 24.229 it should be 600 seconds before the expiration
                            // time if the initial registration was for greater than 1200 seconds, or when half of the time has
                            // expired if the initial registration was for 1200 seconds or less.

                            if (i_expires > 1200) {
                                refresh_time = i_expires - 600;
                            } else {
                                refresh_time = i_expires / 2;
                            }
                            console.debug("refresh_time = " + refresh_time);
                            var self = this;
                            this.refresh_timer = setTimeout(function () { self.register_refresh(); }, refresh_time * 1000);
                        } else {
                            // report error and return
                            console.debug("invalid i_expires = " + i_expires);
                            return;
                        }
                    } else if (this.sessionStatus === SessionStatus.CONNECTED) {
                        this.ws.close();
                    } else {
                        console.warn("Session.receivedRegisterResponse() Ignore SIP REGISTER response (session status = " + this.sessionStatus + ")");
                    }
                } else {
                    console.debug("Session.receivedRegisterResponse() failed response = " + response.response + " " + response.responsetext);
                    if (response.response == 423) {
                        // extract min-expires header value
                        min_expires = response.getItem("min-expires").value;
                        this.sessionExpires = min_expires;
                        console.debug("Re-trying register with expires = " + min_expires);
                        this.register();
                        return;
                    }
                    event = {name:SessionStatus.DISCONNECTED};
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
        this.authenticate = function (ua, header, stack) {
            console.debug("authenticate() username = " + this.token.id + ", password = "+ this.token.key);
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
        this.createServer = function (request, uri, stack) {
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
        this.receivedRequest = function (ua, request, stack) {
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
                call.receivedInvite(ua, request);
            } else if (method === "BYE") {
                call.receivedBye(ua, request);
            //} else if (method === "MESSAGE") {
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
        this.getCall = function (callId) {
            var call = null, i;
            for (i=0; i < this.calls.length; i+=1) {
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
        this.dialogCreated = function (dialog, ua, stack) {
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
        this.cancelled = function (ua, request, stack) {
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
    function Call(to, mediatypes, session, callback) {
        this.callback = callback;
        if (previousCall) {
            previousCall = this;
        }

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
        this.CallStatus.HOLD = 'hold';
        this.CallStatus.REMOTE_HOLD = 'remote hold';
        this.CallStatus.UPGRADING = 'upgrading';
        this.CallStatus.DOWNGRADING = 'downgrading';

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
        this.MediaDirection.INACTIVE = 'inactive';

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
         * Call status for internal state.
         * @type {orcaALU.Call.CallStatus}
         * @private
         */
        this.callStatus = this.CallStatus.IDLE;

        /**
         * Call status.
         * @type {CallStatus}
         * @private
         */
        this.callStatusExternal = this.CallStatus.DISCONNECTED;

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
        this.callId= undefined;

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
        this.targetAOR = (typeof to == 'string' ? [to] : to);

        /**
         * Media types.
         * @type string
         * @private
         */
        this.mediatypes = mediatypes;
        this.oldMediaTypes = undefined;

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
         * Flag for video upgrade to know whether waiting for ICE before sending SDP
         * @type bool
         * @private
         */
        this.waitingIce = false;

        /**
        * Remote peers attached to this call.
        * @type PeerIdentity[]
        */
        this.remotePeerIds = [];

        /**
        * Flag for whether an initial frame refresh is needed
        * @type bool
        */
        this.needsRefresh = this.session.config.providerConfig.refreshTiled;

        /**
        * Flag for whether call might have ALU tiled video
        * @type bool
        */
        this.isTiledVideo = false;

        /**
        * Buffer of DTMF tones to be sent via SIP INFO method
        * @type string
        */
        this.dtmfSipBuffer = '';

        /**
        * Flag for whether SIP INFO DTMF should be sent
        * @type bool
        */
        this.dtmfSip = (this.session.config.providerConfig.dtmf !== 'inband');

        /**
        * Flag for whether inband DTMF should be sent
        * @type bool
        */
        this.dtmfInband = (this.session.config.providerConfig.dtmf !== 'sip');

        /*
        * Flags to indicate whether a hold or resume is pending
        */
        this.holdPending = false;
        this.resumePending = false;

        var self = this;



        // Call.id() is implemented in orca.js

        /**
        * Gets the identities of the remote peers attached to this call
        * @returns {PeerIdentity[]}
        */
        this.remoteIdentities = function () {
            return this.remotePeerIds;
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
        this.addStream = function (managed) {
            var streams, audioTracks;
            if (this.pc) {
                streams = this.pc.getLocalStreams();
                if ((this.callStatus === this.CallStatus.CONFIRMED) || (this.callStatus === this.CallStatus.ACCEPTED) || (this.callStatus === this.CallStatus.HOLD) || (this.callStatus === this.CallStatus.REMOTE_HOLD)) {
                    this.callDirection = this.CallDirection.OUTGOING;
                }
                if (streams.length > 0) {
                    if (streams[0].getVideoTracks().length === 0 && managed.stream().getVideoTracks().length > 0) {
                        this.waitingIce = true;
                    } else {
                        this.waitingIce = false; //TODO: audio upgrade needs true here.
                    }
                    this.pc.removeStream(streams[0]);
                    console.debug('addStream() removeStream: '+streams[0].id);
                } else {
                    this.waitingIce = true;
                }
                this.pc.addStream(managed.stream());
                this.mediatypes = managed.type();
                console.trace('addStream(): ' + managed.stream().id + ', ' + this.mediatypes +', waitingIce: ' + this.waitingIce);

                this.dtmfSender = null;
                if (this.dtmfInband) {
                    audioTracks = managed.stream().getAudioTracks();
                    if (audioTracks.length > 0) {
                        try {
                            this.dtmfSender = this.pc.createDTMFSender(audioTracks[0]);
                        } catch (e) {
                            this.dtmfSender = null;
                            console.warn('Call.connect() inband DTMF not supported by browser');
                        }
                    }
                }
            } else {
                console.warn("Call.connect() Peer connexion is not created");
            }
            // if (this.callStatus === this.CallStatus.CONFIRMED) {
            //     var localStreams = this.callback.streams('local');
            //     console.debug('addStream() localStreams:' + localStreams.length);
            //     for (var i = 0; i < localStreams.length; i++) {
            //         if (localStreams[i].stream().id != managed.stream().id) {
            //             this.pc.removeStream(localStreams[i].stream());
            //         }
            //     }
            //     this.pc.addStream(managed.stream());
            //     var audio = managed.stream().getAudioTracks().length;
            //     var video = managed.stream().getVideoTracks().length;
            //     if (audio && video)
            //         this.mediatypes = 'audio,video';
            //     else if (audio)
            //         this.mediatypes = 'audio';
            //     else if (video)
            //         this.mediatypes = 'video';
            //     else
            //         this.mediatypes = '';

            //     //this.oldMediaTypes = this.mediatypes;
            //     this.invite();
            // }
        };

        /**
        * Attempts to reach the call recipient and establish a connection
        * For an incoming call, calling this method explicitly joins/accepts the call
        */
        this.connect = function () {
            console.debug("Call.connect()");
            if (this.pc) {
                //var localStreams = this.callback.streams('local');
                //this.pc.addStream(localStreams[0].stream());
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
        this.disconnect = function () {
            console.debug("Call.disconnect()");
            if ((this.callDirection === this.CallDirection.OUTGOING) && ((this.callStatus === this.CallStatus.IDLE) || (this.callStatus === this.CallStatus.RINGING))) {
                this.cancel();
            } else if ((this.callDirection === this.CallDirection.INCOMING) && ((this.callStatus === this.CallStatus.IDLE) || (this.callStatus === this.CallStatus.RINGING))) {
                this.sendInviteResponse(480, 'Temporarily Unavailable');
            } else if ((this.callStatus === this.CallStatus.CONFIRMED) || (this.callStatus === this.CallStatus.ACCEPTED) || (this.callStatus === this.CallStatus.HOLD) || (this.callStatus === this.CallStatus.REMOTE_HOLD)) {
                this.bye();
            } else {
                console.debug("Call.disconnect() Ignore it [callStatus = " + this.callStatus + ", callDirection = " + this.callDirection + "]");
            }
        };

        /**
        * Called when a user does not wish to accept an incoming call
        *
        */
        this.reject = function () {
            console.debug("Call.reject()");
            this.callStatus = this.CallStatus.REFUSED;
            this.sendInviteResponse(480, 'Temporarily Unavailable');
        };

        // Call.streams() is implemented in orca.js


        /**
        * IMPLEMENTATION LAYER ONLY Retrieves a list of remote streams associated with this call.
        * @returns {orca.ManagedStream[]}
        */
        this.remoteStreams = function () {
            return this.managedStreams;
        };

        /**
        * Retrieves the current status of this call
        * @returns {CallStatus}
        */
        this.getStatus = function () {
            return this.callStatusExternal;
        };

        /**
        * Gets the media stream types used in this call
        * @returns {string}
        */
        //TODO: discuss API change with Orca working group
        this.mediaTypes = function () {
            return this.mediatypes;
        };

        /**
        * Add a new participant to a group call of which you are the initiator.
        * @param {string} target The user to add
        */
        //TODO: discuss API change with Orca working group
        this.addParticipant = function (target) {
            this.doRefer(target, true);
        };

        /**
        * Remove a participant from a group call of which you are the initiator.
        * @param {string} target The user to remove
        */
        //TODO: discuss API change with Orca working group
        this.removeParticipant = function (target) {
            this.doRefer(target, false);
        };

        /**
        * Send DTMF.
        * @param {string} dtmf The DTMF to send
        */
        //TODO: discuss API change with Orca working group
        this.sendDTMF = function (dtmf) {
            var duration = 250, gap = 50;
            console.debug("sendDTMF " + dtmf);
            if (this.uaCall) {
                if (this.dtmfInband) {
                    if (this.dtmfSender) {
                        try {
                            this.dtmfSender.insertDTMF(dtmf, duration, gap);
                        } catch (e) {
                            console.error('Error from insertDTMF: ' + e.message);
                            // Chrome throws error if other party does not accept telephone-event in SDP
                        }
                    } else {
                        console.error('Could not send inband DTMF');
                    }
                }
                if (this.dtmfSip) {
                    if (this.dtmfSipBuffer.length > 0) {
                        this.dtmfSipBuffer += ',' + dtmf;
                    } else {
                        this.dtmfSipBuffer = dtmf;
                        this.sendDTMFBuffer();
                    }
                }
            }
        };

        /**
        * Send DTMF tones in the buffer using SIP INFO method.
        */
        this.sendDTMFBuffer = function () {
            var c, gap = 300;
            if (self.dtmfSipBuffer.length > 0) {
                c = self.dtmfSipBuffer[0];
                self.dtmfSipBuffer = self.dtmfSipBuffer.substring(1);
                if (c === ',') {
                    gap = 2000;
                } else {
                    self.sendDTMFSip(c);
                }
                if (self.dtmfSipBuffer.length > 0) {
                    setTimeout(self.sendDTMFBuffer, gap);
                }
            }
        };

        /**
        * Send a DTMF tone using SIP INFO method.
        * @param {string} dtmf The DTMF tone to send
        */
        this.sendDTMFSip = function (dtmf) {
            var allowed, request, contact;
            console.debug("sendDTMFSip " + dtmf);
            if (this.uaCall) {
                if (typeof dtmf !== 'string' || dtmf.length !== 1) {
                    console.error('sendDTMFSip() Input must be a single DTMF character.');
                    return;
                }
                allowed = '1234567890#*ABCDabcd';
                if (allowed.indexOf(dtmf) < 0) {
                    console.error('sendDTMFSip() Character "' + dtmf + '" is not a DTMF tone, ignoring.');
                    return;
                }
                request = this.uaCall.createRequest('INFO');
                contact = new sip.Header((new sip.Address(this.localAOR)).uri.toString(), 'Contact');
                request.setItem('Contact', contact);
                if (this.userAgent) {
                    request.setItem('User-Agent', new sip.Header(this.userAgent, 'User-Agent'));
                }
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
        this.transfer = function (target) {
            this.doRefer(target, true);
        };

        /**
        * Upgrade to audiovideo call
        */
        //TODO: discuss API change with Orca working group
        this.startVideo = function () {
            this.updateCall({audio:undefined, video:"sendrecv"});
        };

        /**
        * Downgrade to audio call
        */
        //TODO: discuss API change with Orca working group
        this.stopVideo = function () {
            this.updateCall({audio:undefined, video:"none"});
        };

        /**
        * @summary Change media stream directions
        * @private
        */
        this.updateCall = function (params) {
            var reinvite = false;
            var has_audio = false;
            var has_video = false;

            // update call's audio stream
            if (params.audio !== this.audioMediaDirection) {
                console.debug("updateCall() audio: " + this.audioMediaDirection + " => " + params.audio);
                reinvite = true;
                this.audioMediaDirection = params.audio;
            }
            // update call's video stream
            if (params.video !== this.videoMediaDirection) {
                console.debug("updateCall() video: " + this.videoMediaDirection + " => " + params.video);
                reinvite = true;
                this.videoMediaDirection = params.video;
            }

            if (params.audio === undefined) {
                has_audio = false;
            } else {
                has_audio = true;
            }

            if (params.video === undefined) {
                has_video = false;
            } else {
                has_video = true;
            }

            if (has_audio === true) {
                if (has_video === true) {
                    this.mediatypes = 'audio,video';
                } else {
                    this.mediatypes = 'audio';
                }
            } else {
                if (has_video === true) {
                    this.mediatypes = 'video';
                } else {
                    this.mediatypes = '';
                }
            }

            if (reinvite) {
                this.invite();
            }
        };

        /**
        * @summary Sends a SIP request INVITE to make a call.
        * @private
        */
        this.invite = function () {
            console.debug("Call.invite(): oldMediaTypes=" + this.oldMediaTypes + "; current mediatypes=" + this.mediatypes);
            this.callDirection = this.CallDirection.OUTGOING;
            this.markActionNeeded();
        };

    /**
    * Places a call on hold
    */
    this.hold = function (type) {
        console.debug("Call.hold() type = " + type);
        if (type === undefined) {
            type = 'inactive';
        }
        if (type != 'sendonly' && type != 'inactive') {
            console.debug("Call.hold invalid type = ", + type);
            return;
        }
	
	var updateDict = {} ;
	if (this.mediatypes.indexOf('audio') !== -1) {
	    updateDict['audio'] = type ;
        }

        if (this.mediatypes.indexOf('video') !== -1) {
	    updateDict['video'] = type ;
        }


        this.holdPending = true;
        this.updateCall(updateDict) ;
	
    };

    /**
    * Takes a call off hold
    */
    this.resume = function () {
        console.debug("Call.resume()");
        
		if ( ( this.mediatypes.indexOf('video') === -1 ) &&
		     ( this.mediatypes.indexOf('audio') === -1 ) )
		{
			console.debug("Call.hold invalid mediatypes=", + this.mediatypes);
			return;
		}
		
		this.resumePending = true;
		
		var updateDict = {} ;
		if (this.mediatypes.indexOf('audio') !== -1) {
			updateDict['audio'] = "sendrecv" ;
        }

        if (this.mediatypes.indexOf('video') !== -1) {
			updateDict['video'] = "sendrecv" ;
        }

        this.updateCall(updateDict) ;
		
	};


    /**
    * @private
    */
    this.markActionNeeded = function () {
        this.actionNeeded = true;
        var self = this;
        this.doLater(function () {
            self.onStableStatus();
        });
    };

    /**
    * @summary Post an event to myself so that I get called a while later.
    * @param {function} what Function to run later
    * @private
    */
    this.doLater = function (what) {
        setTimeout(what, 1);
    };


    /**
    * @summary Internal function called when a stable state is entered by the browser (to allow for multiple AddStream calls or
    * other interesting actions).
    * @private
    */
    this.onStableStatus = function () {
	
        console.debug("Call.onStableStatus() [actionNeeded = " + this.actionNeeded + ", moreIceComing = " + this.moreIceComing + ",waitingIce = " + this.waitingIce +", status = " + this.callStatus + ", callDirection = " + this.callDirection + ", activeCall = " + this.activeCall + "]");
	
        var mySDP, sdp, self;
        if (this.actionNeeded) {
            switch(this.callStatus) {
                case this.CallStatus.IDLE:
                    this.createSDPOffer();
                   break;

                case this.CallStatus.PREPARING_OFFER:
                    console.debug('PREPARING_OFFER: waitingIce: ' + this.waitingIce);
                    if (this.waitingIce || this.moreIceComing) {
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
                        this.sdpOffer = this.updateSDPForTempWorkarounds(this.sdpOffer, "offer");
                        // we already received a SDP offer
                        if (this.session.config.providerConfig.iceType === "google-ice") {
                            this.sdpOffer = this.updateSDPMediaIceOption(this.sdpOffer, "offer", "google-ice");
                        }

                        this.callStatus = this.CallStatus.PREPARING_ANSWER;
                        if (webkitRTCPeerConnection !== undefined) {
                            var remoteSdpOffer = this.sdpOffer;
                            // var idx = this.sdpOffer.indexOf('m=video 0');
                            // if (idx !== -1) {
                            //     remoteSdpOffer = this.sdpOffer.substring(0, idx);
                            // }
                            //TODO: temp workaround to remove unnecessary video codecs which will cause transfer party A not working
                            // will revisit this to find root cause or rewrite regex to replace the sdp string.
                            // if (remoteSdpOffer.indexOf('m=video') !== -1) {
                            //     var index1 = this.sdpOffer.lastIndexOf('RTP/SAVPF 100 ');
                            //     remoteSdpOffer = this.sdpOffer.substring(0, index1);
                            //     remoteSdpOffer += 'RTP/SAVPF 100\n';
                            //     index1 = this.sdpOffer.lastIndexOf('c=IN IP4 ');
                            //     var index2 = this.sdpOffer.lastIndexOf('a=rtpmap:100');
                            //     remoteSdpOffer += this.sdpOffer.substring(index1, index2);
                            //     remoteSdpOffer += 'a=rtpmap:100 VP8/90000\n';
                            //     index1 = this.sdpOffer.lastIndexOf('a=crypto:1');
                            //     remoteSdpOffer += this.sdpOffer.substring(index1);
                            // }
                            var idx = this.sdpOffer.indexOf('m=video');
                            if(idx !== -1 && this.sdpOffer.indexOf('VP8') === -1) {
                                remoteSdpOffer = remoteSdpOffer.substring(0, idx);
                                //remoteSdpOffer += 'm=video 0 RTP/SAVPF';
                            }
                            console.trace("onStableStatus() setRemoteDescription sdp = " + remoteSdpOffer);
                            this.pc.setRemoteDescription(new RTCSessionDescription({type:'offer', sdp:remoteSdpOffer}));
                            try {
                                self = this;
                                this.pc.createAnswer(function (sessionDescription) {
                                    if (self.session.config.providerConfig.crypto === "sdes-sbc") {
                                        sessionDescription = self.updateSDPRemoveCrypto(sessionDescription);
                                    }
                                    if (self.session.config.providerConfig.bundle === false) {
                                        sessionDescription = self.updateSDPOfferMediaBundle(sessionDescription);
                                    }
                                    if (self.session.config.providerConfig.iceType === "google-ice") {
                                        sessionDescription = self.updateSDPMediaIceOption(sessionDescription, "answer", "google-ice");
                                    }
                                    if (self.sdpOffer.indexOf('m=video') !== -1 && self.sdpOffer.indexOf('m=video 0') === -1 && 
                                        (sessionDescription.sdp.indexOf('m=video') === -1 || sessionDescription.sdp.indexOf('m=video 0') !== -1)) {
                                        self.waitingIce = false;
                                    }
                                    console.trace("onStableStatus() setLocalDescription sdp = " + sessionDescription.sdp);
                                    self.pc.setLocalDescription(sessionDescription);
                                }, function (error) {
                                    self.callStatus = self.CallStatus.FAILED;
                                    console.error('createAnswer failure callback: ' + error);
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
                                // mySDP = pc.createAnswer(this.sdpOffer, {audio: true, video: true});
                            // }
                            // pc.setLocalDescription(webkitPeerConnection00.SDP_ANSWER, mySDP);
                            // if (isDebugEnabled() === true)  onDebug('onStableStatus() setLocalDescription 2 (answer)');
                        //}
                        this.markActionNeeded(); //TODO: might need to move the call into callback if callStatus is not set in time
                    } else {
                        this.createSDPOffer();
                    }
                    break;

                case this.CallStatus.PREPARING_ANSWER:
                    console.debug('PREPARING_ANSWER: waitingIce: ' + this.waitingIce);
                    if (this.waitingIce || this.moreIceComing) {
                        return;
                    }
                    if (webkitRTCPeerConnection !== undefined) {
                        sdp = this.pc.localDescription.sdp;
                    } //else if (webkitPeerConnection00 !== undefined) {
                        //sdp = pc.localDescription.toSdp();
                    //}
                    if (this.session.config.providerConfig.iceType === "google-ice") {
                        sdp = this.updateSDPMediaIceOption(sdp, "answer", "google-ice");
                    }
                    var idx = sdp.indexOf('m=video');
                    if (idx === -1 && this.sdpOffer.indexOf('m=video') !== -1) { //downgraded. remote sdp offer has video or video 0
                        sdp = sdp + 'm=video 0 RTP/SAVPF 0\nc=IN IP4 0.0.0.0\n';
                    }
                    this.createAndSendInviteResponse(sdp);
                    break;

                case this.CallStatus.CONFIRMED:
                case this.CallStatus.HOLD:
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
                    else{
                        console.warn('call FAILED');
                        if(this.callDirection === this.CallDirection.INCOMING)
                            this.reject();
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
    this.onRTCPeerConnectionOnAddStream = function (evt) {
        console.debug("Call.onRTCPeerConnectionOnAddStream()");
        var managedSteam , event;
        managedSteam = orca.createManagedStream(evt.stream);
        self.managedStreams.push(managedSteam);
        event = {name:CallStatus.ADDSTREAM};
        self.callback.onAddStream(managedSteam, event);
    };

    /**
     * @summary Function called when RTCPeerConnection onconnecting event is fired.
     * @param {Event} evt
     * @private
     */
    this.onRTCPeerConnectionOnConnecting = function (evt) {
        console.debug("Call.onRTCPeerConnectionConnecting()");
    };

    /**
     *  Callback for ongatheringchange RTCPeerConnection event.
     * @param {Event} evt
     */
    this.onRTCPeerConnectionOnGatheringChange = function (evt) {
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
    this.onRTCPeerConnectionOnIceCandidate = function (evt) {
        if (evt.candidate === null) {
            console.debug("Call.onRTCPeerConnectionIceCandidate() end of candidates [status = " + self.callStatus + ", callDirection = " + self.callDirection + ", activeCall = " + self.activeCall + "]");
            if ((self.callStatus === self.CallStatus.PREPARING_OFFER) || (self.callStatus === self.CallStatus.PREPARING_ANSWER)) {
                self.moreIceComing = false;
                self.waitingIce = false;
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
    this.onRTCPeerConnectionOnIceChange = function (evt) {
        console.debug("Call.onRTCPeerConnectionIceChange()");
    };

    /**
     * @summary Function called when RTCPeerConnection onnegotiatoinneeded event is fired.
     * @param {Event} evt
     * @private
     */
    this.onRTCPeerConnectionOnNegotiationNeeded = function (evt) {
        console.debug("Call.onRTCPeerConnectionNegotiationNeeded()");
    };

    /**
     * @summary Function called when RTCPeerConnection onopen event is fired.
     * @param {Event} evt
     * @private
     */
    this.onRTCPeerConnectionOnOpen = function (evt) {
        console.debug("Call.onRTCPeerConnectionOnOpen()");
    };

    /**
     * @summary Function called when RTCPeerConnection onremovestream event is fired.
     * @param {MediaStreamEvent} evt
     * @private
     */
    this.onRTCPeerConnectionOnRemoveStream = function (evt) {
        console.debug("Call.onRTCPeerConnectionRemoveStream()");
    };

    /**
     * @summary Function called when RTCPeerConnection onstatechange event is fired.
     * @param {Event} evt
     * @private
     */
    this.onRTCPeerConnectionOnStatusChange = function (evt) {
        console.debug("Call.onRTCPeerConnectionStatusChange() [readyStatus=" + evt.currentTarget.readyStatus + ', iceStatus=' + evt.currentTarget.iceStatus + "]");
    };

    /**
     * @summary Creates and sends a SIP INVITE request.
     * @param {string} sdp SDP offer
     * @private
     */
    this.createAndSendInviteRequest = function (sdp) {
        console.debug("Call.createAndSendInviteRequest() moreIceComing= " + this.moreIceComing);
        var request, contact, rls, idx, mtp;
        if (this.uaCall === null) {
            this.uaCall = new sip.UserAgent(this.session.stack);
            if (this.targetAOR.length === 1) {
                this.uaCall.remoteParty = new sip.Address(this.targetAOR[0]);
            } else {
                this.uaCall.remoteParty = new sip.Address(this.session.config.providerConfig.conferenceFactoryURI);
            }
            this.uaCall.localParty = new sip.Address(this.localAOR);
            this.uaCall.routeSet = [this.getRouteHeader()];
            for (idx=0; idx < this.targetAOR.length; idx+=1) {
                this.remotePeerIds.push({id:this.targetAOR[idx]});
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
                for (idx=0; idx<this.targetAOR.length; idx+=1) {
                    rls.addResource({uri:this.targetAOR[idx]});
                }
                // conferenceParams.rls = rls;
                // callParams.isConferenceCall = true;
                // we have to establish a conference call
                mtp = new Multipart();
                mtp.addPart({contentType:"application/sdp", data:sdp});
                mtp.addPart({contentType:"application/resource-lists+xml", contentDisposition:"recipient-list", data:rls.toString()});
                request.setItem('Content-Type', new sip.Header('multipart/mixed;boundary='+ mtp.getBoundary(), 'Content-Type'));
                request.setItem('Require', new sip.Header("recipient-list-invite", 'Require'));
                request.setBody(mtp.toString());
                this.isTiledVideo = this.mediatypes.indexOf('video') > -1;
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
    this.createAndSendInviteResponse = function (sdp) {
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
    this.createSDPOffer = function () {
        console.debug("Call.createSDPOffer()");
        var constraint, constraint1, constraint2, audio=false, video=false, sdpOffer;

        if (this.mediatypes.indexOf('audio') !== -1) {
            audio=true;
        }

        if (this.mediatypes.indexOf('video') !== -1) {
            video=true;
        }

        this.waitingIce = false;
        constraint1 = { audio: audio, video: video };
        constraint2 = {'mandatory': {'OfferToReceiveAudio':audio, 'OfferToReceiveVideo':video}};
	
        console.debug("createSDPOffer(): oldMediaTypes=" + this.oldMediaTypes + "; current mediatypes=" + this.mediatypes);
	
        // if ((this.mediatypes === undefined) && (callParams.callDirection === "incoming")) {
            // this.mediatypes = "audiovideo";
            // if (!callParams.videoMediaDirection) {
                // callParams.videoMediaDirection = "sendrecv";
            // }
            // if (!callParams.audioMediaDirection) {
                // callParams.audioMediaDirection = "sendrecv";
            // }
            // this.videoMediaDirection = this.MediaDirection.SENDRECV;
            // this.audioMediaDirection = this.MediaDirection.SENDRECV;
        // }

    if (this.holdPending || this.resumePending) {
            // call hold/resume re-invite, don't need to redo ice
            this.moreIceComing = false;
    } else {
	
	    if (this.mediatypes.indexOf('audio') !== -1) {
	            this.audioMediaDirection = this.MediaDirection.SENDRECV;
	    }
	    if (this.mediatypes.indexOf('video') !== -1) {
		    this.videoMediaDirection = this.MediaDirection.SENDRECV;
	    }
	
        //this.moreIceComing = true;
    }

        if (webkitRTCPeerConnection !== undefined) {
            try {
                this.pc.createOffer(function (sdp) {
                    sdpOffer = self.updateSDPOfferMediaDirection(sdp, {audio:self.audioMediaDirection, video:self.videoMediaDirection});
                    if (self.session.config.providerConfig.crypto === "sdes-sbc") {
                        sdpOffer = self.updateSDPRemoveCrypto(sdpOffer);
                    }
                    if (self.session.config.providerConfig.bundle === false) {
                        sdpOffer = self.updateSDPOfferMediaBundle(sdpOffer);
                    }
                    if (self.session.config.providerConfig.iceType === "google-ice") {
                        sdpOffer = self.updateSDPMediaIceOption(sdpOffer, "offer", "google-ice");
                    }
                    if (sdpOffer.sdp !== self.sdpOffer) {
                        console.trace("createSDPOffer() setLocalDescription sdp = " + sdpOffer.sdp);
                        if (self.oldMediaTypes.indexOf('video') !== -1) {
                            if (self.mediatypes.indexOf('video') === -1) {
                                //downgrading. sdp should have no a=ssrc for video
                                var temp = sdpOffer.sdp.indexOf('m=video');
                                if (temp !== -1) {
                                    sdpOffer.sdp = sdpOffer.sdp.substring(0, temp);
                                }
                            }
                        }

                        self.pc.setLocalDescription(sdpOffer);
                        self.callStatus = self.CallStatus.PREPARING_OFFER;
                        self.sdpOffer = sdpOffer.sdp;
                        self.markActionNeeded();
                        return;
                    }
                    console.debug('createSDPOffer() Not sending a new offer');
                }, function (error) {console.error('createOffer failure callback: ' + error);}, constraint1);
            } catch (e1) {
                try {
                    this.pc.createOffer(function (sdp) {
		        console.debug("unmodified local SDP from createOffer:\n" + sdp.sdp) ;
                        sdpOffer = self.updateSDPOfferMediaDirection(sdp, {audio:self.audioMediaDirection, video:self.videoMediaDirection});
                        if (self.session.config.providerConfig.crypto === "sdes-sbc") {
                            sdpOffer = self.updateSDPRemoveCrypto(sdpOffer);
                        }
                        if (self.session.config.providerConfig.bundle === false) {
                            sdpOffer = self.updateSDPOfferMediaBundle(sdpOffer);
                        }
                        if (self.session.config.providerConfig.iceType === "google-ice") {
                            sdpOffer = self.updateSDPMediaIceOption(sdpOffer, "offer", "google-ice");
                        }
                        if (sdpOffer.sdp !== self.sdpOffer) {
                            console.debug('createOffer1: ' + self.oldMediaTypes + ',' + self.mediatypes);
			    
                            //if (self.oldMediaTypes !== undefined && self.oldMediaTypes.indexOf('video') !== -1) {
                            if (self.mediatypes.indexOf('video') == -1) { // no video
                                if (self.mediatypes.indexOf('video') === -1) {
                                    //downgrading. sdp should have no a=ssrc for video
                                    var temp = sdpOffer.sdp.indexOf('m=video');
                                    if (temp !== -1) {
				        console.debug("local SDP has m=video line but video is not needed now... adding m=video 0 line and removing existing m=video line") ;
					//TODO: m=video line could be first (Firefox could do it that way and it is legal).
					// in such a case this code will not work.
					// rewrite this code to replace 'm=video <port>\r\n' line with 'm=video RTP/SAVPF 0'
                                        sdpOffer.sdp = sdpOffer.sdp.substring(0, temp);
                                        sdpOffer.sdp += 'm=video 0 RTP/SAVPF 0\nc=IN IP4 0.0.0.0\n';

                                    }
                                }
			    
                            }

                            console.trace("createSDPOffer() setLocalDescription sdp = " + sdpOffer.sdp);
                            self.pc.setLocalDescription(sdpOffer);
                            self.callStatus = self.CallStatus.PREPARING_OFFER;
                            self.sdpOffer = sdpOffer.sdp;
                            self.markActionNeeded();
                            return;
                        }
                        console.debug('createSDPOffer() Not sending a new offer');
                    }, function (error) {console.error('createOffer failure callback2: ' + error);}, constraint2);
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
            // if (sdpOffer1.toSdp() !== prevOffer) {
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
    this.updateSDPOfferMediaDirection = function (sdpoffer, medias) {
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
                    if (idx === -1) {
                        idx = sdp.indexOf("a=inactive");
                    }
                }
            }

            if (idx !== -1) {
                sdpstr1 = sdp.substring(0, idx);
                sdpstr1 = sdpstr1 + "a=" + medias.audio;
                sdpstr1 = sdpstr1 + sdp.substring(idx+10);
                changed = true;
            }
        }

        if (medias.video !== undefined) {
            idx = sdp.lastIndexOf("a=sendrecv");
            if (idx === -1) {
                idx = sdp.lastIndexOf("a=sendonly");
                if (idx === -1) {
                    idx = sdp.lastIndexOf("a=recvonly");
                    if (idx === -1) {
                        idx = sdp.indexOf("a=inactive");
                    }
                }
            }

            if (idx !== -1) {
                sdpstr2 = sdpstr1.substring(0, idx);
                sdpstr2 = sdpstr2 + "a=" + medias.video;
                sdpstr2 = sdpstr2 + sdpstr1.substring(idx+10);
                changed = true;
            }

        } else {
            sdpstr2 = sdpstr1;
        }

        if (changed === true) {
            //console.debug("Call.updateSDPOfferMediaDirection() medias = " + medias, ", SDP has been updated:= " + sdpstr2);
            if (window.RTCSessionDescription && sdpoffer instanceof RTCSessionDescription) {
                return new RTCSessionDescription({type:'offer', sdp:sdpstr2});
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
    this.updateSDPOfferMediaBundle = function (sdpoffer) {
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
            //console.debug("updateSDPOfferMediaBundle() SDP has been updated:" + sdp);
            if (window.RTCSessionDescription && sdpoffer instanceof RTCSessionDescription) {
                return new RTCSessionDescription({type:'offer', sdp:sdp});
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
    this.updateSDPRemoveCrypto = function (sdpoffer) {
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
            //console.debug("updateSDPRemoveCrypto() SDP has been updated:" + sdp);
            if (window.RTCSessionDescription && sdpoffer instanceof RTCSessionDescription) {
                return new RTCSessionDescription({type:'offer', sdp:sdp});
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
     * @param {string} sdp SDP
     * @private
     */
    this.updateSDPAddCodecs = function (sdpoffer) {
        console.debug('updateSDPAddCodecs()');
        var sdp, changed, idx, m;
        if (window.RTCSessionDescription && sdpoffer instanceof RTCSessionDescription) {
            sdp = sdpoffer.sdp;
        } else if (window.SessionDescription && sdpoffer instanceof SessionDescription) {
            sdp = sdpoffer.toSdp();
        } else {
            sdp = sdpoffer;
        }

        changed = false;

        // should RTP/AVP be tolerated ?
        if ((/m=video .* RTP\/SAVPF/).test(sdp) && !(/a=rtpmap:.* VP8\//).test(sdp)) {
            m = sdp.split('m=');
            for (var i = 0; i < m.length; i++) {
                if (m[i].indexOf('video') == 0) {
                    if (m[i].indexOf('a=recvonly') > -1) {
                        //TODO: fail the request in this case
                        break;
                    }
                    changed = true;
                    m[i] = m[i]
                    .replace(/\r\na=rtpmap:.*/g, '')
                    .replace(/\r\na=fmtp:.*/g, '')
                    .replace(/(video .* RTP\/SAVPF)(.*)/, '$1 100 116 117\r\na=rtpmap:100 VP8/90000\r\na=rtpmap:116 red/90000\r\na=rtpmap:117 ulpfec/90000');
                    break;
                }
            }
            if (changed) {
                sdp = m.join('m=');
            }
        }

        if (changed === true) {
            console.debug("updateSDPAddCodecs() SDP has been updated:" + sdp);
            if (window.RTCSessionDescription && sdpoffer instanceof RTCSessionDescription) {
                return new RTCSessionDescription({type:'offer', sdp:sdp});
            }
            if (window.SessionDescription && sdpoffer instanceof SessionDescription) {
                return new SessionDescription(sdp);
            }
            return sdp;
        }
        console.debug("updateSDPAddCodecs() SDP has not been updated)");
        return sdpoffer;
    };


    /**
     * @summary Updates a SDP.
     * @param {string} type Type of SDP (offer or answer)
     * @private
     */
    this.updateSDPForTempWorkarounds = function (sdp, type) {
        console.debug('updateSDPForTempWorkarounds()');
        var outsdp, idx, changed ;
        if (window.RTCSessionDescription && sdp instanceof RTCSessionDescription) {
            outsdp = sdp.sdp;
        } else if (window.SessionDescription && sdp instanceof SessionDescription) {
            outsdp = sdp.toSdp();
        } else {
            outsdp = sdp;
        }

        changed = false;
        idx = sdp.indexOf("SAVP ");
        if (idx !== -1) {
            // Chrome26+ is strict about getting RTP/SAVPF in SDP answer. if RTP/SAVP is received
            // replace it with RTP/SAVPF.
            changed = true;
            console.debug('Convert SAVP to SAVPF');
            sdp = sdp.replace(/SAVP /g, "SAVPF ");
        }

        if (changed) {
            console.debug('updateSDPForTempWorkarounds() SDP has been updated:' + outsdp);
            if (window.RTCSessionDescription && sdp instanceof RTCSessionDescription) {
                return new RTCSessionDescription({type:type, sdp:outsdp});
            }
            if (window.SessionDescription && sdp instanceof SessionDescription) {
                return new SessionDescription(outsdp);
            }
            return outsdp ;
        }
        return outsdp;
    };

    /**
     * @summary Updates a SDP.
     * @param {string} type Type of SDP (offer or answer)
     * @param {string} iceoption Ice option to force in the SDP
     * @private
     */
    this.updateSDPMediaIceOption = function (sdp, type, iceoption) {
        console.debug('updateSDPMediaIceOption()');
        var outsdp, idx;
        if (window.RTCSessionDescription && sdp instanceof RTCSessionDescription) {
            outsdp = sdp.sdp;
        } else if (window.SessionDescription && sdp instanceof SessionDescription) {
            outsdp = sdp.toSdp();
        } else {
            outsdp = sdp;
        }

        idx = outsdp.indexOf("a=ice-options:google-ice");
        if (idx === -1) {
            outsdp = outsdp.replace(/\r\na=ice-ufrag/g, "\x0d\x0aa=ice-options:"+ iceoption + "\x0d\x0aa=ice-ufrag");
            // remove "a=ice-lite" string
            //outsdp = outsdp.replace("a=ice-lite\r\n", "");
        }

        //console.debug('updateSDPMediaIceOption() SDP has been updated:' + outsdp);

        if (window.RTCSessionDescription && sdp instanceof RTCSessionDescription) {
            return new RTCSessionDescription({type:type, sdp:outsdp});
        }
        if (window.SessionDescription && sdp instanceof SessionDescription) {
            return new SessionDescription(outsdp);
        }
        return outsdp;
    };

    /**
    * @summary Do a hold and unhold to ensure a fresh video frame is sent
    */
    this.refreshFrame = function () {
        setTimeout(function () { self.hold(); }, 500);
        setTimeout(function () { self.resume(); }, 800);
    };

    /**
    * @summary Creates a header 'Route' from the username, for a SIP messsage.
    * @param {string} username username
    * @returns {sip.Header}
    * @private
    */
    this.getRouteHeader = function (username) {
        var outboundProxyAddress = this.session.config.uri.split('/')[2].trim() + ';transport=' + this.session.transport;
        return new sip.Header("<sip:" + (username ? username + "@" : "") + outboundProxyAddress + ";lr>", 'Route');
    };

    /**
    * @summary Receives a SIP INVITE request
    * @param {sip.UserAgent} ua User agent instance
    * @param {sip.Message} requset SIP request
    * @private
    */
    this.receivedInvite = function (ua, request, callapi) {
        console.debug("Call.receivedInvite");
        var from, res, event, rls, resources, idx, isReinvite;
        if ((this.callStatus === this.CallStatus.IDLE) || ((this.activeCall === true) && 
            (this.callStatus === this.CallStatus.CONFIRMED || 
             this.callStatus === this.CallStatus.REMOTE_HOLD ||
             this.callStatus === this.CallStatus.HOLD))) {
            if (request.first("Call-ID").value == this.callId) {
                isReinvite = true;
            }

            this.uaCall = ua;
            this.callDirection = this.CallDirection.INCOMING;
            //this.callStatus = "receiving";
            from = request.first('From').value;
            this.targetAOR = [from.uri.toString()];
            this.callId = request.first("Call-ID").value;
            this.remotePeerIds = [{id:this.targetAOR}];
            //this.isCallUpdate = false;
            //this.isConferenceCall = false;

            if (request.body !== null) {
                var contentType = request.getItem("Content-Type");
                if (contentType !== null) {
                    if (contentType.value === "application/sdp") {
                        // we received a SDP offer
                        this.sdpOffer = request.body;
						// save current media direction
						old_audioMediaDirection = this.audioMediaDirection;
						old_videoMediaDirection = this.videoMediaDirection;
                        res = this.parseSDP();
                        if (res === false) {
                            console.warn("Call.receivedInvite() received a SDP offer with unsupported media");
                            ua.sendResponse(ua.createResponse(488, 'Not Acceptable Here'));
                        }
                        if (this.session.config.providerConfig.addCodecs) {
                            this.sdpOffer = this.updateSDPAddCodecs(this.sdpOffer);
                        }
                    }
                    if (contentType.value === "application/resource-lists+xml") {
                        // we received a resources list
                        rls = new ResourceList(request.body);
                        resources = rls.getResources();
                        for (idx=0; idx < resources.length; idx+=1) {
                            if (resources[idx].uri !== this.localAOR) {
                                this.remotePeerIds.push({id:resources[idx].uri});
                            }
                        }

                        this.mediatypes = 'audio,video';
                        this.audioMediaDirection = 'sendrecv';
                        this.videoMediaDirection = 'sendrecv';

                        // conferenceParams.rls = rls;
                        // callParams.isConferenceCall = true;
                        // plugin.settings.onConferenceStatus.call(this, conferenceParams);
                    }
                } else {
                    this.mediatypes = 'audio,video';
                    this.audioMediaDirection = 'sendrecv';
                    this.videoMediaDirection = 'sendrecv';
                }
            } else {
                this.mediatypes = 'audio,video';
                this.audioMediaDirection = 'sendrecv';
                this.videoMediaDirection = 'sendrecv';
            }

            if (isReinvite) {
                if (this.oldMediaTypes !== undefined) {
                    if (this.oldMediaTypes.indexOf('video') === -1 && this.mediatypes.indexOf('video') !== -1) {
                        console.debug('receivedInvite(): upgrade');
                        this.callStatus = this.CallStatus.UPGRADING;
                        event = {name: CallStatus.UPGRADING};
                        this.callback.onStatus(CallStatus.UPGRADING, event);
                    }
                    else if (this.oldMediaTypes.indexOf('video') !== -1 && this.mediatypes.indexOf('video') === -1) {
                        console.debug('receivedInvite(): downgrade');
                        this.callStatus = this.CallStatus.DOWNGRADING;
                        event = {name: CallStatus.DOWNGRADING};
                        this.callback.onStatus(CallStatus.DOWNGRADING, event);
                    }
					else if ( this.isHoldRequest( old_audioMediaDirection, old_videoMediaDirection ) )
					{
                        this.holdPending = true;
                        this.accept();
                    } else {
                        this.accept();
                    }
                }
            } else {
                this.isTiledVideo = this.mediatypes.indexOf('video') > -1 &&
                    (/Alcatel-Lucent-HPSS/).test(request.first('User-Agent').value);
                event = {name: SessionStatus.INCOMINGCALL};
                this.session.callback.onIncoming(this.callback, event);

                ua.sendResponse(ua.createResponse(180, 'Ringing'));
                this.callStatus = this.CallStatus.RINGING;
                this.callStatusExternal = CallStatus.CONNECTING;
                event = {name: CallStatus.CONNECTING};
                this.callback.onStatus(CallStatus.CONNECTING, event);
            }
        } else {
            console.debug("receivedInvite() received INVITE in state " + this.callStatus);
            ua.sendResponse(ua.createResponse(486, 'Busy Here'));
        }

    };
	
	/** 
	 * @summary Determines if a re-invite is a request to place a call on hold
	 * @returns {boolean} 
	 * @private
	 */
	this.isHoldRequest = function( oldAudioDirection, oldVideoDirection )
	{
	
		// For now, we don't consider the case that the call could have both audio and video but
		// have different directions for each.
		
	    if (( this.audioMediaDirection == 'sendonly' || this.audioMediaDirection == 'inactive' ) &&
			( oldAudioDirection == 'sendrecv' ) )
		{
			return true;
		}
            
		if (( this.videoMediaDirection == 'sendonly' || this.videoMediaDirection == 'inactive' ) &&
			( oldVideoDirection == 'sendrecv' ) )
		{
			return true;
		}
			
		return false;
		
	}

    /**
    * @summary Parses the SDP.
    * @returns {boolean} Flag indicating that the parsing of SDP is successful
    * @private
    */
    this.parseSDP = function () {
     
        var sdp, sdpstr, sdpstr2, idx;
        if (this.sdpOffer.search("m=message") !== -1) {
            if ((this.sdpOffer.search("TCP/MSRP") !== -1) || (this.sdpOffer.search("TCP/TLS/MSRP") !== -1)) {
                return false;
            }
        }

        if (this.sdpOffer.search("m=audio") !== -1) {
            if ((this.sdpOffer.search("m=video") !== -1) && (this.sdpOffer.search("m=video 0") === -1)) {
                this.mediatypes = 'audio,video';
            } else {
                this.mediatypes = 'audio';
            }
        } else {
            if (this.sdpOffer.search("m=video") !== -1) {
                this.mediatypes = 'video';
            } else {
                this.mediatypes = undefined;
            }
        }

        sdp = this.sdpOffer;
        sdpstr = this.sdpOffer;
		idx = -1;
		
		audio_start = sdp.indexOf('audio');
		video_start = sdp.indexOf('video');
		if ( audio_start < video_start )
		{
			audio_end = video_start;
			video_end = sdp.length;
		}
		else
		{
			video_end = audio_start;
			audio_end = sdp.length;
		}
		var audio_sdp = sdp.slice(audio_start, audio_end);
		var video_sdp = sdp.slice(video_start, video_end);
		
		 if (this.mediatypes.indexOf('audio') !== -1) {
            idx = audio_sdp.indexOf("a=sendrecv");
            if (idx === -1) {
                idx = audio_sdp.indexOf("a=sendonly");
                if (idx === -1) {
                    idx = audio_sdp.indexOf("a=recvonly");
                    if (idx === -1) {
                        idx = audio_sdp.indexOf("a=inactive");
                    }
                }
            }
            if (idx !== -1) {
                this.audioMediaDirection = audio_sdp.substr(idx+2, 8);
            }
        }

        if (this.mediatypes.indexOf('video') !== -1) {
            idx = video_sdp.indexOf("a=sendrecv");
            if (idx === -1) {
                idx = video_sdp.indexOf("a=sendonly");
                if (idx === -1) {
                    idx = video_sdp.indexOf("a=recvonly");
                    if (idx === -1) {
                        idx = video_sdp.indexOf("a=inactive");
                    }
                }
            }
            if (idx !== -1) {
                this.videoMediaDirection = video_sdp.substr(idx+2, 8);
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
    this.receivedAck = function (ua, request) {
        console.debug("Call.receivedAck()");
        var event, sdp;
        if (this.callStatus === this.CallStatus.CANCELED || (this.callStatus === this.CallStatus.REFUSED)) {
            this.clean();
            this.callStatusExternal = CallStatus.DISCONNECTED;
            event = {name:CallStatus.DISCONNECTED};
            this.callback.onDisconnected(event);
            this.callStatus = this.CallStatus.IDLE;
        } else {
            if (this.holdPending) {
                this.holdPending = false;
                this.callStatusExternal = CallStatus.REMOTE_HOLD;
                this.callStatus = this.CallStatus.REMOTE_HOLD;
                event = {name:CallStatus.REMOTE_HOLD};
                this.callback.onStatus(CallStatus.REMOTE_HOLD, event);
            } else {
                this.callStatus = this.CallStatus.CONFIRMED;
                if (this.callStatusExternal === CallStatus.HOLD || this.callStatusExternal === CallStatus.REMOTE_HOLD) {
                    this.callStatusExternal = CallStatus.CONNECTED;
                    event = {name:CallStatus.UNHOLD};
                    this.callback.onStatus(CallStatus.UNHOLD, event);
                } else {
                    this.callStatusExternal = CallStatus.CONNECTED;
                    event = {name:CallStatus.CONNECTED};
                    this.callback.onConnected(event);
                    if (this.needsRefresh && this.isTiledVideo) {
                        this.needsRefresh = false;
                        this.refreshFrame();
                    }
                }
            }
            this.oldMediaTypes = this.mediatypes;
            // if (rls !== undefined) {
                // conferenceParams.status = 'active';
                // plugin.settings.onConferenceStatus.call(this, conferenceParams);
            // }

            // if no body found then request.body is not set by Message.prototype._parse,
            // so it is 'undefined' rather than 'null'
            if (request.body !== undefined && request.body !== null) {
                // we receive the SDP answer in ACK
                sdp = request.body;
                sdp = this.updateSDPForTempWorkarounds(sdp, "offer");
                if (this.session.config.providerConfig.iceType === "google-ice") {
                    sdp = this.updateSDPMediaIceOption(sdp, "answer", "google-ice");
                }
                if (this.session.config.providerConfig.addCodecs) {
                    sdp = this.updateSDPAddCodecs(sdp);
                }

                if (webkitRTCPeerConnection !== undefined) {
                    console.trace("receivedAck() setRemoteDescription sdp = " + sdp);
                    this.pc.setRemoteDescription(new RTCSessionDescription({type:'answer', sdp:sdp}));
                } else if (webkitPeerConnection00 !== undefined) {
                    console.trace("receivedAck() setRemoteDescription sdp = " + sdp);
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
    this.receivedNotify = function (ua, request) {
        if (this.uaCall && this.CallStatus != this.CallStatus.IDLE) {
            ua.sendResponse(ua.createResponse(200, 'OK'));
            var event = request.getItem('event').value;
            switch (event) {
                case "refer" :
                    break;
                case "conference" :
                    break;
                default:
                    console.debug("receivedNotify() event not supported: " + event);
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
    this.receivedBye = function (ua, request) {
        console.debug("Call.receivedBye()");
        if (this.uaCall && this.callStatus !== this.CallStatus.IDLE) {
            ua.sendResponse(ua.createResponse(200, 'OK'));
            this.callStatusExternal = CallStatus.DISCONNECTED;
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
    this.receivedInviteResponse = function (ua, response) {
        console.debug("Call.receivedInviteResponse()");
        var event, sdp,remoteStream;
        if (response.isfinal()) {
            if (!response.is2xx()) {
                if (this.activeCall === false) {
                    if (this.callDirection === this.CallDirection.OUTGOING) {
                        console.debug("Call.receivedInviteResponse() response is failed [response = " + response.response + ", text = " + response.responsetext + "]");
                        this.callStatusExternal = CallStatus.DISCONNECTED;
                        if (this.callStatus === this.CallStatus.CANCELED) {
                            event = {name: CallStatus.DISCONNECTED};
                            this.callback.onDisconnected(event);
                        } else {
                            this.callStatus = this.CallStatus.FAILED;
                            event = {name:CallStatus.REJECTED};
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

            if (this.holdPending) {
                this.callStatus = this.CallStatus.HOLD;
            } else {
                this.callStatus = this.CallStatus.ACCEPTED;
            }
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
                sdp = this.updateSDPForTempWorkarounds(sdp, "answer");
                if (this.session.config.providerConfig.iceType === "google-ice") {
                    sdp = this.updateSDPMediaIceOption(sdp, "answer", "google-ice");
                }

                if (webkitRTCPeerConnection !== undefined) {
                    console.trace("receivedInviteResponse() setRemoteDescription sdp = " + sdp);
                    this.pc.setRemoteDescription(new RTCSessionDescription({type:'answer', sdp:sdp}));
                } else if (webkitPeerConnection00 !== undefined) {
                    console.trace("receivedInviteResponse() setRemoteDescription sdp = " + sdp);
                    this.pc.setRemoteDescription(webkitPeerConnection00.SDP_ANSWER, new SessionDescription(sdp));
                }
            }

            if (this.holdPending) {
                this.callStatusExternal = CallStatus.HOLD;
                event = {name: CallStatus.HOLD};
                this.callStatus = this.CallStatus.HOLD;
                this.holdPending = false;
                this.callback.onStatus(CallStatus.HOLD, event);
            } else {
                if (this.resumePending) {
                    this.resumePending = false;
                }
                this.activeCall = true;
                this.oldMediaTypes = this.mediatypes;
                this.callStatus = this.CallStatus.CONFIRMED;
                if (this.callStatusExternal === CallStatus.HOLD || this.callStatusExternal === CallStatus.REMOTE_HOLD) {
                    this.callStatusExternal = CallStatus.CONNECTED;
                    event = {name:CallStatus.UNHOLD};
                    this.callback.onStatus(CallStatus.UNHOLD, event);
                } else {
                    this.callStatusExternal = CallStatus.CONNECTED;
                    event = {name:CallStatus.CONNECTED};
                    this.callback.onConnected(event);
                    if (this.needsRefresh && this.isTiledVideo) {
                        this.needsRefresh = false;
                        this.refreshFrame();
                    }
                }
                        // if (conferees !== undefined && conferees.length > 1) {
                            // conferenceParams.status = 'active';
                            // plugin.settings.onConferenceStatus.call(this, conferenceParams);
                        // }
            }

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
                    this.callStatusExternal = CallStatus.CONNECTING;
                    this.callStatus = this.CallStatus.RINGING;
                    event = {name:CallStatus.CONNECTING};
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
    this.receivedByeResponse = function (ua, response) {
        console.debug("receivedByeResponse()");
        this.callStatusExternal = CallStatus.DISCONNECTED;
        this.callStatus = this.CallStatus.CLOSED;
        var event = {name:CallStatus.DISCONNECTED};
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
    this.doRefer = function (uri, isAdded) {
        console.debug("doRefer() uri=" + uri + ", isAdded=" + isAdded);
        if (this.uaCall !== null) {
            var request = this.uaCall.createRequest('REFER');
            if (this.userAgent) {
                request.setItem('User-Agent', new sip.Header(this.userAgent, 'User-Agent'));
            }
            if (isAdded === true) {
                request.setItem('Refer-To', new sip.Header(uri, 'Refer-To'));
            } else {
                request.setItem('Refer-To', new sip.Header('<' + uri + ';method=BYE>', 'Refer-To'));
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
    this.dialogCreated = function (dialog, ua) {
        if (ua === this.uaCall) {
            this.uaCall = dialog;
        }
    };

    /**
    * @summary SIP request has been canceled.
    * @param {sip.UserAgent} SIP user agent
    * @private
    */
    this.cancelled = function (ua) {
        console.debug("Call.cancelled()");
        if (this.uaCall && this.callStatus === this.CallStatus.RINGING && this.callDirection === this.CallDirection.INCOMING) {
            // ALU begin
            // ALU : dialog is created : uaCall pointed now directly on the Dialog instance
            //if (ua === uaCall) {
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
    this.accept= function () {
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
    this.sendInviteResponse = function (code, text) {
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
    this.cancel = function () {
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
    this.bye = function () {
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
    this.clean = function () {
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
        if (session.config.providerConfig && typeof session.config.providerConfig.stun == 'string') {
            var s = session.config.providerConfig.stun.replace(/^\s+|\s+$/g, '');
            if (s !== '') {
                this.iceServers = [{"url": "stun:"+s}];
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
        this.parse= function (xmlstr)  {
            var idx, anonymized, resource, parser, xmlDoc, entries;
            if (window.DOMParser) {
              parser = new DOMParser();
              xmlDoc = parser.parseFromString(xmlstr,"text/xml");
              entries = xmlDoc.getElementsByTagName("entry");
              for (idx=0;idx<entries.length;idx+=1) {
                  anonymized = false;
                  if (entries[idx].getAttribute('cp:anonymize') === 'true') {
                      anonymized = true;
                  }
                  if (anonymized !== true) {
                      resource = {uri:entries[idx].getAttribute('uri'), copyControl:entries[idx].getAttribute('cp:copyControl'), anonymous:anonymized};
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
        this.addResource = function (resource)  {
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
        this.getResources = function ()  {
            return resources;
        };

        /**
        * @summary Deletes a resource in the resource list.
        * @private
        */
        this.delResource = function (resource)  {
            var idx, uri;
            for(idx= 0; idx < resources.length; idx+=1) {
                uri  = resources[idx].uri;
                if (resource.uri === uri) {
                   resources.splice(idx,1);
                   return;
                }
            }
        };

        /**
        * @summary Returns a XML string representation of a resource list.
        * @returns {string}
        * @private
        */
        this.toString = function ()  {
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
        this.toXML = function ()  {
            var data, xmlDoc, parser, idx, entry, uri, copyControl, anonymous, node;

            data = '<?xml version=\"1.0\" encoding=\"UTF-8\"?>';
            data = data + '<resource-lists xmlns="urn:ietf:params:xml:ns:resource-lists" xmlns:cp="urn:ietf:params:xml:ns:copyControl">';
            data = data +  '<list>';
            data = data +  '</list>';
            data = data +  '</resource-lists>';

            if (window.DOMParser) {
                parser = new DOMParser();
                xmlDoc = parser.parseFromString(data,"text/xml");
            } else {
                // Internet Explorer
                xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
                xmlDoc.async=false;
                xmlDoc.loadXML(data);
            }

            for (idx= 0; idx < resources.length; idx += 1) {
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
        this.createBoundary = function () {
            var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz",
                string_length = 16,
                boundary = '',
                i, rnum;

            for (i=0; i<string_length; i+=1) {
                rnum = Math.floor(Math.random() * chars.length);
                boundary += chars.substring(rnum,rnum+1);
            }
            return boundary;
        };


        /**
        * @summary Returns the boundary string.
        * @return {string}
        * @private
        */
        this.getBoundary = function () {
            return boundary;
        };

        /**
        * @summary Return the multi-parts content string data.
        * @return {string}
        * @private
        */
        this.toString = function ()  {
            var mtp, idx;
            mtp = '';
            if (parts.length !== 0) {
                mtp = '--' + boundary + '\r\n';

                for(idx= 0; idx < parts.length; idx+=1) {
                    mtp = mtp + 'Content-Type: ' + parts[idx].contentType;
                    if (parts[idx].contentDisposition !== undefined) {
                        mtp = mtp + '\r\nContent-Disposition: ' + parts[idx].contentDisposition;
                    }
                    mtp = mtp + '\r\n\r\n';
                    mtp = mtp + parts[idx].data;

                    if (idx === parts.length-1) {
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
        this.addPart = function (part)  {
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

    // global constants are defined in orca.js

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
        createSession: function (userid, token, sessionConfig, callback) {
            //TODO: validation? what happens if sessionConfig is invalid object?
            var config = {
                uri: sessionConfig.uri,
                mediatypes: sessionConfig.mediatypes,
                providerConfig: {}
            };
            var fields = ['stun', 'bundle', 'iceType', 'crypto', 'conferenceFactoryURI', 
                    'expires', 'addCodecs', 'dtmf', 'refreshTiled'];
            var values = ['', true, 'standard-ice', '', '', '600', false, 'both', false];
            for (var i=0; i < fields.length; i++) {
                if (sessionConfig.providerConfig && sessionConfig.providerConfig.hasOwnProperty(fields[i])) {
                    config.providerConfig[fields[i]] = sessionConfig.providerConfig[fields[i]];
                } else {
                    config.providerConfig[fields[i]] = values[i];
                }
            }
            return new Session(userid, token, config, callback);
        }

        // orca.createManagedStream() is implemented in orca.js

    };

    this.orcaALU = orcaALU;

})();
