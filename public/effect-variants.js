// Visual variation derives from the authoritative event identifier, so every
// connected client sees the same model. Hit geometry and safe holes never vary.
const groups={
 steelSweep:['steelSweep','forge-cleave','forge-lance'],stoneWave:['stoneWave','forge-spikes'],ironChains:['ironChains','forge-chains'],redEruption:['redEruption'],
 rootEruption:['rootEruption','grove-roots','grove-seed'],poisonCloud:['poisonCloud','grove-spores'],
 voidSweep:['voidSweep','eclipse-crescents','eclipse-lance'],voidRift:['voidRift','eclipse-rift'],crystalEruption:['crystalEruption','eclipse-nova']
};
const core={'grove-leaf':'steelSweep'};for(const[base,variants]of Object.entries(groups))for(const model of variants)core[model]=base;
export const baseEffect=model=>core[model]||model;
export function effectVariant(base,event){const variants=base==='rootEruption'&&['line','cone'].includes(event.shape)?['rootEruption','grove-leaf','grove-roots']:groups[base]||[base];const seed=Number.isFinite(event.id)?event.id:Math.round((event.x||0)*3+(event.y||0)*5+(event.mark||0));return variants[Math.abs(seed)%variants.length];}
export const EFFECT_VARIANTS=groups;
