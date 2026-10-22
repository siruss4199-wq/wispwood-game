// Coast map: place statuses follow real progress and real restoration rules.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {fresh,act,load} from '../v5/core.mjs';
import {PLACES,coastPlaces,placeById,doneIds,readyPlaces,CAMP_PLACES} from '../v5/coast-map.mjs';

const status=s=>Object.fromEntries(coastPlaces(s).map(p=>[p.id,p.status]));
const fixtures=()=>{const dir=new URL('./fixtures/stage2/',import.meta.url);return readdirSync(dir).map(f=>[f,load(readFileSync(new URL(f,dir),'utf8'),9)]);};

test('every place has an image and two or three lines from Ivo or Neri',()=>{
 assert.equal(new Set(PLACES.map(p=>p.id)).size,PLACES.length);
 for(const p of PLACES){
  assert.ok(p.lines.length>=2&&p.lines.length<=3,p.id);
  for(const l of p.lines){assert.ok(['Ivo','Neri'].includes(l.who));assert.ok(l.text.length>10&&l.text.length<120,p.id+': '+l.text);}
 }
 assert.deepEqual(CAMP_PLACES,['workshop','pier','loft','bench','deep']);
});

test('a fresh coast: the landing is the current goal, the Workshop waits for supplies, the rest is locked',()=>{
 const s=fresh(0),st=status(s);
 assert.equal(st.landing,'next');assert.equal(st.workshop,'saving');
 assert.match(coastPlaces(s).find(p=>p.id==='workshop').note,/Need 8 more ◆/);
 for(const id of ['pier','loft','crossing','lift','rings','vault','bench','deep','signal'])assert.equal(st[id],'locked',id);
 assert.deepEqual(readyPlaces(s),[]);assert.deepEqual(doneIds(s),[]);
});

test('reading the map never changes the game',()=>{
 const s=fresh(0);s.requests.supplies=30;const before=JSON.stringify(s);
 coastPlaces(s);readyPlaces(s);assert.equal(JSON.stringify(s),before);
});

test('ready means the restoration really succeeds; building it marks the place restored',()=>{
 const s=fresh(0);s.requests.supplies=8;
 assert.equal(status(s).workshop,'ready');
 assert.equal(act(s,{type:placeById('workshop').action},1).ok,true);
 assert.equal(status(s).workshop,'done');assert.equal(s.requests.supplies,0);
 assert.equal(status(s).pier,'saving');assert.equal(status(s).bench,'saving');
 s.requests.supplies=12;assert.equal(status(s).pier,'ready');
});

test('statuses agree with the real action on progressed saves',()=>{
 for(const [f,s] of fixtures()){
  for(const supplies of [0,40]){
   s.requests.supplies=supplies;
   for(const p of coastPlaces(s)){
    if(!p.action)continue;
    const r=act(structuredClone(s),{type:p.action},1);
    assert.equal(p.status==='ready',r.ok,`${f} ${p.id} with ${supplies} ◆: ${p.status} vs ${r.message}`);
    if(p.status==='done')assert.equal(r.ok,false);
   }
  }
  const st=status(s);
  assert.equal(st.landing,'done',f);assert.equal(st.crossing,'done',f);
  assert.equal(coastPlaces(s).filter(p=>p.status==='next').length<=1,true,f);
 }
});
