import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { moveName, speakingOrder } from '../src/order.js';

const NAMES = ['Aidan', 'Bernardo', 'Fabio', 'Michele', 'Simone', 'Valentina'];
const people = (names) => names.map((name, index) => ({ id: `id-${index}`, name }));
const names = (participants) => participants.map((participant) => participant.name);
const NO_RULES = { seed: 'turnly:abc-defg-hij:2026-11-23', first: null, last: null, skip: [], manualOrder: null };

function order(participants, rules = {}) {
  const { queue, skipped } = speakingOrder(participants, { ...NO_RULES, ...rules });
  return { queue: names(queue), skipped: names(skipped) };
}

describe('speakingOrder', () => {
  it('gives the same order whatever order the participants are found in', () => {
    const forward = order(people(NAMES)).queue;
    const backward = order(people([...NAMES].reverse())).queue;
    assert.deepEqual(forward, backward);
  });

  it('shuffles differently on another day', () => {
    const today = order(people(NAMES)).queue;
    const tomorrow = order(people(NAMES), { seed: 'turnly:abc-defg-hij:2026-11-24' }).queue;
    assert.notDeepEqual(today, tomorrow);
  });

  it('keeps everyone else in place when someone joins or leaves', () => {
    const everyone = order(people(NAMES)).queue;
    const withoutFabio = order(people(NAMES.filter((name) => name !== 'Fabio'))).queue;
    assert.deepEqual(withoutFabio, everyone.filter((name) => name !== 'Fabio'));
  });

  it('puts the pinned people first and last', () => {
    const { queue } = order(people(NAMES), { first: 'Simone', last: 'Aidan' });
    assert.equal(queue[0], 'Simone');
    assert.equal(queue.at(-1), 'Aidan');
    assert.equal(queue.length, NAMES.length);
  });

  it('ignores a pinned person who is absent', () => {
    const present = people(NAMES.filter((name) => name !== 'Simone'));
    const { queue } = order(present, { first: 'Simone' });
    assert.deepEqual(queue, order(present).queue);
  });

  it('leaves skipped people out of the queue', () => {
    const { queue, skipped } = order(people(NAMES), { skip: ['Fabio'] });
    assert.equal(queue.includes('Fabio'), false);
    assert.deepEqual(skipped, ['Fabio']);
  });

  it('follows the manual order of the day', () => {
    const manualOrder = [...NAMES].reverse();
    assert.deepEqual(order(people(NAMES), { manualOrder }).queue, manualOrder);
  });

  it('places a late joiner where the shuffle puts them relative to the manual order', () => {
    const shuffled = order(people(NAMES)).queue;
    const lateJoiner = shuffled[2];
    const manualOrder = shuffled.filter((name) => name !== lateJoiner);
    assert.deepEqual(order(people(NAMES), { manualOrder }).queue, shuffled);
  });

  it('keeps pinned people in place over the manual order', () => {
    const manualOrder = [...NAMES].reverse();
    const { queue } = order(people(NAMES), { first: 'Simone', last: 'Aidan', manualOrder });
    assert.equal(queue[0], 'Simone');
    assert.equal(queue.at(-1), 'Aidan');
    assert.deepEqual(queue.slice(1, -1), manualOrder.filter((name) => !['Simone', 'Aidan'].includes(name)));
  });

  it('keeps the pinned last person last when someone joins after a manual change', () => {
    const before = order(people(NAMES.filter((name) => name !== 'Bernardo')), { last: 'Aidan' }).queue;
    const manualOrder = moveName(before, 0, 1);
    const { queue } = order(people(NAMES), { last: 'Aidan', manualOrder });
    assert.equal(queue.at(-1), 'Aidan');
    assert.equal(queue.length, NAMES.length);
  });

  it('keeps people who share a name apart', () => {
    const twins = [
      { id: 'b', name: 'Andrea' },
      { id: 'a', name: 'Andrea' },
    ];
    assert.deepEqual(
      speakingOrder(twins, NO_RULES).queue.map((participant) => participant.id),
      ['a', 'b'],
    );
  });
});

describe('moveName', () => {
  it('swaps an entry with its neighbour', () => {
    assert.deepEqual(moveName(['a', 'b', 'c'], 1, -1), ['b', 'a', 'c']);
    assert.deepEqual(moveName(['a', 'b', 'c'], 1, 1), ['a', 'c', 'b']);
  });

  it('leaves the list unchanged at either end', () => {
    assert.deepEqual(moveName(['a', 'b'], 0, -1), ['a', 'b']);
    assert.deepEqual(moveName(['a', 'b'], 1, 1), ['a', 'b']);
  });
});
