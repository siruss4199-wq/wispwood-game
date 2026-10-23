// Shaded "toy render" SVGs for Coast Camp's own objects (build 26, user: "chi uuruu
// saijruulaad bai" after asking for 3D-style icons on a par with the painted parts).
// Three-quarter view, light from the upper left, a darker right face, rim highlights and a
// soft contact shadow, so they sit beside the painted Fieldworks parts. Painted WebP art
// from docs/V5_COAST_ART_BRIEF_2026-10-23.md can replace any of these later.
// Gradient ids are prefixed cc- and identical wherever they appear.
export const COAST_DEFS=`<defs>
<radialGradient id="cc-shadow"><stop stop-color="#1d2b3a" stop-opacity=".42"/><stop offset="1" stop-color="#1d2b3a" stop-opacity="0"/></radialGradient>
<linearGradient id="cc-woodTop" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f0cf9c"/><stop offset=".55" stop-color="#d4a46c"/><stop offset="1" stop-color="#b9864f"/></linearGradient>
<linearGradient id="cc-woodL" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#c58f58"/><stop offset=".6" stop-color="#9d6b3d"/><stop offset="1" stop-color="#7a4f2b"/></linearGradient>
<linearGradient id="cc-woodR" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#966236"/><stop offset=".6" stop-color="#6f4625"/><stop offset="1" stop-color="#55341b"/></linearGradient>
<linearGradient id="cc-iron" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#c7d0d8"/><stop offset=".45" stop-color="#7d8a97"/><stop offset="1" stop-color="#4a5562"/></linearGradient>
<radialGradient id="cc-canvas" cx=".35" cy=".3" r=".8"><stop stop-color="#9fe0e6"/><stop offset=".45" stop-color="#4aa3b3"/><stop offset="1" stop-color="#1f5d6d"/></radialGradient>
<linearGradient id="cc-rope" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#9c7740"/><stop offset=".35" stop-color="#f0d39a"/><stop offset=".7" stop-color="#c9a265"/><stop offset="1" stop-color="#8e6a36"/></linearGradient>
<linearGradient id="cc-barrel" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#5a2d17"/><stop offset=".22" stop-color="#9d5a32"/><stop offset=".4" stop-color="#d08a58"/><stop offset=".55" stop-color="#b06a3c"/><stop offset=".85" stop-color="#7a3f21"/><stop offset="1" stop-color="#4f2613"/></linearGradient>
<radialGradient id="cc-barrelTop" cx=".4" cy=".35" r=".75"><stop stop-color="#e2a676"/><stop offset=".6" stop-color="#b47547"/><stop offset="1" stop-color="#7d4a2a"/></radialGradient>
<linearGradient id="cc-hoop" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#3f4955"/><stop offset=".38" stop-color="#b9c4cf"/><stop offset=".6" stop-color="#76838f"/><stop offset="1" stop-color="#36404b"/></linearGradient>
<linearGradient id="cc-wicker" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#8a5f26"/><stop offset=".35" stop-color="#e9bf73"/><stop offset=".6" stop-color="#cf9f55"/><stop offset="1" stop-color="#7d5420"/></linearGradient>
<linearGradient id="cc-teal" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#7fd3c9"/><stop offset=".5" stop-color="#3f9f98"/><stop offset="1" stop-color="#256b69"/></linearGradient>
<linearGradient id="cc-tealDark" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#3b8f8a"/><stop offset="1" stop-color="#1d5553"/></linearGradient>
<linearGradient id="cc-gold" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff4c4"/><stop offset=".35" stop-color="#f2c55a"/><stop offset=".75" stop-color="#c58a1c"/><stop offset="1" stop-color="#8a5a10"/></linearGradient>
<linearGradient id="cc-leather" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#e06a58"/><stop offset=".5" stop-color="#a8352f"/><stop offset="1" stop-color="#6c1d1f"/></linearGradient>
<linearGradient id="cc-leatherTop" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f08a72"/><stop offset=".6" stop-color="#c2463b"/><stop offset="1" stop-color="#8e2a28"/></linearGradient>
<linearGradient id="cc-copper" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffd2a6"/><stop offset=".4" stop-color="#e88a4f"/><stop offset="1" stop-color="#a24a26"/></linearGradient>
<radialGradient id="cc-seaglass" cx=".38" cy=".32" r=".75"><stop stop-color="#f2fffc"/><stop offset=".4" stop-color="#9ee6db"/><stop offset="1" stop-color="#3a9f93"/></radialGradient>
<radialGradient id="cc-brassFace" cx=".38" cy=".32" r=".8"><stop stop-color="#fff2bf"/><stop offset=".45" stop-color="#e7b44e"/><stop offset="1" stop-color="#9a6412"/></radialGradient>
<linearGradient id="cc-shine" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
</defs>`;
const SHADOW='<ellipse cx="50" cy="90" rx="36" ry="6.5" fill="url(#cc-shadow)"/>';
const Q=(x,y,c)=>`<text x="${x}" y="${y}" font-size="24" font-weight="900" fill="${c}" font-family="system-ui,sans-serif" opacity=".8">?</text>`;

