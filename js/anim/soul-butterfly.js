import {expertAnimation} from './expert-adapter.js';
import {createSoulRenderer,SOUL_MESSAGE} from './soul-butterfly-renderer.js';
export default expertAnimation({id:'soul-butterfly',createRenderer:createSoulRenderer,message:SOUL_MESSAGE,reveal:13.8,color:'#d8e9fa',particleMessage:true});
