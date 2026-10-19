const atlas=new Image(),pending=new Map();let ready=false;
atlas.onload=()=>{ready=true;for(const [canvas,index]of pending)paint(canvas,index);pending.clear();};atlas.src=new URL('./assets/hud-icons.png',import.meta.url).href;
function paint(canvas,index){const c=canvas.getContext('2d'),scale=atlas.width/1536,size=285*scale;c.clearRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=false;c.drawImage(atlas,(24+(index%5)*303)*scale,(62+Math.floor(index/5)*303)*scale,size,size,0,0,canvas.width,canvas.height);}
export function hudIcon(canvas,index){if(!canvas)return;if(canvas.dataset.icon===String(index)&&ready)return;canvas.dataset.icon=index;if(ready)paint(canvas,index);else pending.set(canvas,index);}
