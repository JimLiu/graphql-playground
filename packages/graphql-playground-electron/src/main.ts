// TODO enable tslint
/* tslint:disable */
import {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  protocol,
} from 'electron'
import * as electronLocalShortcut from 'electron-localshortcut'
import * as fs from 'fs'
import * as os from 'os'
import { autoUpdater } from 'electron-updater'
const dev = require('electron-is-dev')

const path = require('path')

const { newWindowConfig } = require('./utils')

const server = 'https://hazel-wmigqegsed.now.sh'
const feed = `${server}/update/${process.platform}/${app.getVersion()}`

app.setAsDefaultProtocolClient('graphql-playground')

const log = {
  info: (...args) => {
    console.log(...args)
  },
}

app.on('open-url', (event, url) => {
  event.preventDefault()
  forceSend('OpenUrl', url)
})

app.on('open-file', (event, path) => {
  event.preventDefault()
  forceSend('OpenSelectedFile', path)
})

function getFocusedWindow(): any | null {
  return BrowserWindow.getFocusedWindow()
}

function send(channel: string, arg: string) {
  const focusedWindow = getFocusedWindow()
  if (focusedWindow) {
    log.info('sending to focused window', channel, arg)
    focusedWindow.webContents.send(channel, arg)
  } else {
    log.info('no focused window')
  }
}

const readyWindowsPromises = {}

async function forceSend(channel: string, arg: string) {
  await appPromise
  const currentWindows = BrowserWindow.getAllWindows()
  let window = currentWindows[0]
  if (!window) {
    window = createWindow()
  }
  await readyWindowsPromises[window.id]
  log.info('force sending', channel, arg)
  window.webContents.send(channel, arg)
}

function initAutoUpdate() {
  if (dev) return

  if (process.platform === 'linux') return

  autoUpdater.on('update-downloaded', showUpdateNotification)

  autoUpdater.on('error', (event, error) => {
    dialog.showErrorBox(
      'Error: ',
      error == null ? 'unknown' : (error.stack || error).toString(),
    )
  })

  // autoUpdater.checkForUpdates()
}

function showUpdateNotification(it) {
  it = it || {}
  const restartNowAction = 'Restart Now'

  const versionLabel = it.label ? `Version ${it.version}` : 'The latest version'

  dialog.showMessageBox(
    {
      type: 'info',
      title: 'Install Updates',
      message: `${
        versionLabel
      } has been downloaded and application will be quit for update...`,
    },
    () => {
      setImmediate(() => autoUpdater.quitAndInstall())
    },
  )
}

ipcMain.on('async', (event, arg) => {
  const focusedWindow = getFocusedWindow()
  if (focusedWindow) {
    focusedWindow.close()
  }
})

const windows = new Set([])

function createWindow() {
  // Create the browser window.
  const newWindow = new BrowserWindow(newWindowConfig)

  newWindow.loadURL(
    dev
      ? 'http://localhost:4040' // Dev server ran by react-scripts
      : `file://${path.join(__dirname, '/dist/index.html')}`, // Bundled application
  )

  if (dev) {
    // If dev mode install react and redux extension
    // Also open the devtools
    const {
      default: installExtension,
      REACT_DEVELOPER_TOOLS,
      REDUX_DEVTOOLS,
    } = require('electron-devtools-installer')

    installExtension(REACT_DEVELOPER_TOOLS)
      .then(name => log.info(`Added Extension:  ${name}`))
      .catch(err => log.info('An error occurred: ', err))

    installExtension(REDUX_DEVTOOLS)
      .then(name => log.info(`Added Extension:  ${name}`))
      .catch(err => log.info('An error occurred: ', err))

    // newWindow.webContents.openDevTools()
  }

  windows.add(newWindow)

  // Emitted when the window is closed.
  newWindow.on('closed', function() {
    if (process.platform !== 'darwin' && windows.size === 0) {
      app.quit()
    }
    windows.delete(newWindow)
  })

  // electronLocalShortcut.register(newWindow, 'Cmd+Shift+]', () => {
  //   send('Tab', 'Next')
  // })

  // electronLocalShortcut.register(newWindow, 'Cmd+Shift+[', () => {
  //   send('Tab', 'Prev')
  // })
  readyWindowsPromises[newWindow.id] = new Promise(r => {
    ipcMain.once('ready', () => {
      r()
    })
  })

  return newWindow
}

