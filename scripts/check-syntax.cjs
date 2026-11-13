const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const scripts = ['server.js'];
for (const dir of ['lib', 'public/js']) {
    for (const file of fs.readdirSync(path.join(root, dir))) {
        if (file.endsWith('.js')) scripts.push(dir + '/' + file);
    }
}
for (const file of scripts) execFileSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'pipe' });
console.log('PASS syntax: ' + scripts.length + ' JavaScript files');
