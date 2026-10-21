import {prewarmArenaArt} from './arena-art.js';
import {portraitAssetsReady} from './portraits.js';
import {transitionAssetsReady} from './transition-sprites.js';
import {animationAssetsReady,warmAnimationFrames} from './animation.js';
import {strikeAssetsReady} from './strike-sprites.js';
import {bossWalkReady} from './boss-walk.js';
import {hurtSpritesReady} from './hurt-sprites.js';
import {rescueSpritesReady} from './rescue-sprites.js';
import {itemSpritesReady} from './item-art.js';
import {motionSpritesReady} from './motion-sprites.js';
import {volumeAssetsReady,prewarmVolumes} from './volumes.js';
import {sceneAssetsReady} from './scenes.js';
// Finish decode/caches in the lobby, rather than spending the opening second of
// a cutscene uploading hundreds of first-use character/effect textures.
export const renderAssetsReady=Promise.all([portraitAssetsReady,transitionAssetsReady,animationAssetsReady,strikeAssetsReady,bossWalkReady,hurtSpritesReady,rescueSpritesReady,itemSpritesReady,motionSpritesReady,volumeAssetsReady,sceneAssetsReady]).then(async results=>{if(results.some(r=>r===false))throw Error('Required artwork failed to load');prewarmArenaArt();await warmAnimationFrames();await prewarmVolumes();return true;});
