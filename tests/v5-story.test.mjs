import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,load} from '../v5/core.mjs';
import {storySnapshot} from '../v5/story.mjs';

test('story starts with a human mystery, advances with expedition discoveries and never changes the save',()=>{
 const s=fresh(0),initial=JSON.stringify(s);
 const open=storySnapshot(s);
 assert.equal(open.expedition.voice,'Neri · navigator');
 assert.match(open.expedition.question,/Find the buried crossing/);
 assert.deepEqual(JSON.stringify(s),initial,'reading narrative must be pure');
 s.landingStep=1;
 assert.match(storySnapshot(s).expedition.line,/Two coastal charts/);
 s.stage=2;
 assert.match(storySnapshot(s).expedition.title,/silent ring/);
 s.stage=4;
 assert.match(storySnapshot(s).expedition.line,/has not appeared yet/);
 assert.match(storySnapshot(s).expedition.question,/tomorrow/);
 assert.deepEqual(storySnapshot(load(JSON.stringify(s))),storySnapshot(s),'legacy-compatible narrative after reload');
});

test('camp clues reveal only earned discoveries and leave mystery ahead after the Ocean Crown',()=>{
 const s=fresh(0);
 assert.match(storySnapshot(s).camp.question,/Complete orders/);
 s.camp.earlyFragments=1;
 assert.match(storySnapshot(s).camp.title,/fragment/);
 s.workshop.repaired=true;
 assert.match(storySnapshot(s).camp.title,/recovered instrument/);
 s.camp.pier=true;s.camp.loft=true;
 assert.match(storySnapshot(s).camp.question,/Pearl Astrolabe/);
 s.discovered.push('chart:tide:2');
 assert.match(storySnapshot(s).camp.title,/fleet/);
 s.camp.deepSurvey=true;
 assert.match(storySnapshot(s).camp.question,/Sextant/);
 s.discovered.push('chart:tide:3');
 assert.match(storySnapshot(s).camp.question,/Ocean Crown/);
 s.discovered.push('chart:tide:4');
 const end=storySnapshot(s);
 assert.match(end.camp.line,/return/);
 assert.match(end.camp.question,/next coast remains uncharted/);
 assert.equal(typeof end.expedition.line,'string');
});
