import { cp, mkdir, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateRawSync } from 'node:zlib';
import { createHash } from 'node:crypto';

const root=fileURLToPath(new URL('../',import.meta.url)),dist=resolve(root,'dist');
await mkdir(dist,{recursive:true});
// Only generated subdirectories owned by this script are refreshed.
for(const name of ['infinityfree','source'])await rm(join(dist,name),{recursive:true,force:true});
await cp(join(root,'public'),join(dist,'infinityfree'),{recursive:true});
await mkdir(join(dist,'source'),{recursive:true});
const sourceFiles=['public','server','desktop','scripts','test','docs','README.md','LICENSE','package.json','package-lock.json','.env.example','.gitignore','Dockerfile','.dockerignore'];
for(const name of sourceFiles)await cp(join(root,name),join(dist,'source',name),{recursive:true});
const crcTable=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(buf){let crc=0xffffffff;for(const byte of buf)crc=crcTable[(crc^byte)&255]^(crc>>>8);return(crc^0xffffffff)>>>0;}
async function files(dir){let result=[];for(const e of await readdir(dir,{withFileTypes:true})){const p=join(dir,e.name);if(e.isDirectory())result.push(...await files(p));else if(e.isFile())result.push(p);}return result.sort();}
async function zip(directory,target){
  const locals=[],central=[];let offset=0;
  for(const path of await files(directory)){
    const name=Buffer.from(relative(directory,path).replaceAll('\\','/')),data=await readFile(path),compressed=deflateRawSync(data,{level:9}),crc=crc32(data);
    const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(0x800,6);header.writeUInt16LE(8,8);header.writeUInt16LE(0x21,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(compressed.length,18);header.writeUInt32LE(data.length,22);header.writeUInt16LE(name.length,26);
    locals.push(header,name,compressed);
    const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x800,8);c.writeUInt16LE(8,10);c.writeUInt16LE(0x21,14);c.writeUInt32LE(crc,16);c.writeUInt32LE(compressed.length,20);c.writeUInt32LE(data.length,24);c.writeUInt16LE(name.length,28);c.writeUInt32LE(offset,42);central.push(c,name);offset+=header.length+name.length+compressed.length;
  }
  const index=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(central.length/2,8);end.writeUInt16LE(central.length/2,10);end.writeUInt32LE(index.length,12);end.writeUInt32LE(offset,16);
  const data=Buffer.concat([...locals,index,end]);await writeFile(target,data);
  return createHash('sha256').update(data).digest('hex')+'  '+relative(dist,target);
}
const sums=[];
sums.push(await zip(join(dist,'infinityfree'),join(dist,'infinityfree-cliente.zip')));
sums.push(await zip(join(dist,'source'),join(dist,'shadows-iron-crown-completo.zip')));
await writeFile(join(dist,'SHA256SUMS.txt'),sums.join('\n')+'\n');
console.log('Built dist/infinityfree-cliente.zip and dist/shadows-iron-crown-completo.zip (no secrets, sessions, or node_modules).');
