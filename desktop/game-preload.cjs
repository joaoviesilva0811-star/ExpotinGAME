const {contextBridge,ipcRenderer}=require('electron');
// Only sanitized presentation preferences; no paths, accounts or combat IPC.
contextBridge.exposeInMainWorld('ironPreferences',{
 get:()=>ipcRenderer.invoke('iron:preferences:get'),
 save:value=>ipcRenderer.invoke('iron:preferences:save',value)
});
