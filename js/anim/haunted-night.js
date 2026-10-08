import {autumnAnimation} from './autumn-adapter.js';
import {createHauntedRenderer,HAUNTED_MESSAGE} from './haunted-night-renderer.js';
export default autumnAnimation({id:'haunted-night',factory:createHauntedRenderer,message:HAUNTED_MESSAGE,reveal:18,color:'#d5dfef',action:'Encender una ventana'});
