import { currentDefinition } from '../../state';
import { formatModifier, getProficiencyBonus, getTotalLevel, getSkillModifier } from '../../utils/derived';
import { rollD20, type RollResult } from '../../utils';
import { currentRoll } from '../rolls/MacroButton';
import { addToHistory } from '../rolls/rollHistory';
import { globalAdvantage } from '../rolls/rollState';

export function CombatStats() {
  const def = currentDefinition.value;
  if (!def) return null;

  const level = getTotalLevel(def.classes);
  const profBonus = getProficiencyBonus(level);

  // Calculate initiative bonus (DEX mod + any initiative bonus)
  const dexMod = Math.floor((def.abilityScores.dex - 10) / 2);
  const initiativeBonus = dexMod + (def.initiativeBonus || 0);

  // Calculate passive perception (10 + perception mod)
  const perceptionMod = getSkillModifier(
    def.abilityScores.wis,
    def.skillProficiencies.perception,
    profBonus
  );
  const passivePerception = 10 + perceptionMod;

  const handleInitiativeClick = () => {
    const advantage = globalAdvantage.value;
    const d20 = rollD20(advantage);
    const total = d20.result + initiativeBonus;
    const result: RollResult = {
      dice: [{ sides: 20, result: d20.result, wasRerolled: false }],
      bonus: initiativeBonus,
      total,
      expression: '1d20'
    };
    currentRoll.value = { result, type: 'check', label: 'Initiative' };
    addToHistory({ result, type: 'check', label: 'Initiative', timestamp: Date.now() });
  };

  return (
    <div class="combat-stats">
      <div class="combat-stat">
        <div class="combat-stat__value">{def.armorClass}</div>
        <div class="combat-stat__label">AC</div>
      </div>

      <div class="combat-stat combat-stat--clickable" onClick={handleInitiativeClick} title="Roll Initiative">
        <div class="combat-stat__value">{formatModifier(initiativeBonus)}</div>
        <div class="combat-stat__label">Initiative</div>
      </div>

      <div class="combat-stat">
        <div class="combat-stat__value">{def.speed} ft</div>
        <div class="combat-stat__label">Speed</div>
      </div>

      <div class="combat-stat">
        <div class="combat-stat__value">{formatModifier(profBonus)}</div>
        <div class="combat-stat__label">Proficiency</div>
      </div>

      {def.spellSaveDC && (
        <div class="combat-stat">
          <div class="combat-stat__value">{def.spellSaveDC}</div>
          <div class="combat-stat__label">Spell DC</div>
        </div>
      )}

      {def.spellAttackBonus !== undefined && (
        <div class="combat-stat">
          <div class="combat-stat__value">{formatModifier(def.spellAttackBonus)}</div>
          <div class="combat-stat__label">Spell Attack</div>
        </div>
      )}

      <div class="combat-stat">
        <div class="combat-stat__value">{passivePerception}</div>
        <div class="combat-stat__label">Passive Per.</div>
      </div>
    </div>
  );
}
