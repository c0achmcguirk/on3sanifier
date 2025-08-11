const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');

const browserArg = process.argv.find(arg => arg.startsWith('--browser='));
const browser = browserArg ? browserArg.split('=')[1] : 'chrome';

const distDir = path.join(__dirname, `../dist-${browser}`);
const packageDir = path.join(__dirname, '../packages');

async function packageExtension() {
  await fs.ensureDir(packageDir);

  const manifestPath = path.join(distDir, 'manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
  const version = manifest.version;

  const zipFileName = `on3sanifier.${browser}.${version}.zip`;
  const output = fs.createWriteStream(path.join(packageDir, zipFileName));
  const archive = archiver('zip', {
    zlib: {level: 9},
  });

  output.on('close', () => {
    console.log(
      `Package for ${browser} version ${version} created at ${path.join(
        packageDir,
        zipFileName,
      )}`,
    );
  });

  archive.on('error', err => {
    throw err;
  });

  archive.pipe(output);
  archive.directory(distDir, false);
  await archive.finalize();
}

packageExtension().catch(err => {
  console.error(err);
  throw err;
});
