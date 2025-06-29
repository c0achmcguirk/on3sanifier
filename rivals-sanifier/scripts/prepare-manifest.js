const fs = require('fs');
const path = require('path');

const manifestPath = path.join(__dirname, '../manifest.json');
const distPath = path.join(__dirname, '../dist/manifest.json');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

// This is where you could add browser-specific modifications
// For example:
// if (process.env.BROWSER === 'firefox') {
//   delete manifest.background.service_worker;
// } else {
//   delete manifest.background.scripts;
// }

fs.writeFileSync(distPath, JSON.stringify(manifest, null, 2));
console.log('Manifest prepared for distribution.');
