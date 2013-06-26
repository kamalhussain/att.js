var jade = require('jade'),
    fs = require('fs');

module.exports = function (spec, template) {
    var layoutFile = fs.readFileSync('scripts/layout.jade', 'utf8');
    var layoutFunc = jade.compile(layoutFile, { pretty: true, filename: 'scripts/layout.jade' });
    
    var templateFile = fs.readFileSync('scripts/' + template + '.jade', 'utf-8'),
        templateFunc = jade.compile(templateFile, {pretty: true});
    return  layoutFunc(templateFunc(spec), spec)
        
    // return templateFunc(spec);
};

