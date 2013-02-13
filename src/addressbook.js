function AddressBook(token) {
    this.api = new Rester(token, 'https://api.foundry.att.com/a4/addressbook');
}

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

att.AddressBook = AddressBook;

if ($) {
    $.addressBook = function (token) {
        return new AddressBook(token);
    };
}

