/*global io MediaServices Phono*/
(function () {
    // Utils and references
    var root = this,
        att = {},
        cache = {},
        $ = root.jQuery;

    // global utils
    var _ = att.util = {
        _uuidCounter: 0,
        uuid: function () {
            return Math.random().toString(16).substring(2) + (_._uuidCounter++).toString(16);
        },
        slice: Array.prototype.slice,
        isFunc: function (obj) {
            return Object.prototype.toString.call(obj) == '[object Function]';
        },
        extend: function (obj) {
            this.slice.call(arguments, 1).forEach(function (source) {
                if (source) {
                    for (var prop in source) {
                        obj[prop] = source[prop];
                    }
                }
            });
            return obj;
        },
        each: function (obj, func) {
            if (!obj) return;
            if (obj instanceof Array) {
                obj.forEach(func);
            } else {
                for (var key in obj) {
                    func(key, obj[key]);
                }
            }
        },
        getQueryParam: function (name) {
            // query string parser
            var cleaned = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]"),
                regexS = "[\\?&]" + cleaned + "=([^&#]*)",
                regex = new RegExp(regexS),
                results = regex.exec(window.location.search);
            return (results) ? decodeURIComponent(results[1].replace(/\+/g, " ")) : undefined;
        },
        // used to try to determine whether they're using the ericsson leif browser
        // this is not an ideal way to check, but I'm not sure how to do it since
        // leif if pretty much just stock chromium.
        h2sSupport: function () {
            // first OR is for original leif
            // second OR is for Mobile bowser
            // third OR is for IIP Leif
            return window.navigator.userAgent == "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_2) AppleWebKit/536.4 (KHTML, like Gecko) Chrome/19.0.1077.0 Safari/536.4" ||
            window.navigator.userAgent == "Mozilla/5.0 (iPhone; CPU iPhone OS 6_0_1 like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Mobile/10A523" ||
            window.webkitPeerConnection00 && window.navigator.userAgent.indexOf('Chrome/24') !== -1;
        },
        getMe: function (token, cb) {
            var self = this,
                baseUrl = "https://auth.tfoundry.com",
                data = {
                    access_token: token
                },
                version;

            // short circuit this if we've already done it
            if (cache.me) {
                // the return is important for halting execution
                return cb(cache.me);
            }

            // removes domain from number if exists
            function cleanNumber(num) {
                return num.split('@')[0];
            }

            // we try to figure out what endpoint this user
            // should be using based on a series of checks.
            console.log(data);

            // first we get the user object
            $.ajax({
                data: data,
                dataType: 'json',
                url: baseUrl + '/me.json',
                success: function (user) {
                    // store the user in the cache
                    cache.me = user;
                    // now we check to see if we've got a webrtc.json specified for this
                    // user.
                    $.ajax({
                        data: data,
                        dataType: 'json',
                        url: baseUrl + '/users/' + user.uid + '/api_services/webrtc.json',
                        // if we get a 200
                        success: function (res) {
                            // if we've got an explicit version use it.
                            var explicitVersion = res && res.version,
                                explicitNumber = res && res.options && res.options.phone_number;
                            if (explicitVersion) {
                                user.version = 'a' + explicitVersion;
                            } else {
                                user.version = 'a1';
                            }
                            user.number = explicitNumber || user.phone_number;
                            cb(user);
                        }
                    });
                }
            });
        }
    };

    // Rester is a helper for doing repetitive ajax calls
    //
    // init it like so:
    // api = new Rester("mytoken", "https://api.foundry.att.com/a4/addressbook");
    //
    // then use:
    // api.get('/contacts', function (err, res) {
    //
    // });
    //
    function Rester(token, baseUrl) {
        this.token = token;
        this.baseUrl = baseUrl;
        this.errorHandlers = {
            401: function () {},
            402: function () {},
            403: function () {}
        };
    }
    
    Rester.prototype.get = function (path, callback) {
        var self = this;
        $.ajax({
            url: this.baseUrl + path + '?access_token=' + this.token,
            success: function (result) {
                callback(null, result);
            },
            error: function (err) {
                console.log('err', err);
                var errHand = self.errorHandlers[err.status];
                if (errHand) errHand();
                callback(err);
            }
        });
    };
    
    Rester.prototype.put = function (path, payloadObj, callback) {
        var self = this;
        $.ajax({
            url: this.baseUrl + path + '?access_token=' + this.token,
            type: 'put',
            data: payloadObj,
            success: function (result) {
                callback(null, result);
            },
            error: function (err) {
                var errHand = self.errorHandlers[err.status];
                if (errHand) errHand();
                callback(err);
            }
        });
    };
    
    Rester.prototype.post = function (path, payloadObj, callback) {
        var self = this;
        $.ajax({
            url: this.baseUrl + path + '?access_token=' + this.token,
            type: 'post',
            data: payloadObj,
            success: function (result) {
                callback(null, result);
            },
            error: function (err) {
                var errHand = self.errorHandlers[err.status];
                if (errHand) errHand();
                callback(err);
            }
        });
    };
    
    Rester.prototype.delete = function (path, callback) {
        var self = this;
        $.ajax({
            url: this.baseUrl + path + '?access_token=' + this.token,
            type: 'delete',
            success: function (result) {
                callback(null, result);
            },
            error: function (err) {
                var errHand = self.errorHandlers[err.status];
                if (errHand) errHand();
                callback(err);
            }
        });
    };
    
    /*
    WildEmitter.js is a slim little event emitter largely based on @visionmedia's Emitter from UI Kit.
    
    I wanted it standalone.
    
    I also wanted support for wildcard emitters. Like:
    
    emitter.on('*', function (eventName, other, event, payloads) {
    
    });
    
    emitter.on('somenamespace*', function (eventName, payloads) {
    
    });
    
    Functions triggered by wildcard registered events also get the event name as the first argument.
    
    */
    function WildEmitter() {
        this.callbacks = {};
    }
    
    // Listen on the given `event` with `fn`. Store a group name if present.
    WildEmitter.prototype.on = function (event, groupName, fn) {
        var hasGroup = (arguments.length === 3),
            group = hasGroup ? arguments[1] : undefined,
            func = hasGroup ? arguments[2] : arguments[1];
        func._groupName = group;
        (this.callbacks[event] = this.callbacks[event] || []).push(func);
        return this;
    };
    
    // Adds an `event` listener that will be invoked a single
    // time then automatically removed.
    WildEmitter.prototype.once = function (event, fn) {
        var self = this;
        function on() {
            self.off(event, on);
            fn.apply(this, arguments);
        }
        this.on(event, on);
        return this;
    };
    
    // Unbinds an entire group
    WildEmitter.prototype.releaseGroup = function (groupName) {
        var item, i, len, handlers;
        for (item in this.callbacks) {
            handlers = this.callbacks[item];
            for (i = 0, len = handlers.length; i < len; i++) {
                if (handlers[i]._groupName === groupName) {
                    //console.log('removing');
                    // remove it and shorten the array we're looping through
                    handlers.splice(i, 1);
                    i--;
                    len--;
                }
            }
        }
        return this;
    };
    
    // Remove the given callback for `event` or all
    // registered callbacks.
    WildEmitter.prototype.off = function (event, fn) {
        var callbacks = this.callbacks[event],
            i;
    
        if (!callbacks) return this;
    
        // remove all handlers
        if (arguments.length === 1) {
            delete this.callbacks[event];
            return this;
        }
    
        // remove specific handler
        i = callbacks.indexOf(fn);
        callbacks.splice(i, 1);
        return this;
    };
    
    // Emit `event` with the given args.
    // also calls any `*` handlers
    WildEmitter.prototype.emit = function (event) {
        var args = [].slice.call(arguments, 1),
            callbacks = this.callbacks[event],
            specialCallbacks = this.getWildcardCallbacks(event),
            i,
            len,
            item;
    
        if (callbacks) {
            for (i = 0, len = callbacks.length; i < len; ++i) {
                callbacks[i].apply(this, args);
            }
        }
    
        if (specialCallbacks) {
            for (i = 0, len = specialCallbacks.length; i < len; ++i) {
                specialCallbacks[i].apply(this, [event].concat(args));
            }
        }
    
        return this;
    };
    
    // Helper for for finding special wildcard event handlers that match the event
    WildEmitter.prototype.getWildcardCallbacks = function (eventName) {
        var item,
            split,
            result = [];
    
        for (item in this.callbacks) {
            split = item.split('*');
            if (item === '*' || (split.length === 2 && eventName.slice(0, split[1].length) === split[1])) {
                result = result.concat(this.callbacks[item]);
            }
        }
        return result;
    };
    





    function Messages(token) {
        var self = this;
        this.api = new Rester(token, 'https://api.foundry.att.com/a1/messages');
    
        // inherit wildemitter properties
        WildEmitter.call(this);
    
        // handle errors
        this.api.errorHandlers[404] = this._badToken.bind(this);
        this.api.errorHandlers[401] = this._badToken.bind(this);
    }
    
    // set our prototype to be a new emitter instance
    Messages.prototype = Object.create(WildEmitter.prototype, {
        constructor: {
            value: Messages 
        }
    });
    
    Messages.prototype._badToken = function () {
        this.emit('invalidToken');
    };
    
    Messages.prototype.sendMessage = function (contact, text, callback) {
        this.api.post('/messages', {recipient: contact, text: text}, callback);
    };
    
    Messages.prototype.getMessages = function (callback) {
        this.api.get('/messages', callback);
    };
    
    Messages.prototype.getMessage = function (id, callback) {
        this.api.get('/messages/' + id, callback);
    };
    
    Messages.prototype.deleteMessage = function (id, callback) {
        this.api.delete('/messages/' + id, callback);
    };
    
    Messages.prototype.searchByNumber = function (number, callback) {
        this.api.get('/messages/filter/' + number, callback);
    };
    
    att.Messages = Messages;
    
    if ($) {
        $.messages = function (token) {
            return new Messages(token);
        };
    }
    

    // attach to window or export with commonJS
    if (typeof exports !== 'undefined') {
        module.exports = att;
    } else {
        // make sure we've got an "att" global
        root.ATT || (root.ATT = {});
        _.extend(root.ATT, att);
    }

}).call(this);
