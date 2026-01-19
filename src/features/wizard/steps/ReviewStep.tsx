import { wizardData } from '../wizardState';
import type { Ability } from '../../../types';
import { getAbilityModifier } from '../../../types';

const ABILITY_NAMES: Record<Ability, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma'
};

function formatMod(score: number): string {
  const mod = getAbilityModifier(score);
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

export function ReviewStep() {
  const data = wizardData.value;
  const scores = data.abilityScores || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  const currentClass = data.classes?.[0];
  const skills = data.skillProficiencies || {};
  const currency = data.currency || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };

  const proficientSkills = Object.entries(skills)
    .filter(([_, level]) => level === 'proficient' || level === 'expertise')
    .map(([skill, level]) => ({ skill, level }));

  const isValid = Boolean(data.name && data.race && currentClass?.name);

  return (
    <div class="wizard-step">
      <h2 class="wizard-step__title">Review Character</h2>

      {!isValid && (
        <div class="wizard-warning">
          <strong>Missing required fields:</strong>
          <ul>
            {!data.name && <li>Character name</li>}
            {!data.race && <li>Race</li>}
            {!currentClass?.name && <li>Class</li>}
          </ul>
        </div>
      )}

      <div class="review-section">
        <h3 class="review-section__title">Basic Info</h3>
        <div class="review-grid">
          <div class="review-item">
            <span class="review-item__label">Name</span>
            <span class="review-item__value">{data.name || '—'}</span>
          </div>
          <div class="review-item">
            <span class="review-item__label">Race</span>
            <span class="review-item__value">{data.race || '—'}</span>
          </div>
          <div class="review-item">
            <span class="review-item__label">Background</span>
            <span class="review-item__value">{data.background || '—'}</span>
          </div>
          <div class="review-item">
            <span class="review-item__label">Player</span>
            <span class="review-item__value">{data.playerName || '—'}</span>
          </div>
        </div>
      </div>

      <div class="review-section">
        <h3 class="review-section__title">Class</h3>
        <div class="review-grid">
          <div class="review-item">
            <span class="review-item__label">Class</span>
            <span class="review-item__value">
              {currentClass?.name || '—'}
              {currentClass?.subclass && ` (${currentClass.subclass})`}
            </span>
          </div>
          <div class="review-item">
            <span class="review-item__label">Level</span>
            <span class="review-item__value">{currentClass?.level || 1}</span>
          </div>
          <div class="review-item">
            <span class="review-item__label">Max HP</span>
            <span class="review-item__value">{data.maxHP || 10}</span>
          </div>
        </div>
      </div>

      <div class="review-section">
        <h3 class="review-section__title">Ability Scores</h3>
        <div class="review-abilities">
          {(Object.keys(ABILITY_NAMES) as Ability[]).map(ab => (
            <div key={ab} class="review-ability">
              <span class="review-ability__name">{ab.toUpperCase()}</span>
              <span class="review-ability__score">{scores[ab]}</span>
              <span class="review-ability__mod">{formatMod(scores[ab])}</span>
            </div>
          ))}
        </div>
      </div>

      <div class="review-section">
        <h3 class="review-section__title">Combat Stats</h3>
        <div class="review-grid">
          <div class="review-item">
            <span class="review-item__label">Armor Class</span>
            <span class="review-item__value">{data.armorClass || 10}</span>
          </div>
          <div class="review-item">
            <span class="review-item__label">Speed</span>
            <span class="review-item__value">{data.speed || 30} ft</span>
          </div>
          <div class="review-item">
            <span class="review-item__label">Initiative</span>
            <span class="review-item__value">{formatMod(scores.dex)}</span>
          </div>
        </div>
      </div>

      {proficientSkills.length > 0 && (
        <div class="review-section">
          <h3 class="review-section__title">Skill Proficiencies</h3>
          <div class="review-tags">
            {proficientSkills.map(({ skill, level }) => (
              <span key={skill} class={`review-tag review-tag--${level}`}>
                {skill.replace(/([A-Z])/g, ' $1').trim()}
                {level === 'expertise' && ' ★'}
              </span>
            ))}
          </div>
        </div>
      )}

      <div class="review-section">
        <h3 class="review-section__title">Currency</h3>
        <div class="review-currency">
          {currency.gp > 0 && <span>{currency.gp} GP</span>}
          {currency.sp > 0 && <span>{currency.sp} SP</span>}
          {currency.cp > 0 && <span>{currency.cp} CP</span>}
          {currency.gp === 0 && currency.sp === 0 && currency.cp === 0 && <span>None</span>}
        </div>
      </div>

      {data.equipment && data.equipment.length > 0 && (
        <div class="review-section">
          <h3 class="review-section__title">Equipment</h3>
          <ul class="review-list">
            {data.equipment.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {data.notes && (
        <div class="review-section">
          <h3 class="review-section__title">Notes</h3>
          <p class="review-notes">{data.notes}</p>
        </div>
      )}
    </div>
  );
}
