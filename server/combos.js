export const comboState=()=>({count:0,until:0,multiplier:1,last:-10});
export function resetCombo(p){p.combo=comboState();}
export function recordCombo(p,amount,now){
 if(!(amount>0))return;
 p.combo??=comboState();const c=p.combo;if(now>=c.until){c.count=0;c.multiplier=1;}
 // A single cleave or same-frame volley cannot manufacture multiple steps.
 if(now-c.last>=.18){c.count++;c.until=now+3.5;c.last=now;}
 c.multiplier=1+Math.min(3,Math.floor(c.count/5))*.25;
 const bonus=amount/30*(c.multiplier-1);
 for(const stats of [p.stats,p.roundStats]){stats.comboPoints=(stats.comboPoints||0)+bonus;stats.maxCombo=Math.max(stats.maxCombo||0,c.count);}
}
export function expireCombo(p,now){if(p.combo&&now>=p.combo.until&&p.combo.count)resetCombo(p);}
