import {ARENA_OBSTACLES} from './shared.js';
export const COVER_LAYOUTS=[
 [{x:555,y:310},{x:685,y:440},{x:950,y:120}],
 [{x:515,y:325},{x:745,y:490},{x:1030,y:120}],
 [{x:575,y:330},{x:705,y:435},{x:970,y:150}]
];
export const TRAP_NAMES=['Fornalha do Trono','Sementes da Putrefação','Vitral do Eclipse'];
export function arenaObstacles(room){return[...(ARENA_OBSTACLES[room?.round||0]||[]),...(room?.covers||[]).filter(c=>c.hp>0)];}
export function makeCovers(round){return COVER_LAYOUTS[round].map((p,i)=>({...p,id:'cover-'+i,r:24,maxHp:[140,115,150][round],hp:[140,115,150][round],material:['stone','root','crystal'][round],destroyedAt:null,hitAt:-10}));}
