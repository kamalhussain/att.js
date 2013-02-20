var message = {};

//place holder for developer's callback function for getMessages and getMessage method
var getMessagesCallback;

//place holder for developer's callback function for search by number
var searchByNumberCallback;

//var messageServiceUrl = "https://api.tfoundry.com/a1/messages/messages/";
var messageServiceUrl = "https://api.foundry.att.com/a1/messages/messages/";

// helper function that creates data returned to developer's callback function
message.constructReturnData = function(data, textStatus) {
	var returnData = {};
	returnData.status = textStatus;
	returnData.data = data;
	return JSON.stringify(returnData);
};

message.sendMessageSuccess = function(data, textStatus, jqXHR) {
	console.debug("success sendMessage. textStatus = "+textStatus);
};

message.sendMessageError = function(data, textStatus, jqXHR) {
	console.error("error sendMessage. textStatus = " + textStatus);
	console.error(JSON.stringify(data));
};

message.getMessagesSuccess = function(data, textStatus, jqXHR) {
	console.debug("success getMessages. textStatus = "+textStatus);

	getMessagesCallback(message.constructReturnData(data, textStatus));
};

message.getMessagesError = function(data, textStatus, jqXHR) {
	console.error("error getMessages. textStatus = "+textStatus);
	console.error(JSON.stringify(data));

	getMessagesCallback(message.constructReturnData(data, textStatus));	
};

message.deleteMessageSuccess = function(data, textStatus, jqXHR) {
	console.debug("success deleteMessage. textStatus = "+textStatus);
};

message.deleteMessageError = function(data, textStatus, jqXHR) {
	console.error("error deleteMessage. textStatus = "+textStatus);
	console.error(JSON.stringify(data));
};

message.searchByNumberSuccess = function(data, textStatus, jqXHR) {
	console.debug("success searchByNumber. textStatus = "+textStatus);

	searchByNumberCallback(message.constructReturnData(data, textStatus));	
};


message.searchByNumberError = function(data, textStatus, jqXHR) {
	console.error("error searchByNumber. textStatus = "+textStatus);
	console.error(JSON.stringify(data));
	
	searchByNumberCallback(message.constructReturnData(data, textStatus));	
};

// helper function that gets URL, appends access token
message.getUrl = function(requestedPath) {
	var access_token = window.att.config.apiKey;
	var url = "";
	
	if(requestedPath) {
		url = messageServiceUrl+requestedPath+"/?access_token="+access_token;
	} else {
		url = messageServiceUrl+"?access_token="+access_token;		
	}
	
	console.debug("url = "+url);
	
	return url;	
};

message.sendMessage = function(recipient, text) {
	console.debug('sending message '+text+' to '+recipient);

	var data = {};
	data.recipient = recipient;
	data.text = text;

	$.ajax({
		type : 'POST',
		url : message.getUrl(),
		data : JSON.stringify(data),
		success : message.sendMessageSuccess,
		error : message.sendMessageError,
		dataType : 'application/json'
	});
};

message.getMessages = function(callback) {
	getMessagesCallback = callback;
	$.ajax({
		type : 'GET',
		url : message.getUrl(),
		success : message.getMessagesSuccess,
		error : message.getMessagesError
	});
};

message.getMessage = function(messageId, callback) {
	getMessagesCallback = callback;
	$.ajax({
		type : 'GET',
		url : message.getUrl(messageId),
		success : message.getMessagesSuccess,
		error : message.getMessagesError
	});
};

message.deleteMessage = function(messageId) {
	$.ajax({
		type : 'DELETE',
		url : message.getUrl(messageId),
		success : message.deleteMessageSuccess,
		error : message.deleteMessageError
	});
};

message.searchByNumber = function(number, callback) {
	searchByNumberCallback = callback;
	$.ajax({
		type : 'GET',
		url : message.getUrl("filter/"+number),
		success : message.searchByNumberSuccess,
		error : message.searchByNumberError
	});
};

att.message = message;
