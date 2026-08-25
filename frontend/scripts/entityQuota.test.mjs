import assert from 'node:assert/strict';
import { ensureEntityQuota } from '../src/engine/entityQuota.js';

const requested = 18;
const extracted = Array.from({ length: 15 }, (_, i) => ({ id: `entity_${i + 1}` }));
const actual = ensureEntityQuota(extracted, requested);

assert.equal(actual.length, requested, `expected ${requested} entities, got ${actual.length}`);
assert.equal(new Set(actual.map(entity => entity.id)).size, requested, 'entity ids must remain unique');
assert.equal(actual.filter(entity => entity._synthetic).length, 3, 'missing entities should be explicit fallbacks');
