(function(ATT, $) {
	//////////////////////////////////////////////////////
	/**
	 * Entry point to WCG Media Services
	 */
	function WCGCall(att, callee, hasVideo) {
		var self = this;

		WildEmitter.call(this);

		self.att = att;
		self.remotePeer = callee;

		var media = (hasVideo) ? {
			audio : true,
			video : true
		} : {
			audio : true,
			video : false
		};
		console.log("WCGCall create call");
		//init the Media Services here
		self._call = att.wcgBackend.wcgService.createCall(callee, media);
		//call
		self._call.ring();

		self._bind();

		self.on('*', function(eventType) {
			att.emit(eventType, self);
		});

		return self;
	}

	/**
	 * Create an instance of WCGCall that inherits from a WildEmitter class
	 */
	WCGCall.prototype = Object.create(WildEmitter.prototype, {
		constructor : {
			value : WCGCall
		}
	});

	/**
	 * Bind events to the call and propagate them through att emitter
	 */
	WCGCall.prototype._bind = function() {
		var self = this;

		this._call.onaddstream = function(event) {
			if (event.call.mediaType.video && event.call.mediaType.video == true) {
				if (event.call.localStreams) {
					self.att.emit('wcgLocalStream', event.call.localStreams[0]);
				}
				if (event.call.remoteStreams) {
					//THAO TEMPORARY FIX FOR 203 server
					self.att.emit('wcgRemoteStream', event.stream);
				}
			}

		};
		this._call.onbegin = function() {
			self.emit('callBegin')
		};
		this._call.onend = function() {
			self.emit('callEnd');
		};
		this._call.onerror = function(event) {
			self.emit('error');
		};
		this._call.onstatechange = function() {
			self.emit('wcgstateChange');
		};

	}
	/**
	 * Answer to the call
	 */
	WCGCall.prototype.answer = function() {
		return this._call.answer();
	}
	/**
	 * End the call
	 */
	WCGCall.prototype.hangup = function() {
		return this._call.end();
	}
	//////////////////////////////////////////////////////
	ATT.fn.WCGCall = function(att, call) {
		var self = this;
		var wcgCall = Object.create(WCGCall.prototype);
		wcgCall.att = att;

		WildEmitter.call(wcgCall);

		//call
		wcgCall._call = call;
		wcgCall.remotePeer = call.recipient

		wcgCall._bind();

		wcgCall.on('*', function(eventType) {
			wcgCall.att.emit(eventType, wcgCall);
		});

		return wcgCall;
	};
	/**
	 * Logout from WCG
	 */
	ATT.fn.logout = function() {
		console.log("Logging out");
		this.wcgBackend.wcgService.unregister();
		this.wcgBackend.wcgService = null;
	};

	/**
	 * Make a video call
	 */
	ATT.fn.videocall = function(callee) {
		var self = this;
		var call = new WCGCall(self, callee, true);
		self.emit('outgoingCall', call);

		return call;

	};
	ATT.fn.voicecall = function(callee) {
		var self = this;
		var call = new WCGCall(self, callee, false);
		self.emit('outgoingCall', call);

		return call;

	};

	ATT.fn.wcgBackend = {
		wcgService : null,
	};

	//////////////////////////////////////////////////////

	ATT.fn.dial = function(number) {
		var self = this;
		//
		var call = new WCGCall(self, number, false);
		self.emit('outgoingCall', call);
	}

	ATT.fn.video = function(callee) {
		var self = this;
		var call = new WCGCall(self, callee, true);
		self.emit('outgoingCall', call);

		return call;

	};

	ATT.initPlugin(function(att) {
		console.log('Load WCG Plugin');

		window.onbeforeunload = function() {

			if (att.wcgBackend.wcgService != null) {
				ATT.fn.logout();
			}
		}

		att.on('user', function(user) {
			console.log('Setting up WCG');

			//ALPHA Lab info
			var wcgUrl = 'http://64.124.154.207:38080/HaikuServlet/rest/v2/';
			var turn = 'STUN: 206.18.171.164:5060';
			//My token created on APIGEE for my profile
			var accessToken = att.config.apiKey;

			//LOGIN HERE with APIGEE id
			var options = {
				'url' : wcgUrl,
				'name' : user.first_name,
				'token' : accessToken,
				'media' : "audio,video,chat"
			};


			att.wcgBackend.wcgService = new MediaServices(wcgUrl, user.first_name, "oauth " + accessToken, "audio,video,chat");
			att.wcgBackend.wcgService.turnConfig = turn;

			att.wcgBackend.wcgService.onready = function() {

				att.emit('phoneReady', user.first_name);
			}
			att.wcgBackend.wcgService.onclose = function() {
				att.emit('phoneClose');
			}
			att.wcgBackend.wcgService.onerror = function(event) {
				att.emit('error', event.reason);
			}
			att.wcgBackend.wcgService.oninvite = function(event) {
				if (event.call) {
					var call = event.call;
					console.log("call media", call.mediaType);

					//instantiage the WCGCall (incoming call)
					var wcgCall = new ATT.fn.WCGCall(att, call);
					wcgCall.emit('ring');
					att.emit('incomingCall', wcgCall);
				}
			}
		});
	});

})(ATT, jQuery);
