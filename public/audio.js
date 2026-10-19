export class AudioEngine {
  constructor(){this.enabled=false;this.ctx=null;this.volume=.17;this.lastMusic=0;this.beat=0;}
  async toggle(){
    if(!this.ctx){const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)return false;this.ctx=new AudioContext();this.master=this.ctx.createGain();this.master.gain.value=this.volume;this.master.connect(this.ctx.destination);}
    await this.ctx.resume();this.enabled=!this.enabled;this.master.gain.setTargetAtTime(this.enabled?this.volume:0,this.ctx.currentTime,.1);return this.enabled;
  }
  tone(freq,duration=.15,type='sine',gain=.3,slide=0){
    if(!this.enabled||!this.ctx)return;const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,freq+slide),t+duration);
    g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(gain,t+.012);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+duration+.03);
  }
  noise(duration=.12,gain=.35,cutoff=1800){
    if(!this.enabled||!this.ctx)return;const n=Math.floor(this.ctx.sampleRate*duration),b=this.ctx.createBuffer(1,n,this.ctx.sampleRate),data=b.getChannelData(0);
    for(let i=0;i<n;i++)data[i]=(Math.random()*2-1)*(1-i/n);const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),g=this.ctx.createGain();source.buffer=b;filter.type='lowpass';filter.frequency.value=cutoff;g.gain.value=gain;source.connect(filter);filter.connect(g);g.connect(this.master);source.start();
  }
  fx(kind){
    if(kind==='step')this.noise(.045,.055,300);
    if(kind==='attack'){this.noise(.12,.25,3000);this.tone(320,.09,'triangle',.12,-200);}
    if(kind==='arrow'){this.noise(.08,.18,5000);this.tone(700,.08,'sine',.1,-450);}
    if(kind==='hit'){this.noise(.08,.25,1900);this.tone(100,.12,'triangle',.4,-55);}
    if(kind==='block'){this.tone(710,.15,'triangle',.4,-180);this.tone(1100,.1,'sine',.15);}
    if(kind==='boss'){this.noise(.6,.7,350);this.tone(78,.7,'sawtooth',.25,-45);}
    if(kind==='magic'){this.tone(330,.3,'sine',.3,440);this.tone(440,.5,'triangle',.14,440);}
    if(kind==='warning'){this.tone(146,.4,'triangle',.3);this.tone(155,.5,'sine',.2);}
    if(kind==='heal'){[330,440,660].forEach((f,i)=>setTimeout(()=>this.tone(f,.4,'sine',.25),i*100));}
    if(kind==='victory'){[220,277,330,440,554].forEach((f,i)=>setTimeout(()=>this.tone(f,.65,'triangle',.22),i*150));}
    if(kind==='defeat'){[220,196,146,110].forEach((f,i)=>setTimeout(()=>this.tone(f,.7,'sine',.25),i*220));}
    if(kind==='ui')this.tone(550,.06,'sine',.15);
  }
  music(time,round,battle){
    if(!this.enabled||!this.ctx||time-this.lastMusic<(battle?.42:.9))return;
    this.lastMusic=time;const roots=[73.42,65.41,61.74],root=roots[round||0],sequence=[1,1,1.5,1,1.189,1,1.5,1.334];
    const f=root*sequence[this.beat%8];this.tone(f,.75,'sine',.16);if(this.beat%4===0){this.tone(f*2,1.7,'triangle',.065);this.tone(f*2.997,1.5,'sine',.045);}
    if(battle){this.noise(.065,this.beat%2?.035:.09,170);if(this.beat%2===0)this.tone(f*4,.16,'triangle',.06);}
    this.beat++;
  }
}
