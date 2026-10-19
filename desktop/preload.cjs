const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('ironDesktop',{launch:request=>ipcRenderer.invoke('iron:launch',request)});
