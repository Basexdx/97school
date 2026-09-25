const {app,BrowserWindow,shell,session}=require('electron')
const http=require('node:http')
const fs=require('node:fs')
const path=require('node:path')

const MIME={
  '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg',
  '.jpeg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2'
}

let server

function staticRoot(){return path.join(__dirname,'..','out')}

function startStaticServer(){
  const root=staticRoot()
  server=http.createServer((req,res)=>{
    try{
      const url=new URL(req.url,'http://127.0.0.1')
      let pathname=decodeURIComponent(url.pathname)
      if(pathname.endsWith('/'))pathname+='index.html'
      const relative=pathname.replace(/^\/+/, '')
      let file=path.resolve(root,relative)
      if(!file.startsWith(path.resolve(root)))throw new Error('unsafe_path')
      if(!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(root,'index.html')
      const ext=path.extname(file).toLowerCase()
      res.writeHead(200,{
        'content-type':MIME[ext]||'application/octet-stream',
        'cache-control':ext==='.html'?'no-cache':'public, max-age=31536000, immutable',
        'x-content-type-options':'nosniff',
      })
      fs.createReadStream(file).pipe(res)
    }catch{
      res.writeHead(404,{'content-type':'text/plain; charset=utf-8'})
      res.end('Not found')
    }
  })
  return new Promise((resolve,reject)=>{
    server.once('error',reject)
    server.listen(0,'127.0.0.1',()=>resolve(server.address().port))
  })
}

async function createWindow(){
  const port=await startStaticServer()
  const localOrigin=`http://127.0.0.1:${port}`
  const win=new BrowserWindow({
    width:1440,height:920,minWidth:980,minHeight:680,
    backgroundColor:'#071525',show:false,autoHideMenuBar:true,
    webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}
  })
  win.removeMenu()
  win.once('ready-to-show',()=>{win.maximize();win.show()})
  win.webContents.setWindowOpenHandler(({url})=>{
    if(!url.startsWith(localOrigin))shell.openExternal(url)
    return {action:'deny'}
  })
  win.webContents.on('will-navigate',(event,url)=>{
    if(!url.startsWith(localOrigin)){event.preventDefault();shell.openExternal(url)}
  })
  await win.loadURL(localOrigin)
}

const gotLock=app.requestSingleInstanceLock()
if(!gotLock)app.quit()
else{
  app.setAppUserModelId('school.genius.physics')
  app.whenReady().then(async()=>{
    session.defaultSession.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false))
    await createWindow()
    app.on('activate',()=>{if(BrowserWindow.getAllWindows().length===0)createWindow()})
  })
  app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()})
  app.on('before-quit',()=>{try{server?.close()}catch{}})
}
