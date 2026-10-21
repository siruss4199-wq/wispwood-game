import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,load} from '../v5/core.mjs';
import {chapterEndView} from '../v5/chapter-end.mjs';
test('Chapter 1 end screen is only displayed after a genuinely viewed earned fleet signal',()=>{
 const s=fresh(0);s.stage=4;
 assert.equal(chapterEndView(s),null);
 s.discovered.push('chart:tide:4');
 assert.equal(chapterEndView(s).status,'pending','discovery must offer a real reveal instead of mandatory orders');
 assert.match(chapterEndView(s).action,/REVEAL SIGNAL/);
 s.camp.fleetViewed=true;
 const before=JSON.stringify(s),end=chapterEndView(s);
 assert.equal(end.phase,'THE SIGNAL ANSWERS','the reveal opens a question, not a false finale');
 assert.equal(end.status,'complete');
 assert.match(end.detail,/fleet discovery|fleet|signal/i);
 assert.doesNotMatch(end.hint,/MAKE|NEXT ORDER|BUILD/i);
 assert.equal(JSON.stringify(s),before);
 const recovered=load(JSON.stringify(s));
 assert.deepEqual(chapterEndView(recovered),end,'old save shape requires no new ending flags');
});
test('end screen never activates for a save still exploring',()=>{
 const s=fresh(0);s.stage=3;s.camp.fleetViewed=true;
 assert.equal(chapterEndView(s),null);
});
