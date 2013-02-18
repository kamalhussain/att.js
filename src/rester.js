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
}

Rester.prototype.get = function(path, callback) {
    $.ajax({
        url: this.baseUrl + path + '?access_token=' + this.token,
        success: function (result) {
            callback(null, result);
        },
        error: function (err) {
            callback(err);
        }
    });
};

Rester.prototype.put = function(path, payloadObj, callback) {
    $.ajax({
        url: this.baseUrl + path + '?access_token=' + this.token,
        type: 'put',
        data: payloadObj,
        success: function (result) {
            callback(null, result);
        },
        error: function (err) {
            callback(err);
        }
    });
};

Rester.prototype.post = function(path, payloadObj, callback) {
    $.ajax({
        url: this.baseUrl + path + '?access_token=' + this.token,
        type: 'post',
        data: payloadObj,
        success: function (result) {
            callback(null, result);
        },
        error: function (err) {
            callback(err);
        }
    });
};

Rester.prototype.delete = function(path, callback) {
    $.ajax({
        url: this.baseUrl + path + '?access_token=' + this.token,
        type: 'delete',
        success: function (result) {
            callback(null, result);
        },
        error: function (err) {
            callback(err);
        }
    });
};
