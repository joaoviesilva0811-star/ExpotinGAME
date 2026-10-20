export const QUALITY={low:{particles:500,smoke:18,volumes:42,detail:.45},medium:{particles:1000,smoke:48,volumes:90,detail:.72},high:{particles:1800,smoke:96,volumes:160,detail:1}};
export function cleanSettings(value={}){return{quality:Object.hasOwn(QUALITY,value.quality)?value.quality:'high',shake:Number.isFinite(Number(value.shake))?Math.max(0,Math.min(1,Number(value.shake))):.45,autoCamera:value.autoCamera!==false,outline:value.outline!==false,showPerf:!!value.showPerf,lighting:value.lighting!==false};}
export class FrameMonitor{
 constructor(){this.elapsed=0;this.costs=[];this.intervals=[];this.report={fps:0,p95:0,cpu:0};}
 record(interval,cpu){if(interval<=0||interval>300)return this.report;this.elapsed+=interval;this.costs.push(cpu);this.intervals.push(interval);if(this.elapsed>=1000){const n=this.intervals.length,sorted=[...this.intervals].sort((a,b)=>a-b);this.report={fps:n/this.elapsed*1000,p95:sorted[Math.min(n-1,Math.floor(n*.95))],cpu:this.costs.reduce((a,b)=>a+b,0)/n};this.elapsed=0;this.costs=[];this.intervals=[];}return this.report;}
}
