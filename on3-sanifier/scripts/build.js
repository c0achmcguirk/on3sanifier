const fs = require('fs-extra');
const path = require('path');
const esbuild = require('esbuild');
const sass = require('sass');

const isWatch = process.argv.includes('--watch');
const browserArg = process.argv.find(arg => arg.startsWith('--browser='));
const browser = browserArg ? browserArg.split('=')[1] : 'chrome';
const distDir = path.join(__dirname, `../dist-${browser}`);

const srcDir = path.join(__dirname, '../src');
const publicDir = path.join(__dirname, '../public');
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
      path.join(srcDir, 'background.ts'),
    ],
    bundle: true,
    outdir: path.join(distDir, 'js'),
    sourcemap: 'inline',
  });

  // Compile Sass
  const sassResult = sass.compile(path.join(srcDir, 'theme.scss'), {
    loadPaths: [nodeModulesDir],
  });
  await fs.writeFile(path.join(distDir, 'theme.css'), sassResult.css);

  // Copy static assets
  await fs.copy(publicDir, distDir);
  await fs.copy(
    path.join(srcDir, 'site-style.css'),
    path.join(distDir, 'site-style.css'),
  );

  // Prepare and copy manifest
  const manifestPath = path.join(__dirname, '../manifest.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));

  if (browser === 'firefox') {
    // For Firefox, use the background script from browser_specific_settings
    if (
      manifest.browser_specific_settings &&
      manifest.browser_specific_settings.gecko &&
      manifest.browser_specific_settings.gecko.background
    ) {
      manifest.background = manifest.browser_specific_settings.gecko.background;
    } else {
      // Fallback if not defined in browser_specific_settings
      manifest.background = {
        scripts: ['js/background.js'],
      };
    }

    // Clean up browser_specific_settings for Firefox
    if (manifest.browser_specific_settings.gecko) {
      const geckoId = manifest.browser_specific_settings.gecko.id;
      manifest.browser_specific_settings = {
        gecko: {
          id: geckoId,
        },
      };
    }
  } else {
    // Chrome - remove browser_specific_settings
    delete manifest.browser_specific_settings;
  }

  await fs.writeJson(path.join(distDir, 'manifest.json'), manifest, {
    spaces: 2,
  });

  if (isWatch) {
    await ctx.watch();
    console.log(`Watching for changes to build for ${browser}...`);
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    console.log(`Build for ${browser} complete.`);
  }
}

build().catch(err => {
  console.error(err);
  throw err;
});
