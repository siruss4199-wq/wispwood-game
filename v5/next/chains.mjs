// Item chains for Coast Camp: one generator, one chain (docs/V5_SEALED_CARGO_PLAN).
// New generators are found in sealed cargo opened with the previous one's parts.
// The three Classic chains keep their art; the new ones are drawn here in the same
// style (100×100, the shared material gradients, a soft ground shadow).
import {FAMILIES} from '../core.mjs';
import {art,SPRITE_OVERRIDES} from '../art.mjs';
import {MATERIALS} from '../objects.mjs';

export const CHAINS={
 rig:{gen:'rig',names:FAMILIES.rig.names},
 rope:{gen:'rope',names:['Frayed twine','Rope coil','Fishing net','Pulley block','Rope ladder','Cargo hoist']},
 lamp:{gen:'lamp',names:['Candle stub','Tin lantern','Storm lantern','Signal lamp','Beacon lens']},
 chart:{gen:'chart',names:FAMILIES.chart.names},
 shell:{gen:'shell',names:['Sand dollar','Cockle shell','Conch','Pearl oyster','Nautilus','Coral crown']},
 flux:{gen:'flux',names:FAMILIES.flux.names}
};
// Generator → its chain (the level column stays for saves and future use).
export const GENERATOR_CHAINS={rig:[['rig',1]],chart:[['chart',1]],rope:[['rope',1]],shell:[['shell',1]],lamp:[['lamp',1]],flux:[['flux',1]]};
export const GENERATOR_NAMES={rig:'Rivet Rover',chart:'Survey Kite',rope:'Rope Winch',shell:'Shell Trap',lamp:'Lantern Kiln',flux:'Echo Crucible'};
// The three generators drawn for Coast Camp (Rover, Kite and Crucible keep their art).
const GENERATOR_SHAPES={
 rope:'<ellipse cx="50" cy="84" rx="38" ry="8" fill="#6d4a26" opacity=".35"/><path d="M14 80L26 30H74L86 80Z" fill="#8a5a2e"/><path d="M20 78L30 36H70L80 78Z" fill="#b07a46"/><circle cx="50" cy="50" r="22" fill="#a87a45"/><circle cx="50" cy="50" r="18" fill="none" stroke="#e4bf82" stroke-width="6"/><circle cx="50" cy="50" r="10" fill="none" stroke="#c99a5e" stroke-width="6"/><circle cx="50" cy="50" r="4" fill="url(#vw-brass)"/><path d="M50 50L84 34" stroke="#8c9aa8" stroke-width="6" stroke-linecap="round"/><circle cx="86" cy="33" r="6" fill="url(#vw-coral)"/><path d="M72 64Q86 74 78 88" fill="none" stroke="#e4bf82" stroke-width="5" stroke-linecap="round"/>',
 shell:'<ellipse cx="50" cy="86" rx="38" ry="7" fill="#3b6f85" opacity=".3"/><path d="M14 40Q50 24 86 40L80 82Q50 92 20 82Z" fill="#c48a52"/><path d="M14 40Q50 24 86 40L80 82Q50 92 20 82Z" fill="none" stroke="#7a5532" stroke-width="3"/><path d="M22 44V80M36 38V86M50 35V88M64 38V86M78 44V80M16 56Q50 44 84 56M18 70Q50 60 82 70" stroke="#e0b07a" stroke-width="3" fill="none"/><path d="M50 30Q62 10 74 18" fill="none" stroke="#8c9aa8" stroke-width="4"/><path d="M34 62L18 50Q20 30 34 28Q48 30 50 46Z" fill="#ffc7a8" stroke="#e58f6c" stroke-width="3"/><path d="M34 62L26 34M34 62L36 30M34 62L44 38" stroke="#e58f6c" stroke-width="2.5"/><circle cx="66" cy="66" r="7" fill="#fff" stroke="#d9e2ee" stroke-width="2"/>',
 lamp:'<ellipse cx="50" cy="88" rx="36" ry="7" fill="#6d4a26" opacity=".3"/><path d="M20 86L26 44H74L80 86Z" fill="url(#vw-stone)"/><path d="M30 86V60Q50 44 70 60V86Z" fill="#3b2a24"/><path d="M36 86V64Q50 54 64 64V86Z" fill="#ff9a3c"/><path d="M50 84Q38 74 46 62Q50 70 54 62Q62 74 50 84Z" fill="#ffd774"/><rect x="40" y="18" width="20" height="28" rx="3" fill="url(#vw-stone)"/><path d="M44 16Q50 4 56 16" fill="none" stroke="#c9c2b8" stroke-width="5" opacity=".6"/><circle cx="76" cy="40" r="9" fill="#fff3b0" opacity=".7"/><path d="M70 30L82 30L80 44H72Z" fill="url(#vw-brass)"/>'
};
export const maxTier=chain=>CHAINS[chain].names.length-1;
export const chainName=(chain,tier)=>CHAINS[chain].names[tier];
export const chainsAt=(gen,level)=>GENERATOR_CHAINS[gen].filter(([,l])=>level>=l).map(([c])=>c);
// The chain a generator level opens, if any.
export const chainOpenedAt=(gen,level)=>GENERATOR_CHAINS[gen].find(([,l])=>l===level)?.[0]??null;