// A sealed wooden crate seen from above-left: light lid, lit left face, shaded right face.
const BOX=(top='url(#cc-woodTop)',left='url(#cc-woodL)',right='url(#cc-woodR)')=>`<path d="M12 34L50 21L88 34L50 47Z" fill="${top}"/><path d="M12 34L50 47V89L12 75Z" fill="${left}"/><path d="M50 47L88 34V75L50 89Z" fill="${right}"/>`;
export const CARGO_CRATE=SHADOW+BOX()+
 '<path d="M12 48L50 61M12 62L50 75M50 61L88 48M50 75L88 62" stroke="#5a3a1f" stroke-width="1.6" opacity=".55"/>'+
 '<path d="M24 30L62 43M36 26L74 39" stroke="#a87a48" stroke-width="1.4" opacity=".6"/>'+
 '<path d="M12 34L50 47L88 34" fill="none" stroke="#fff3d6" stroke-width="1.6" opacity=".7"/>'+
 '<path d="M12 36V75M50 49V89M88 36V75" stroke="url(#cc-iron)" stroke-width="5"/><path d="M14 36V74" stroke="#e6edf2" stroke-width="1.2" opacity=".7"/>'+
 '<circle cx="18" cy="44" r="1.6" fill="#38414b"/><circle cx="18" cy="68" r="1.6" fill="#38414b"/><circle cx="82" cy="43" r="1.6" fill="#2a3138"/><circle cx="82" cy="67" r="1.6" fill="#2a3138"/>'+
 Q(24,74,'#fbe7c4');
// A bundle wrapped in waxed teal canvas, tied with two ropes and a knot.
export const CARGO_BUNDLE=SHADOW+
 '<path d="M12 46Q12 26 30 24H70Q88 26 88 46V70Q88 87 70 88H30Q12 87 12 70Z" fill="url(#cc-canvas)"/>'+
 '<path d="M14 44Q50 34 86 44M14 62Q50 54 86 62" fill="none" stroke="#1d5866" stroke-width="2" opacity=".55"/>'+
 '<path d="M22 30Q32 25 46 26" stroke="url(#cc-shine)" stroke-width="5" fill="none" stroke-linecap="round"/>'+
 '<path d="M34 24Q32 56 35 88M66 24Q68 56 65 88" stroke="url(#cc-rope)" stroke-width="7" fill="none"/>'+
 '<path d="M34 24Q32 56 35 88M66 24Q68 56 65 88" stroke="#7d5a2a" stroke-width="1.2" stroke-dasharray="2.5 3.5" fill="none" opacity=".8"/>'+
 '<ellipse cx="50" cy="26" rx="10" ry="6" fill="url(#cc-rope)" stroke="#8a6532" stroke-width="1.4"/><path d="M44 25Q50 21 56 25" stroke="#fff1cf" stroke-width="1.6" fill="none"/>'+
 Q(40,72,'#e8fbfd');
