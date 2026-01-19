import { currentDefinition, currentSession, modifyResource } from '../../state';

interface ResourcePoolProps {
  resourceId: string;
  compact?: boolean;
}

export function ResourcePool({ resourceId, compact = false }: ResourcePoolProps) {
  const def = currentDefinition.value;
  const session = currentSession.value;

  if (!def || !session) return null;

  const resourceDef = def.resourceDefinitions.find(r => r.id === resourceId);
  if (!resourceDef) return null;

  const current = session.resourceCurrents[resourceId] ?? resourceDef.maximum;
  const max = resourceDef.maximum;

  if (compact) {
    return (
      <div class="resource-pool resource-pool--compact">
        <span class="resource-pool__name">{resourceDef.name}</span>
        <div class="resource-pool__pips">
          {Array.from({ length: max }, (_, i) => (
            <button
              key={i}
              class={`resource-pool__pip ${i < current ? 'resource-pool__pip--filled' : ''}`}
              onClick={() => modifyResource(resourceId, i < current ? -1 : 1)}
            >
              ●
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div class="resource-pool card">
      <div class="resource-pool__header">
        <span class="resource-pool__name">{resourceDef.name}</span>
        <span class="resource-pool__count">{current}/{max}</span>
      </div>

      {max <= 10 ? (
        <div class="resource-pool__pips">
          {Array.from({ length: max }, (_, i) => (
            <button
              key={i}
              class={`resource-pool__pip ${i < current ? 'resource-pool__pip--filled' : ''}`}
              onClick={() => modifyResource(resourceId, i < current ? -1 : 1)}
            >
              ●
            </button>
          ))}
        </div>
      ) : (
        <div class="resource-pool__buttons">
          <button class="btn btn--small btn--secondary" onClick={() => modifyResource(resourceId, -1)}>−</button>
          <span class="resource-pool__value">{current}</span>
          <button class="btn btn--small btn--secondary" onClick={() => modifyResource(resourceId, 1)}>+</button>
        </div>
      )}
    </div>
  );
}

export function SpellSlots() {
  const def = currentDefinition.value;
  if (!def) return null;

  const spellSlots = def.resourceDefinitions.filter(
    r => r.category === 'spell_slot' || r.category === 'pact_slot'
  );

  if (spellSlots.length === 0) return null;

  return (
    <div class="spell-slots card">
      <h3 class="spell-slots__title">Spell Slots</h3>
      <div class="spell-slots__grid">
        {spellSlots.map(slot => (
          <ResourcePool key={slot.id} resourceId={slot.id} compact />
        ))}
      </div>
    </div>
  );
}
