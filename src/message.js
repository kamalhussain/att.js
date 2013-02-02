var message = {};
var sendMessageCallback;

var messageServiceUrl = "https://api.tfoundry.com/a1/messages/messages/";

sendMessageSuccess = function(data, textStatus, jqXHR) {
	console.log("success sendMessage. textStatus = "+textStatus);
};

sendMessageError = function(data, textStatus, jqXHR) {
	console.error("error sendMessage. textStatus = "+textStatus);
};

getMessagesSuccess = function(data, textStatus, jqXHR) {
	console.log("success getMessages. textStatus = "+textStatus);
	
	sendMessageCallback(JSON.stringify(data));
};

getMessagesError = function(data, textStatus, jqXHR) {
	console.error("error getMessages. textStatus = "+textStatus);
	
	var returnData = {};
	returnData.textStatus = textStatus;
	sendMessageCallback(JSON.stringify(returnData));
};

getUrl = function(requestedPath) {
	var access_token = window.att.config.apiKey;
	var url = "";
	
	if(requestedPath) {
		url = messageServiceUrl+requestedPath+"/?access_token="+access_token;
	} else {
		url = messageServiceUrl+"?access_token="+access_token;		
	}
	
	console.log("url = "+url);
	
	return url;	
};

message.sendMessage = function(recipient, text) {
	console.log('sending message '+text+' to '+recipient);

	var data = {};
	data.recipient = recipient;
	data.text = text;

	$.ajax({
		type : 'POST',
		url : getUrl(),
		data : JSON.stringify(data),
		success : sendMessageSuccess,
		error : sendMessageError,
		dataType : 'application/json'
	});
};

message.getMessages = function(callback) {
	sendMessageCallback = callback;
	$.ajax({
		type : 'GET',
		url : getUrl(),
		success : getMessagesSuccess,
		error : getMessagesError
	});
};

message.getMessage = function(messageId) {
	$.ajax({
		type : 'GET',
		url : getUrl(messageId),
		success : getMessagesSuccess,
		error : getMessagesError
	});
}

att.message = message;
