const {contextBridge,ipcRenderer}=require('electron');
contextBridge.exposeInMainWorld('ironDesktop',{launchError:()=>ipcRenderer.invoke('iron:launch-error'),launch:request=>ipcRenderer.invoke('iron:launch',request),returnToMenu:()=>ipcRenderer.invoke('iron:return-menu')});

contextBridge.exposeInMainWorld('ironPreferences',{
 get:()=>ipcRenderer.invoke('iron:preferences:get'),
 save:value=>ipcRenderer.invoke('iron:preferences:save',value)
});
