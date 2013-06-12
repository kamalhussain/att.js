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

(function(ATT, $) {
    var cache = {};

    ATT.fn.getMe = function(cb) {
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
            success: function(user) {

                // store the user in the cache
                cache.me = user;
                // now we check to see if we've got a webrtc.json specified for this
                // user.
                $.ajax({
                    data: data,
                    dataType: 'json',
                    url: baseUrl + '/users/' + user.uid + '/api_services/webrtc.json',
                    // if we get a 200
                    success: function(res) {
                        // if we've got an explicit version use it.
                        var explicitVersion = res && res.version,
                                explicitNumber = res && res.options && res.options.phone_number,
                                pubId = res && res.options && res.options.pubId,
                                prvId = res && res.options && res.options.prvId,
                                password = res && res.options && res.options.password;

                        if (explicitVersion) {
                            user.version = 'a' + explicitVersion;
                        } else {
                            user.version = 'alu';
                        }
                        user.number = explicitNumber || user.phone_number;
                        user.pubId = pubId || '';
                        user.prvId = prvId || '';
                        user.key = password || '';

                        cb(user);
                    },
                    error: function(err) {
                        console.log("error invoking " + url);
                    }
                });
            }
        });
    };

    ATT.initPlugin(function(att) {
        att.on('init', function() {

            if ((typeof att.config.settings.userid === 'undefined') ||
                    (typeof att.config.settings.token.id === 'undefined') ||
                    (typeof att.config.settings.token.key === 'undefined')) {
                att.getMe(function(me) {
                    // make it possible to override guessed version
                    me.version = att.config.version || _.getQueryParam('version') || me.version;
                    att.config.version = me.version;
                    att.config.myNumber = me.number;

                    console.log('using API version:', att.config.version);

                    att.emit('user', me);
                });
                
            } else {
                var me = {
                    pubId: att.config.settings.userid,
                    prvId: att.config.settings.token.id,
                    key: att.config.settings.token.key
                };

                att.emit('user', me);
            }
        });
    });

})(ATT, jQuery);
