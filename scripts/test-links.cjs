const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../public');
let count = 0;
const missing = [];
for (const name of fs.readdirSync(root).filter(n => n.endsWith('.html'))) {
    const html = fs.readFileSync(path.join(root, name), 'utf8');
    for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
        const url = match[1].split(/[?#]/)[0];
        if (!url || /^(?:https?:|tel:|mailto:|data:|javascript:)/.test(url) || url.includes('$') || !/\.(html|js|css)$/.test(url)) continue;
        count++;
        if (!fs.existsSync(path.join(root, url))) missing.push(name + ': ' + url);
    }
}
assert.deepEqual(missing, [], 'Missing internal page/script/style links');
console.log('PASS internal links: ' + count + ' HTML/JS/CSS references');
