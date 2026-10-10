// Original object illustrations. Shared materials, individually built silhouettes.
const P=(d,f='coral',extra='')=>`<path d="${d}" fill="${f.startsWith('#')||f==='none'?f:`url(#vw-${f})`}" ${extra}/>`;
const R=(x,y,w,h,r,f,extra='')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${f.startsWith('#')?f:`url(#vw-${f})`}" ${extra}/>`;
const C=(x,y,r,f,extra='')=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${f.startsWith('#')?f:`url(#vw-${f})`}" ${extra}/>`;
const E=(x,y,rx,ry,f,extra='')=>`<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${f.startsWith('#')?f:`url(#vw-${f})`}" ${extra}/>`;
const L=(d,c='#fff4d4',w=3)=>P(d,'none',`stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`);
const bolt=(x,y)=>C(x,y,3,'steel')+L(`M${x-1} ${y-1}l2 2`,'#607589',1.5);
const wheel=(x,y,r=13)=>C(x,y,r,'rubber')+C(x,y,r*.54,'steel')+C(x-1,y-1,r*.22,'brass');
const foot=()=>R(20,80,60,10,5,'rubber')+R(25,77,50,8,4,'brass');
export const MATERIALS=`<defs>
<linearGradient id="vw-coral" x2=".3" y2="1"><stop stop-color="#ffce8e"/><stop offset=".35" stop-color="#fc8860"/><stop offset=".8" stop-color="#d85749"/><stop offset="1" stop-color="#933e47"/></linearGradient>
<linearGradient id="vw-steel" x2=".6" y2="1"><stop stop-color="#f5ffff"/><stop offset=".3" stop-color="#cbdde1"/><stop offset=".54" stop-color="#8ca9b8"/><stop offset=".64" stop-color="#e1ecec"/><stop offset="1" stop-color="#647c94"/></linearGradient>
<linearGradient id="vw-brass" x2=".5" y2="1"><stop stop-color="#fff0b3"/><stop offset=".4" stop-color="#e8b865"/><stop offset=".8" stop-color="#b8793f"/><stop offset="1" stop-color="#7c4d3b"/></linearGradient>
<linearGradient id="vw-blue" x2=".4" y2="1"><stop stop-color="#baf7ff"/><stop offset=".36" stop-color="#4ebcdb"/><stop offset="1" stop-color="#347090"/></linearGradient>
<linearGradient id="vw-paper" x2=".6" y2="1"><stop stop-color="#fffce6"/><stop offset=".65" stop-color="#e5eedd"/><stop offset="1" stop-color="#a9bdc5"/></linearGradient>
<linearGradient id="vw-violet" x2=".6" y2="1"><stop stop-color="#edbcff"/><stop offset=".4" stop-color="#a777dc"/><stop offset="1" stop-color="#543479"/></linearGradient>
<linearGradient id="vw-rubber" x2=".4" y2="1"><stop stop-color="#5e7185"/><stop offset=".5" stop-color="#354356"/><stop offset="1" stop-color="#202e42"/></linearGradient>
<radialGradient id="vw-glass" cx=".3" cy=".25" r=".8"><stop stop-color="#ffffff"/><stop offset=".25" stop-color="#baf9fa"/><stop offset=".65" stop-color="#5cbfe3"/><stop offset="1" stop-color="#3b638e"/></radialGradient>
<radialGradient id="vw-power" cx=".4" cy=".3" r=".75"><stop stop-color="#fff9ff"/><stop offset=".25" stop-color="#f3ceff"/><stop offset=".6" stop-color="#c97ce8"/><stop offset="1" stop-color="#7642a5"/></radialGradient>
<radialGradient id="vw-stone" cx=".25" cy=".15" r=".9"><stop stop-color="#d9d5df"/><stop offset=".45" stop-color="#a09aac"/><stop offset="1" stop-color="#555f7d"/></radialGradient>
<linearGradient id="vw-leather" x2=".4" y2="1"><stop stop-color="#66c8d5"/><stop offset=".55" stop-color="#367f9a"/><stop offset="1" stop-color="#24465e"/></linearGradient>
</defs>`;
const grip=()=>R(41,41,18,48,8,'coral')+L('M46 54v22','#ffce9b',4)+L('M42 62h16M42 72h16','#aa4947',2.5);
const mapPaper=()=>P('M12 22L36 15 60 23 84 15 88 78 62 85 37 77 13 85Z','paper')+P('M12 22L36 15 37 77 13 85Z','blue')+P('M60 23L84 15 88 78 62 85Z','blue');
export const OBJECTS={
 rig:[
  // Bent sheet and fasteners, not a rock/token.
  P('M18 32Q16 23 27 20L65 12 79 29 72 67 27 80 14 60Z','coral')+P('M27 20L65 12 79 29 41 41Z','brass')+P('M14 60L27 80 72 67 68 56 27 66Z','coral')+L('M27 28L61 20','#ffe4b3',4)+bolt(31,48)+bolt(59,41)+R(55,73,29,9,4,'steel','transform="rotate(-16 70 77)"')+C(78,79,8,'steel')+C(78,79,3,'rubber'),
  `<g transform="rotate(28 50 50)">${grip()}${P('M38 45L27 29Q26 13 42 9V25H56V9Q72 13 73 28L61 45Z','steel')}${P('M38 40L61 40 59 49H41Z','rubber')}${L('M31 28L41 36','#ffffff',3)}</g>`,
  `<g transform="rotate(-25 50 50)">${R(42,32,16,54,7,'coral')}${P('M28 25L40 10H63L73 22 64 41 45 46 29 36Z','steel')}${P('M44 14H61L65 23 54 30 42 25Z','rubber')}${R(33,34,31,11,4,'brass')}${L('M47 54v23','#ffdc9b',4)}${bolt(49,38)}</g>`,
  R(16,65,69,17,6,'coral')+P('M20 65L26 27H38L40 66M63 65V26H76L83 65Z','coral')+R(31,31,41,34,12,'rubber')+L('M37 37v23M44 34v29M51 34v29M58 34v29M65 38v21','#afc4cb',4)+E(32,48,7,20,'steel')+E(72,48,6,20,'steel')+L('M75 42L88 34V21','#647d94',6)+C(89,20,6,'coral')+L('M50 65v14q0 14 11 7','#53677d',5)+bolt(24,73)+bolt(77,73),
  R(15,76,70,12,5,'coral')+wheel(23,84,7)+wheel(77,84,7)+P('M27 71L62 30H72L40 73Z','steel')+P('M65 73L29 30H40L77 72Z','coral')+C(51,52,7,'brass')+R(23,23,53,12,4,'rubber')+R(32,12,34,13,3,'steel')+L('M81 72L91 45','#677e92',5)+R(87,35,8,20,4,'coral')+L('M23 78H69','#ffcb8d',3),
  P('M8 62L30 33 52 41 80 13 92 23 62 57 38 51 19 76Z','steel')+P('M8 62L19 76 19 87 8 77Z','coral')+P('M80 13L92 23 91 49 81 44Z','coral')+L('M16 57L34 61 30 34M36 43L56 51 53 40M61 32L77 32 79 17','#c5704d',5)+L('M16 62L33 42 55 50 84 22','#fff3cb',3)+R(24,76,51,11,5,'rubber')+C(32,82,5,'brass')+C(67,82,5,'brass'),
  P('M9 43L25 21H52L61 45H90V73H8Z','coral')+P('M28 25H48L55 44H18Z','glass')+R(60,26,31,26,5,'brass')+P('M61 26H91L82 16H66Z','coral')+R(6,65,88,9,3,'steel')+wheel(25,75,15)+wheel(75,75,15)+L('M34 48v12','#ffdbac',4)+R(43,50,8,4,2,'rubber')+C(10,53,4,'paper'),
  R(8,69,84,22,11,'rubber')+[20,39,59,79].map(x=>wheel(x,80,9)).join('')+P('M14 48Q13 39 21 37H50V72H14Z','coral')+P('M24 36L31 16Q32 12 39 12H61Q67 12 68 20L72 52H23Z','coral')+P('M34 18H57Q61 18 62 24L64 39H27Z','glass')+P('M60 18L67 23 71 46 63 43Z','blue')+R(25,8,39,8,4,'brass')+R(30,47,24,18,5,'steel')+L('M36 51v10M44 51v10','#61778c',3)+P('M68 51V17Q69 10 75 12L86 20 83 27 77 25V57Z','brass')+R(77,29,14,31,6,'steel')+P('M77 55H91L84 75Z','steel')+L('M80 39l8 4M80 48l8 4','#526b83',3)+P('M7 60L19 58V74L5 77Z','brass')+C(25,43,4,'paper')+C(59,44,4,'paper')+L('M17 57V65','#ffcf99',4)

 ],
 chart:[
  P('M20 22Q43 10 72 19L79 73Q54 91 22 82L14 69Z','brass')+P('M18 19Q41 7 72 16L74 63Q53 80 19 74Z','paper')+P('M19 56Q36 49 40 35L56 43 68 30 71 62Q50 76 20 72Z','#83bac1')+L('M26 60Q59 66 45 40T62 24','#377d98',4)+C(62,24,4,'coral')+P('M19 66Q38 59 42 72Q44 86 25 86Q10 86 14 72Q16 66 23 67Q30 69 27 75L21 76Q25 72 21 72Z','paper')+P('M61 15L72 16 73 31Q61 28 61 15Z','blue')+L('M26 24Q39 18 52 20','#fffefa',4),
  mapPaper()+P('M19 53L29 35 39 51 52 37 65 57 77 46V69L58 76 37 68 20 75Z','#63a8b0')+L('M20 37Q46 67 70 31','#fff4c9',5)+C(70,31,5,'coral')+L('M36 18L37 74M60 25L62 82','#f9fff3',2),
  `<g transform="rotate(-32 50 50)">${R(42,56,17,35,7,'brass')}${R(43,65,15,23,6,'blue')}${C(50,35,27,'brass')}${C(50,35,21,'glass')}${P('M34 35Q39 17 54 18Q38 31 37 46Z','#e9ffff')}${L('M64 37Q64 49 53 52','#72d7e7',3)}</g>`,
  L('M50 58L27 89M50 58L73 89M50 60V91','#64798d',6)+C(50,57,8,'brass')+`<g transform="rotate(-23 49 37)">${R(15,21,65,28,8,'blue')}${R(12,24,13,23,4,'brass')}${R(61,18,21,34,6,'brass')}${E(80,35,9,17,'glass')}${L('M29 26H56','#d3f9ff',4)}${R(8,27,9,16,3,'rubber')}</g>`,
  E(50,70,30,19,'rubber')+P('M23 60V39L76 39V62Q75 82 50 84Q25 82 23 60Z','brass')+E(50,48,29,25,'blue')+E(50,47,23,19,'paper')+P('M50 29L57 48 43 57Z','coral')+P('M50 65L43 47 57 39Z','blue')+C(50,47,4,'brass')+P('M27 25Q25 6 50 6Q75 6 74 25L67 31H33Z','blue')+E(50,19,18,9,'glass')+L('M30 69Q48 82 69 68','#ffedb7',3),
  R(15,14,69,70,8,'blue')+P('M24 20L76 21 74 75 24 78Z','paper')+P('M27 27H70V67H27Z','#426e96')+L('M31 50L43 36 59 55 67 32M34 61L56 29','#bcf0f4',2.5)+[ [43,36],[59,55],[67,32],[34,61],[56,29] ].map(([x,y])=>C(x,y,3,'brass')).join('')+R(8,11,13,78,6,'brass')+R(78,11,13,78,6,'brass')+E(14,12,7,4,'paper')+E(84,12,7,4,'paper')+L('M25 80H72','#d5f7ef',3),
  foot()+L('M51 71V56','#92623f',8)+C(50,39,28,'glass')+P('M32 22L44 16 53 26 48 39 39 43 37 57 29 45 25 33Z','#eaf0c4')+P('M58 36L68 28 74 39 65 54 57 50Z','#eaf0c4')+`<ellipse cx="50" cy="39" rx="40" ry="13" transform="rotate(-28 50 39)" fill="none" stroke="#d7aa62" stroke-width="6"/>`+L('M21 26Q44 0 69 20','#fff0b9',4)+C(80,24,5,'brass'),
  P('M7 51L46 37 92 50V82L52 94 7 82Z','leather')+P('M12 55L45 45 50 81 12 75Z','paper')+P('M50 46L87 55V75L53 83Z','paper')+P('M11 76L50 86 87 77V83L51 94 11 84Z','brass')+L('M18 69L40 75M62 76L80 71','#a2bdc2',2.5)+P('M44 46L50 42 57 47 54 87 48 88Z','leather')+P('M8 53L19 49V58L9 63M79 52L91 56V65L81 61Z','brass')+C(50,31,23,'glass')+P('M34 18Q40 11 49 13L46 25 36 30 40 42 33 40 28 29Z','#e5f1d0')+P('M57 23L70 27 66 42 57 46 52 35Z','#e5f1d0')+`<ellipse cx="50" cy="31" rx="33" ry="9" transform="rotate(-24 50 31)" fill="none" stroke="#e5bb73" stroke-width="5"/>`+L('M36 18Q42 11 49 12','#ffffff',4)+C(79,17,4,'power')+P('M50 54L56 64 50 71 45 64Z','glass')

 ],
 flux:[
  P('M22 68L17 51 29 28 42 40 47 16 68 11 82 30 76 61 62 79 37 85Z','violet')+P('M47 16L68 11 60 40 42 56Z','power')+P('M42 56L60 40 76 61 62 79Z','violet')+P('M19 64L39 75 62 79 49 90 23 85Z','rubber')+L('M53 26L62 20','#ffe7ff',5)+C(28,60,4,'brass'),
  R(29,13,41,72,16,'violet')+R(33,21,33,55,13,'glass')+P('M45 29Q37 46 49 62Q60 54 55 40Z','power')+R(27,12,45,14,5,'brass')+R(28,75,44,12,5,'brass')+R(43,6,14,9,3,'steel')+L('M38 34v24','#ffffff',4)+L('M22 30Q9 49 23 69','#b088cf',6),
  foot()+R(34,19,32,57,10,'glass')+R(27,12,46,14,5,'steel')+L('M39 12V5M60 12V5','#e9bd73',6)+[30,41,52,63].map(y=>`<ellipse cx="50" cy="${y}" rx="28" ry="9" fill="none" stroke="#9761bb" stroke-width="10"/>`+L(`M24 ${y-2}Q47 ${y-10} 71 ${y-2}`,'#e5b4fb',4)).join('')+C(51,46,5,'power'),
  R(16,76,69,12,5,'brass')+P('M20 72V24Q23 11 35 19L39 47H61L65 19Q79 11 82 24V72Z','violet')+P('M35 51Q49 27 65 51L61 76H39Z','rubber')+C(50,55,15,'brass')+C(50,55,10,'power')+R(20,27,11,32,5,'steel')+R(71,27,11,32,5,'steel')+L('M39 25Q50 15 61 25','#eccbfb',4),
  L('M32 22V14Q50 -1 68 14V22','#dfb06a',6)+P('M27 29Q20 51 28 72Q50 85 72 72Q80 51 73 29Z','glass')+P('M45 31Q27 62 50 69Q72 58 53 31Z','power')+P('M25 25L33 16H67L76 25V33H25Z','violet')+P('M25 71H75L80 84H20Z','violet')+R(22,29,56,8,4,'brass')+R(24,72,53,7,3,'brass')+L('M32 39Q28 53 32 65','#ffffff',4),
  foot()+P('M25 72L18 34 27 16H40L39 63H61L60 16H73L82 34 75 72Z','violet')+C(50,41,23,'power')+`<ellipse cx="50" cy="41" rx="39" ry="12" transform="rotate(-24 50 41)" fill="none" stroke="#ddb26f" stroke-width="6"/>`+C(84,26,6,'steel')+C(49,41,10,'glass')+L('M24 22L29 18M71 19L76 30','#f6d4ff',3),
  foot()+P('M18 64L17 26 30 12H70L84 27 82 64 65 80H34Z','brass')+P('M25 57V31Q50 -2 75 31V57Q50 83 25 57Z','violet')+E(50,43,21,28,'glass')+P('M48 21Q33 45 48 64Q70 43 48 21Z','power')+L('M35 27Q30 37 32 52','#edfcff',4)+P('M12 31L24 37V61L13 57Z','violet')+P('M77 37L88 30 87 57 77 62Z','violet')+C(50,77,5,'power'),
  E(50,85,35,8,'rubber')+P('M18 77Q26 70 30 52L34 37H42L40 70H60L57 37H67L72 58Q75 72 83 78L75 86H26Z','violet')+E(50,76,27,7,'brass')+P('M43 69L40 29 50 15 61 29 57 69Z','glass')+P('M48 29L51 22 54 31 51 60 48 57Z','power')+P('M16 18Q50 38 85 18L80 34Q50 53 21 34Z','brass')+E(50,19,35,12,'violet')+E(50,18,27,7,'power')+P('M16 18L12 8 25 13 29 21M72 21L77 12 89 7 85 18Z','brass')+P('M42 9L50 2 58 9 51 20Z','glass')+L('M22 27Q48 41 78 27','#fff1bd',4)+L('M30 61L27 72M68 61L73 74','#eac4ff',4)+C(50,80,5,'glass')

 ],
 sources:{
  rig:R(5,65,90,24,11,'rubber')+[18,36,55,75,86].map(x=>wheel(x,78,8)).join('')+P('M9 35L22 13H48L58 36V65H8Z','coral')+P('M25 19H43L50 35H15Z','glass')+R(55,39,37,26,5,'coral')+P('M57 39L64 27 89 31 92 42Z','brass')+L('M66 28V13H88V30','#71879a',7)+L('M87 30v8q-6 6-9-1','#dfb875',4)+R(18,6,30,9,4,'brass')+R(21,46,22,11,3,'steel')+L('M26 47v9M33 47v9M40 47v9','#61758b',2)+C(12,42,4,'paper'),
  chart:L('M49 44Q79 62 55 70Q34 76 47 83','#d4a568',3)+P('M50 3Q80 5 95 35L56 57 8 34Q21 9 50 3Z','blue')+P('M50 3L56 57 8 34Z','paper')+P('M50 3L73 19 56 57Z','blue')+L('M8 34L50 3 95 35M50 3L56 57','#355b80',2.5)+P('M8 34L16 48 27 44 21 38M95 35L88 49 79 45 84 40Z','coral')+R(18,78,65,15,6,'rubber')+R(26,71,48,13,5,'blue')+C(50,76,14,'brass')+C(50,76,9,'glass')+L('M45 74L51 70','#f9ffff',3),
  flux:P('M20 52L8 33 18 25 30 43M70 43L81 24 93 32 81 56Z','brass')+P('M21 42Q21 81 49 86Q79 82 79 42Z','violet')+E(50,41,32,14,'rubber')+E(50,39,26,9,'power')+P('M20 49Q49 67 80 49L77 60Q48 78 24 60Z','brass')+P('M33 23L43 12 48 34 37 36Z','glass')+P('M57 5L69 15 64 32 53 25Z','power')+R(24,83,52,9,4,'rubber')+C(50,70,7,'glass')+L('M27 72L31 77','#e3b6f5',3)
 }
};
