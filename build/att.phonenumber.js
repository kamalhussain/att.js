/*global io MediaServices Phono*/
(function () {
    // Utils and references
    var root = this,
        att = {},
        cache = {};

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
                    // attempt to grab the external_id
                    var externalId = function () {
                        var val;
                        try {
                            val = user.identifiers.external_id[0];
                        } catch (e) {}
                        return val;
                    }();

                    // store the user in the config
                    cache.me = user;
                    
                    // attempt to build an imsNumber
                    user.imsNumber = user.ims_phone_number || externalId;

                    // if we have one, remove the domain.
                    if (user.imsNumber) {
                        user.imsNumber = cleanNumber(user.imsNumber);
                    }

                    // attempt to build a virtualNumber
                    user.virtualNumber = user.conference_phone_number;

                    // if we have an explicit IMS number or an externalID
                    // then it's IMS
                    if (user.ims_phone_number || externalId) {
                        version = 'a1';
                    } else if (user.conference_phone_number) {
                        // if not and we've got a conference number
                        // we want that as our number and we know we're likely
                        // using a3/phono.
                        version = 'a3';
                    }
                    // now we check to see if we've got a webrtc.json specified for this
                    // user.
                    $.ajax({
                        data: data,
                        dataType: 'json',
                        url: baseUrl + '/users/' + user.uid + '/api_services/webrtc.json',
                        // if we get a 200
                        success: function (res) {
                            // if we've got an explicit version use it.
                            var explicitVersion = res && res.version;
                            if (explicitVersion) {
                                user.version = 'a' + explicitVersion;
                            } else {
                                user.version = version || 'a3';
                            }

                            if (user.version === 'a3') {
                                // use known phono number or main
                                user.number = user.virtualNumber || user.phone_number;
                            } else {
                                // for 'a1' or 'a2' we should have an IMS number, if not
                                // fallback to main phone.
                                user.number = user.imsNumber || user.phone_number;                        
                            }
                            
                            cb(user);
                        }
                    });
                }
            });
        }
    };

    var phoneNumber = {};
    
    phoneNumber.stringify = function (text) {
        // strip all non numbers
        var cleaned = phoneNumber.parse(text),
            len = cleaned.length,
            countryCode = (cleaned.charAt(0) === '1'),
            arr = cleaned.split(''),
            diff;
    
        // if it's long just return it unformatted
        if (len > (countryCode ? 11 : 10)) return cleaned;
    
        // if it's too short to tell
        if (!countryCode && len < 4) return cleaned;
    
        // remove country code if we have it
        if (countryCode) arr.splice(0, 1);
    
        // the rules are different enough when we have
        // country codes so we just split it out
        if (countryCode) {
            if (len > 1) {
                diff = 4 - len;
                diff = (diff > 0) ? diff : 0;
                arr.splice(0, 0, " (");
                // back fill with spaces
                arr.splice(4, 0, (new Array(diff + 1).join(' ') + ") "));
                
                if (len > 7) {
                    arr.splice(8, 0, '-');
                }
            }
        } else {
            if (len > 7) {
                arr.splice(0, 0, "(");
                arr.splice(4, 0, ") ");
                arr.splice(8, 0, "-");
            } else if (len > 3) {
                arr.splice(3, 0, "-");
            }
        }
    
        // join it back when we're done with the CC if it's there
        return (countryCode ? '1' : '') + arr.join('');
    };
    
    phoneNumber.parse = function (input) {
        return String(input)
            .toUpperCase()
            .replace(/[A-Z]/g, function (l) {
                return (l.charCodeAt(0) - 65) / 3 + 2 - ("SVYZ".indexOf(l) > -1) | 0;
            })
            .replace(/\D/g, '');
    };
    
    phoneNumber.getCallable = function (input, countryAbr) {
        var country = countryAbr || 'us',
            cleaned = phoneNumber.parse(input);
        if (cleaned.length === 10) {
            if (country == 'us') {
                return '1' + cleaned;
            }
        } else if (country == 'us' && cleaned.length === 11 && cleaned.charAt(0) === '1') {
            return cleaned;
        } else {
            return false;
        }
    };
    
    att.phoneNumber = phoneNumber;




    // attach to window or export with commonJS
    if (typeof exports !== 'undefined') {
        module.exports = att;
    } else {
        // make sure we've got an "att" global
        root.ATT || (root.ATT = {});
        _.extend(root.ATT, att);
    }

}).call(this);
