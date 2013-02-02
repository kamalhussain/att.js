var message = {};

var messageServiceUrl = "https://api.tfoundry.com/a1/messages/messages/?access_token=";

success = function(data) {
	console.log("success"+data);
}

error = function(data) {
	console.error("error"+data);
}

message.sendMessage = function(recipient, text) {
	console.log('send message '+text+' to '+recipient);
	var data = {};
	data.recipient = recipient;
	data.text = text;
	var access_token = window.att.config.apiKey;
	var url = messageServiceUrl+access_token;
	$.ajax({
		type : 'POST',
		url : url,
		data : JSON.stringify(data),
		success : success,
		error : error,
		dataType : 'application/json'
	})
}

att.message = message;
