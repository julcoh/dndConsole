import { signal } from '@preact/signals';
import type { AttackMacro, SaveMacro, CheckMacro } from '../../types';
import { rollAttack, rollSave, rollD20, type AttackRollResult, type SaveRollResult, type RollResult } from '../../utils';
import { formatModifier } from '../../utils/derived';
import { RollOutput, formatRollForClipboard } from './RollOutput';
import { addToHistory } from './rollHistory';
import { globalAdvantage } from './rollState';

// Global state for current roll result
export const currentRoll = signal<{
  result: AttackRollResult | SaveRollResult | RollResult;
  type: 'attack' | 'save' | 'check';
  label: string;
} | null>(null);

interface AttackMacroButtonProps {
  macro: AttackMacro;
}

export function AttackMacroButton({ macro }: AttackMacroButtonProps) {
  const handleClick = () => {
    const advantage = globalAdvantage.value;
    const result = rollAttack(macro.toHit, macro.damage, macro.critBehavior, advantage);
    currentRoll.value = { result, type: 'attack', label: macro.name };
    addToHistory({ result, type: 'attack', label: macro.name, timestamp: Date.now() });
  };

  return (
    <button class="macro-btn macro-btn--attack" onClick={handleClick}>
      <span class="macro-btn__name">{macro.name}</span>
      <span class="macro-btn__info">
        {formatModifier(macro.toHit)} · {macro.damage.dice}+{macro.damage.bonus}
      </span>
    </button>
  );
}

interface SaveMacroButtonProps {
  macro: SaveMacro;
  targetBonus?: number;
}

export function SaveMacroButton({ macro, targetBonus = 0 }: SaveMacroButtonProps) {
  const handleClick = () => {
    const result = rollSave(macro.saveDC, targetBonus, macro.damage, macro.halfOnSave);
    currentRoll.value = { result, type: 'save', label: macro.name };
    addToHistory({ result, type: 'save', label: macro.name, timestamp: Date.now() });
  };

  return (
    <button class="macro-btn macro-btn--save" onClick={handleClick}>
      <span class="macro-btn__name">{macro.name}</span>
      <span class="macro-btn__info">
        DC {macro.saveDC} {macro.saveAbility.toUpperCase()}
      </span>
    </button>
  );
}

interface CheckMacroButtonProps {
  macro: CheckMacro;
}

export function CheckMacroButton({ macro }: CheckMacroButtonProps) {
  const handleClick = () => {
    const advantage = globalAdvantage.value;
    const d20 = rollD20(advantage);
    const total = d20.result + macro.bonus;
    const result: RollResult = {
      dice: [{ sides: 20, result: d20.result, wasRerolled: false }],
      bonus: macro.bonus,
      total,
      expression: '1d20'
    };
    currentRoll.value = { result, type: 'check', label: macro.name };
    addToHistory({ result, type: 'check', label: macro.name, timestamp: Date.now() });
  };

  return (
    <button class="macro-btn macro-btn--check" onClick={handleClick}>
      <span class="macro-btn__name">{macro.name}</span>
      <span class="macro-btn__info">{formatModifier(macro.bonus)}</span>
    </button>
  );
}

// Roll result display panel
export function CurrentRollDisplay() {
  const rollData = currentRoll.value;
  if (!rollData) return null;

  const handleCopy = async () => {
    const text = formatRollForClipboard(rollData.result, rollData.type, rollData.label);
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleClose = () => {
    currentRoll.value = null;
  };

  return (
    <div class="current-roll">
      <RollOutput
        result={rollData.result}
        type={rollData.type}
        label={rollData.label}
        onCopy={handleCopy}
        onClose={handleClose}
      />
    </div>
  );
}

// Quick d20 roll button - used for skills, saves, initiative
interface QuickRollButtonProps {
  label: string;
  bonus: number;
  type?: 'check' | 'save' | 'initiative';
  onClick?: () => void;
}

export function QuickRollButton({ label, bonus, type = 'check', onClick }: QuickRollButtonProps) {
  const handleClick = () => {
    const advantage = globalAdvantage.value;
    const d20 = rollD20(advantage);
    const total = d20.result + bonus;
    const result: RollResult = {
      dice: [{ sides: 20, result: d20.result, wasRerolled: false }],
      bonus,
      total,
      expression: '1d20'
    };
    currentRoll.value = { result, type: type === 'initiative' ? 'check' : type, label };
    addToHistory({ result, type: type === 'initiative' ? 'check' : type, label, timestamp: Date.now() });
    onClick?.();
  };

  const btnClass = type === 'save' ? 'macro-btn--save' : type === 'initiative' ? 'macro-btn--initiative' : 'macro-btn--check';

  return (
    <button class={`macro-btn ${btnClass}`} onClick={handleClick}>
      <span class="macro-btn__name">{label}</span>
      <span class="macro-btn__info">{formatModifier(bonus)}</span>
    </button>
  );
}
