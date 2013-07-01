// Reads "src" directory and extracts and builds relevant
// spec data.
var fs = require('fs'),
    path = require('path'),
    _ = require('underscore');

module.exports = function () {
    var localFiles = fs.readdirSync(__dirname+'/../src'),
    specFiles = [];

    localFiles.forEach(function (filename) {
        if (filename.match(/\.spec$/)) {
            specFiles.push(filename);
        }
    });


    var result = {
        spec: {},
        eventIndex: {},
        datatypeIndex: {},
        builtins: {
            string: true,
            number: true,
            object: true
        }
    };


    specFiles.forEach(function (specFile) {
        var data = JSON.parse(fs.readFileSync(__dirname+'/../src/' + specFile, 'utf8'));
        result.spec[data.plugin] = data;

        _.forEach(data.events, function (desc, eventName) {
            if (!result.eventIndex[eventName]) {
                result.eventIndex[eventName] = [];
            }
            result.eventIndex[eventName].push({plugin: data.plugin, event: desc});
        });
        _.forEach(data.datatypes, function (desc, typeName) {
            if (!result.builtins[typeName]) {
                result.datatypeIndex[typeName] = {plugin: data.plugin, type: desc};
            }
        });
    });

    return result;
};
