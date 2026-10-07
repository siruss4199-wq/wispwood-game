'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Evaluate the actual game's rules in a sandbox without running browser code.
// This avoids duplicating the rules in a different test implementation.
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/i)?.[1];
assert.ok(script, 'Inline game script must exist');
// Compile the FULL inline script, not just game rules: catches duplicate const / syntax errors in UI code.
test('complete browser game JavaScript compiles without syntax errors', () => {
  assert.doesNotThrow(() => new vm.Script(script, { filename: 'index.html:inline.js' }));
});
const uiStart = script.indexOf("const KEY='wispwood-prototype-v1'");
assert.ok(uiStart > 0, 'Could not find boundary between game rules and browser UI');
const context = vm.createContext({});
const names = ['SIZE','KINDS','INITIAL_OPEN','INITIAL_ENERGY','MAX_ENERGY','CELL_REVEALS','GENERATORS','isOpen','isGenerator','isWebbed','neighbors','isFrontierCell','unlockCost','openEmptyIndices','ensureStarterGenerator','revealUnlockedCell','unlockCell','activateGenerator','V2_MOVES','isWild','normalItem','itemLabel','v2Active','v2Limited','generateFrom','mergeGroup','TASKS', 'GROVE_TASKS', 'TRAIL', 'PUZZLES', 'SKILL_MAX', 'BLOCKER_ICON', 'puzzleInfo', 'puzzleReady', 'seedPuzzle', 'ensurePuzzle', 'isBlocked', 'useCompanionSkill', 'CREATURES', 'ORRU_GROW_COST', 'ORRU_QUEST_GOAL', 'orruGrow', 'orruCanGrow', 'clearVines', 'deliverOrruQuest', 'rescueStage', 'currentCompanion', 'chooseCompanion', 'activeTasks', 'gainXP', 'trailInfo', 'isTrail', 'collected', 'createState', 'merge', 'deliver', 'spawn', 'recycle', 'explore', 'serialize', 'restore'];
vm.runInContext(script.slice(0, uiStart) + '\nglobalThis.game = {' + names.join(',') + '};', context, { timeout: 1000 });
const game = context.game;

test('MVP markup contains game controls and accessible board', () => {
  for (const id of ['board', 'spawnBtn', 'deliverBtn', 'recycleBtn', 'exploreBtn', 'endOverlay', 'resetBtn']) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.match(html, /aria-label="8 by 8 merge board"/);
});

test('a new game starts on an 8×8 board with one small clearing', () => {
  const s = game.createState();
  assert.equal(s.board.length,64);
  assert.equal(s.openCells.length,9);
  assert.equal(s.board.filter(Boolean).length,3);
  assert.equal(game.isGenerator(s.board[27]),true);
  assert.equal(game.TASKS.length, 3);
  assert.equal(s.rescued, false);
  assert.equal(s.explored, false);
});

test('two identical items merge and advance the move counter', () => {
  const s = game.createState();
  assert.equal(game.merge(s,26,34).ok,true);
  assert.equal(s.board[26],null);
  assert.equal(s.board[34].kind,'leaf');
  assert.equal(s.board[34].tier,1);
  assert.equal(s.magic,2);
  assert.equal(s.energy,25);
  assert.equal(s.moves, 1);
});

test('illegal merges do not change items or moves', () => {
  const s = game.createState();
  assert.equal(game.merge(s,18,26).ok,false); // Empty vs item
  assert.equal(game.merge(s,26,26).ok,false); // Same cell
  assert.equal(game.merge(s,-1,26).ok,false); // Out of bounds
  s.board[18]={kind:'leaf',tier:5};s.board[19]={kind:'leaf',tier:5};
  assert.equal(game.merge(s,18,19).ok,false); // Maximum tier
  assert.equal(s.board[18].tier,5);
  assert.equal(s.moves, 0);
});

test('deterministic gathering adds one tier-zero item to an empty tile', () => {
  const s = game.createState();
  const r = game.spawn(s, () => 0);
  assert.equal(r.ok, true);
  assert.equal(s.board[r.index].kind, 'leaf');
  assert.equal(s.board[r.index].tier, 0);
  assert.equal(s.spawns, 1);
});

