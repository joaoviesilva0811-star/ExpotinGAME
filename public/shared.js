export const WORLD = { w: 1200, h: 760, margin: 55 };
export const CLASSES = {
  knight: { name: 'Cavaleiro', role: 'Tanque • proteção', hp: 160, speed: 116, damage: 25, range: 96, interval: .82, color: '#e6b76c',
    skills: ['Golpe de Espada', 'Investida de Ferro', 'Muralha Real'], descriptions: ['25 de dano próximo', 'Avança e causa 35 de dano', '4s: protege você e aliados próximos'] },
  archer: { name: 'Arqueiro', role: 'Distância • controle', hp: 100, speed: 140, damage: 32, range: 540, interval: .98, color: '#8cd9ae',
    skills: ['Flecha Perfurante', 'Chuva de Flechas', 'Flecha Congelante'], descriptions: ['30 de dano à distância', '5 flechas: até 40 de dano', '20 de dano e lentidão por 2s'] },
  rogue: { name: 'Ladino', role: 'Mobilidade • explosão', hp: 115, speed: 158, damage: 18, range: 84, interval: .54, color: '#c4a2f2',
    skills: ['Corte Duplo', 'Passo Sombrio', 'Lâminas Venenosas'], descriptions: ['Dois golpes de 18 de dano', 'Teleporte e +25 no próximo golpe', '24 de dano de veneno em 3s'] }
};
export const COSTS = [20, 30, 40];
export const COOLDOWNS = [2, 6, 12];
export const REVIVE = { duration: 4, range: 86, health: .4, recovery: .85, grace: .65 };
export const BOSSES = [
  { name: 'VARKHUL', title: 'O Rei Sem Trono', arena: 'Ruínas do Trono', hp: 6440, color: '#ed5c67', threshold: .7, finalThreshold: .3, phase: 'Coroa Sangrenta', finalPhase:'Tirano de Ferro', reward: 100, speed: 62, radius: 48 },
  { name: 'THARAZUL', title: 'O Devorador de Raízes', arena: 'Floresta Amaldiçoada', hp: 8280, color: '#89d789', threshold: .65, finalThreshold: .3, phase: 'Fúria da Floresta', finalPhase:'Colheita Maldita', reward: 150, speed: 50, radius: 62 },
  { name: 'AZRAKIEL', title: 'O Carrasco do Vazio', arena: 'Catedral do Fim', hp: 10580, color: '#bf8df5', threshold: .7, finalThreshold: .35, phase: 'Eclipse', finalPhase:'Apocalipse', reward: 250, speed: 70, radius: 53 }
];
export const DODGE={cost:20,cooldown:2.4,duration:.24,distance:86};
export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function hazardContains(pos,h,padding=17){
  const dx=pos.x-h.x,dy=pos.y-h.y,d=Math.hypot(dx,dy);
  if(h.shape==='line'){
    const along=dx*Math.cos(h.angle)+dy*Math.sin(h.angle),across=-dx*Math.sin(h.angle)+dy*Math.cos(h.angle);
    return Math.abs(along)<=h.length/2+padding&&Math.abs(across)<=h.width/2+padding;
  }
  if(d>h.r+padding||h.inner&&d<h.inner-padding)return false;
  if(h.shape==='cone')return Math.abs(Math.atan2(Math.sin(Math.atan2(dy,dx)-h.angle),Math.cos(Math.atan2(dy,dx)-h.angle)))<=h.spread;
  return true;
}
export const EMOTES={step:'Passinho',cross:'Braços cruzados',spin:'Giro',victory:'Celebração'};
// Collider centers and occlusion crops follow the painted source art (1536×1024).
export const ARENA_OBSTACLES=[
 [{x:229,y:229,r:31,crop:[236,168,116,155]},{x:914,y:229,r:31,crop:[1112,168,116,155]},{x:229,y:563,r:31,crop:[236,608,116,161]},{x:914,y:563,r:31,crop:[1112,608,116,161]},
  {x:463,y:220,r:32,kind:'barricade',crop:[477,190,232,130]},{x:421,y:220,r:29,renderSkip:true},{x:505,y:220,r:29,renderSkip:true},
  {x:727,y:551,r:33,kind:'barricade',crop:[804,629,269,144]},{x:680,y:551,r:29,renderSkip:true},{x:773,y:551,r:29,renderSkip:true}],
 [{x:202,y:237,r:43,crop:[140,135,242,198]},{x:965,y:237,r:43,crop:[1125,125,248,213]},{x:211,y:591,r:45,crop:[150,569,245,244]},{x:982,y:604,r:45,crop:[1140,566,251,265]},
  {x:464,y:495,r:29,kind:'stump',crop:[550,549,108,137]},{x:677,y:584,r:28,kind:'stump',crop:[813,657,121,140]},{x:786,y:230,r:35,kind:'stone',crop:[941,204,142,111]}],
 [{x:276,y:244,r:34,crop:[298,130,120,207]},{x:944,y:249,r:34,crop:[1144,131,130,212]},{x:275,y:598,r:34,crop:[298,625,123,192]},{x:948,y:604,r:34,crop:[1149,625,128,199]},
  {x:429,y:218,r:31,kind:'pew',crop:[432,187,221,130]},{x:388,y:218,r:27,renderSkip:true},{x:466,y:218,r:27,renderSkip:true},
  {x:769,y:566,r:33,kind:'pew',crop:[864,673,242,137]},{x:727,y:566,r:29,renderSkip:true},{x:813,y:566,r:29,renderSkip:true},
  {x:574,y:161,r:38,kind:'altar',crop:[674,132,175,99]}]
];
