const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('scholarAI', {
  localAI: {
    getState: () => ipcRenderer.invoke('local-ai:state'),
    install: (modelId) => ipcRenderer.invoke('local-ai:install', modelId),
    cancel: () => ipcRenderer.invoke('local-ai:cancel'),
    remove: () => ipcRenderer.invoke('local-ai:remove'),
    test: () => ipcRenderer.invoke('local-ai:test'),
    generate: (input) => ipcRenderer.invoke('local-ai:generate', input),
    onProgress: (callback) => {
      const listener = (_, state) => callback(state)
      ipcRenderer.on('local-ai:progress', listener)
      return () => ipcRenderer.removeListener('local-ai:progress', listener)
    },
  },
  provider: {
    get: () => ipcRenderer.invoke('provider:get'),
    set: (config) => ipcRenderer.invoke('provider:set', config),
  },
  generate: (input) => ipcRenderer.invoke('ai:generate', input),
})
