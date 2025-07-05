const fs = require('fs-extra');
const path = require('path');
const esbuild = require('esbuild');

const isWatch = process.argv.includes('--watch');

const srcDir = path.join(__dirname, '../src');
const publicDir = path.join(__dirname, '../public');
const distDir = path.join(__dirname, '../dist');
const nodeModulesDir = path.join(__dirname, '../node_modules');

async function build() {
  // Clean and create the dist directory
  await fs.emptyDir(distDir);
  await fs.ensureDir(distDir);

  // Create a context for esbuild
  const ctx = await esbuild.context({
    entryPoints: [
      path.join(srcDir, 'popup.ts'),
      path.join(srcDir, 'options.ts'),
      path.join(srcDir, 'content.ts'),
      path.join(srcDir, 'background.ts')
    ],
    bundle: true,
    outdir: path.join(distDir, 'js'),
  });

  // Copy static assets
  await fs.copy(publicDir, distDir);
  await fs.copy(path.join(srcDir, 'site-style.css'), path.join(distDir, 'site-style.css'));
  await fs.copy(path.join(srcDir, 'theme.css'), path.join(distDir, 'theme.css'));
  await fs.copy(path.join(nodeModulesDir, 'material-components-web/dist/material-components-web.min.css'), path.join(distDir, 'material.css'));


  // Prepare and copy manifest
  const manifestPath = path.join(__dirname, '../manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
  // Add any browser-specific modifications here if needed
  await fs.writeJson(path.join(distDir, 'manifest.json'), manifest, { spaces: 2 });

  if (isWatch) {
    await ctx.watch();
    console.log('Watching for changes...');
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    console.log('Build complete.');
  }
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});

