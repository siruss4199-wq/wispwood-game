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
const uiStart = script.indexOf("const KEY='wispwood-prototype-v1'");
assert.ok(uiStart > 0, 'Could not find boundary between game rules and browser UI');
const context = vm.createContext({});
const names = ['SIZE', 'KINDS', 'TASKS', 'createState', 'merge', 'deliver', 'spawn', 'recycle', 'explore', 'serialize', 'restore'];
vm.runInContext(script.slice(0, uiStart) + '\nglobalThis.game = {' + names.join(',') + '};', context, { timeout: 1000 });
const game = context.game;

test('MVP markup contains game controls and accessible board', () => {
  for (const id of ['board', 'spawnBtn', 'deliverBtn', 'recycleBtn', 'exploreBtn', 'endOverlay', 'resetBtn']) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
  assert.match(html, /aria-label="6 by 6 merge board"/);
});

test('a new game has a 6×6 grid, 3 tasks, and no rescue progress', () => {
  const s = game.createState();
  assert.equal(s.board.length, 36);
  assert.equal(s.board.filter(Boolean).length, 9);
  assert.equal(game.TASKS.length, 3);
  assert.equal(s.rescued, false);
  assert.equal(s.explored, false);
});

test('two identical items merge and advance the move counter', () => {
  const s = game.createState();
  assert.equal(game.merge(s, 0, 1).ok, true);
  assert.equal(s.board[0], null);
  assert.equal(s.board[1].kind, 'leaf');
  assert.equal(s.board[1].tier, 1);
  assert.equal(s.moves, 1);
});

test('illegal merges do not change items or moves', () => {
  const s = game.createState();
  assert.equal(game.merge(s, 0, 6).ok, false); // Different kind
  assert.equal(game.merge(s, 0, 0).ok, false); // Same cell
  assert.equal(game.merge(s, -1, 1).ok, false); // Out of bounds
  s.board[2] = { kind: 'leaf', tier: 3 };
  s.board[3] = { kind: 'leaf', tier: 3 };
  assert.equal(game.merge(s, 2, 3).ok, false); // Maximum tier
  assert.equal(s.board[2].tier, 3);
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
  assert.equal(copy.board.length, 36);
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
