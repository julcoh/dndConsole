import { wizardData, updateSkillProficiency } from '../wizardState';
import type { Skill, Ability, ProficiencyLevel } from '../../../types';

const SKILLS: { key: Skill; name: string; ability: Ability }[] = [
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

export function SkillsStep() {
  const data = wizardData.value;
  const skills: Partial<Record<Skill, ProficiencyLevel>> = data.skillProficiencies || {};

  const proficientCount = Object.values(skills).filter(v => v === 'proficient' || v === 'expertise').length;

  const toggleSkill = (skill: Skill) => {
    const current = skills[skill] || 'none';
    // Cycle: none -> proficient -> expertise -> none
    const next = current === 'none' ? 'proficient' : current === 'proficient' ? 'expertise' : 'none';
    updateSkillProficiency(skill, next);
  };

  return (
    <div class="wizard-step">
      <h2 class="wizard-step__title">Skills</h2>
      <p class="wizard-step__desc">
        Click to cycle: None \u2192 Proficient (\u25CF) \u2192 Expertise (\u25C6)
      </p>
      <p class="wizard-step__desc">
        <strong>{proficientCount}</strong> skills selected
      </p>

      <div class="skills-grid">
        {SKILLS.map(({ key, name, ability }) => {
          const level = skills[key] || 'none';
          return (
            <button
              key={key}
              type="button"
              class={`skill-toggle skill-toggle--${level}`}
              onClick={() => toggleSkill(key)}
            >
              <span class="skill-toggle__indicator">
                {level === 'proficient' ? '\u25CF' : level === 'expertise' ? '\u25C6' : '\u25CB'}
              </span>
              <span class="skill-toggle__name">{name}</span>
              <span class="skill-toggle__ability">{ability.toUpperCase()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
