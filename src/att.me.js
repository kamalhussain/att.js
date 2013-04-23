(function (ATT, $) {
    var cache = {};

    ATT.fn.getMe = function (cb) {
        var self = this,
            baseUrl = "https://auth.tfoundry.com",
            data = {
                access_token: self.config.apiKey
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
    };

    ATT.initPlugin(function (att) {
        att.on('init', function () {
            att.getMe(function (me) {
                // make it possible to override guessed version
                me.version = att.config.version || _.getQueryParam('version') || me.version;
                att.config.version = me.version;
                att.config.myNumber = me.number;

                console.log('using API version:', att.config.version);

                att.emit('user', me);
            });
        });
    });

})(ATT, jQuery);
