// src/lib/chrome_mock.ts
(window as any).chrome = {
  runtime: {
    sendMessage: () => {},
    getURL: (path: string) => path,
    getManifest: () => ({
      manifest_version: 3,
      name: 'on3-sanifier',
      version: '1.0.0',
    }),
    openOptionsPage: () => {},
  },
  extension: {
    inIncognitoContext: false,
  },
  storage: {
    sync: {
      get: (keys: any, callback: (items: {[key: string]: any}) => void) => {
        callback({});
      },
      set: (items: any, callback: () => void) => {
        callback();
      },
    },
  },
  tabs: {
    create: () => {},
  },
};