// A stout barrel: cylinder shading across the staves, iron hoops, lit lid.
export const CARGO_BARREL=SHADOW+
 '<path d="M21 24Q13 55 21 86Q50 94 79 86Q87 55 79 24Z" fill="url(#cc-barrel)"/>'+
 '<path d="M34 25Q29 56 34 89M50 26V91M66 25Q71 56 66 89" stroke="#4a2410" stroke-width="1.6" fill="none" opacity=".55"/>'+
 '<path d="M18 40Q50 49 82 40" stroke="url(#cc-hoop)" stroke-width="5.5" fill="none"/><path d="M17 72Q50 81 83 72" stroke="url(#cc-hoop)" stroke-width="5.5" fill="none"/>'+
 '<ellipse cx="50" cy="24" rx="29" ry="9" fill="url(#cc-barrelTop)" stroke="url(#cc-hoop)" stroke-width="4"/>'+
 '<path d="M30 22H70M33 26H67" stroke="#7a4527" stroke-width="1.3" opacity=".7"/>'+
 '<path d="M27 32Q24 52 27 68" stroke="#f3c79b" stroke-width="3.2" fill="none" opacity=".6" stroke-linecap="round"/>'+
 Q(40,68,'#fbe2cc');
// A closed wicker basket with a woven lid and rope handles.
export const CARGO_BASKET=SHADOW+
 '<path d="M14 38H86L78 87Q50 93 22 87Z" fill="url(#cc-wicker)"/>'+
 '<path d="M15 50Q50 56 85 50M16 62Q50 68 84 62M18 74Q50 80 82 74" stroke="#7d5420" stroke-width="2" fill="none" opacity=".7"/>'+
 '<path d="M27 40L31 88M41 40L43 90M57 40L56 90M72 40L68 88" stroke="#8a5f26" stroke-width="1.8" opacity=".55"/>'+
 '<ellipse cx="50" cy="37" rx="38" ry="9" fill="#e7bd70" stroke="#8a5f26" stroke-width="2.2"/><ellipse cx="50" cy="35" rx="30" ry="5" fill="#f6d796" opacity=".8"/>'+
 '<path d="M10 46Q4 54 12 60M90 46Q96 54 88 60" stroke="url(#cc-rope)" stroke-width="4" fill="none"/>'+
 Q(40,76,'#fff3da');

// Crates (generator boxes): an open driftwood crate, a teal sea chest, a captain's trunk.
export const KIT_DRIFTWOOD=SHADOW+BOX('#4a2e18')+
 '<path d="M17 35L50 24L83 35L50 46Z" fill="#3a2414"/>'+
 '<path d="M24 34Q30 18 44 24Q38 30 34 38Z" fill="url(#cc-copper)" stroke="#8a3d1f" stroke-width="1.4"/>'+
 '<path d="M52 30L70 18L76 22L58 36Z" fill="url(#cc-iron)" stroke="#3f4955" stroke-width="1.2"/><path d="M68 20L80 14" stroke="#2f6f7a" stroke-width="5" stroke-linecap="round"/>'+
 '<path d="M12 34L50 47L88 34" fill="none" stroke="#f5dcb4" stroke-width="2.2"/><path d="M12 34L50 21L88 34" fill="none" stroke="#c49460" stroke-width="2.2"/>'+
 '<path d="M12 50L50 63M50 63L88 50" stroke="#5a3a1f" stroke-width="1.6" opacity=".55"/>';
export const KIT_CHEST=SHADOW+
 '<path d="M14 50H86V82Q50 90 14 82Z" fill="url(#cc-teal)"/>'+
 '<path d="M14 52Q14 22 50 20Q86 22 86 52Z" fill="url(#cc-teal)"/><path d="M22 34Q30 26 46 24" stroke="url(#cc-shine)" stroke-width="5" fill="none" stroke-linecap="round"/>'+
 '<path d="M14 52Q50 58 86 52" stroke="#1d5553" stroke-width="2.4" fill="none"/>'+
 '<path d="M28 22Q26 52 28 86M72 22Q74 52 72 86" stroke="url(#cc-gold)" stroke-width="6" fill="none"/>'+
 '<path d="M14 50V82M86 50V82" stroke="url(#cc-gold)" stroke-width="4"/>'+
 '<rect x="43" y="50" width="14" height="16" rx="3" fill="url(#cc-gold)" stroke="#8a5a10" stroke-width="1.5"/><circle cx="50" cy="58" r="2.4" fill="#5b3a08"/>';
