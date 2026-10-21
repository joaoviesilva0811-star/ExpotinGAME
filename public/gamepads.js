export function radialStick(x=0,y=0,dead=.18){const length=Math.hypot(x,y);if(length<=dead)return{x:0,y:0};const scale=Math.min(1,(length-dead)/(1-dead))/length;return{x:x*scale,y:y*scale};}
export const controllerKind=id=>/054c|sony|dualshock|dualsense|playstation|wireless controller/i.test(id)?'ps':'xbox';
export const padLabels=kind=>kind==='ps'?{attack:'□',dash:'×',revive:'○',skill1:'△',skill2:'R1',skill3:'R2',block:'L1',menu:'OPTIONS',confirm:'×'}:{attack:'X',dash:'A',revive:'B',skill1:'Y',skill2:'RB',skill3:'RT',block:'LB',menu:'START',confirm:'A'};
export class GamepadHub{
 constructor(){this.seats=[];this.locked=false;}
 poll(pads=[]){
  const frames=[];for(const s of this.seats)s.connected=false;
  for(const pad of pads){if(!pad?.connected)continue;const down=Array.from({length:17},(_,i)=>(pad.buttons[i]?.value??(pad.buttons[i]?.pressed?1:0))>.55),active=down.some(Boolean)||pad.axes.some(v=>Math.abs(v)>.26);
   let seat=this.seats.find(s=>s.index===pad.index&&s.id===pad.id);
   if(!seat&&active){seat=this.seats.find(s=>s.id===pad.id&&!pads.some(p=>p?.connected&&p.index===s.index));if(seat)seat.index=pad.index;else{seat=this.seats.find(s=>!pads.some(p=>p?.connected&&p.index===s.index&&p.id===s.id));if(seat)Object.assign(seat,{index:pad.index,id:pad.id,kind:controllerKind(pad.id),buttons:down,aimed:false});else if(this.seats.length<3){seat={slot:this.seats.length,index:pad.index,id:pad.id,kind:controllerKind(pad.id),buttons:down,aim:{x:1,y:0}};this.seats.push(seat);}}}
   if(!seat)continue;seat.connected=true;seat.pad=pad;
   const pressed=new Set(down.map((d,i)=>d&&!seat.buttons[i]?i:-1).filter(i=>i>=0)),move=radialStick(pad.axes[0],pad.axes[1]),aim=radialStick(pad.axes[2],pad.axes[3],.2);
   if(Math.hypot(aim.x,aim.y)>.01){const n=Math.hypot(aim.x,aim.y);seat.aim={x:aim.x/n,y:aim.y/n};}else if(!seat.aimed&&Math.hypot(move.x,move.y)>.01){const n=Math.hypot(move.x,move.y);seat.aim={x:move.x/n,y:move.y/n};}if(Math.hypot(aim.x,aim.y)>.01)seat.aimed=true;
   seat.buttons=down;seat.intent={x:move.x,y:move.y,ax:seat.aim.x,ay:seat.aim.y,attack:down[2],block:down[4]||down[6],revive:down[1]};frames.push({...seat,pressed});
  }
  this.locked=this.seats.some(s=>s.connected);return frames;
 }
 intent(slot,blocked=false){const s=this.seats[slot],a=s?.aim||{x:1,y:0};return !s?.connected||blocked?{x:0,y:0,ax:a.x,ay:a.y,attack:false,block:false,revive:false}:s.intent;}
 rumble(slot,amount=20,blocked=false,heavy=false){const actuator=this.seats[slot]?.pad?.vibrationActuator;try{actuator?.playEffect('dual-rumble',{duration:blocked?65:heavy?190:110,weakMagnitude:blocked?.22:heavy?.65:.35,strongMagnitude:blocked?.12:Math.min(.9,.2+amount/70)})?.catch(()=>{});}catch{}}
}
// Menus work with either family; the mouse remains available while open.
export function padMenu(frame,root){
 const buttons=[...root.querySelectorAll('button,input,select')].filter(e=>!e.disabled&&e.getClientRects().length),current=buttons.indexOf(document.activeElement);if(!buttons.length)return;
 if(frame.pressed.has(12)||frame.pressed.has(13)){const d=frame.pressed.has(12)?-1:1;buttons[(current+d+buttons.length)%buttons.length].focus();}
 const e=document.activeElement;if(frame.pressed.has(14)||frame.pressed.has(15)){const d=frame.pressed.has(14)?-1:1;if(e?.tagName==='SELECT'){e.selectedIndex=(e.selectedIndex+d+e.options.length)%e.options.length;e.dispatchEvent(new Event('input',{bubbles:true}));}else if(e?.type==='range'){e.value=Number(e.value)+d*Number(e.step||5);e.dispatchEvent(new Event('input',{bubbles:true}));}}
 if(frame.pressed.has(0)){const target=buttons.includes(document.activeElement)?document.activeElement:buttons.find(e=>e.tagName==='BUTTON');if(target?.type==='checkbox'){target.checked=!target.checked;target.dispatchEvent(new Event('input',{bubbles:true}));}else target?.click();}
}
