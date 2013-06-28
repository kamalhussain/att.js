var jade = require('jade'),
    fs = require('fs');

module.exports = function (spec, template, layout) {
    var layoutFile = fs.readFileSync(layout || 'scripts/layout.jade', 'utf8');
    var layoutFunc = jade.compile(layoutFile, {pretty: true});

    var templateFile = fs.readFileSync(__dirname+'/' + template + '.jade', 'utf-8');
    var templateFunc = jade.compile(templateFile, {pretty: true});

    return layoutFunc({body: templateFunc(spec)});
};

