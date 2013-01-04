// The Muc object assumes you'll send it a strophe connection
function ChatSession(options) {
    var self = this,
        opts = options || {},
        config = this.config = {
            url: 'https://webrtc.spectrum.io:443',
            token: ''
        };

    // extend our defaults
    for (var item in config) {
        if (opts.hasOwnProperty(item)) {
            config[item] = opts[item];
        }
    }

    this.debug = true;

    // storage for our connected chats
    this.chats = {};

    // set up our bosh connection
    var socket = this.socket = new io.connect(this.config.url);
    socket.on('connect', function (e) {
        self.emit('connect', e);
    });
    socket.on('ready', function (profile) {
        self.profile = profile;
        self.emit('ready', profile);
    });
    
    var apiEvents = [
        'joinedRoom',
        'leftRoom',
        'offline', 
        'online',
        'message',
        'directChat',
        'newTopic'
    ];

    // passthrough of our events so that the API will emit them directly.
    for (var i = 0, l = apiEvents.length; i < l; i++) {
        this.socket.on(apiEvents[i], function (event) {
            return function (payload) {
                // tack on last received event for tracking
                self.emit(event, payload);
            };
        }(apiEvents[i]));
    }

    // if we got auth credentials on init, we assume
    // they want to immediately log in.
    if (config.token) {
        this.login(config.token);
    }

    // inherit wildemitter properties
    WildEmitter.call(this);

    if (this.debug) {
        this.on('*', function (eventName, payload) {
            console.log('e:', eventName, payload);
        });
    }
}

// set our prototype to be a new emitter instance
ChatSession.prototype = new WildEmitter();

ChatSession.prototype.login = function (token, cb) {
    console.log('login called', token);
    this.socket.emit('login', token, cb);
};

// send a message to a room
ChatSession.prototype.sendMessage = function (room, message) {
    this.socket.emit('sendMessage', {room: room, body: message});
};

ChatSession.prototype.sendDirectChat = function (who, message) {
    this.socket.emit('sendDirectChat', {
        to: who,
        message: message
    });
};

ChatSession.prototype.addUserToRoom = function (roomId, userId) {
    this.socket.emit('addUserToRoom', {
        room: roomId, 
        user: userId
    });
};
// leave a room
ChatSession.prototype.leave = function (room) {
    this.socket.emit('leaveRoom', room);
};

// invite a user to a room
ChatSession.prototype.createGroupChat = function (topic, cb) {
    this.socket.emit('createRoom', topic, cb);
};

ChatSession.prototype.setRoomTopic = function (roomId, newTopic, cb) {
    this.socket.emit('setRoomTopic', {id: roomId, topic: newTopic}, cb);
}; 

att.ChatSession = ChatSession;