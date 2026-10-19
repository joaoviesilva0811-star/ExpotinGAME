// Shared pose decisions keep the bow oriented while aiming, firing and recoiling.
export const facingRow=angle=>((Math.round((Math.PI/2-angle)/(Math.PI/4))%8)+8)%8;
export function archerPose(p,now){
 const elapsed=now-(p.attackAt??-10),duration=p.attackFor||.52;
 if(elapsed>=0&&elapsed<duration){
  // The release pose coincides with the authoritative basic arrow at 170 ms.
  const release=p.attackSlot>=0?0:.17;
  const col=elapsed<release?Math.min(2,Math.floor(elapsed/release*3)):3+Math.min(2,Math.floor((elapsed-release)/Math.max(.01,duration-release)*3));
  return{row:facingRow(p.facing??0),col,phase:'fire'};
 }
 if(p.aiming||Math.hypot(p.vx||0,p.vy||0)<12)return{row:facingRow(p.facing??0),col:p.aiming?1:0,phase:'aim'};
 return null;
}
