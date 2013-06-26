var jade = require('jade'),
    fs = require('fs');

module.exports = function (spec, template) {
    var templateFile = fs.readFileSync('scripts/' + template + '.jade', 'utf-8'),
        templateFunc = jade.compile(templateFile, {pretty: true});
    return templateFunc(spec);
};
