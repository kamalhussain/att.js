var locker = {};

var uploadTicket;

//place holder for developer's getMedia callback
var getMediaCallback;

var lockerServiceUrl = "https://api.foundry.att.com/a2/locker/";

// helper function that gets URL, appends access token
getUrl = function(requestedPath) {
	var access_token = window.att.config.apiKey;
	var url = "";
	
	if(requestedPath) {
		url = lockerServiceUrl+requestedPath+"?access_token="+access_token;
	} else {
		url = lockerServiceUrl+"?access_token="+access_token;		
	}
	
	console.debug("url = "+url);
	
	return url;	
};

// helper function that creates data returned to developer's callback function
constructReturnData = function(data, textStatus) {
	var returnData = {};
	returnData.status = textStatus;
	returnData.data = data;
	return JSON.stringify(returnData);
};

getUploadTicketSuccess = function(data, textStatus, jqXHR) {
	console.debug("success getUploadTicket. textStatus = "+textStatus);
	console.debug(JSON.stringify(data));
	uploadTicket = data.token;
};

getUploadTicketError = function(data, textStatus, jqXHR) {
	console.error("error getUploadTicket. textStatus = "+textStatus);
    console.error(JSON.stringify(data));
};


getMediaSuccess = function(data, textStatus, jqXHR) {
	console.debug("success getMediaSuccess. textStatus = "+textStatus);
	
	getMediaCallback(constructReturnData(data, textStatus));
};

getMediaError = function(data, textStatus, jqXHR) {
	console.error("error getMediaError. textStatus = "+textStatus);
        console.error(JSON.stringify(data));

	getMediaCallback(constructReturnData(data, textStatus));
};

getUploadTicket = function() {
	var url = getUrl('upload');
	$.ajax({
		type : 'GET',
		url : url,
		success : getUploadTicketSuccess,
		error : getUploadTicketError
	});	
};

uploadFile = function() {
	
};

locker.upload = function() {
	console.debug("getting upload ticket");
	console.log(getUploadTicket());
};

locker.getMedia = function(callback) {
	var url = getUrl('media');
	
	getMediaCallback = callback;
	$.ajax({
		type : 'GET',
		url : url,
		success : getMediaSuccess,
		error : getMediaError
		// beforeSend : setHeader
	});
};

setHeader = function(xhr) {
	xhr.setRequestHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
	xhr.setRequestHeader('access-control-allow-origin', '*');
};

att.locker = locker;
