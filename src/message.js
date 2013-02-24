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
