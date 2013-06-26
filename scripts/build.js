var fs = require('fs'),
    spec = require('./spec')(),
    renderMarkdown = require('./renderMarkdown'),
    renderHtml = require('./renderHtml');


var layoutFile = 'scripts/layout.jade';
if (process.argv.length > 2) {
    layoutFile = process.argv[2];
}


fs.writeFileSync('docs/plugins.md', renderMarkdown(spec));
fs.writeFileSync('staticSite/index.html', renderHtml(spec, 'index', layoutFile));
fs.writeFileSync('staticSite/plugins.html', renderHtml(spec, 'plugins', layoutFile));
fs.writeFileSync('staticSite/datatypes.html', renderHtml(spec, 'datatypes', layoutFile));
fs.writeFileSync('staticSite/events.html', renderHtml(spec, 'events', layoutFile));
