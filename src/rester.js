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
