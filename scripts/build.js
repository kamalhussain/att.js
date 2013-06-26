var fs = require('fs'),
    spec = require('../src/spec')(),
    renderMarkdown = require('./renderMarkdown'),
    renderHtml = require('./renderHtml');


fs.writeFileSync('docs/plugins.md', renderMarkdown(spec));
fs.writeFileSync('staticSite/index.html', renderHtml(spec));
