var _ = require('underscore');


module.exports = function (result) {
    var out = [];

    out.push('# ATT.js Plugin Documentation');
    _.forEach(result.spec, function (plugin) {
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
                        if (result.builtins[arg.type]) {
                            args.push(arg.type + (arg.name ? ' ' + arg.name : ''));
                        } else {
                            args.push('[' + arg.type + '](#' + result.datatypeIndex[arg.type].plugin + '-datatype-' + arg.type + ')' + (arg.name ? ' ' + arg.name : ''));
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
                    if (result.builtins[arg.type]) {
                        args.push(arg.type);
                    } else {
                        args.push('[' + arg.type + '](#' + result.datatypeIndex[arg.type].plugin + '-datatype-' + arg.type + ')');
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
    _.forEach(result.datatypeIndex, function (desc, name) {
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
                        if (result.builtins[arg.type]) {
                            args.push(arg.type + (arg.name ? ' ' + arg.name : ''));
                        } else {
                            args.push('[' + arg.type + '](#' + result.datatypeIndex[arg.type].plugin + '-datatype-' + arg.type + ')' + (arg.name ? ' ' + arg.name : ''));
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
    _.forEach(result.eventIndex, function (sources, name) {
        out.push('\n\n### ' + name);
        _.forEach(sources, function (source) {
            out.push('\n  - [' + source.plugin + '](#' + source.plugin + ')');
        });
    });

    return out.join('');

};
