const {contextBridge}=require('electron')
contextBridge.exposeInMainWorld('geniusDesktop',{apiProxy:true})
