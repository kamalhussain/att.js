var fs = require('fs'),
    path = require('path'),
    jade = require('jade'),
    _ = require('underscore'),
    uglifyjs = require('uglify-js');

function beautify(code) {
    return uglifyjs.parse(code).print_to_string({beautify: true});
}



var localFiles = fs.readdirSync('./src'),
    specFiles = [];

localFiles.forEach(function (filename) {
    if (filename.match(/\.spec$/)) {
        specFiles.push(filename);
    }
});


var spec = {},
    eventIndex = {},
    datatypeIndex = {},
    builtins = {
        string: true,
        number: true,
        object: true
    };

specFiles.forEach(function (specFile) {
    var data = JSON.parse(fs.readFileSync('./src/' + specFile, 'utf8'));
    spec[data.plugin] = data;

    _.forEach(data.events, function (desc, eventName) {
        if (!eventIndex[eventName]) {
            eventIndex[eventName] = [];
        }
        eventIndex[eventName].push({plugin: data.plugin, event: desc});
    });
    _.forEach(data.datatypes, function (desc, typeName) {
        if (!builtins[typeName]) {
            datatypeIndex[typeName] = {plugin: data.plugin, type: desc};
        }
    });
});

var out = [];

out.push('# ATT.js Plugin Documentation');
_.forEach(spec, function (plugin) {
    out.push('\n\n## The ' + plugin.plugin + ' plugin');
    out.push('\n\n' + plugin.description);
    if (plugin.methods && Object.keys(plugin.methods).length) {
        out.push('\n\n### Methods');
        out.push('\n');
        _.forEach(plugin.methods, function (methodDesc, name) {
            out.push('\n  - ' + name + '(');
            var args = [];
            if (methodDesc.parameters) {
                methodDesc.parameters.forEach(function (arg) {
                    if (builtins[arg.type]) {
                        args.push(arg.type + (arg.name ? ' ' + arg.name : ''));
                    } else {
                        args.push('[' + arg.type + '](#' + datatypeIndex[arg.type].plugin + '-datatype-' + arg.type + ')' + (arg.name ? ' ' + arg.name : ''));
                    }
                });
            }
            out.push(args.join(', '));
            out.push(')');
            out.push('\n\n    ' + methodDesc.description);
        });
    }
    if (plugin.events && Object.keys(plugin.events).length) {
        out.push('\n\n### Events');
        _.forEach(plugin.events, function (eventDesc, name) {
            out.push('\n\n  - <a id="' + plugin.plugin + '-event-' + name + '"></a>' + name);
            var args = [];
            (eventDesc.args || []).forEach(function (arg) {
                if (builtins[arg.type]) {
                    args.push(arg.type);
                } else {
                    args.push('[' + arg.type + '](#' + datatypeIndex[arg.type].plugin + '-datatype-' + arg.type + ')');
                }
            });
            if (args.length) {
                out.push(', called with: ');
                out.push(args.join(', '));
            }
            out.push('\n\n    ' + eventDesc.description);
        });
    }
});

out.push('\n\n## Data Types');
_.forEach(datatypeIndex, function (desc, name) {
    out.push('\n\n### <a id="' + desc.plugin + '-datatype-' + name + '"></a>' + name);
    out.push('\n\n' + desc.type.description);
    if (desc.type.methods && Object.keys(desc.type.methods).length) {
        out.push('\n\n### Methods');
        out.push('\n');
        _.forEach(desc.type.methods, function (methodDesc, name) {
            out.push('\n  - ' + name + '(');
            var args = [];
            if (methodDesc.parameters) {
                methodDesc.parameters.forEach(function (arg) {
                    if (builtins[arg.type]) {
                        args.push(arg.type + (arg.name ? ' ' + arg.name : ''));
                    } else {
                        args.push('[' + arg.type + '](#' + datatypeIndex[arg.type].plugin + '-datatype-' + arg.type + ')' + (arg.name ? ' ' + arg.name : ''));
                    }
                });
            }
            out.push(args.join(', '));
            out.push(')');
            out.push('\n\n    ' + methodDesc.description);
        });
    }
 
});

out.push('\n\n## Event Index');
_.forEach(eventIndex, function (sources, name) {
    out.push('\n\n### ' + name);
    _.forEach(sources, function (source) {
        out.push('\n  - [' + source.plugin + '](#' + source.plugin + ')');
    });
});


console.log(out.join(''));
