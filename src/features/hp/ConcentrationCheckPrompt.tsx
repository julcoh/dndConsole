import { signal } from '@preact/signals';
import {
  currentDefinition,
  currentSession,
  pendingConcentrationCheck,
  breakConcentration,
  dismissConcentrationCheck
} from '../../state';
import { rollD20, type RollResult } from '../../utils/dice';
import { getSaveModifier, formatModifier, getProficiencyBonus, getTotalLevel } from '../../utils/derived';
import { currentRoll, addToHistory, globalAdvantage } from '../rolls';

// Track last concentration roll result for display
const lastConcentrationRoll = signal<{ roll: number; total: number; passed: boolean } | null>(null);

export function ConcentrationCheckPrompt() {
  const check = pendingConcentrationCheck.value;
  const def = currentDefinition.value;
  const session = currentSession.value;

  if (!check || !def || !session) return null;

  const level = getTotalLevel(def.classes);
  const profBonus = getProficiencyBonus(level);
  const conProficiency = def.savingThrowProficiencies.con;
  const conMod = getSaveModifier(def.abilityScores.con, conProficiency, profBonus);

  const handleRoll = () => {
    const advantage = globalAdvantage.value;
    const d20 = rollD20(advantage);
    const total = d20.result + conMod;
    const passed = total >= check.dc;

    lastConcentrationRoll.value = { roll: d20.result, total, passed };

    // Add to roll history
    const result: RollResult = {
      dice: [{ sides: 20, result: d20.result, wasRerolled: false }],
      bonus: conMod,
      total,
      expression: '1d20'
    };
    const label = `Concentration (${check.spellName})`;
    currentRoll.value = { result, type: 'save', label };
    addToHistory({ result, type: 'save', label, timestamp: Date.now() });

    // Auto-resolve after showing result
    setTimeout(() => {
      if (!passed) {
        breakConcentration();
      } else {
        dismissConcentrationCheck();
      }
      lastConcentrationRoll.value = null;
    }, 1500);
  };

  const handleAutoPass = () => {
    dismissConcentrationCheck();
    lastConcentrationRoll.value = null;
  };

  const handleAutoFail = () => {
    breakConcentration();
    lastConcentrationRoll.value = null;
  };

  const rollResult = lastConcentrationRoll.value;

  return (
    <div class="concentration-prompt-overlay">
      <div class="concentration-prompt-overlay__backdrop" />
      <div class="concentration-prompt card">
        <h3 class="concentration-prompt__title">Concentration Check</h3>
        <p class="concentration-prompt__spell">{check.spellName}</p>
        <p class="concentration-prompt__dc">DC {check.dc}</p>
        <p class="concentration-prompt__mod">CON Save: {formatModifier(conMod)}</p>

        {rollResult && (
          <div class={`concentration-prompt__result ${rollResult.passed ? 'concentration-prompt__result--pass' : 'concentration-prompt__result--fail'}`}>
            <span class="concentration-prompt__roll">{rollResult.total}</span>
            <span class="concentration-prompt__verdict">
              {rollResult.passed ? 'MAINTAINED!' : 'BROKEN!'}
            </span>
          </div>
        )}

        {!rollResult && (
          <div class="concentration-prompt__actions">
            <button class="btn btn--primary" onClick={handleRoll}>
              Roll CON Save
            </button>
            <div class="concentration-prompt__quick-actions">
              <button class="btn btn--small" onClick={handleAutoPass}>
                Pass
              </button>
              <button class="btn btn--small btn--danger" onClick={handleAutoFail}>
                Fail
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
