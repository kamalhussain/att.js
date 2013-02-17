var locker = {};

var fileToUpload;
//place holder for developer's getMedia callback
var getMediaCallback;

var lockerServiceUrl = "https://api.foundry.att.com/a2/locker/";

// helper function that gets URL, appends access token
locker.getUrl = function(requestedPath) {
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
locker.constructReturnData = function(data, textStatus) {
	var returnData = {};
	returnData.status = textStatus;
	returnData.data = data;
	return JSON.stringify(returnData);
};

locker.getUploadTicketSuccess = function(data, textStatus, jqXHR) {
	console.debug("success getUploadTicket. textStatus = "+textStatus);
	console.debug(JSON.stringify(data));
	console.log(data.token);
	// locker.uploadFile(data.token);
	// locker.uploadFileFormData(data.token);
	locker.renderUploadForm(data.token);
};

locker.getUploadTicketError = function(data, textStatus, jqXHR) {
	console.error("error getUploadTicket. textStatus = "+textStatus);
    console.error(JSON.stringify(data));
};


locker.getMediaSuccess = function(data, textStatus, jqXHR) {
	console.debug("success getMedia. textStatus = "+textStatus);
	
	getMediaCallback(locker.constructReturnData(data, textStatus));
};

locker.getMediaError = function(data, textStatus, jqXHR) {
	console.error("error getMedia. textStatus = "+textStatus);
    console.error(JSON.stringify(data));

	getMediaCallback(locker.constructReturnData(data, textStatus));
};

locker.uploadFileSuccess = function(data, textStatus, jqXHR) {
	console.debug("success uploadFile. textStatus = "+textStatus);
    console.debug(JSON.stringify(data));
};

locker.uploadFileError = function(data, textStatus, jqXHR) {
	console.error("error uploadFile. textStatus = "+textStatus);
    console.error(JSON.stringify(data));
};

locker.getUploadTicket = function() {
	var url = locker.getUrl('upload');
	$.ajax({
		type : 'GET',
		url : url,
		success : locker.getUploadTicketSuccess,
		error : locker.getUploadTicketError
	});	
};

/* this one uses FormData(), but doing a POST results in a pending action and does not yeild any result */

locker.uploadFileFormData = function(token) {
	var data = new FormData();
	var fileUploadUrl = "https://UCM01-STG1A-DATCHL-ucm.att.com/data/1_0_0/upload/";
	
	filename = fileToUpload.name;

	data.append('Filename', filename);
	data.append('X-Duplicate', true);
	data.append('Object-Name', filename);
	data.append('Upload-Token', token);
	
	
	var reader = new FileReader();
	reader.onloadend = (function(aFile) {
		// return function(e) {
		console.debug('loaded file');
		console.log(aFile);
		
		var fileContent = aFile.target.result;
		data.append('File', fileContent);


		/*
		var oReq = new XMLHttpRequest();
		oReq.open("POST", fileUploadUrl);
		oReq.send(data);
*/

		// console.log(data);
		$.ajax({
			type : 'POST',
			url : fileUploadUrl,
			contentType : false,
			contentLength : 1089207, 
			processData : false,
			cache : false,
			data : data,
			success : locker.uploadFileSuccess,
			error : locker.uploadFileError
			
		});

		
	// };
	});
	console.log('end');
	reader.readAsBinaryString(fileToUpload);
	console.log('after read');
	
};

/* This attempts to upload a file, but get cannot parse form data error */

locker.uploadFile = function(token) {
	console.debug("uploading file token = "+token);
	// myfile = "/Users/jacobthomas/Desktop/IMG_0122.jpg";
	myfile = fileToUpload;
	fileName =myfile.name;

	var fileUploadUrl = "https://UCM01-STG1A-DATCHL-ucm.att.com/data/1_0_0/upload/";
	// var fileUploadUrl = "https://api.foundry.att.com/a2/locker/upload";

	var boundaryKey = Math.floor(Math.random()*1000000).toString();
		var crlf = '\r\n';

	var data = crlf;

	data += '------'+ boundaryKey+crlf+crlf;
	data += 'Content-Disposition: form-data; name="Filename"'+crlf+crlf;
	// data += 'Content-Type: text/plain; charset=ISO-8859-1'+crlf;
	// data += 'Content-Transfer-Encoding: 8bit'+crlf;
	data += crlf+crlf;
	data += fileName+crlf+crlf;

	data += '------'+ boundaryKey+crlf+crlf;
	data += 'Content-Disposition: form-data; name="X-Duplicate"'+crlf+crlf;
	// data += 'Content-Type: text/plain; charset=ISO-8859-1'+crlf;
	// data += 'Content-Transfer-Encoding: 8bit'+crlf;
	data += crlf+crlf +'true'+crlf+crlf;

	
	data += '------'+ boundaryKey+crlf+crlf;	
	data += 'Content-Disposition: form-data; name="Object-Name"'+crlf+crlf;
	// data += 'Content-Type: text/plain; charset=ISO-8859-1'+crlf;
	// data += 'Content-Transfer-Encoding: 8bit'+crlf;
	data += crlf+crlf;
	data += fileName+crlf+crlf;
	
	data += '------'+ boundaryKey+crlf+crlf;
	data += 'Content-Disposition: form-data; name="Upload-Token"'+crlf+crlf;
	// data += 'Content-Type: text/plain; charset=ISO-8859-1'+crlf;
	// data += 'Content-Transfer-Encoding: 8bit'+crlf;
	data += crlf+crlf;
	data += token+crlf+crlf;
	


	data += '------'+ boundaryKey+crlf+crlf;	
	data += 'Content-Disposition: form-data; name="File"; filename="'+fileName+'"'+crlf+crlf;
	data += 'Content-Type: image/jpeg'+crlf+crlf;
	// data += 'Content-Transfer-Encoding: binary'+crlf;
	data += crlf+crlf;
		
	// data += '------'+ boundaryKey+crlf;
	
	var reader = new FileReader();
	reader.onloadend = (function(aFile) {
		// return function(e) {
		console.debug('loaded file');
		console.log(aFile);
		
		data += aFile.target.result;
		data += crlf+'------'+ boundaryKey+crlf+crlf;

		var oReq = new XMLHttpRequest();
		oReq.open("POST", fileUploadUrl);
		oReq.send(data);

		// // console.log(data);
		// $.ajax({
		// 	type : 'POST',
		// 	url : fileUploadUrl,
		// 	// dataType : 'multipart/form-data; boundary=----'+boundaryKey,
		// 	contentType : 'multipart/form-data; boundary=----'+boundaryKey+'--',
		// 	data : data,
		// 	success : locker.uploadFileSuccess,
		// 	error : locker.uploadFileError
		// 	
		// });
	// };
	});
	console.log('end');
	reader.readAsBinaryString(myfile);
		console.log('after read');
	
};

locker.upload = function(file) {
	fileToUpload = file;
	console.debug("getting upload ticket");
	locker.getUploadTicket();
	
};

locker.getMedia = function(callback) {
	var url = locker.getUrl('media');
	
	getMediaCallback = callback;
	$.ajax({
		type : 'GET',
		url : url,
		success : locker.getMediaSuccess,
		error : locker.getMediaError
	});
};



/* this function creates a form element and uploads file.
   this works, but the form is rendered in the page, and user has to select a file to upload
   and clicking submit button redirects user to POST url, or can open in a new tab
   */

locker.renderUploadForm = function(uploadtoken) {
	if ($('#locker_file_upload').length != 1) {
		console.error("div with id locker_file_upload not found. please create one");
		return;
	}
	
	var fileUploadUrl = "https://UCM01-STG1A-DATCHL-ucm.att.com/data/1_0_0/upload/";
	
    var form = document.createElement('form');
	
	form.setAttribute('id', 'locker_file_upload_form');
	form.setAttribute('method', 'POST');
	form.setAttribute('enctype',"multipart/form-data");
	form.setAttribute('target', "_blank");
	form.setAttribute('action', fileUploadUrl);

    var filenameInput = document.createElement('input');
	filenameInput.setAttribute('id', 'locker_file_upload_form_filename_input');
	filenameInput.setAttribute('name', 'Filename');
	filenameInput.setAttribute('type', 'hidden');

	form.appendChild(filenameInput);
	
    var xDuplicate = document.createElement('input');
	xDuplicate.setAttribute('id', 'locker_file_upload_form_xduplicate_input');
	xDuplicate.setAttribute('name', 'X-Duplicate');
	xDuplicate.setAttribute('value', 'true');
	xDuplicate.setAttribute('type', 'hidden');

	form.appendChild(xDuplicate);
	
    var objectName = document.createElement('input');
	objectName.setAttribute('id', 'locker_file_upload_form_objectname_input');
	objectName.setAttribute('name', 'Object-Name');
	objectName.setAttribute('type', 'hidden');
	
	form.appendChild(objectName);
	
	var uploadToken = document.createElement('input');
	uploadToken.setAttribute('id', 'locker_file_upload_form_uploadtoken_input');	
	uploadToken.setAttribute('name', 'Upload-Token');
	uploadToken.setAttribute('value', uploadtoken);
	uploadToken.setAttribute('type', 'hidden');
	
	form.appendChild(uploadToken);
	 
	var file = document.createElement('input');
	file.setAttribute('id', 'locker_file_upload_form_file_input');
	file.setAttribute('name', 'File');
	file.setAttribute('type', 'file');
	
	form.appendChild(file);

	var submit = document.createElement('input');
	submit.setAttribute('name', 'Submit');
	submit.setAttribute('value', 'Upload');
	submit.setAttribute('type', 'submit');
	
	form.appendChild(submit);
	
	form.onSubmit = function() {
		filename = $('#locker_file_upload_form_file_input').val().split('\\')[file.split('\\').length -1 ];;

		$('#locker_file_upload_form_filename_input').val(filename);
		$('#locker_file_upload_form_objectname_input').val(filename);
		return false;
	};

	document.getElementById("locker_file_upload").appendChild(form);	
};

att.locker = locker;
