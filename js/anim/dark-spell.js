import {autumnAnimation} from './autumn-adapter.js';
import {createSpellRenderer,SPELL_MESSAGE} from './dark-spell-renderer.js';
export default autumnAnimation({id:'dark-spell',factory:createSpellRenderer,message:SPELL_MESSAGE,reveal:16,color:'#e7d9fa',action:'Lanzar hechizo',spell:true});
