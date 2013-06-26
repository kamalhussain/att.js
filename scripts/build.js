var fs = require('fs'),
    spec = require('./spec')(),
    renderMarkdown = require('./renderMarkdown'),
    renderHtml = require('./renderHtml');


fs.writeFileSync('docs/plugins.md', renderMarkdown(spec));
fs.writeFileSync('staticSite/index.html', renderHtml(spec, 'index'));
fs.writeFileSync('staticSite/plugins.html', renderHtml(spec, 'plugins'));
fs.writeFileSync('staticSite/datatypes.html', renderHtml(spec, 'datatypes'));
fs.writeFileSync('staticSite/events.html', renderHtml(spec, 'events'));
