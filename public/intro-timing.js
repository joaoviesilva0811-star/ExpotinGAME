import {comicSequenceShot} from './comic-timing.js';
export const INTRO_FILM=9.6,INTRO_GATE_AT=7.25,INTRO_DIALOGUE_AT=9.8;
export function introFilmShot(room,now){
 if(room?.state!=='countdown'||!room.intro)return null;
 return comicSequenceShot(now-room.intro.started,INTRO_FILM,[0,3.1,6.3,INTRO_FILM]);
}
