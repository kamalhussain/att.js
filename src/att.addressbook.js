(function (ATT, WildEmitter, Rester) {
    function AddressBook(token) {
        var self = this;
        this.api = new Rester(token, 'https://api.foundry.att.com/a4/addressbook');

        // inherit wildemitter properties
        WildEmitter.call(this);

        // handle errors
        this.api.errorHandlers[404] = this._badToken.bind(this);
        this.api.errorHandlers[401] = this._badToken.bind(this);
    }

    // set our prototype to be a new emitter instance
    AddressBook.prototype = Object.create(WildEmitter.prototype, {
        constructor: {
            value: AddressBook
        }
    });

    AddressBook.prototype._badToken = function () {
        this.emit('invalidToken');
    };

    AddressBook.prototype.getContacts = function (callback) {
        this.api.get('/contacts', callback);
    };

    AddressBook.prototype.getContact = function (id, callback) {
        this.api.get('/contacts/' + id, callback);
    };

    AddressBook.prototype.addContact = function (contactDetails, callback) {
        this.api.post('/contacts', contactDetails, callback);
    };

    AddressBook.prototype.updateContact = function (id, contactDetails, callback) {
        this.api.put('/contacts/' + id, contactDetails, callback);
    };

    AddressBook.prototype.deleteContact = function (id, callback) {
        this.api.delete('/contacts/' + id, callback);
    };

    AddressBook.prototype.getGroups = function (callback) {
        this.api.get('/groups', callback)
    };

    AddressBook.prototype.getGroup = function (id, callback) {
        this.api.get('/groups/' + id, callback)
    };

    AddressBook.prototype.addGroup = function (groupDetails, callback) {
        this.api.post('/groups', groupDetails, callback);
    };

    AddressBook.prototype.updateGroup = function (id, groupDetails, callback) {
        this.api.post('/groups/' + id, groupDetails, callback);
    };

    AddressBook.prototype.deleteGroup = function (id, callback) {
        this.api.delete('/groups/' + id, callback);
    };


    ATT.AddressBook = AddressBook;
    

    ATT.initPlugin(function (att) {
        att.on('accessToken', function (token) {
            att.addressbook = new AddressBook(token);
            att.emit('addressBookReady');
        });
    });
})(ATT, WildEmitter, Rester);
