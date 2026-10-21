export class AudioEngine {
  constructor(){this.enabled=false;this.ctx=null;this.volume=.184;this.lastMusic=0;this.beat=0;this.track=null;this.trackName=null;this.samples=new Map();this.noiseBuffers=new Map();this.lastSample=new Map();this.musicVolume=.68;this.disposed=false;this.starting=null;this.userMuted=false;
    document.addEventListener('visibilitychange',()=>this.syncVisibility());
    addEventListener('pagehide',()=>this.dispose(),{once:true});
  }
  syncVisibility(){if(this.track){this.track.volume=this.enabled&&!document.hidden?this.musicVolume:0;if(document.hidden||!this.enabled)this.track.pause();}if(this.master)this.master.gain.setTargetAtTime(this.enabled&&!document.hidden?this.volume:0,this.ctx.currentTime,.05);}
  configure(settings){this.musicVolume=Math.max(0,Math.min(1,settings.musicVolume??.68));this.volume=.23*Math.max(0,Math.min(1,settings.effectsVolume??.8));this.syncVisibility();}
  dispose(){this.disposed=true;this.enabled=false;if(this.track){this.track.pause();this.track.src='';}this.ctx?.close().catch(()=>{});}
  async context(){
    if(this.disposed)return false;
    if(!this.ctx){const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext)return false;this.ctx=new AudioContext();this.master=this.ctx.createGain();this.master.gain.value=0;this.master.connect(this.ctx.destination);}
    if(!this.starting)this.starting=this.ctx.resume().finally(()=>{this.starting=null;});await this.starting;this.syncVisibility();return true;
  }
  async toggle(){
    this.enabled=!this.enabled;this.userMuted=!this.enabled;await this.context();this.syncVisibility();return this.enabled;
  }
  async enable(){if(this.disposed||this.userMuted)return false;this.enabled=true;if(!await this.context())return false;for(const name of ['slash','arrow','hit','block','dash','roar-0','roar-1','roar-2'])if(!this.samples.has(name)){this.samples.set(name,'loading');fetch(new URL(`./assets/audio/${name}.ogg`,import.meta.url)).then(r=>r.arrayBuffer()).then(b=>this.ctx.decodeAudioData(b)).then(b=>this.samples.set(name,b)).catch(()=>this.samples.delete(name));}return this.enabled;}
  sample(name,gain=.55){
    if(!this.enabled||!this.ctx)return;const time=this.ctx.currentTime;if(time-(this.lastSample.get(name)||-10)<(name.startsWith('roar')?1.4:.07))return;this.lastSample.set(name,time);
    let buffer=this.samples.get(name);if(!buffer){this.samples.set(name,'loading');fetch(new URL(`./assets/audio/${name}.ogg`,import.meta.url)).then(r=>r.arrayBuffer()).then(b=>this.ctx.decodeAudioData(b)).then(b=>this.samples.set(name,b)).catch(()=>this.samples.delete(name));return;}
    if(buffer==='loading')return;const source=this.ctx.createBufferSource(),g=this.ctx.createGain();source.buffer=buffer;g.gain.value=gain;source.connect(g);g.connect(this.master);source.start();
  }
  tone(freq,duration=.15,type='sine',gain=.3,slide=0){
    if(!this.enabled||!this.ctx)return;const t=this.ctx.currentTime,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(20,freq+slide),t+duration);
    g.gain.setValueAtTime(.001,t);g.gain.exponentialRampToValueAtTime(gain,t+.012);g.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+duration+.03);
  }
  noise(duration=.12,gain=.35,cutoff=1800){
    if(!this.enabled||!this.ctx)return;const key=duration.toFixed(3);let b=this.noiseBuffers.get(key);if(!b){const n=Math.floor(this.ctx.sampleRate*duration);b=this.ctx.createBuffer(1,n,this.ctx.sampleRate);const data=b.getChannelData(0);for(let i=0;i<n;i++)data[i]=(Math.random()*2-1)*(1-i/n);this.noiseBuffers.set(key,b);}
    const source=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),g=this.ctx.createGain();source.buffer=b;filter.type='lowpass';filter.frequency.value=cutoff;g.gain.value=gain;source.connect(filter);filter.connect(g);g.connect(this.master);source.start();
  }
  fx(kind,round=0){
    if(kind==='sword'){this.sample('slash',.8);this.tone(125,.17,'triangle',.13,-65);return;}
    if(kind==='dagger'){this.sample('slash',.4);this.tone(520,.065,'triangle',.1,-270);return;}
    if(kind==='arrowImpact'){this.sample('hit',.28);this.tone(980,.055,'triangle',.08,-630);this.noise(.045,.08,2800);return;}
    if(kind==='daggerImpact'){this.sample('slash',.24);this.tone(460,.07,'triangle',.09,-190);return;}
    if(kind==='heavyHit'){this.sample('hit',.85);this.tone(72,.19,'sine',.24,-35);return;}
    const samples={attack:'slash',arrow:'arrow',hit:'hit',block:'block',dash:'dash',roar:'roar-'+round};if(samples[kind]){this.sample(samples[kind],kind==='roar'?.8:.7);return;}
    if(kind==='gate'){this.noise(.55,.5,550);this.tone(54,.6,'triangle',.45,-27);this.tone(171,.4,'triangle',.12,-60);}
    if(kind==='pickup'){this.tone(660,.22,'sine',.24);this.tone(990,.35,'sine',.13);}
    if(kind==='frost'){this.noise(.4,.2,4400);[523,784,1047].forEach(f=>this.tone(f,.65,'sine',.1,160));}
    if(kind==='summon'){this.noise(.45,.22,520);this.tone(90,.6,'sawtooth',.08,80);}
    if(kind==='minion'){this.noise(.25,.2,1200);this.tone(110,.2,'triangle',.2,-65);}
    if(kind==='step')this.noise(.045,.055,300);
    if(kind==='attack'){this.noise(.12,.25,3000);this.tone(320,.09,'triangle',.12,-200);}
    if(kind==='arrow'){this.noise(.08,.18,5000);this.tone(700,.08,'sine',.1,-450);}
    if(kind==='hit'){this.noise(.08,.25,1900);this.tone(100,.12,'triangle',.4,-55);}
    if(kind==='block'){this.tone(710,.15,'triangle',.4,-180);this.tone(1100,.1,'sine',.15);}
    if(kind==='boss'){const now=this.ctx?.currentTime||0;if(now-(this.lastBossImpact??-10)<.25)return;this.lastBossImpact=now;this.noise(.65,.55,620);this.tone(52,.65,'sine',.5,-29);this.tone(98,.35,'triangle',.22,-55);if(round===1)this.noise(.5,.2,1400);if(round===2)this.tone(190,.5,'sawtooth',.09,-110);}
    if(kind==='magic'){this.tone(330,.3,'sine',.3,440);this.tone(440,.5,'triangle',.14,440);}
    if(kind==='warning'){this.tone(146,.4,'triangle',.3);this.tone(155,.5,'sine',.2);}
    if(kind==='heal'){[330,440,660].forEach((f,i)=>setTimeout(()=>this.tone(f,.4,'sine',.25),i*100));}
    if(kind==='victory'){[220,277,330,440,554].forEach((f,i)=>setTimeout(()=>this.tone(f,.65,'triangle',.22),i*150));}
    if(kind==='defeat'){[220,196,146,110].forEach((f,i)=>setTimeout(()=>this.tone(f,.7,'sine',.25),i*220));}
    if(kind==='ui')this.tone(550,.06,'sine',.15);
  }
  music(time,round,battle){
    if(this.disposed)return;
    const name=battle?['battle-throne','battle-forest','battle-void'][round||0]:'menu';
    if(this.trackName!==name){
      if(this.track){this.track.pause();this.track.src='';}
      this.track=new Audio(new URL(`./assets/audio/${name}.ogg`,import.meta.url));this.track.loop=true;this.track.preload='auto';this.trackName=name;
    }
    this.track.volume=this.enabled&&!document.hidden?this.musicVolume:0;
    if(this.enabled&&!document.hidden&&this.track.paused)this.track.play().catch(()=>{});
    if(document.hidden&&!this.track.paused)this.track.pause();
  }
}
