import {comicSequenceShot} from './comic-timing.js';
export const INTERLUDE_FILM=9.6,ROUND_OUTRO_TIME=6+INTERLUDE_FILM,ENDING_FILM_DELAY=8.2;
// All pages follow the authoritative room clock. Losses never show earned keys
// or the victory page; joining late selects the correct panel without replay.
export function narrativeFilmShot(room,now){
 if(!room||!Number.isFinite(now))return null;
 if(room.state==='round_end'&&room.round<2&&room.results?.at(-1)?.won&&room.gateUnlocked&&room.keyDrop?.collectedAt!=null){
  const start=room.outroStarted+6,duration=Math.min(INTERLUDE_FILM,room.transitionAt-start),shot=comicSequenceShot(now-start,duration);
  return shot?{...shot,kind:'interlude',round:room.round,asset:['comic-bridge-forest','comic-bridge-cathedral'][room.round]}:null;
 }
 if(room.state==='ending'&&room.wins===3&&room.secretUnlocked&&room.vaultOpenedAt!=null&&[0,1,2].every(round=>room.keys?.some(k=>k.round===round))){
  const start=Math.max(room.endingAt+ENDING_FILM_DELAY,room.transitionAt-INTERLUDE_FILM,room.vaultOpenedAt+3.2),duration=room.transitionAt-start,shot=comicSequenceShot(now-start,duration);
  return shot?{...shot,kind:'victory',round:2,asset:'comic-ending-crown'}:null;
 }
 return null;
}
