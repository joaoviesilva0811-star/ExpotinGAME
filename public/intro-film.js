import {introFilmShot} from './intro-timing.js';
import {sceneImage} from './scenes.js';
import {drawComicPage} from './comic-page.js';
import {BOSSES} from './shared.js';
const PANEL_ROWS=[[0,345,669,1024],[0,344,669,1024],[0,342,670,1024]];
const CAPTIONS=[
 ['UM REI ESQUECIDO. UM JURAMENTO A CUMPRIR.','ALDRIC ERGUE O ESCUDO. NINGUÉM RECUA.','O FERRO CAI. A COROA EXIGE SEU TRIBUTO.'],
 ['SOB AS RAÍZES, O ANTIGO GUARDIÃO RESPIRA.','LYRA PREPARA A FLECHA. A FLORESTA ESCUTA.','A PASSAGEM SE FECHA. THARAZUL DESPERTA.'],
 ['O ÚLTIMO SELO DORME SOB O ECLIPSE.','NYX SACA AS LÂMINAS. A LUZ SE APAGA.','AS CORRENTES ECOAM. AZRAKIEL OS AGUARDA.']
];
export function drawIntroFilm(c,room,now,time,options={}){
 const shot=introFilmShot(room,now);if(!shot)return false;
 const round=room.round;
 return drawComicPage(c,sceneImage('comic-'+['throne','forest','cathedral'][round]),shot,{...options,title:['I · O REI SEM TRONO','II · O CORAÇÃO SOB AS RAÍZES','III · O ÚLTIMO ECLIPSE'][round],caption:CAPTIONS[round][shot.index],footer:BOSSES[round].arena.toUpperCase()+' · '+(shot.index+1)+'/3',color:['#e9b373','#94ca82','#ba9de0'][round],rows:PANEL_ROWS[round],seed:round,motif:['ember','leaf','void'][round]});
}
