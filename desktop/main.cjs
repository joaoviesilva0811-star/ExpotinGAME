const {app,BrowserWindow,ipcMain,dialog}=require('electron');
const {fork}=require('node:child_process');
const {join,resolve}=require('node:path');
const {pathToFileURL}=require('node:url');
const {existsSync}=require('node:fs');
const {readFile,writeFile}=require('node:fs/promises');

const applicationRoot=existsSync(join(__dirname,'server','index.js'))?__dirname:resolve(__dirname,'..');
let launcher,game,serverProcess,launching=false,quitting=false,serverStopping=Promise.resolve();
let gameOrigin=null,preferencesWrite=Promise.resolve();
const launcherUrl=pathToFileURL(join(__dirname,'launcher.html')).href;
function privateAddress(text){
  if(text==='localhost')return'127.0.0.1';
  if(typeof text!=='string'||!/^\d{1,3}(\.\d{1,3}){3}$/.test(text))throw new Error('Digite o IPv4 do anfitrião, por exemplo 192.168.1.10.');
  const parts=text.split('.').map(Number);if(parts.some(n=>n>255))throw new Error('Endereço IPv4 inválido.');
  const [a,b]=parts;
  if(!(a===10||a===127||(a===192&&b===168)||(a===172&&b>=16&&b<=31)||(a===169&&b===254)))throw new Error('Use o endereço local do anfitrião na mesma rede.');
  return parts.join('.');
}
function trusted(event){return launcher&&!launcher.isDestroyed()&&event.sender===launcher.webContents&&event.senderFrame?.url===launcherUrl;}
function stopServer(){
  const child=serverProcess;serverProcess=null;if(!child)return serverStopping;
  serverStopping=new Promise(done=>{if(child.exitCode!==null)return done();child.once('exit',done);try{if(child.connected)child.send({type:'shutdown'});else child.kill();}catch{child.kill();}setTimeout(()=>{if(child.exitCode===null)child.kill();done();},2500).unref();});
  return serverStopping;
}
function startServer(mode){
  return new Promise((resolve,reject)=>{
    const executable=app.isPackaged?join(process.resourcesPath,'runtime',process.platform==='win32'?'node.exe':'node'):process.env.IRON_NODE_BINARY;
    if(!executable||!existsSync(executable))return reject(new Error('Runtime do jogo ausente. Extraia o ZIP completo, incluindo a pasta resources.'));
    const script=app.isPackaged?join(applicationRoot,'desktop','server.js'):join(__dirname,'server.js');
    const child=fork(script,[],{execPath:executable,execArgv:[],windowsHide:true,silent:true,env:{...process.env,IRON_DESKTOP_MODE:mode,IRON_DATA_DIR:join(app.getPath('userData'),'saves'),ELECTRON_RUN_AS_NODE:undefined}});
    serverProcess=child;
    let settled=false;
    const timeout=setTimeout(()=>{stopServer();reject(new Error('O servidor local demorou para iniciar. Confira as permissões do aplicativo.'));},18000);
    const fail=message=>{if(settled)return;settled=true;clearTimeout(timeout);reject(new Error(message));};
    child.on('error',e=>fail(e.message));child.on('exit',code=>{if(!settled)fail('Não foi possível iniciar o servidor local (código '+code+').');if(serverProcess===child&&game&&!game.isDestroyed())dialog.showErrorBox('Servidor local encerrado','Volte ao menu do PC e abra uma nova expedição.');});
    child.stdout.on('data',()=>{});let errors='';child.stderr.on('data',b=>{errors=(errors+b.toString()).slice(-2000);});
    child.on('message',m=>{if(m.type==='error')fail(m.message);if(m.type==='ready'){if(settled)return;settled=true;clearTimeout(timeout);resolve(m);}});
  });
}
function restrictWindow(win,allowed){
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  win.webContents.on('will-navigate',(event,url)=>{if(!allowed(url))event.preventDefault();});
  win.webContents.session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
}
app.whenReady().then(()=>{
  const preferencesPath=join(app.getPath('userData'),'presentation.json');
  const trustedGame=event=>{try{return game&&!game.isDestroyed()&&event.sender===game.webContents&&event.senderFrame===game.webContents.mainFrame&&new URL(event.senderFrame.url).origin===gameOrigin;}catch{return false;}};
  ipcMain.handle('iron:preferences:get',async event=>{
    if(!trustedGame(event))throw new Error('Origem não autorizada.');
    await preferencesWrite.catch(()=>{});const {cleanSettings}=await import('../public/presentation.js');
    try{return cleanSettings(JSON.parse(await readFile(preferencesPath,'utf8')));}catch{return cleanSettings();}
  });
  ipcMain.handle('iron:preferences:save',async(event,value)=>{
    if(!trustedGame(event))throw new Error('Origem não autorizada.');
    const {cleanSettings}=await import('../public/presentation.js');const settings=cleanSettings(value&&typeof value==='object'?value:{});
    preferencesWrite=preferencesWrite.catch(()=>{}).then(()=>writeFile(preferencesPath,JSON.stringify(settings)));await preferencesWrite;return settings;
  });
  launcher=new BrowserWindow({width:1120,height:820,minWidth:920,minHeight:700,backgroundColor:'#101415',title:'Shadows of the Iron Crown',autoHideMenuBar:true,webPreferences:{preload:join(__dirname,'preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true}});
  restrictWindow(launcher,url=>url===launcherUrl);launcher.loadFile(join(__dirname,'launcher.html'));
  launcher.on('close',()=>{quitting=true;stopServer();if(game&&!game.isDestroyed())game.destroy();});
  ipcMain.handle('iron:launch',async(event,request)=>{
    if(!trusted(event))throw new Error('Origem não autorizada.');
    if(launching||game&&!game.isDestroyed())return{ok:false,error:'Uma expedição já está aberta.'};
    launching=true;
    try{
      const mode=request?.mode;if(!['solo','host','join'].includes(mode))throw new Error('Escolha um modo de jogo.');
      const name=typeof request.name==='string'?request.name.trim().normalize('NFC'):'';
      if(name.length<2||name.length>20||/[\p{C}<>]/u.test(name))throw new Error('Use um nome de 2 a 20 caracteres.');
      const classId=['knight','archer','rogue'].includes(request.classId)?request.classId:'knight';
      let base,info;
      if(mode==='join'){
        base='http://'+privateAddress(request.address?.trim())+':48230';
        const response=await fetch(base+'/api/health',{signal:AbortSignal.timeout(8000)});
        if(!response.ok)throw new Error('O anfitrião não respondeu.');
        const health=await response.json();if(!health.localDesktop)throw new Error('Este endereço não é um anfitrião da versão PC.');
      }else{await stopServer();info=await startServer(mode);base='http://127.0.0.1:'+info.port;}
      const target=new URL(base);target.searchParams.set('desktop','1');target.searchParams.set('mode',mode);target.searchParams.set('name',name);target.searchParams.set('class',classId);
      if(info?.lan?.length)target.searchParams.set('lan',info.lan.join(','));
      if(typeof request.code==='string'&&request.code.trim())target.searchParams.set('code',request.code.trim().toUpperCase());
      gameOrigin=base;
      game=new BrowserWindow({width:1440,height:960,minWidth:960,minHeight:650,backgroundColor:'#101415',title:'Shadows of the Iron Crown — '+(mode==='solo'?'Solo com companheiros':'Rede local'),autoHideMenuBar:true,webPreferences:{preload:join(__dirname,'game-preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true}});
      restrictWindow(game,url=>{try{return new URL(url).origin===base;}catch{return false;}});
      game.on('closed',()=>{game=null;stopServer();if(!quitting&&!launcher.isDestroyed())launcher.show();});
      await game.loadURL(target.href);launcher.hide();return{ok:true};
    }catch(error){if(game&&!game.isDestroyed())game.destroy();stopServer();return{ok:false,error:error.message?.includes('fetch')?'Não foi possível alcançar o anfitrião. Confira o IP, a mesma rede e a liberação do jogo no firewall do anfitrião.':error.message};}
    finally{launching=false;}
  });
});
app.on('window-all-closed',()=>app.quit());
app.on('before-quit',()=>{quitting=true;stopServer();});
