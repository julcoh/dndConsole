import { currentDefinition } from '../../state';
import { getSkillModifier, formatModifier, getProficiencyBonus, getTotalLevel } from '../../utils/derived';
import { rollD20, type RollResult } from '../../utils/dice';
import { currentRoll, addToHistory, globalAdvantage } from '../rolls';
import type { Skill, Ability } from '../../types';

interface SkillInfo {
  key: Skill;
  name: string;
  ability: Ability;
}

const SKILLS: SkillInfo[] = [
  { key: 'acrobatics', name: 'Acrobatics', ability: 'dex' },
  { key: 'animalHandling', name: 'Animal Handling', ability: 'wis' },
  { key: 'arcana', name: 'Arcana', ability: 'int' },
  { key: 'athletics', name: 'Athletics', ability: 'str' },
  { key: 'deception', name: 'Deception', ability: 'cha' },
  { key: 'history', name: 'History', ability: 'int' },
  { key: 'insight', name: 'Insight', ability: 'wis' },
  { key: 'intimidation', name: 'Intimidation', ability: 'cha' },
  { key: 'investigation', name: 'Investigation', ability: 'int' },
  { key: 'medicine', name: 'Medicine', ability: 'wis' },
  { key: 'nature', name: 'Nature', ability: 'int' },
  { key: 'perception', name: 'Perception', ability: 'wis' },
  { key: 'performance', name: 'Performance', ability: 'cha' },
  { key: 'persuasion', name: 'Persuasion', ability: 'cha' },
  { key: 'religion', name: 'Religion', ability: 'int' },
  { key: 'sleightOfHand', name: 'Sleight of Hand', ability: 'dex' },
  { key: 'stealth', name: 'Stealth', ability: 'dex' },
  { key: 'survival', name: 'Survival', ability: 'wis' }
];

export function Skills() {
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
    currentRoll.value = { result, type: 'check', label: name };
    addToHistory({ result, type: 'check', label: name, timestamp: Date.now() });
  };

  return (
    <div class="skills card">
      <h3 class="skills__title">Skills</h3>
      <div class="skills__list">
        {SKILLS.map(({ key, name, ability }) => {
          const proficiency = def.skillProficiencies[key];
          const mod = getSkillModifier(
            def.abilityScores[ability],
            proficiency,
            profBonus
          );
          const isProficient = proficiency !== 'none';
          const isExpertise = proficiency === 'expertise';

          return (
            <button
              key={key}
              class={`skill skill--clickable ${isProficient ? 'skill--proficient' : ''}`}
              onClick={() => handleRoll(name, mod)}
            >
              <span class="skill__indicator">
                {isExpertise ? '\u25C6' : isProficient ? '\u25CF' : '\u25CB'}
              </span>
              <span class="skill__mod">{formatModifier(mod)}</span>
              <span class="skill__name">{name}</span>
              <span class="skill__ability">({ability.toUpperCase()})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
