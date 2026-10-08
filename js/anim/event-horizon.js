import {expertAnimation} from './expert-adapter.js';
import {createHorizonRenderer,HORIZON_MESSAGE} from './event-horizon-renderer.js';
export default expertAnimation({id:'event-horizon',createRenderer:createHorizonRenderer,message:HORIZON_MESSAGE,reveal:11.8,color:'#e6d5bd'});