// TODO use proper typing, maybe we need to update to electron 1.7.1 as they fixed some ts definitions
// https://github.com/electron/electron/releases/tag/v1.7.1
const template: any = [
  {
    label: 'Application',
    submenu: [
      {
        label: 'About GraphQL Playground',
        selector: 'orderFrontStandardAboutPanel:',
      },
      // {
      //   label: 'Check For Updates',
      //   click: () => manuallyCheckForUpdates(),
      // },
      { type: 'separator' },
      {
        label: 'Quit',
        accelerator: 'Command+Q',
        click: () => app.quit(),
      },
    ],
  },
  {
    label: 'File',
    submenu: [
      {
        label: 'New window',
        accelerator: 'Cmd+N',
        click: () => {
          createWindow()
        },
      },
      {
        label: 'New Tab',
        accelerator: 'Cmd+T',
        click: () => send('Tab', 'New'),
      },
      { type: 'separator' },
      { label: 'Close Window', accelerator: 'Cmd+Shift+W' },
      {
        label: 'Close Tab',
        accelerator: 'Cmd+W',
        click: () => send('Tab', 'Close'),
      },
      {
        label: 'Open File',
        accelerator: 'Cmd+O',
        click: () => send('File', 'Open'),
      },
      {
        label: 'Save File',
        accelerator: 'Cmd+S',
        click: () => send('File', 'Save'),
      },
    ],
  },
  {
    label: 'Edit',
    submenu: [
      { label: 'Undo', accelerator: 'CmdOrCtrl+Z', selector: 'undo:' },
      { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', selector: 'redo:' },
      { type: 'separator' },
      { label: 'Cut', accelerator: 'CmdOrCtrl+X', selector: 'cut:' },
      { label: 'Copy', accelerator: 'CmdOrCtrl+C', selector: 'copy:' },
      { label: 'Paste', accelerator: 'CmdOrCtrl+V', selector: 'paste:' },
      {
        label: 'Select All',
        accelerator: 'CmdOrCtrl+A',
        selector: 'selectAll:',
      },
    ],
  },
  {
    label: 'Window',
    submenu: [
      {
        label: 'Next Tab',
        accelerator: 'Cmd+Alt+Right',
        click: () => send('Tab', 'Next'),
      },
      {
        label: 'Previous Tab',
        accelerator: 'Cmd+Alt+Left',
        click: () => send('Tab', 'Next'),
      },
      {
        label: 'Minimize',
        accelerator: 'Cmd+M',
        click: () => {
          const focusedWindow = getFocusedWindow()
          if (focusedWindow) {
            focusedWindow.minimize()
          }
        },
      },
      { type: 'separator' },
      { label: 'Toggle Developer Tools', role: 'toggledevtools' },
    ],
  },
]

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
let appResolve
const appPromise = new Promise(resolve => (appResolve = resolve))
app.on('ready', () => {
  createWindow()
  // initAutoUpdate()

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)

  ipcMain.on('get-file-data', event => {
    log.info('get-file-data', event)
    // this.fileAdded(event)
  })

  ipcMain.on('load-file-content', (event, filePath) => {
    log.info('load-file-content', event, filePath)
  })

  protocol.registerFileProtocol('file:', (request, filePath) => {
    log.info('file:', request, filePath)
  })

  if (appResolve) {
    appResolve()
  }
})

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('will-quit', () => {
  // Unregister all shortcuts.
  globalShortcut.unregisterAll()
})
