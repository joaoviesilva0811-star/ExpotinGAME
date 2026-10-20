// Geometry is compiled once per impact/preset, rather than rebuilding hundreds
// of rotated crack/vine paths every rendered frame. Footprint clipping remains.
export function groundMesh(field,stride){
 field.meshes??=new Map();let mesh=field.meshes.get(stride);if(mesh)return mesh;
 const cracks=new Path2D(),detail=new Path2D(),chips=new Path2D(),glints=new Path2D();
 for(let i=0;i<field.points.length;i+=stride){const p=field.points[i],cs=Math.cos(p.angle),sn=Math.sin(p.angle),r=p.reach,x=p.x,y=p.y;
  const at=(a,b)=>[x+a*cs-b*sn,y+a*sn+b*cs];cracks.moveTo(...at(-r,0));for(const v of [[-3,-3],[2,2],[r,-2]])cracks.lineTo(...at(...v));cracks.moveTo(...at(2,2));cracks.lineTo(...at(5,9));
  if(field.kind==='green'&&field.model!=='poisonCloud'){detail.moveTo(x-6,y+4);detail.quadraticCurveTo(x-8,y-12,x+2,y-18);detail.moveTo(x+2,y-18);detail.lineTo(x-2,y-24);detail.moveTo(x+2,y-18);detail.lineTo(x+8,y-23);}
  else if(field.kind==='violet'){detail.moveTo(x,y-14);detail.lineTo(x+4,y-6);detail.lineTo(x,y+2);detail.lineTo(x-4,y-6);detail.closePath();}
  else{const q=at(-4,-4),g=at(5,-6);chips.rect(q[0],q[1],5,3);glints.rect(g[0],g[1],2,2);}
 }
 mesh={cracks,detail,chips,glints};field.meshes.set(stride,mesh);return mesh;
}
