import { BrowserWindow, MessageBoxSyncOptions } from 'electron';
import { emitter } from '@/lib/events';

const browserSpecs = (() => {
  const ua = navigator.userAgent;
  let tem: RegExpMatchArray | null;
  let M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];

  if (/trident/i.test(M[1])) {
    tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
    return {name: 'IE', version: (tem[1] || '')};
  }

  if (M[1] === 'Chrome') {
    tem = ua.match(/\b(OPR|Edge)\/(\d+)/);
    if (tem != null) { return {name: tem[1].replace('OPR', 'Opera'), version: tem[2]}; }
  }

  M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
  // tslint:disable-next-line:no-conditional-assignment
  if ((tem = ua.match(/version\/(\d+)/i)) != null) {
      M.splice(1, 1, tem[1]);
  }

  return {name: M[0], version: M[1]};
})();

process.versions = Object.assign({}, process.versions, {
  V8: undefined,
  node: undefined,
  [browserSpecs.name]: browserSpecs.version,
  Node: process.versions.node,
});

const w = window as any;

w.__static = '';

const showMessageBoxSync = (browserWindow: BrowserWindow, options: MessageBoxSyncOptions): number => {
  return 1; // 1 means block
};

const openDevTools = () => {
  // not possible
};

const isDevToolsOpened = () => {
  return false;
};

const webContents = {
  openDevTools,
  isDevToolsOpened,
};

const win = {
  reload: () => {
    location.reload();
  },
  close: () => {
    window.close();
  },
  webContents,
};

const getCurrentWindow = () => {
  return win;
};

const showSaveDialog = () => {
  return {
    filePath: undefined,
  };
};

const dialog = {
  showMessageBoxSync,
  showSaveDialog,
};

const openExternal = (url: string) => {
  window.open(url);
};

const shell = {
  openExternal,
};

const writeText = (text: string) => {
  const el = document.createElement('textarea');
  el.value = text;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
};

const clipboard = {
  writeText,
};

const getVersion = () => {
  // TODO does this work?
  return process.env.npm_package_version;
};

const getPath = (name: 'appData' | 'documents') => {
  return name === 'appData' ? '/AppData' : '/Documents';
};

const getName = () => {
  return 'DAWG';
};

const app = {
  getVersion,
  getPath,
  getName,
};

type TODO = any;
type IpcRendererEvent = TODO;
type Send = (channel: string, ...args: any[]) => void;

interface IpcMainEvent {
  sender: { send: Send };
}

const mainEvents = emitter();

const send: Send = (channel, ...args) => {
  rendererEvents.emit(channel, {}, ...args);
};

const sender = { send };

export const ipcMain = {
  on: (channel: string, listener: (event: IpcMainEvent, ...args: any[]) => void) => {
    mainEvents.on(channel, listener);
  },
};

const rendererEvents = emitter();

export const ipcRenderer = {
  on: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) => {
    rendererEvents.on(channel, listener);
  },
  send: (channel: string, ...args: any[]) => {
    mainEvents.emit(channel, { sender }, ...args);
  },
};

// TODO what if you import Menu??
export const events = emitter<{ setApplicationMenu: [any], popup: [any, () => void] }>();

export const Menu = {
  buildFromTemplate: (menu: any) => {
    const onCloseEmitter = emitter<{ 'menu-will-close': [] }>();

    return {
      popup: () => {
        events.emit('popup', menu, () => {
          onCloseEmitter.emit('menu-will-close');
        });
      },
      addListener: (e: 'menu-will-close', cb: () => void) => {
        onCloseEmitter.on(e, cb);
      },
    };
  },
  setApplicationMenu: (menu: any) => {
    events.emit('setApplicationMenu', menu);
  },
};

export const remote = {
  app,
  dialog,
  getCurrentWindow,
  shell,
  clipboard,
};
