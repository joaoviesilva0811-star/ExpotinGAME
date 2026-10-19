// The east-facing source drawings turn the hood away from the bow. Use the
// visually verified west poses mirrored for E/NE/SE, not those inconsistent rows.
export const facingRow=angle=>((Math.round((Math.PI/2-angle)/(Math.PI/4))%8)+8)%8;
export function archerDirection(angle){
 const direction=facingRow(angle),flip=direction>=1&&direction<=3;
 return{direction,row:flip?8-direction:direction,flip};
}
export function archerPose(p,now){
 const pose=archerDirection(p.facing??0),elapsed=now-(p.attackAt??-10),duration=p.attackFor||.52;
 if(elapsed>=0&&elapsed<duration){
  const release=p.attackSlot>=0?0:.17;
  const col=elapsed<release?Math.min(2,Math.floor(elapsed/release*3)):3+Math.min(2,Math.floor((elapsed-release)/Math.max(.01,duration-release)*3));
  return{...pose,col,phase:'fire'};
 }
 if(p.aiming||Math.hypot(p.vx||0,p.vy||0)<12)return{...pose,col:p.aiming?1:0,phase:'aim'};
 return null;
}