export const KIT_TRUNK=SHADOW+
 '<ellipse cx="50" cy="52" rx="46" ry="40" fill="#ffe48a" opacity=".22"/>'+
 '<path d="M9 48H91V84Q50 93 9 84Z" fill="url(#cc-leather)"/>'+
 '<path d="M9 50Q9 16 50 14Q91 16 91 50Z" fill="url(#cc-leatherTop)"/><path d="M18 32Q28 22 46 20" stroke="url(#cc-shine)" stroke-width="5" fill="none" stroke-linecap="round"/>'+
 '<path d="M9 50Q50 57 91 50" stroke="#ffd36a" stroke-width="2.5" fill="none" opacity=".9"/><path d="M9 50Q50 57 91 50" stroke="#fff3b0" stroke-width="6" fill="none" opacity=".25"/>'+
 '<path d="M24 16Q21 50 24 87M76 16Q79 50 76 87M9 48V84M91 48V84" stroke="url(#cc-gold)" stroke-width="5.5" fill="none"/>'+
 '<path d="M9 48L18 44M91 48L82 44M9 84L18 87M91 84L82 87" stroke="url(#cc-gold)" stroke-width="5"/>'+
 '<path d="M42 46H58V66L50 71L42 66Z" fill="url(#cc-gold)" stroke="#8a5a10" stroke-width="1.6"/><circle cx="50" cy="56" r="3" fill="#5b3a08"/>';
export const KITS=[KIT_DRIFTWOOD,KIT_CHEST,KIT_TRUNK];

// Tide token: a thick sea-glass coin, its edge showing below the face, with embossed arrows.
export const TOKEN=SHADOW+
 '<ellipse cx="50" cy="56" rx="37" ry="33" fill="#2c8579"/><ellipse cx="50" cy="51" rx="37" ry="33" fill="url(#cc-seaglass)" stroke="#2f8f86" stroke-width="2.5"/>'+
 '<ellipse cx="50" cy="51" rx="28" ry="25" fill="none" stroke="#fff" stroke-width="2" opacity=".7"/>'+
 '<path d="M34 47A17 15 0 0 1 63 39" fill="none" stroke="#165e57" stroke-width="7" stroke-linecap="round" opacity=".35" transform="translate(1.5 2)"/>'+
 '<path d="M34 47A17 15 0 0 1 63 39" fill="none" stroke="#1f6e66" stroke-width="6" stroke-linecap="round"/><path d="M57 31L66 39L56 44" fill="none" stroke="#1f6e66" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'+
 '<path d="M66 56A17 15 0 0 1 37 63" fill="none" stroke="#e07f24" stroke-width="6" stroke-linecap="round"/><path d="M43 71L34 63L44 58" fill="none" stroke="#e07f24" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>'+
 '<path d="M24 38Q32 25 48 22" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".85"/>';
// Brass cog: a thick gear (its back edge darker) with a green up-arrow inlay.
const teeth=(cx,cy,fill)=>Array.from({length:8},(_,k)=>`<rect x="${cx-6}" y="${cy-44}" width="12" height="16" rx="3" fill="${fill}" transform="rotate(${k*45} ${cx} ${cy})"/>`).join('');
export const COG=SHADOW+teeth(50,55,'#8a5a10')+`<circle cx="50" cy="55" r="31" fill="#8a5a10"/>`+teeth(50,50,'url(#cc-gold)')+
 '<circle cx="50" cy="50" r="31" fill="url(#cc-brassFace)" stroke="#9a6412" stroke-width="2.5"/>'+
 '<circle cx="50" cy="50" r="18" fill="#fdf1cf" stroke="#9a6412" stroke-width="2.5"/><circle cx="50" cy="50" r="18" fill="none" stroke="#c99a3a" stroke-width="1" opacity=".6" transform="translate(1 1.5)"/>'+
 '<path d="M50 61V40M41 48L50 38L59 48" fill="none" stroke="#2f8f5b" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/>'+
 '<path d="M28 34Q36 24 50 22" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".7"/>';
