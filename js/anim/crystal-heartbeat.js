import {expertAnimation} from './expert-adapter.js';
import {createHeartbeatRenderer,HEARTBEAT_MESSAGE} from './crystal-heartbeat-renderer.js';
export default expertAnimation({id:'crystal-heartbeat',createRenderer:createHeartbeatRenderer,message:HEARTBEAT_MESSAGE,reveal:11.2,color:'#f2d8e0'});