test('gathering rejects a full board', () => {
  const s = game.createState();
  s.board.fill({ kind: 'glow', tier: 0 });
  assert.equal(game.spawn(s, () => 0).ok, false);
  assert.equal(s.spawns, 0);
});

test('all three completed tasks rescue the creature exactly once', () => {
  const s = game.createState();
  game.TASKS.forEach((task, i) => {
    s.board[i] = { kind: task.kind, tier: task.tier };
    const result = game.deliver(s, i);
    assert.equal(result.ok, true);
    assert.equal(s.board[i], null);
  });
  assert.equal(s.completed.length, 3);
  assert.equal(s.rescued, true);
  s.board[0] = { kind: game.TASKS[0].kind, tier: game.TASKS[0].tier };
  assert.equal(game.deliver(s, 0).ok, false);
  assert.equal(s.completed.length, 3);
});

test('exploration stays locked until creature is rescued', () => {
  const s = game.createState();
  assert.equal(game.explore(s), false);
  assert.equal(s.explored, false);
  s.rescued = true;
  assert.equal(game.explore(s), true);
  assert.equal(s.explored, true);
});

test('saved progress can be restored and malformed saves are rejected', () => {
  const s = game.createState();
  s.moves = 11;
  const copy = game.restore(game.serialize(s));
  assert.equal(copy.moves, 11);
  assert.equal(copy.board.length,64);
  assert.equal(game.restore('{not-json'), null);
  assert.equal(game.restore('{"board":[]}'), null);
  const bad = JSON.parse(game.serialize(s));
  bad.board[0] = { kind: 'unknown', tier: 1 };
  assert.equal(game.restore(JSON.stringify(bad)), null);
});

test('recycling makes a tile empty', () => {
  const s = game.createState();
  assert.equal(game.recycle(s, 0), true);
  assert.equal(s.board[0], null);
  assert.equal(game.recycle(s, 0), false);
});

test('rescue animation targets existing character element and respects reduced motion', () => {
  assert.match(html, /id="character"/);
  assert.doesNotMatch(html, /el\('creature'\)/);
  assert.match(html, /el\('character'\)\.classList\.add\('fx-rescue'\)/);
  assert.match(html, /\.creature\.happy\.fx-rescue/);
  assert.match(html, /prefers-reduced-motion:reduce/);
  assert.match(html, /class="mivra-eye"/);
});

test('Mivra rescue unlocks Moonlit Grove and changes the active tasks', () => {
 const state=game.createState();
 assert.equal(game.explore(state),false);
 for(let i=0;i<game.TASKS.length;i++){
  const t=game.TASKS[i];state.board[i]={kind:t.kind,tier:t.tier};
  assert.equal(game.deliver(state,i).ok,true);
 }
 assert.equal(state.rescued,true);
 assert.equal(game.explore(state),true);
 assert.equal(game.explore(state),false);
 assert.equal(game.activeTasks(state).length,3);
 assert.equal(game.activeTasks(state)[0].tier,3);
});

test('Bloom, Moonwell, and Aurora rescue Orru exactly once', () => {
 const state=game.createState();state.rescued=true;
 assert.equal(game.explore(state),true);
 for(let i=0;i<game.GROVE_TASKS.length;i++){
  const t=game.GROVE_TASKS[i];state.board[i]={kind:t.kind,tier:t.tier};
  const result=game.deliver(state,i);
  assert.equal(result.ok,true);
  assert.equal(result.friend,'Orru');
 }
 assert.equal(state.orruRescued,true);
 assert.equal(state.groveCompleted.length,3);
 assert.equal(game.collected(state).filter(x=>x.unlocked).length,2);
 state.board[0]={kind:'leaf',tier:3};
 assert.equal(game.deliver(state,0).ok,false);
});

test('legacy v0.3 saves migrate without deleting items or progress', () => {
 const legacy=game.createState();
 delete legacy.groveCompleted;delete legacy.orruRescued;
 legacy.rescued=true;legacy.completed=['heal','drink','light'];
 legacy.explored=true;
 const loaded=game.restore(JSON.stringify(legacy));
 assert.ok(loaded);
 assert.equal(loaded.rescued,true);
 assert.equal(loaded.explored,true);
 assert.equal(loaded.orruRescued,false);
 assert.equal(loaded.board.length,64);
 assert.equal(loaded.groveCompleted.length,0);
});

