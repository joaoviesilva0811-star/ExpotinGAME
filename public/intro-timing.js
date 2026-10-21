export const INTRO_FILM=9.6,INTRO_GATE_AT=7.25,INTRO_DIALOGUE_AT=9.8;
export function introFilmShot(room,now){
 if(room?.state!=='countdown'||!room.intro)return null;
 const age=now-room.intro.started;if(age<0||age>=INTRO_FILM)return null;
 const index=age<3.1?0:age<6.3?1:2,start=[0,3.1,6.3][index],end=[3.1,6.3,INTRO_FILM][index];
 return{age,index,shot:['arena','party','gate'][index],progress:(age-start)/(end-start),opacity:Math.min(1,(INTRO_FILM-age)/.6)};
}
