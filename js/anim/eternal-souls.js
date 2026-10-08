import {autumnAnimation} from './autumn-adapter.js';
import {createSoulsRenderer,SOULS_MESSAGE} from './eternal-souls-renderer.js';
export default autumnAnimation({id:'eternal-souls',factory:createSoulsRenderer,message:SOULS_MESSAGE,reveal:16,color:'#f4d6a2'});
