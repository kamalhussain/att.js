// ====================================================================
// Bundled Att.js Dependencies:
// --------------------------------------------------------------------
// WildEmitter - A wildcardable event emitter
// Rester      - REST API helper
// ====================================================================


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




// ====================================================================
// Att.js Core
// ====================================================================

(function (window, undefined) {
    // create simple utils
    var _ = {
        slice: Array.prototype.slice,
        isFunction: function (obj) {
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
                    func(obj[key], key);
                }
            }
        },
        _uuidCounter: 0,
        uuid: function () {
            return Math.random().toString(16).substring(2) + (_._uuidCounter++).toString(16);
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
        }
    };

    // Main ATT object constructor
    function ATT(opts) {
        WildEmitter.call(this);

        var self = this,
            opts = opts || {};

        self.config = {
            accessToken: '',
            user: _.uuid(),
            log: true,
            dependencyBaseUrl: '//js.att.io',
            settings: {}
        };

        // extend self.config with passed in options
        _.extend(self.config, opts);

        var hasToken = !!self.config.accessToken;

        // expose util methods as att._
        self._ = _;

        if (self.config.log) {
            self.on('*', function (eventName, payload) {
                console.log('att.js event:', eventName, payload);
            });
        }

        _.each(self.plugins, function (plugin) {
            plugin(self);
        });

        self.emit('init', self);

        if (hasToken) {
            self.emit('accessToken', self.config.accessToken);
        }
    }

    // expose util methods as ATT._ rather than a global
    // so other plugins can use it
    ATT._ = _;

    ATT.prototype = Object.create(WildEmitter.prototype, {
        constructor: {
            value: ATT
        },
    });

    ATT.prototype.plugins = {};

    ATT.fn = ATT.prototype;
    ATT.initPlugin = function (name, initHandler) {
        if (arguments.length == 1) {
            name = _.uuid();
            initHandler = arguments[0];
        }
        ATT.prototype.plugins[name] = initHandler;
    };

    ATT.prototype.__defineGetter__('accessToken', function () {
        return this.config.accessToken;
    });
    ATT.prototype.__defineSetter__('accessToken', function (value) {
        this.config.accessToken= value;
        if (!!value) {
            this.emit('accessToken', value);
        }
    });


    if (typeof module === "object" && typeof module.exports === "object") {
        module.exports = ATT;
    } else {
        if (typeof define === "function" && define.amd) {
            define("att", [], function () {
                return ATT;
            });
        }
    }
    if (typeof window === "object" && typeof window.document === "object") {
        window.ATT = ATT;
    }
})(window);
