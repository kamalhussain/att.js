var jade = require('jade'),
    fs = require('fs');


var templateFile = fs.readFileSync('scripts/template.jade', 'utf-8'),
    templateFunc = jade.compile(templateFile, {pretty: true});


module.exports = function (spec) {
    return templateFunc(spec);
};
