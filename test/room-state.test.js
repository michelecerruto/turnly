import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { applyChange, emptyState, isValidChange } from '../src/room-state.js';

const A = 'a'.repeat(64);
const B = 'b'.repeat(64);
const TODAY = '2026-11-24';

describe('applyChange', () => {
  it('marks and unmarks a person', () => {
    const marked = applyChange(emptyState(TODAY), { type: 'mark', day: TODAY, person: A, done: true });
    assert.deepEqual(marked.done, [A]);
    const again = applyChange(marked, { type: 'mark', day: TODAY, person: A, done: true });
    assert.deepEqual(again.done, [A]);
    const unmarked = applyChange(again, { type: 'mark', day: TODAY, person: A, done: false });
    assert.deepEqual(unmarked.done, []);
  });

  it('keeps two attendees marking different people at once', () => {
    let state = emptyState(TODAY);
    state = applyChange(state, { type: 'mark', day: TODAY, person: A, done: true });
    state = applyChange(state, { type: 'mark', day: TODAY, person: B, done: true });
    assert.deepEqual(state.done, [A, B]);
  });

  it('starts a new day with no marks and no manual order, but the same rules', () => {
    let state = emptyState('2026-11-23');
    state = applyChange(state, { type: 'mark', day: '2026-11-23', person: A, done: true });
    state = applyChange(state, { type: 'setOrder', day: '2026-11-23', order: [B, A] });
    state = applyChange(state, { type: 'setRules', rules: { first: A, last: null, skip: [B] } });
    state = applyChange(state, { type: 'hello', day: TODAY });
    assert.equal(state.day, TODAY);
    assert.deepEqual(state.done, []);
    assert.equal(state.manualOrder, null);
    assert.deepEqual(state.rules, { first: A, last: null, skip: [B] });
  });

  it('ignores changes for a previous day', () => {
    const state = emptyState(TODAY);
    const stale = applyChange(state, { type: 'mark', day: '2026-11-23', person: A, done: true });
    assert.equal(stale, state);
  });

  it('replaces all marks, for reset and undo', () => {
    const state = applyChange(emptyState(TODAY), { type: 'setDone', day: TODAY, people: [A, B, A] });
    assert.deepEqual(state.done, [A, B]);
  });
});

describe('isValidChange', () => {
  it('accepts well-formed changes', () => {
    assert.ok(isValidChange({ type: 'hello', day: TODAY }));
    assert.ok(isValidChange({ type: 'mark', day: TODAY, person: A, done: true }));
    assert.ok(isValidChange({ type: 'setOrder', day: TODAY, order: [A, B] }));
    assert.ok(isValidChange({ type: 'setRules', rules: { first: null, last: B, skip: [A] } }));
  });

  it('accepts a hello carrying the cached state, and rejects a malformed one', () => {
    const cached = { ...emptyState(TODAY), done: [A], rules: { first: B, last: null, skip: [] } };
    assert.ok(isValidChange({ type: 'hello', day: TODAY, state: cached }));
    assert.equal(isValidChange({ type: 'hello', day: TODAY, state: { ...cached, done: ['Simone'] } }), false);
    assert.equal(isValidChange({ type: 'hello', day: TODAY, state: { ...cached, rules: null } }), false);
  });

  it('rejects anything that is not a token, such as a plain name', () => {
    assert.equal(isValidChange({ type: 'mark', day: TODAY, person: 'Simone', done: true }), false);
    assert.equal(isValidChange({ type: 'setRules', rules: { first: 'Simone', last: null, skip: [] } }), false);
  });

  it('rejects malformed days, unknown types and oversized lists', () => {
    assert.equal(isValidChange({ type: 'hello', day: 'tomorrow' }), false);
    assert.equal(isValidChange({ type: 'drop', day: TODAY }), false);
    assert.equal(isValidChange(null), false);
    assert.equal(isValidChange({ type: 'setDone', day: TODAY, people: Array(501).fill(A) }), false);
  });
});
