const esbuild = require('esbuild');
const { copy } = require('esbuild-plugin-copy');

const isWatch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: [
    'src/popup.ts',
    'src/options.ts',
    'src/content.ts',
    'src/background.ts'
  ],
  bundle: true,
  outdir: 'dist',
  plugins: [
    copy({
      resolveFrom: 'cwd',
      assets: [
        {
          from: ['./public/*'],
          to: ['./dist/public']
        },
        {
          from: ['./manifest.json'],
          to: ['./dist/manifest.json']
        },
        {
          from: ['./src/site-style.css'],
          to: ['./dist/site-style.css']
        }
      ]
    })
  ]
};

async function build() {
  if (isWatch) {
    const ctx = await esbuild.context(buildOptions);
    await ctx.watch();
    console.log('Watching for changes...');
  } else {
    await esbuild.build(buildOptions);
  }
}

build().catch(() => process.exit(1));
