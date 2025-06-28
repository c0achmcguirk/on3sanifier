# Rivals Sanifier

This is a browser extension for Firefox and Chrome that filters posts and threads on rivals.com.

## Development

This project is written in TypeScript. To get started, you'll need to have Node.js and npm installed.

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Build the extension:**
    ```bash
    npm run build
    ```
    This will compile the TypeScript files into JavaScript and place them in the `dist` directory. It will also copy the necessary static assets.

3.  **Watch for changes:**
    ```bash
    npm run watch
    ```
    This will automatically recompile the TypeScript files whenever you make a change.

## Loading the extension

### Chrome

1.  Open Chrome and navigate to `chrome://extensions`.
2.  Enable "Developer mode" in the top right corner.
3.  Click "Load unpacked" and select the `dist` directory within this project.

### Firefox

1.  Open Firefox and navigate to `about:debugging`.
2.  Click "This Firefox" and then "Load Temporary Add-on...".
3.  Select the `manifest.json` file within the `dist` directory.
