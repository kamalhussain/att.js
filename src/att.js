(function (window, undefined) {

    // Use existing underscore.js, or built-in minimal version.

    this._ = _ = {
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
        }
    };

    // Extend _ to include additional generic utilities
    _.extend(_, {
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
    });

    function ATT(opts) {
        WildEmitter.call(this);

        var self = this,
            opts = opts || {};

        self.config = {
            // apiKey: false,
            user: _.uuid(),
            log: true,
            dependencyBaseUrl: '//js.att.io'
        };


        _.extend(self.config, opts);

        if (self.config.log) {
            self.on('*', function (eventName, payload) {
                console.log('att.js event:', eventName, payload);
            });
        }

        _.each(self.plugins, function (plugin) {
            plugin(self);
        });
        
        // Set a session state that can be used to identify this session and can be used to validate oauth requests
        if (!sessionStorage.state) {
          sessionStorage.state = _.uuid();
          self.state =  sessionStorage.state;
        } else {
          self.state = sessionStorage.getItem('state');
        }
        
        self.emit('init', self);
    }

    ATT.prototype = Object.create(WildEmitter.prototype, {
        constructor: {
            value: ATT
        },
    });

    ATT.prototype.plugins = {};

    ATT.fn = ATT.prototype;
    ATT.initPlugin = function (initHandler) {
        ATT.prototype.plugins[_.uuid()] = initHandler;
    };


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
