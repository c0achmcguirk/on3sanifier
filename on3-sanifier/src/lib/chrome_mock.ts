export function initializeChromeMock() {
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
        _data: {},
        get: (keys: any, callback: (items: {[key: string]: any}) => void) => {
          const result: {[key: string]: any} = {};
          if (typeof keys === 'string') {
            result[keys] = (chrome as any).storage.sync._data[keys];
          } else if (Array.isArray(keys)) {
            keys.forEach(key => {
              result[key] = (chrome as any).storage.sync._data[key];
            });
          } else if (typeof keys === 'object') {
            for (const key in keys) {
              if (Object.prototype.hasOwnProperty.call(keys, key)) {
                result[key] = (chrome as any).storage.sync._data[key] !== undefined ? (chrome as any).storage.sync._data[key] : keys[key];
              }
            }
          }
          callback(result);
        },
        set: (items: any, callback: () => void) => {
          for (const key in items) {
            if (Object.prototype.hasOwnProperty.call(items, key)) {
              (chrome as any).storage.sync._data[key] = items[key];
            }
          }
          callback();
        },
      },
    },
    tabs: {
      create: () => {},
    },
  };
}