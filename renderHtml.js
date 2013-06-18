var jade = require('jade'),
    fs = require('fs'),
    spec = require('./extractSpecData')();


var templateFile = fs.readFileSync('template.jade', 'utf-8'),
    templateFunc = jade.compile(templateFile, {pretty: true});


//console.log(spec);

var html = templateFunc(spec);


console.log(html);

fs.writeFileSync('staticSite/index.html', html);


