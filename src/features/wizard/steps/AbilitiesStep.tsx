import { wizardData, updateAbilityScore } from '../wizardState';
import type { Ability } from '../../../types';
import { getAbilityModifier } from '../../../types';

const ABILITIES: { key: Ability; name: string; desc: string }[] = [
  { key: 'str', name: 'Strength', desc: 'Physical power' },
  { key: 'dex', name: 'Dexterity', desc: 'Agility & reflexes' },
  { key: 'con', name: 'Constitution', desc: 'Health & stamina' },
  { key: 'int', name: 'Intelligence', desc: 'Reasoning & memory' },
  { key: 'wis', name: 'Wisdom', desc: 'Perception & insight' },
  { key: 'cha', name: 'Charisma', desc: 'Force of personality' }
];

function formatModifier(score: number): string {
  const mod = getAbilityModifier(score);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function AbilitiesStep() {
  const data = wizardData.value;
  const scores = data.abilityScores || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };

  const handleScoreChange = (ability: Ability, value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue >= 1 && numValue <= 30) {
      updateAbilityScore(ability, numValue);
    }
  };

  // Standard array preset
  const applyStandardArray = () => {
    const standardArray = [15, 14, 13, 12, 10, 8];
    ABILITIES.forEach((ab, i) => {
      updateAbilityScore(ab.key, standardArray[i]);
    });
  };

  // Point buy default (all 8s)
  const resetToEights = () => {
    ABILITIES.forEach(ab => {
      updateAbilityScore(ab.key, 8);
    });
  };

  return (
    <div class="wizard-step">
      <h2 class="wizard-step__title">Ability Scores</h2>

      <div class="wizard-step__presets">
        <button class="btn btn--sm btn--secondary" onClick={applyStandardArray}>
          Standard Array
        </button>
        <button class="btn btn--sm btn--secondary" onClick={resetToEights}>
          Reset to 8s
        </button>
      </div>

      <div class="ability-grid">
        {ABILITIES.map(({ key, name, desc }) => (
          <div key={key} class="ability-input">
            <label class="ability-input__label">
              <span class="ability-input__name">{name}</span>
              <span class="ability-input__desc">{desc}</span>
            </label>
            <div class="ability-input__controls">
              <button
                class="ability-input__btn"
                onClick={() => updateAbilityScore(key, Math.max(1, scores[key] - 1))}
                disabled={scores[key] <= 1}
              >
                -
              </button>
              <input
                type="number"
                class="ability-input__value"
                value={scores[key]}
                min={1}
                max={30}
                onChange={(e) => handleScoreChange(key, (e.target as HTMLInputElement).value)}
              />
              <button
                class="ability-input__btn"
                onClick={() => updateAbilityScore(key, Math.min(30, scores[key] + 1))}
                disabled={scores[key] >= 30}
              >
                +
              </button>
            </div>
            <span class="ability-input__mod">{formatModifier(scores[key])}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
