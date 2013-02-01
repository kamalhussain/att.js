// Creates the att.js source and att.min.js

/*global __dirname*/
var fileName = 'att.js',
    minFileName = 'att.min.js',
    src = __dirname + '/src',
    vendor = __dirname + '/vendor',
    outputPath = __dirname + '/' + fileName,
    minifiedPath = __dirname + '/' + minFileName;

var fs = require('fs'),
    mustache = require('mustache'),
    uglify = require('uglify-js'),
    colors = require('colors');
    
var template = fs.readFileSync(src + '/template.js', 'utf-8'),
    socketIO = fs.readFileSync(vendor + '/socket.io.js', 'utf-8'),
    emitter = fs.readFileSync(src + '/wildemitter.js', 'utf-8'),
    phoneNumber = fs.readFileSync(src + '/phoneNumber.js', 'utf-8'),
    message = fs.readFileSync(src + '/message.js', 'utf-8'),
    phone = fs.readFileSync(src + '/att.core.js', 'utf-8');

// indents each line in a file by 4 spaces or whatever you pass into it
function indent(file, indentAmount) {
    var split = file.split('\n'),
        actualIndent = indentAmount || '    ',
        i = 0,
        l = split.length;
    
    for (; i < l; i++) {
        split[i] = actualIndent + split[i];
    }

    return split.join('\n');
}

// build our concatenated code
var context = {
    emitter: indent(emitter), 
    phone: indent(phone),
    phoneNumber: indent(phoneNumber),
    message: indent(message),
    socket: socketIO
};

// some flair
console.log('\nAT&T'.bold + ' FOUNDRY'.blue.bold);
console.log('~~~~~~~~~~~~');

var file = 'att.js';

function clone(obj) {
    var res = {};
    for (var i in obj) {
        res[i] = obj[i];
    }
    return res;
}

function writeFiles(name, context) {
    var code = mustache.render(template, context),
        fileName = name + '.js',
        minFileName = name + '.min.js',
        outputPath = __dirname + '/build/' + fileName,
        minifiedOutputPath = __dirname + '/build/' + minFileName;

    fs.writeFileSync(outputPath, code, 'utf-8');
    console.log(fileName.bold + ' file built.'.grey);
    fs.writeFileSync(minifiedOutputPath, uglify.minify(outputPath).code, 'utf-8');
    console.log(minFileName.bold + ' file built.'.grey + '\n');
}

// write it to disk
writeFiles('att', context);

// phone number only
writeFiles('att.phonenumber', {phoneNumber: indent(phoneNumber)});

// message
writeFiles('att.message', {message: indent(message)});


console.log('The ' + '/build'.bold.blue + ' directory contains the built files.\n');

console.log('Run ' + 'node server'.bold.blue + ' to see example uses.\n');

// yup, we're done
process.exit(0);    
