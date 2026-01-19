import { currentDefinition } from '../../state';
import { getAbilityModifier, formatModifier } from '../../utils/derived';
import type { Ability } from '../../types';

const ABILITIES: { key: Ability; name: string }[] = [
  { key: 'str', name: 'STR' },
  { key: 'dex', name: 'DEX' },
  { key: 'con', name: 'CON' },
  { key: 'int', name: 'INT' },
  { key: 'wis', name: 'WIS' },
  { key: 'cha', name: 'CHA' }
];

export function AbilityScores() {
  const def = currentDefinition.value;
  if (!def) return null;

  return (
    <div class="ability-scores">
      {ABILITIES.map(({ key, name }) => {
        const score = def.abilityScores[key];
        const mod = getAbilityModifier(score);

        return (
          <div key={key} class="ability-score">
            <div class="ability-score__name">{name}</div>
            <div class="ability-score__mod">{formatModifier(mod)}</div>
            <div class="ability-score__value">{score}</div>
          </div>
        );
      })}
    </div>
  );
}
