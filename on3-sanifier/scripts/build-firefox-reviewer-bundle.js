const fs = require('fs-extra');
const path = require('path');
const archiver = require('archiver');

const bundleDir = path.join(__dirname, '../dist-firefox-reviewer-bundle');
const packageDir = path.join(__dirname, '../packages');
const projectRoot = path.join(__dirname, '..');

async function createReviewerBundle() {
  await fs.ensureDir(packageDir);

  const packageJsonPath = path.join(projectRoot, 'package.json');
  const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
  const version = packageJson.version;

  const outputZip = path.join(
    packageDir,
    `on3sanifier.firefoxReviewerBundle.${version}.zip`,
  );

  // 1. Create a clean directory.
  await fs.emptyDir(bundleDir);

  // 2. Copy all necessary files.
  const filesToCopy = [
    'manifest.json',
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'karma.conf.js',
    '.editorconfig',
    '.eslintignore',
    '.eslintrc.json',
    '.prettierrc.js',
    'scripts',
    'src',
    'public',
  ];

  for (const file of filesToCopy) {
    await fs.copy(path.join(projectRoot, file), path.join(bundleDir, file));
  }

  // 3. Create the README.md file.
  const readmeContent = `
# on3 Sanifier - Source Code for Reviewers

This package contains the complete source code and build instructions for the on3 Sanifier Firefox add-on.

**GitHub Repository:** [https://github.com/c0achmcguirk/on3sanifier/](https://github.com/c0achmcguirk/on3sanifier/)

## Build Environment Requirements

*   **Operating System:** macOS, Windows, or Linux
*   **Node.js:** v21.7.3 or later
*   **npm:** 10.8.1 or later

## Step-by-Step Build Instructions

1.  **Install Dependencies:**
    Open a terminal in the root of this directory and run the following command to install the required Node.js packages:
    \`\`\`bash
    npm install
    \`\`\`

2.  **Build the Add-on:**
    Once the dependencies are installed, run the following command to build the Firefox add-on:
    \`\`\`bash
    npm run build:firefox
    \`\`\`

3.  **Verify the Output:**
    After the build script finishes, you will find the generated add-on files in the \`dist-firefox\` directory. This directory can be loaded as a temporary add-on in Firefox for testing, or packaged as a \`.zip\` file for submission to the Firefox Add-on Store.

## Included Files

This bundle includes all the necessary files to build the extension:

*   \`manifest.json\`: The extension's manifest file.
*   \`package.json\` and \`package-lock.json\`: Define the project's dependencies and scripts.
*   \`tsconfig.json\`: TypeScript configuration.
*   \`karma.conf.js\`: Karma test runner configuration.
*   \`.editorconfig\`, \`.eslintignore\`, \`.eslintrc.json\`, \`.prettierrc.js\`: Code style and linting configurations.
*   \`scripts/\`: Contains the build scripts.
*   \`src/\`: Contains the TypeScript source code.
*   \`public/\`: Contains the static assets like HTML, CSS, and images.
`;

  await fs.writeFile(path.join(bundleDir, 'README.md'), readmeContent.trim());

  // 4. Zip the directory.
  const output = fs.createWriteStream(outputZip);
  const archive = archiver('zip', {
    zlib: {level: 9}, // Sets the compression level.
  });

  output.on('close', () => {
    console.log(
      `Reviewer bundle created successfully: ${ 
        archive.pointer() / 1024 / 1024
      } MB`,
    );
    console.log(`Bundle saved to: ${outputZip}`);
  });

  archive.on('error', err => {
    throw err;
  });

  archive.pipe(output);
  archive.directory(bundleDir, false);
  await archive.finalize();
}

createReviewerBundle().catch(err => {
  console.error('Error creating the reviewer bundle:', err);
  throw err;
});