import { currentDefinition } from '../../state';
import { getSaveModifier, formatModifier, getProficiencyBonus, getTotalLevel } from '../../utils/derived';
import { rollD20, type RollResult } from '../../utils/dice';
import { currentRoll, addToHistory, globalAdvantage } from '../rolls';
import type { Ability } from '../../types';

const SAVES: { key: Ability; name: string }[] = [
  { key: 'str', name: 'Strength' },
  { key: 'dex', name: 'Dexterity' },
  { key: 'con', name: 'Constitution' },
  { key: 'int', name: 'Intelligence' },
  { key: 'wis', name: 'Wisdom' },
  { key: 'cha', name: 'Charisma' }
];

export function SavingThrows() {
  const def = currentDefinition.value;
  if (!def) return null;

  const level = getTotalLevel(def.classes);
  const profBonus = getProficiencyBonus(level);

  const handleRoll = (name: string, mod: number) => {
    const advantage = globalAdvantage.value;
    const d20 = rollD20(advantage);
    const total = d20.result + mod;
    const result: RollResult = {
      dice: [{ sides: 20, result: d20.result, wasRerolled: false }],
      bonus: mod,
      total,
      expression: '1d20'
    };
    const label = `${name} Save`;
    currentRoll.value = { result, type: 'save', label };
    addToHistory({ result, type: 'save', label, timestamp: Date.now() });
  };

  return (
    <div class="saving-throws card">
      <h3 class="saving-throws__title">Saving Throws</h3>
      <div class="saving-throws__list">
        {SAVES.map(({ key, name }) => {
          const proficiency = def.savingThrowProficiencies[key];
          const mod = getSaveModifier(def.abilityScores[key], proficiency, profBonus);
          const isProficient = proficiency !== 'none';
          const isExpertise = proficiency === 'expertise';

          return (
            <button
              key={key}
              class={`saving-throw saving-throw--clickable ${isProficient ? 'saving-throw--proficient' : ''}`}
              onClick={() => handleRoll(name, mod)}
            >
              <span class="saving-throw__indicator">
                {isExpertise ? '\u25C6' : isProficient ? '\u25CF' : '\u25CB'}
              </span>
              <span class="saving-throw__mod">{formatModifier(mod)}</span>
              <span class="saving-throw__name">{name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
