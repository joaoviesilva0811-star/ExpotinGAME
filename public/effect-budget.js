// Lower transient particle/overdraw cost on slow frames. Gameplay, full ground
// footprints, player art and danger warnings never participate in this budget.
export class AdaptiveEffects{
 constructor(){this.scale=1;this.ema=1/60;this.elapsed=0;this.fast=0;this.adaptive=true;}
 configure(quality,adaptive=true){if(this.quality!==quality||!adaptive)this.scale=1;this.quality=quality;this.adaptive=adaptive;this.ema=1/60;this.elapsed=0;this.fast=0;}
 record(dt,active=true){if(!this.adaptive||!active||dt<=0||dt>.15)return;this.ema+=(dt-this.ema)*.15;this.elapsed+=dt;if(this.elapsed<.4)return;this.elapsed=0;
  if(this.ema>1/54){this.scale=Math.max(.12,this.scale*.75);this.fast=0;}
  else if(this.ema<1/58.5){this.fast+=.4;if(this.fast>6){this.scale=Math.min(1,this.scale+.035);this.fast=0;}}else this.fast=0;
 }
 stats(){return{effectDetail:Math.round(this.scale*100),adaptiveEffects:this.adaptive};}
}
