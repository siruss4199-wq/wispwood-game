// Coast Camp's CrazyGames build (2026-10-26). The page is made from v5/play.html so the two never
// drift: the same game with the HTML5 SDK v3 loaded (v5/next/platform-cg.mjs uses it), ads off
// for Basic Launch (data-ads="off": no ad or rewarded-ad offers, docs/CRAZYGAMES_BASIC_LAUNCH.md)
// and the links that leave the game hidden (data-platform="crazygames").
//   node tools/coast-crazygames.mjs          writes v5/coast-crazygames.html
//   node tools/coast-crazygames.mjs --check  fails when the committed page is out of date
//   node tools/coast-crazygames.mjs --zip    also writes dist/vaultwake-coast-crazygames.zip,
//                                            ready to upload (index.html opens the game)
import {readFileSync,writeFileSync,mkdirSync,rmSync,cpSync,readdirSync,statSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=join(dirname(fileURLToPath(import.meta.url)),'..');
export const SDK='https://sdk.crazygames.com/crazygames-sdk-v3.js';
export function crazyPage(play){
 const html=play.replace('<html lang="en">','<html lang="en" data-ads="off" data-platform="crazygames">')
  .replace('<script type="module" src="next/app.mjs',`<script src="${SDK}"></script><script type="module" src="next/app.mjs`);
 if(html===play||!html.includes('data-ads="off"')||!html.includes(SDK))throw new Error('v5/play.html changed shape: update tools/coast-crazygames.mjs');
 return html;
}
const out=join(root,'v5/coast-crazygames.html'),page=crazyPage(readFileSync(join(root,'v5/play.html'),'utf8'));
if(process.argv.includes('--check')){
 if(readFileSync(out,'utf8')!==page){console.error('v5/coast-crazygames.html is out of date: run node tools/coast-crazygames.mjs');process.exit(1);}
 console.log('v5/coast-crazygames.html is up to date');process.exit(0);
}
writeFileSync(out,page);console.log('wrote v5/coast-crazygames.html');
if(process.argv.includes('--zip')){
 // Only what Coast Camp loads: its page, the V5 modules and styles it imports, its assets and
 // v4/platform.mjs (imported by v5/core.mjs). Classic V5 pages, review pages, the rejected lab
 // and review art stay out.
 const stage=join(root,'dist/coast-crazygames'),zip=join(root,'dist/vaultwake-coast-crazygames.zip');
 rmSync(stage,{recursive:true,force:true});rmSync(zip,{force:true});mkdirSync(join(stage,'v5'),{recursive:true});mkdirSync(join(stage,'v4'),{recursive:true});
 cpSync(join(root,'v4/platform.mjs'),join(stage,'v4/platform.mjs'));
 for(const f of readdirSync(join(root,'v5')))if(/\.(mjs|css)$/.test(f))cpSync(join(root,'v5',f),join(stage,'v5',f));
 cpSync(out,join(stage,'v5/coast-crazygames.html'));
 cpSync(join(root,'v5/next'),join(stage,'v5/next'),{recursive:true});
 cpSync(join(root,'v5/assets'),join(stage,'v5/assets'),{recursive:true,filter:s=>!s.includes('/assets/review')&&!s.endsWith('.md')});
 writeFileSync(join(stage,'index.html'),'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Vaultwake — Coast Camp</title><script>location.replace("v5/coast-crazygames.html"+location.search)</script></head><body><a href="v5/coast-crazygames.html">Play Vaultwake — Coast Camp</a></body></html>\n');
 execFileSync('zip',['-qr',zip,'.'],{cwd:stage});
 const size=f=>statSync(f).size,walk=d=>readdirSync(d).reduce((n,f)=>{const p=join(d,f);return n+(statSync(p).isDirectory()?walk(p):size(p));},0);
 console.log(`wrote dist/vaultwake-coast-crazygames.zip: ${(size(zip)/1048576).toFixed(1)} MB (${(walk(stage)/1048576).toFixed(1)} MB unpacked)`);
}