const SHAPES={
 rope:[
  '<path d="M22 62Q38 40 52 56T80 46" fill="none" stroke="#a87a45" stroke-width="9" stroke-linecap="round"/><path d="M22 62Q38 40 52 56T80 46" fill="none" stroke="#e4bf82" stroke-width="3" stroke-dasharray="4 5"/><path d="M80 46l8-6M80 46l9 2M80 46l6 8M22 62l-8 4M22 62l-6-8" stroke="#c99a5e" stroke-width="2.5" stroke-linecap="round"/>',
  '<ellipse cx="50" cy="62" rx="33" ry="21" fill="#9b6a3c"/><ellipse cx="50" cy="57" rx="30" ry="18" fill="none" stroke="#e4bf82" stroke-width="7"/><ellipse cx="50" cy="57" rx="18" ry="10" fill="none" stroke="#c99a5e" stroke-width="7"/><ellipse cx="50" cy="57" rx="7" ry="4" fill="#6d4a26"/><path d="M78 60Q90 72 74 82" fill="none" stroke="#c99a5e" stroke-width="7" stroke-linecap="round"/><path d="M30 50Q40 44 52 44" stroke="#fff3d6" stroke-width="3" fill="none" opacity=".8"/>',
  '<path d="M18 30Q50 18 82 30L74 82Q50 90 26 82Z" fill="#e9d6ae" opacity=".45"/><path d="M18 30L26 82M34 25L38 86M50 22L50 88M66 25L62 86M82 30L74 82M20 44Q50 34 80 44M22 58Q50 50 78 58M24 72Q50 66 76 72" fill="none" stroke="#a87a45" stroke-width="3"/><circle cx="18" cy="30" r="7" fill="url(#vw-coral)"/><circle cx="50" cy="22" r="7" fill="url(#vw-coral)"/><circle cx="82" cy="30" r="7" fill="url(#vw-coral)"/><path d="M15 27l4-2M47 19l4-2M79 27l4-2" stroke="#fff" stroke-width="2"/>',
  '<path d="M42 12Q50 0 58 12" fill="none" stroke="#8c9aa8" stroke-width="5"/><rect x="30" y="16" width="40" height="54" rx="12" fill="#9b6a3c"/><rect x="34" y="20" width="32" height="46" rx="9" fill="#c48a52"/><circle cx="50" cy="43" r="14" fill="url(#vw-steel)"/><circle cx="50" cy="43" r="5" fill="url(#vw-brass)"/><path d="M36 44V88M64 44V80" stroke="#a87a45" stroke-width="5" stroke-linecap="round"/><path d="M64 80q0 9 7 9" fill="none" stroke="#8c9aa8" stroke-width="4" stroke-linecap="round"/><path d="M38 24H50" stroke="#f1c38f" stroke-width="3"/>',
  '<path d="M34 8Q30 50 36 92M66 8Q70 50 64 92" fill="none" stroke="#a87a45" stroke-width="5"/><g fill="#c48a52" stroke="#8a5a2e" stroke-width="2"><rect x="30" y="16" width="40" height="8" rx="3"/><rect x="30" y="33" width="41" height="8" rx="3"/><rect x="31" y="50" width="40" height="8" rx="3"/><rect x="31" y="67" width="39" height="8" rx="3"/><rect x="32" y="83" width="36" height="7" rx="3"/></g><path d="M30 8h8M62 8h8" stroke="#8a5a2e" stroke-width="4" stroke-linecap="round"/>',
  '<path d="M20 92L44 12M80 92L56 12" stroke="#8a5a2e" stroke-width="7" stroke-linecap="round"/><rect x="36" y="6" width="28" height="11" rx="4" fill="url(#vw-brass)"/><circle cx="50" cy="22" r="8" fill="url(#vw-steel)"/><path d="M50 30V50" stroke="#a87a45" stroke-width="3"/><rect x="33" y="50" width="34" height="30" rx="4" fill="#c48a52" stroke="#8a5a2e" stroke-width="3"/><path d="M33 65H67M50 50V80" stroke="#8a5a2e" stroke-width="2.5"/><path d="M26 76H74" stroke="url(#vw-steel)" stroke-width="4"/><circle cx="66" cy="42" r="4" fill="#fff3b0"/>'
 ],
 lamp:[
  '<ellipse cx="50" cy="78" rx="26" ry="8" fill="url(#vw-brass)"/><rect x="40" y="46" width="20" height="30" rx="4" fill="#fff4dc"/><path d="M40 52q10 6 20 0" fill="none" stroke="#f1d9a8" stroke-width="3"/><path d="M50 22Q40 34 50 44Q60 34 50 22Z" fill="#ffc93c"/><path d="M50 30Q46 37 50 42Q54 37 50 30Z" fill="#fff3b0"/>',
  '<path d="M38 18Q50 4 62 18" fill="none" stroke="#8c9aa8" stroke-width="4"/><path d="M33 22H67L63 30H37Z" fill="url(#vw-steel)"/><rect x="36" y="30" width="28" height="44" rx="5" fill="#b9c4cf"/><g fill="#ffd774"><circle cx="44" cy="40" r="2.8"/><circle cx="56" cy="40" r="2.8"/><circle cx="50" cy="50" r="2.8"/><circle cx="44" cy="60" r="2.8"/><circle cx="56" cy="60" r="2.8"/></g><rect x="32" y="74" width="36" height="9" rx="3" fill="url(#vw-steel)"/>',
  '<path d="M38 14Q50 0 62 14" fill="none" stroke="#3d4656" stroke-width="4"/><rect x="35" y="15" width="30" height="10" rx="3" fill="url(#vw-coral)"/><path d="M34 28Q30 52 38 72H62Q70 52 66 28Z" fill="url(#vw-glass)"/><path d="M50 36Q42 48 50 60Q58 48 50 36Z" fill="#ffc93c"/><path d="M36 28V70M64 28V70" stroke="#d65c4e" stroke-width="4"/><rect x="31" y="72" width="38" height="12" rx="4" fill="url(#vw-coral)"/><path d="M41 34V58" stroke="#fff" stroke-width="3" opacity=".7"/>',
  '<path d="M68 40L97 25V63Z" fill="#fff3b0" opacity=".6"/><rect x="16" y="30" width="46" height="42" rx="8" fill="url(#vw-brass)"/><circle cx="60" cy="51" r="17" fill="url(#vw-brass)"/><circle cx="60" cy="51" r="12" fill="#fff3b0"/><circle cx="60" cy="51" r="6" fill="#ffc93c"/><rect x="22" y="21" width="24" height="10" rx="3" fill="url(#vw-steel)"/><path d="M26 72V87M54 72V87" stroke="#8c9aa8" stroke-width="5" stroke-linecap="round"/><path d="M22 38H44" stroke="#fff3c9" stroke-width="3"/>',
  '<circle cx="50" cy="50" r="42" fill="#ffe68a" opacity=".35"/><circle cx="50" cy="50" r="32" fill="url(#vw-glass)" stroke="url(#vw-brass)" stroke-width="6"/><circle cx="50" cy="50" r="22" fill="none" stroke="#fff" stroke-width="3" opacity=".85"/><circle cx="50" cy="50" r="13" fill="none" stroke="#fff" stroke-width="3" opacity=".85"/><circle cx="50" cy="50" r="6" fill="#ffc93c"/><path d="M50 3V13M50 87V97M3 50H13M87 50H97" stroke="#ffd774" stroke-width="4" stroke-linecap="round"/>'
 ],
 shell:[
  '<circle cx="50" cy="54" r="30" fill="#efdcc0" stroke="#d6bb93" stroke-width="3"/><g fill="#c8a57a"><ellipse cx="50" cy="38" rx="4" ry="9"/><ellipse cx="64" cy="49" rx="4" ry="9" transform="rotate(72 64 49)"/><ellipse cx="59" cy="66" rx="4" ry="9" transform="rotate(144 59 66)"/><ellipse cx="41" cy="66" rx="4" ry="9" transform="rotate(216 41 66)"/><ellipse cx="36" cy="49" rx="4" ry="9" transform="rotate(288 36 49)"/></g><circle cx="50" cy="54" r="3" fill="#b38b5e"/><path d="M30 40Q38 30 50 28" stroke="#fff8ea" stroke-width="3" fill="none"/>',
  '<path d="M50 84L18 46Q20 18 50 14Q80 18 82 46Z" fill="#ffc7a8" stroke="#e58f6c" stroke-width="3"/><path d="M50 84L30 22M50 84L42 15M50 84L58 15M50 84L70 22M50 84L21 36M50 84L79 36" stroke="#e58f6c" stroke-width="3"/><path d="M40 82H60L56 91H44Z" fill="#e58f6c"/><path d="M28 30Q38 20 50 19" stroke="#fff" stroke-width="3" fill="none" opacity=".8"/>',
  '<path d="M18 70Q20 30 58 18Q86 14 84 40Q82 62 56 78Q36 90 18 70Z" fill="#ffd9c2" stroke="#d98a6a" stroke-width="3"/><path d="M58 18Q70 34 56 50Q44 62 28 60" fill="none" stroke="#d98a6a" stroke-width="3"/><path d="M84 40Q66 44 62 60" fill="none" stroke="#d98a6a" stroke-width="3"/><path d="M30 66Q40 74 52 72" fill="none" stroke="#ff9f8a" stroke-width="6" stroke-linecap="round"/><path d="M84 40l10-6-4 12z" fill="#d98a6a"/><path d="M34 40Q44 28 58 24" stroke="#fff" stroke-width="3" fill="none" opacity=".8"/>',
  '<path d="M14 60Q50 96 86 60Z" fill="#8fa3b8" stroke="#5f738a" stroke-width="3"/><path d="M14 58Q20 18 50 16Q80 18 86 58Q50 40 14 58Z" fill="#b8c7d6" stroke="#5f738a" stroke-width="3"/><path d="M20 62Q50 84 80 62" fill="#e9eff6"/><circle cx="50" cy="66" r="11" fill="#fff" stroke="#d9e2ee" stroke-width="2"/><circle cx="46" cy="62" r="3.5" fill="#fff"/><path d="M30 30Q50 22 70 30M26 42Q50 32 74 42" stroke="#e9eff6" stroke-width="3" fill="none"/>',
  '<circle cx="52" cy="52" r="37" fill="#ffe9d2" stroke="#c98d5f" stroke-width="3"/><path d="M52 15A37 37 0 0 1 89 52A25 25 0 0 1 64 77A16 16 0 0 1 48 61A10 10 0 0 1 58 51" fill="none" stroke="#c98d5f" stroke-width="3"/><path d="M30 25Q36 40 23 50M40 17Q44 33 33 40M21 62Q33 66 29 81M38 85Q44 74 55 83" stroke="#e0a374" stroke-width="6" stroke-linecap="round"/><circle cx="58" cy="51" r="4" fill="#c98d5f"/>',
  '<path d="M16 80L22 40L36 58L50 24L64 58L78 40L84 80Z" fill="url(#vw-coral)" stroke="#b9473f" stroke-width="3" stroke-linejoin="round"/><rect x="15" y="76" width="70" height="13" rx="5" fill="url(#vw-brass)"/><circle cx="22" cy="38" r="5.5" fill="#fff"/><circle cx="50" cy="22" r="6.5" fill="#fff"/><circle cx="78" cy="38" r="5.5" fill="#fff"/><circle cx="50" cy="82" r="4.5" fill="url(#vw-glass)"/><circle cx="34" cy="82" r="3" fill="#fff"/><circle cx="66" cy="82" r="3" fill="#fff"/>'
 ]
};
// Coast Camp's crates (generator boxes by size): driftwood crate, sea chest,
// captain's trunk, with a tag in the colour of the generator they feed.
const CRATE_SHAPES=[
 '<path d="M18 40L50 30L82 40V76L50 88L18 76Z" fill="#b98a5a"/><path d="M18 40L50 50L82 40M50 50V88" fill="none" stroke="#7a5532" stroke-width="3"/><path d="M18 54L50 64L82 54M18 66L50 76L82 66" stroke="#9c7046" stroke-width="2.5" fill="none"/><path d="M18 40L50 30L82 40L50 50Z" fill="#d1a676"/><path d="M30 36L60 46M40 33L70 43" stroke="#b98a5a" stroke-width="2"/><path d="M34 33Q50 22 66 33" fill="none" stroke="#e2c08a" stroke-width="4"/><path d="M23 72q7-9 2-18" stroke="#4f9a6a" stroke-width="3" fill="none"/>',
 '<rect x="16" y="46" width="68" height="38" rx="5" fill="#a56a3c"/><path d="M16 48Q16 22 50 22Q84 22 84 48Z" fill="#c2834d"/><path d="M28 24V84M72 24V84" stroke="#5b6573" stroke-width="6"/><path d="M16 48H84" stroke="#5b6573" stroke-width="5"/><rect x="43" y="44" width="14" height="16" rx="3" fill="url(#vw-brass)"/><circle cx="50" cy="52" r="2.5" fill="#5b3a1c"/><path d="M22 31Q50 19 78 31" stroke="#e0a86d" stroke-width="3" fill="none"/>',
 '<circle cx="50" cy="52" r="46" fill="#ffe68a" opacity=".28"/><rect x="10" y="42" width="80" height="44" rx="6" fill="#7b3f2a"/><path d="M10 44Q10 16 50 16Q90 16 90 44Z" fill="#9a5134"/><path d="M10 44H90M10 80H90" stroke="url(#vw-brass)" stroke-width="6"/><path d="M24 18V86M76 18V86" stroke="url(#vw-brass)" stroke-width="6"/><circle cx="50" cy="57" r="12" fill="url(#vw-brass)"/><path d="M50 49l3 6 6 1-4.5 4 1 6-5.5-3-5.5 3 1-6-4.5-4 6-1z" fill="#fff3b0"/><path d="M18 27Q50 11 82 27" stroke="#c97d55" stroke-width="3" fill="none"/>'
];
const TAG={rig:'#f27755',chart:'#43bfe7',flux:'#ac83fa',rope:'#c9a36a',shell:'#ff9f8a',lamp:'#ffc93c'};
// Sealed cargo: a crate stencilled "?" with the part that opens it pinned to its
// corner; cargo holding a generator glows.
const CARGO='<path d="M10 30L50 18L90 30V78L50 92L10 78Z" fill="#8a6440"/><path d="M10 30L50 42L90 30L50 18Z" fill="#b48a5c"/><path d="M50 42V92" stroke="#5f4226" stroke-width="3"/><path d="M10 48L50 60L90 48M10 64L50 76L90 64" stroke="#6f4f30" stroke-width="2.5" fill="none"/><path d="M10 30L50 42L90 30" fill="none" stroke="#5f4226" stroke-width="3"/><path d="M14 34L14 76M86 34V76" stroke="#5b6573" stroke-width="5"/><text x="30" y="74" font-size="26" font-weight="900" fill="#f3dcb3" font-family="system-ui,sans-serif" opacity=".85">?</text>';
// Draw any Coast Camp cell: new chains and crates here, everything else with the
// shared art. Water shows what lies on the sea floor beneath it.
export function draw(x,cls=''){
 // Deep cargo (not yet touching open ground) keeps even its key hidden.
 if(x?.type==='cargo')return `<svg class="art cargoArt ${cls}" viewBox="0 0 100 100" aria-hidden="true" data-art="cargo">${MATERIALS}<g stroke-linejoin="round" stroke-linecap="round">${CARGO}</g></svg>`+(x.deep?'':`<span class="cargoKey" aria-hidden="true">${draw({type:'item',family:x.key.family,tier:x.key.tier})}</span>`);
 if(x?.type==='source'&&GENERATOR_SHAPES[x.id])return `<svg class="art ${cls}" viewBox="0 0 100 100" aria-hidden="true" data-art="source-${x.id}">${MATERIALS}<g stroke-linejoin="round" stroke-linecap="round">${GENERATOR_SHAPES[x.id]}</g></svg>`;
 if(x?.type==='water')return x.find?draw(x.find,(cls+' submerged').trim()):'';
 if(x?.type==='jar')return art(x,cls);
 if(x?.type==='kit')return `<svg class="art crateArt crate${x.size} ${cls}" viewBox="0 0 100 100" aria-hidden="true" data-art="crate-${x.size}-${x.family}">${MATERIALS}<ellipse cx="50" cy="91" rx="34" ry="5" fill="#263957" opacity=".18"/><g stroke-linejoin="round" stroke-linecap="round">${CRATE_SHAPES[x.size-1]}</g><circle cx="82" cy="80" r="9" fill="${TAG[x.family]}" stroke="#fff" stroke-width="3"/></svg>`;
 if(x?.type==='item'&&SHAPES[x.family]){
  const key=x.family+'-'+x.tier;
  if(SPRITE_OVERRIDES[key])return `<img class="art ${cls}" src="${SPRITE_OVERRIDES[key]}" alt="" aria-hidden="true" data-art="${key}">`;
  return `<svg class="art ${cls}" viewBox="0 0 100 100" aria-hidden="true" data-art="${key}" data-render="illustrated-object">${MATERIALS}<ellipse cx="50" cy="91" rx="30" ry="5" fill="#263957" opacity=".18"/><g stroke-linejoin="round" stroke-linecap="round">${SHAPES[x.family][x.tier]}</g></svg>`;
 }
 return art(x,cls);
}
