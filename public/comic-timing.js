const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
export const comicEase=t=>{const p=clamp(t);return p*p*(3-2*p);};
// Shared presentation clock for openings, short interludes and the final page.
// No local counters: reconnects and different render rates select the same panel.
export function comicSequenceShot(age,duration=9.6,stops=null){
 if(!Number.isFinite(age)||!Number.isFinite(duration)||duration<=0||age<0||age>=duration)return null;
 const cuts=stops||[0,duration/3,duration*2/3,duration];
 if(cuts.length!==4||cuts[0]!==0||cuts[3]!==duration||!(cuts[0]<cuts[1]&&cuts[1]<cuts[2]&&cuts[2]<cuts[3]))return null;
 const index=age<cuts[1]?0:age<cuts[2]?1:2,start=cuts[index],end=cuts[index+1];
 return{age,index,shot:['arena','party','gate'][index],progress:clamp((age-start)/(end-start)),localAge:age-start,panelDuration:end-start,opacity:clamp((duration-age)/Math.min(.6,duration*.18))};
}
export function comicPanelMotion(shot,index,reduced=false){
 const active=index===shot.index,past=index<shot.index,progress=clamp(shot.progress),reveal=active?(reduced?1:comicEase(progress/.22)):past?1:0;
 // Previous panels settle gently rather than snapping out of their close-up.
 const settle=index===shot.index-1?1-comicEase(progress/.16):0;
 const focus=active?comicEase(progress/.7):settle;
 return{active,past,reveal,opacity:active?1:past?.64+settle*.36:0,zoom:reduced?1:1+focus*.028,pan:reduced?0:active?(comicEase(progress)-.5)*3:settle*1.5,particles:active&&!reduced?16:0};
}
export function comicCaption(text,shot,reduced=false){
 if(reduced)return text;
 const glyphs=Array.from(text),shown=clamp((shot.progress-.04)/.34);
 return glyphs.slice(0,Math.ceil(glyphs.length*shown)).join('');
}
// Rows may be source pixels or normalized fractions. Every crop is confined to
// its own original illustrated panel; camera motion is applied after cropping.
export function comicPanelRects(width,height,rows=[0,1/3,2/3,1]){
 if(!(width>0&&height>0)||rows.length!==4)return[];
 const normalized=rows.at(-1)<=1,ys=rows.map(y=>normalized?y*height:y);
 if(ys[0]<0||ys.at(-1)>height||ys.some((v,i)=>!Number.isFinite(v)||i&&v<=ys[i-1]))return[];
 const scale=622/(ys[3]-ys[0]),w=width*scale,left=(1200-w)/2;
 return[0,1,2].map(index=>({index,sx:0,sy:ys[index],sw:width,sh:ys[index+1]-ys[index],x:left,y:48+(ys[index]-ys[0])*scale+index*7,w,h:(ys[index+1]-ys[index])*scale}));
}