test('new chapter 2 interface and modal are present and dismissible', () => {
 for(const id of ['collection','collectionCount','worldHint','sceneLabel','tasksTitle','overlayTitle','overlayText'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/el\('endOverlay'\)\.hidden=true/);
 assert.doesNotMatch(html,/if\(state\.explored\)el\('endOverlay'\)\.hidden=false/);
});

test('restoration trail unlocks only after rescuing Orru', () => {
 const s=game.createState();
 assert.equal(game.isTrail(s),false);
 s.rescued=true;s.explored=true;s.orruRescued=true;
 assert.equal(game.isTrail(s),true);
 assert.equal(game.activeTasks(s).length,3);
 assert.equal(game.trailInfo(s).name,'Whispering Bridge');
});

test('restoration quests advance through all 3 zones exactly once', () => {
 const s=game.createState();s.rescued=true;s.explored=true;s.orruRescued=true;
 for(let zone=0;zone<3;zone++){
  // This test focuses on quest-stage progression; puzzle clearing is covered separately below.
  s.puzzleZone=zone;s.blockers=[];
  for(let i=0;i<3;i++){
   const task=game.TRAIL[zone].tasks[i];
   s.board[i]={kind:task.kind,tier:task.tier};
   const result=game.deliver(s,i);
   assert.equal(result.ok,true);
   assert.equal(result.completedStage,i===2);
   if(i<2)assert.equal(s.trailIndex,zone);
  }
  assert.equal(s.trailIndex,zone+1);
  assert.equal(s.trailCompleted.length,0);
 }
 assert.equal(game.activeTasks(s).length,0);
 s.board[0]={kind:'glow',tier:3};
 assert.equal(game.deliver(s,0).ok,false);
 assert.equal(s.trailIndex,3);
 assert.ok(s.xp>=300);
});

test('merges grant XP and rescued friends give periodic free items', () => {
 const s=game.createState();
 const first=game.merge(s,0,1);
 assert.equal(first.ok,true);assert.ok(s.xp>0);
 s.rescued=true;s.orruRescued=true;
 assert.equal(game.chooseCompanion(s,'orru'),true);
 s.spawns=7;
 const result=game.spawn(s,()=>0);
 assert.equal(result.ok,true);
 assert.equal(result.helper,'Orru');
 assert.equal(s.bonusItems,1);
 assert.equal(s.spawns,8);
 assert.equal(s.board.filter(Boolean).length,10); // initial 9, merged 2->1, then 2 spawned
});

test('XP levels advance at 75 points with no level gaps', () => {
 const s=game.createState();
 assert.equal(s.level,1);
 game.gainXP(s,75);
 assert.equal(s.level,2);
 game.gainXP(s,150);
 assert.equal(s.level,4);
});

test('old v0.4 saves migrate to restoration progression without resetting board', () => {
 const s=game.createState();
 s.rescued=true;s.explored=true;s.orruRescued=true;
 s.completed=['heal','drink','light'];
 s.groveCompleted=['grove-bloom','grove-well','grove-aurora'];
 delete s.trailIndex;delete s.trailCompleted;delete s.xp;delete s.level;delete s.bonusItems;
 const loaded=game.restore(JSON.stringify(s));
 assert.ok(loaded);assert.equal(loaded.rescued,true);
 assert.equal(loaded.orruRescued,true);
 assert.equal(loaded.trailIndex,0);
 assert.equal(loaded.board.length,64);
 assert.equal(loaded.level,1);
});

test('level, restoration map and creature collection UI exist', () => {
 for(const id of ['trailPanel','trailStops','trailCount','trailDescription','levelLabel','xpLabel','levelBar'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/r\.completedStage/);
 assert.match(html,/r\.helper/);
});

test('merge garden uses semantic item colours and a clear legend', () => {
 for(const cls of ['legend-leaf','legend-dew','legend-glow','board-frame','board-caption','tier-pips'])
  assert.match(html,new RegExp(cls));
 assert.match(html,/\.tile\.leaf\{/);
 assert.match(html,/\.tile\.dew\{/);
 assert.match(html,/\.tile\.glow\{/);
});

test('matching item highlighting supports group selection and Wild Wisps', () => {
 assert.match(html,/compatible=isWild\(item\)\|\|isWild\(picked\)/);
 assert.match(html,/cell\.classList\.add\('merge-match'\)/);
 assert.match(html,/groupSelected\.includes\(i\)/);
 assert.match(html,/aria-pressed/);
 assert.match(html,/prefers-reduced-motion:reduce/);
});

test('rescue stages follow delivered items in either chapter', () => {
 const gameState=game.createState();
 assert.equal(game.rescueStage(gameState,'mivra'),0);
 for(let i=0;i<game.TASKS.length;i++){
  const t=game.TASKS[i];gameState.board[i]={kind:t.kind,tier:t.tier};
  assert.equal(game.deliver(gameState,i).ok,true);
  assert.equal(game.rescueStage(gameState,'mivra'),i+1);
 }
 game.explore(gameState);
 for(let i=0;i<game.GROVE_TASKS.length;i++){
  const t=game.GROVE_TASKS[i];gameState.board[i]={kind:t.kind,tier:t.tier};
  assert.equal(game.deliver(gameState,i).ok,true);
  assert.equal(game.rescueStage(gameState,'orru'),i+1);
 }
});

test('only rescued creatures can be selected and saved', () => {
 const state=game.createState();
 assert.equal(game.chooseCompanion(state,'mivra'),false);
 assert.equal(game.chooseCompanion(state,'orru'),false);
 assert.equal(game.chooseCompanion(state,'unknown'),false);
 state.rescued=true;
 assert.equal(game.chooseCompanion(state,'mivra'),true);
 assert.equal(game.currentCompanion(state),'mivra');
 state.explored=true;state.groveCompleted=['grove-bloom','grove-well','grove-aurora'];state.orruRescued=true;
 assert.equal(game.chooseCompanion(state,'orru'),true);
 assert.equal(game.currentCompanion(state),'orru');
 assert.equal(game.restore(game.serialize(state)).activeCompanion,'orru');
});

test('selected Mivra gives Spark and selected Orru gives Seed every eighth gather', () => {
 const state=game.createState();state.rescued=true;state.orruRescued=true;
 assert.equal(game.chooseCompanion(state,'mivra'),true);
 state.spawns=7;
 let result=game.spawn(state,()=>0);
 assert.equal(result.helper,'Mivra');
 assert.equal(state.board[result.bonusIndex].kind,'glow');
 assert.equal(game.chooseCompanion(state,'orru'),true);
 state.spawns=15;
 result=game.spawn(state,()=>0);
 assert.equal(result.helper,'Orru');
 assert.equal(state.board[result.bonusIndex].kind,'leaf');
 assert.equal(state.bonusItems,2);
});

test('bonus is skipped transparently if only one free tile remains', () => {
 const state=game.createState();state.rescued=true;
 assert.equal(game.chooseCompanion(state,'mivra'),true);
 state.board.fill({kind:'leaf',tier:0});
 state.board[0]=null;state.spawns=7;
 const result=game.spawn(state,()=>0);
 assert.equal(result.ok,true);
 assert.equal(result.bonusSkipped,true);
 assert.equal(result.helper,null);
 assert.equal(state.bonusItems,0);
});

test('v0.6 save migration keeps existing progress and assigns a rescued companion', () => {
 const old=game.createState();old.rescued=true;old.explored=true;old.orruRescued=true;
 old.groveCompleted=['grove-bloom','grove-well','grove-aurora'];
 delete old.activeCompanion;
 old.trailIndex=1;old.xp=165;old.level=3;
 const restored=game.restore(JSON.stringify(old));
 assert.equal(restored.activeCompanion,'mivra');
 assert.equal(restored.orruRescued,true);
 assert.equal(restored.trailIndex,1);
 assert.equal(restored.xp,165);
});

test('Sanctuary profiles and visual rescue stages are in the interface', () => {
 for(const id of ['creatureOverlay','creaturePortrait','creatureTitle','creatureRole','creatureAbility','companionSelect','creatureClose','rescueVeil','sceneEffect'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/stage-\x27\+i/);
 assert.match(html,/CREATURE SANCTUARY/);
 assert.match(html,/MIVRA_ART:ORRU_ART/);
 assert.match(html,/prefers-reduced-motion:reduce/);
});

test('Orru Grow must be active, charge by merging and create a free Seed', () => {
 const st=game.createState();st.rescued=true;st.explored=true;st.orruRescued=true;
 assert.equal(game.orruGrow(st).ok,false);
 assert.equal(game.chooseCompanion(st,'orru'),true);
 assert.equal(game.orruGrow(st).ok,false);
 st.orruCharge=3;
 assert.equal(game.merge(st,0,1).ok,true);
 assert.equal(st.orruCharge,4);
 const r=game.orruGrow(st);assert.equal(r.ok,true);
 assert.equal(st.board[r.index].kind,'leaf');
 assert.equal(st.board[r.index].tier,0);
 assert.equal(st.orruCharge,0);
});
test('Orru Grow never charges against or replaces board items on full board', () => {
 const st=game.createState();st.rescued=true;st.orruRescued=true;st.orruCharge=4;
 game.chooseCompanion(st,'orru');
 st.board.fill({kind:'leaf',tier:0});
 assert.equal(game.orruGrow(st).ok,false);
 assert.equal(st.orruCharge,4);
});
test('Clear Vines grants one-time Water and XP only with active Orru', () => {
 const st=game.createState();st.rescued=true;st.orruRescued=true;
 assert.equal(game.clearVines(st).ok,false);
 game.chooseCompanion(st,'orru');
 const r=game.clearVines(st);assert.equal(r.ok,true);
 assert.equal(st.vinesCleared,true);
 assert.equal(st.board[r.index].kind,'dew');
 assert.equal(st.board[r.index].tier,1);
 assert.equal(st.xp,50);
 assert.equal(game.clearVines(st).ok,false);
 assert.equal(st.xp,50);
});
test('Forest Remedy accepts exactly two Herbs and gives one Bloom', () => {
 const st=game.createState();st.rescued=true;st.orruRescued=true;
 st.board[0]={kind:'dew',tier:2};
 assert.equal(game.deliverOrruQuest(st,0).ok,false);
 st.board[0]={kind:'leaf',tier:2};
 assert.equal(game.deliverOrruQuest(st,0).ok,true);
 assert.equal(st.orruQuestCount,1);assert.equal(st.board[0],null);
 st.board[0]={kind:'leaf',tier:2};
 const r=game.deliverOrruQuest(st,0);
 assert.equal(r.ok,true);assert.equal(r.completed,true);
 assert.equal(st.board[0].tier,3);assert.equal(st.orruQuestCount,2);
 assert.equal(game.deliverOrruQuest(st,0).ok,false);
});
test('v0.7 save migration preserves existing board, XP and rescued companions', () => {
 const st=game.createState();st.rescued=true;st.explored=true;
 st.groveCompleted=['grove-bloom','grove-well','grove-aurora'];st.orruRescued=true;
 st.activeCompanion='orru';st.xp=210;st.trailIndex=2;
 delete st.orruCharge;delete st.vinesCleared;delete st.orruQuestCount;
 const restored=game.restore(JSON.stringify(st));
 assert.equal(restored.activeCompanion,'orru');
 assert.equal(restored.xp,210);assert.equal(restored.trailIndex,2);
 assert.equal(restored.orruCharge,0);assert.equal(restored.orruQuestCount,0);
 assert.equal(restored.vinesCleared,false);
});
test('Orru controls and complete inline JavaScript render with no parse failure', () => {
 for(const id of ['growBtn','vinesBtn','orruQuestBtn','orruQuestStatus','orruPanel'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.doesNotThrow(()=>new vm.Script(script));
});

test('v1 restoration region seeds real blockers on empty board cells', () => {
 const st=game.createState();st.rescued=true;st.explored=true;st.orruRescued=true;
 game.ensurePuzzle(st);
 assert.equal(st.puzzleZone,0);
 assert.equal(st.blockers.length,5);
 assert.ok(st.blockers.every(b=>b.type==='vine'));
 assert.ok(st.blockers.every(b=>st.board[b.index]===null));
 assert.equal(game.puzzleReady(st),false);
});

test('quest delivery is locked until region blockers are cleared', () => {
 const st=game.createState();st.rescued=true;st.explored=true;st.orruRescued=true;
 game.ensurePuzzle(st);
 const task=game.TRAIL[0].tasks[0];
 const index=st.board.findIndex((v,i)=>v===null&&!game.isBlocked(st,i));
 st.board[index]={kind:task.kind,tier:task.tier};
 const blocked=game.deliver(st,index);
 assert.equal(blocked.ok,false);
 assert.match(blocked.why,/blockers/i);
 st.blockers=[];
 assert.equal(game.deliver(st,index).ok,true);
});

test('five successful merges charge companion skill and invalid merge breaks combo', () => {
 const st=game.createState();st.rescued=true;st.explored=true;st.orruRescued=true;
 st.puzzleZone=0;st.blockers=[];
 for(let n=0;n<5;n++){
  st.board[n*2]={kind:'leaf',tier:0};st.board[n*2+1]={kind:'leaf',tier:0};
  const r=game.merge(st,n*2,n*2+1);
  assert.equal(r.ok,true);
 }
 assert.equal(st.skillCharge,game.SKILL_MAX);
 assert.equal(st.combo,5);
 const bad=game.merge(st,0,2);
 assert.equal(bad.ok,false);
 assert.equal(st.combo,0);
 assert.equal(st.skillCharge,game.SKILL_MAX);
});

test('Orru clears vines while Mivra clears fog and mixed gate needs both', () => {
 const st=game.createState();st.rescued=true;st.explored=true;st.orruRescued=true;
 st.trailIndex=2;game.seedPuzzle(st);
 assert.ok(st.blockers.some(b=>b.type==='vine'));
 assert.ok(st.blockers.some(b=>b.type==='fog'));
 game.chooseCompanion(st,'orru');st.skillCharge=game.SKILL_MAX;
 let r=game.useCompanionSkill(st);assert.equal(r.ok,true);assert.equal(r.companion,'orru');
 assert.ok(st.blockers.every(b=>b.type==='fog'));
 st.skillCharge=game.SKILL_MAX;
 r=game.useCompanionSkill(st);assert.equal(r.ok,false);assert.match(r.why,/Mivra/);
 game.chooseCompanion(st,'mivra');st.skillCharge=game.SKILL_MAX;
 r=game.useCompanionSkill(st);assert.equal(r.ok,true);
 assert.equal(st.blockers.length,0);assert.equal(r.cleared,true);
});

test('zone completion seeds the next region puzzle', () => {
 const st=game.createState();st.rescued=true;st.explored=true;st.orruRescued=true;
 st.puzzleZone=0;st.blockers=[];
 for(let i=0;i<3;i++){
  const t=game.TRAIL[0].tasks[i];st.board[i]={kind:t.kind,tier:t.tier};
  assert.equal(game.deliver(st,i).ok,true);
 }
 assert.equal(st.trailIndex,1);
 assert.equal(st.puzzleZone,1);
 assert.equal(st.blockers.length,5);
 assert.ok(st.blockers.every(b=>b.type==='fog'));
});

test('v0.8 saves migrate into v1 puzzle fields without losing progress', () => {
 const st=game.createState();st.rescued=true;st.explored=true;
 st.groveCompleted=['grove-bloom','grove-well','grove-aurora'];st.orruRescued=true;
 st.trailIndex=1;st.xp=234;delete st.puzzleZone;delete st.blockers;delete st.runesFound;delete st.combo;delete st.skillCharge;
 const loaded=game.restore(JSON.stringify(st));
 assert.equal(loaded.trailIndex,1);assert.equal(loaded.xp,234);
 assert.equal(loaded.puzzleZone,-1);assert.equal(loaded.blockers.length,0);
 assert.equal(loaded.combo,0);assert.equal(loaded.skillCharge,0);
 game.ensurePuzzle(loaded);
 assert.equal(loaded.puzzleZone,1);assert.equal(loaded.blockers.length,5);
});

test('v1 puzzle HUD, blockers and companion skill controls exist', () => {
 for(const id of ['puzzleHud','puzzleName','puzzleHint','blockerCount','comboLabel','skillLabel','skillBtn'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/fog-blocker/);assert.match(html,/vine-blocker/);
 assert.match(html,/puzzle-locked/);assert.match(html,/puzzle-ready/);
 assert.doesNotThrow(()=>new vm.Script(script));
});

test('embedded Spirit Tree spends energy and creates a Seed in the open clearing', () => {
 const st=game.createState();
 const r=game.activateGenerator(st,27,()=>0);
 assert.equal(r.ok,true);
 assert.equal(st.board[r.index].kind,'leaf');assert.equal(st.board[r.index].tier,0);
 assert.equal(st.energy,game.INITIAL_ENERGY-1);
 assert.equal(game.isOpen(st,r.index),true);
});

test('locked frontier costs Magic and opens one tile at a time', () => {
 const st=game.createState();
 assert.equal(game.isFrontierCell(st,17),true);
 const cost=game.unlockCost(st,17);assert.equal(cost,4);
 assert.equal(game.unlockCell(st,17).ok,false);
 st.magic=cost;
 const r=game.unlockCell(st,17);
 assert.equal(r.ok,true);assert.equal(st.magic,0);assert.equal(game.isOpen(st,17),true);
 assert.equal(r.reveal.type,'web');assert.equal(game.isWebbed(st,17),true);
});

test('pair merges earn Magic and recover one energy', () => {
 const st=game.createState();st.energy=10;
 const r=game.merge(st,26,34);
 assert.equal(r.ok,true);assert.equal(r.magicGain,2);
 assert.equal(st.magic,2);assert.equal(st.energy,11);
 assert.equal(st.board[r.target].tier,1);
});

test('webbed item is freed by merging it with a matching item', () => {
 const st=game.createState();st.magic=4;game.unlockCell(st,17);
 assert.equal(game.isWebbed(st,17),true);
 st.board[18]={kind:'leaf',tier:1};
 const r=game.merge(st,18,17);
 assert.equal(r.ok,true);assert.equal(r.webCleared,true);
 assert.equal(game.isWebbed(st,17),false);
 assert.equal(st.board[17].tier,2);
});

test('unlocking special frontier tiles can reveal generators and blockers', () => {
 const st=game.createState();
 st.magic=20;
 let r=game.unlockCell(st,21);
 assert.equal(r.ok,true);assert.equal(r.reveal.type,'generator');
 assert.equal(game.isGenerator(st.board[21]),true);assert.equal(st.board[21].kind,'dew');
 st.magic=20;r=game.unlockCell(st,25);
 assert.equal(r.ok,true);assert.equal(r.reveal.type,'blocker');
 assert.ok(st.blockers.some(b=>b.index===25&&b.type==='fog'));
});

test('locked cells cannot be merged or used as generator output', () => {
 const st=game.createState();
 st.board[0]={kind:'leaf',tier:0};
 assert.equal(game.merge(st,0,26).ok,false);
 for(let i=0;i<20;i++){
  const r=game.activateGenerator(st,27,()=>0);
  if(!r.ok)break;
  assert.equal(game.isOpen(st,r.index),true);
 }
});

test('six-tier chains include meaningful late-game items', () => {
 assert.equal(game.SIZE,8);
 assert.equal(game.CELL_REVEALS[17].type,'web');
 assert.equal(game.GENERATORS.leaf.kind,'leaf');
 assert.match(html,/Ancient Blossom/);
 assert.match(html,/Celestial Water/);
 assert.match(html,/Star Core/);
});

test('legacy 6x6 save migrates to 8x8 without dropping its existing items', () => {
 const old=game.createState();
 const legacyBoard=Array(36).fill(null);
 legacyBoard[0]={kind:'leaf',tier:1};legacyBoard[8]={kind:'dew',tier:2};legacyBoard[20]={kind:'glow',tier:3};
 old.board=legacyBoard;delete old.openCells;delete old.webbed;delete old.magic;delete old.energy;delete old.maxEnergy;
 const loaded=game.restore(JSON.stringify(old));
 assert.ok(loaded);assert.equal(loaded.board.length,64);
 assert.equal(loaded.board.filter(Boolean).length,4);
 assert.ok(loaded.openCells.length>=9);
 assert.equal(loaded.energy,game.INITIAL_ENERGY);assert.equal(loaded.magic,0);
});

test('Merge Board 2.0 interface exposes resources, locked 8x8 board and parses fully', () => {
 for(const id of ['resourceBar','energyLabel','magicLabel','openLabel','board'])
  assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/8 × 8/);assert.match(html,/tile locked/);assert.match(html,/webbed/);assert.match(html,/generator/);
 assert.doesNotThrow(()=>new vm.Script(script));
});

