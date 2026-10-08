// Serializable public controls. Rendering capabilities stay independent of tiers.
const labels={c1:'Color principal',c2:'Color secundario',c3:'Partículas',c4:'Iluminación o energía',c5:'Texto',c6:'Fondo'};
const palettes={
 'eternal-bloom':['#f2f6ff','#c5d9cf','#ffd08a','#ffe1ae','#f1e4cd','#010103'],
 'soul-butterfly':['#75dbea','#ab72ed','#59b8ff','#c5f6ff','#d8e9fa','#010106'],
 'event-horizon':['#ed762c','#b8cbff','#a8bbd8',null,'#e6d5bd',null],
 'crystal-heartbeat':['#f8f2f5','#a0baff','#ff3659','#ff3659','#f2d8e0','#010106'],
 'eternal-souls':['#f99b1d','#e9b75c','#ffb84b','#ffb24e','#f4d6a2','#080b21'],
 'haunted-night':['#363d49','#69717d','#9db9db','#9ab5ed','#d5dfef','#090f1c'],
 'dark-spell':['#281a28','#b89a54','#b39af5','#9455ff','#e7d9fa','#0b0815'],
};
export const SCENE_PALETTES=Object.fromEntries(Object.entries(palettes).map(([id,values])=>[id,values.flatMap((value,i)=>value?[{key:`c${i+1}`,label:labels[`c${i+1}`],value}]:[])]));
export const paletteDefaults=id=>Object.fromEntries((SCENE_PALETTES[id]||[]).map(c=>[c.key,c.value]));
