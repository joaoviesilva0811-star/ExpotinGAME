import {narrativeFilmShot} from './narrative-timing.js';
import {drawComicPage} from './comic-page.js';
import {sceneImage} from './scenes.js';
const PAGES={
 'comic-bridge-forest':{rows:[0,346,666,1024],title:'ENTRE AS SOMBRAS · A CHAVE SANGRENTA',color:'#a8c98a',motif:'leaf',captions:['O REI CAIU. A PRIMEIRA CHAVE RESPONDE.','SOB O FERRO, RAÍZES APONTAM O CAMINHO.','A FLORESTA NÃO OS RECEBE EM SILÊNCIO.']},
 'comic-bridge-cathedral':{rows:[0,350,672,1024],title:'ENTRE AS SOMBRAS · O ÚLTIMO GUARDIÃO',color:'#bda2ed',motif:'void',captions:['O CORAÇÃO VERDE REVELA SEU SEGREDO.','DUAS CHAVES. UM ÚLTIMO JURAMENTO.','NA CATEDRAL, SEIS ASAS APAGAM A LUZ.']},
 'comic-ending-crown':{rows:[0,347,674,1024],title:'EPÍLOGO · A PRIMEIRA AURORA',color:'#edc984',motif:'ember',captions:['TRÊS CHAVES. TRÊS DESTINOS. UM REINO.','A COROA REENCONTRA SEUS GUARDIÕES.','PELA PRIMEIRA VEZ, A NOITE TERMINA.']}
};
export function drawNarrativeFilm(c,room,now,time,options={}){
 const shot=narrativeFilmShot(room,now);if(!shot)return false;const page=PAGES[shot.asset];
 return drawComicPage(c,sceneImage(shot.asset),shot,{...options,...page,caption:page.captions[shot.index],footer:(shot.kind==='victory'?'A CÂMARA DA COROA':'PELAS PROFUNDEZAS')+' · '+(shot.index+1)+'/3',seed:17+shot.round});
}
