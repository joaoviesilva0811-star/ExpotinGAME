import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { cp, mkdir, readFile, writeFile, rename, rm, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { spawnSync } from 'node:child_process';

const root=fileURLToPath(new URL('../',import.meta.url));
const platform=process.argv.includes('--linux')?'linux':'win32';
const electronVersion='44.9.0',nodeVersion='24.19.0';
const cache=join(tmpdir(),'iron-crown-desktop-cache');
await mkdir(cache,{recursive:true});
async function text(url){const r=await fetch(url,{signal:AbortSignal.timeout(60000)});if(!r.ok)throw new Error(`HTTP ${r.status}: ${url}`);return r.text();}
async function download(base,name,checksums){
  const line=checksums.split('\n').find(l=>l.trim().split(/\s+/).at(-1)?.replace(/^\*/,'')===name);
  if(!line)throw new Error('Official checksum not found: '+name);
  const expected=line.trim().split(/\s+/)[0],target=join(cache,name);
  async function valid(){try{return createHash('sha256').update(await readFile(target)).digest('hex')===expected;}catch{return false;}}
  if(!await valid()){
    console.log('Downloading official runtime:',name);
    const response=await fetch(base+'/'+name,{signal:AbortSignal.timeout(300000)});if(!response.ok)throw new Error('Download failed: HTTP '+response.status);
    const part=target+'.part';await pipeline(Readable.fromWeb(response.body),createWriteStream(part));await rename(part,target);
    if(!await valid()){await rm(target,{force:true});throw new Error('SHA-256 verification failed: '+name);}
  }
  console.log('SHA-256 verified:',name);return{path:target,sha256:expected};
}
const electronBase=`https://github.com/electron/electron/releases/download/v${electronVersion}`;
const nodeBase=`https://nodejs.org/dist/v${nodeVersion}`;
const [electronSums,nodeSums]=await Promise.all([text(electronBase+'/SHASUMS256.txt'),text(nodeBase+'/SHASUMS256.txt')]);
const [electron,node]=await Promise.all([
  download(electronBase,`electron-v${electronVersion}-${platform}-x64.zip`,electronSums),
  download(nodeBase,`node-v${nodeVersion}-${platform==='win32'?'win-x64.zip':'linux-x64.tar.xz'}`,nodeSums)
]);
const output=join(root,'dist',platform==='win32'?'IronCrown-Windows-x64':'IronCrown-Linux-x64');
await rm(output,{recursive:true,force:true});await mkdir(output,{recursive:true});
function python(script,args){const p=spawnSync(process.platform==='win32'?'python':'python3',['-c',script,...args],{encoding:'utf8',maxBuffer:1024*1024});if(p.status!==0)throw new Error(p.stderr||'Packaging failed');}
python(`import zipfile,pathlib,os,sys
dest=pathlib.Path(sys.argv[2]).resolve()
with zipfile.ZipFile(sys.argv[1]) as z:
 for info in z.infolist():
  target=(dest/info.filename).resolve()
  if dest not in target.parents and target!=dest: raise RuntimeError('Unsafe archive path')
 z.extractall(dest)
 for info in z.infolist():
  path=dest/info.filename
  mode=(info.external_attr>>16)&0o777
  if mode and path.exists(): os.chmod(path,mode)
`,[electron.path,output]);
const game=join(output,'resources','app'),runtime=join(output,'resources','runtime');
await mkdir(game,{recursive:true});await mkdir(runtime,{recursive:true});
for(const name of ['desktop','server','public'])await cp(join(root,name),join(game,name),{recursive:true});
await mkdir(join(game,'node_modules'),{recursive:true});await cp(join(root,'node_modules','ws'),join(game,'node_modules','ws'),{recursive:true});
await writeFile(join(game,'package.json'),JSON.stringify({name:'iron-crown-desktop',version:'1.1.0',type:'module',main:'desktop/main.cjs',private:true},null,2));
await rm(join(output,'resources','default_app.asar'),{force:true});
if(platform==='win32'){
  python(`import zipfile,sys,pathlib
with zipfile.ZipFile(sys.argv[1]) as z:
 for name in ('node.exe','LICENSE'):
  data=z.read('node-v${nodeVersion}-win-x64/'+name)
  pathlib.Path(sys.argv[2],name).write_bytes(data)
`,[node.path,runtime]);
  await rename(join(output,'electron.exe'),join(output,'Shadows of the Iron Crown.exe'));
}else{
  python(`import tarfile,sys,pathlib
with tarfile.open(sys.argv[1]) as t:
 for source,target in [('bin/node','node'),('LICENSE','LICENSE')]:
  data=t.extractfile('node-v${nodeVersion}-linux-x64/'+source).read()
  pathlib.Path(sys.argv[2],target).write_bytes(data)
`,[node.path,runtime]);
  await chmod(join(runtime,'node'),0o755);
  await rename(join(output,'electron'),join(output,'iron-crown'));
}
await cp(join(root,'docs','PC-LEIA-ME.txt'),join(output,'LEIA-ME.txt'));
await cp(join(root,'LICENSE'),join(output,'LICENSE-IRON-CROWN.txt'));
await writeFile(join(output,'RUNTIMES-SHA256.txt'),`${electron.sha256}  electron-v${electronVersion}-${platform}-x64.zip\n${node.sha256}  node-v${nodeVersion}-${platform==='win32'?'win-x64.zip':'linux-x64.tar.xz'}\n`);
if(platform==='win32'){
  const target=output+'.zip';
  python(`import pathlib,zipfile,sys
root=pathlib.Path(sys.argv[1])
with zipfile.ZipFile(sys.argv[2],'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for f in sorted(root.rglob('*')):
  if f.is_file():z.write(f,f.relative_to(root.parent))
`,[output,target]);
  const digest=createHash('sha256').update(await readFile(target)).digest('hex');await writeFile(target+'.sha256',digest+'  '+target.split(/[\\/]/).at(-1)+'\n');
  console.log('Windows portable ZIP ready:',target);
}else console.log('Linux native QA build ready:',output);
