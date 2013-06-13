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
            apiKey: '',
            user: _.uuid(),
            log: true,
            dependencyBaseUrl: '//js.att.io',
            settings: {}
        };

        // extend self.config with passed in options
        _.extend(self.config, opts);

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
