var locker = {};

//place holder for developer's getMedia callback
var getMediaCallback;

var lockerFileServiceUrl = "https://api.foundry.att.com/a2/locker/files/";
var lockerMediaServiceUrl = "https://api.foundry.att.com/a2/locker/media/";

// helper function that creates data returned to developer's callback function
constructReturnData = function(data, textStatus) {
	var returnData = {};
	returnData.status = textStatus;
	returnData.data = data;
	return JSON.stringify(returnData);
};


getMediaSuccess = function(data, textStatus, jqXHR) {
	console.log("success getMediaError. textStatus = "+textStatus);
	
	getMediaCallback(constructReturnData(data, textStatus));
};

getMediaError = function(data, textStatus, jqXHR) {
	console.error("error getMediaError. textStatus = "+textStatus);

	getMediaCallback(constructReturnData(data, textStatus));
};

locker.getMedia = function getMedia(callback) {
	var access_token = window.att.config.apiKey;
	var url = lockerMediaServiceUrl+"?access_token="+access_token;
	
	getMediaCallback = callback;
	$.ajax({
		type : 'GET',
		url : url,
		success : getMediaSuccess,
		error : getMediaError
	});
};

att.locker = locker;