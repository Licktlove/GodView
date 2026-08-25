// Keep the requested entity count explicit at the extraction boundary.
export function uniqueEntities(rawEntities, targetCount) {
  const limit = Math.max(0, Math.floor(Number(targetCount) || 0));
  const seen = new Set();
  return (Array.isArray(rawEntities) ? rawEntities : [])
    .filter(entity => {
      const id = String(entity?.id || '').trim();
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, limit);
}

export function fillEntityQuota(entities, targetCount) {
  const limit = Math.max(0, Math.floor(Number(targetCount) || 0));
  const result = uniqueEntities(entities, limit);
  const used = new Set(result.map(entity => entity.id));
  let sequence = result.length + 1;
  while (result.length < limit) {
    let id = `supplement_entity_${sequence}`;
    while (used.has(id)) {
      sequence += 1;
      id = `supplement_entity_${sequence}`;
    }
    result.push({
      id,
      name: `场景补充实体 ${sequence}`,
      type: '场景补充',
      persona: '参与当前场景并与核心实体发生互动。',
      goal: '补足场景中的影响链路。',
      _synthetic: true,
    });
    used.add(id);
    sequence += 1;
  }
  return result;
}

export function ensureEntityQuota(rawEntities, targetCount) {
  return fillEntityQuota(rawEntities, targetCount);
}
