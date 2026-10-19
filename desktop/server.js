import { networkInterfaces } from 'node:os';
import { createGameServer } from '../server/index.js';

const solo=process.env.IRON_DESKTOP_MODE==='solo';
const application=createGameServer({localDesktop:true,dataDir:process.env.IRON_DATA_DIR});
const lan=Object.values(networkInterfaces()).flat().filter(n=>n&&n.family==='IPv4'&&!n.internal).map(n=>n.address);
let stopping=false;
async function stop(){if(stopping)return;stopping=true;await application.close();process.exit(0);}
application.server.once('error',error=>{process.send?.({type:'error',message:error.code==='EADDRINUSE'?'A porta 48230 já está em uso. Feche outra cópia que esteja hospedando ou entre no anfitrião existente.':error.message});process.exit(1);});
application.server.listen(solo?0:48230,solo?'127.0.0.1':'0.0.0.0',()=>{
  process.send?.({type:'ready',port:application.server.address().port,lan:solo?[]:lan});
});
process.on('message',m=>{if(m?.type==='shutdown')stop();});
process.on('disconnect',stop);
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,stop);
