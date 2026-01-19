import { signal } from '@preact/signals';
import { currentDefinition, currentSession, modifyHP, setHP, setTempHP, breakConcentration } from '../../state';
import { NumpadModal } from './NumpadModal';

type NumpadTarget = 'hp' | 'tempHp' | null;
const numpadTarget = signal<NumpadTarget>(null);
const quickDamageValue = signal('');
const lastDamage = signal<number | null>(null);

export function HealthTracker() {
  const def = currentDefinition.value;
  const session = currentSession.value;

  if (!def || !session) return null;

  const hpPercent = Math.round((session.currentHP / def.maxHP) * 100);
  const hpColor = hpPercent > 50 ? 'var(--color-hp-good)'
    : hpPercent > 25 ? 'var(--color-hp-mid)'
    : 'var(--color-hp-low)';

  const handleNumpadConfirm = (value: number) => {
    if (numpadTarget.value === 'hp') {
      setHP(value);
    } else if (numpadTarget.value === 'tempHp') {
      setTempHP(value);
    }
    numpadTarget.value = null;
  };

  const handleQuickDamage = () => {
    const value = parseInt(quickDamageValue.value, 10);
    if (!isNaN(value) && value > 0) {
      modifyHP(-value);
      lastDamage.value = value;
      quickDamageValue.value = '';
    }
  };

  const handleQuickHeal = () => {
    const value = parseInt(quickDamageValue.value, 10);
    if (!isNaN(value) && value > 0) {
      modifyHP(value);
      quickDamageValue.value = '';
    }
  };

  const handleRepeatDamage = () => {
    if (lastDamage.value !== null) {
      modifyHP(-lastDamage.value);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleQuickDamage();
    }
  };

  return (
    <div class="health-tracker card">
      <div class="health-tracker__bar">
        <div
          class="health-tracker__fill"
          style={{ width: `${Math.min(100, hpPercent)}%`, backgroundColor: hpColor }}
        />
        {session.tempHP > 0 && (
          <div
            class="health-tracker__temp-fill"
            style={{ width: `${Math.min(100, (session.tempHP / def.maxHP) * 100)}%` }}
          />
        )}
      </div>

      <div class="health-tracker__display">
        <button
          class="health-tracker__hp-value"
          onClick={() => numpadTarget.value = 'hp'}
        >
          {session.currentHP}
        </button>
        <span class="health-tracker__separator">/</span>
        <span class="health-tracker__max">{def.maxHP}</span>
        {session.tempHP > 0 && (
          <button
            class="health-tracker__temp"
            onClick={() => numpadTarget.value = 'tempHp'}
          >
            +{session.tempHP} temp
          </button>
        )}
      </div>

      {/* Quick damage input */}
      <div class="quick-damage">
        <input
          type="number"
          class="quick-damage__input"
          placeholder="Amount"
          value={quickDamageValue.value}
          onInput={(e) => quickDamageValue.value = (e.target as HTMLInputElement).value}
          onKeyDown={handleKeyDown}
          min={0}
        />
        <button class="quick-damage__btn quick-damage__btn--damage" onClick={handleQuickDamage}>
          Damage
        </button>
        <button class="quick-damage__btn quick-damage__btn--heal" onClick={handleQuickHeal}>
          Heal
        </button>
      </div>

      <div class="health-tracker__buttons">
        <button class="hp-btn hp-btn--damage" onClick={() => modifyHP(-10)}>-10</button>
        <button class="hp-btn hp-btn--damage" onClick={() => modifyHP(-5)}>-5</button>
        <button class="hp-btn hp-btn--heal" onClick={() => modifyHP(5)}>+5</button>
        <button class="hp-btn hp-btn--heal" onClick={() => modifyHP(10)}>+10</button>
      </div>

      {/* Concentration indicator */}
      {session.concentratingOn && (
        <div class="concentration-indicator">
          <span class="concentration-indicator__label">Concentrating:</span>
          <span class="concentration-indicator__spell">{session.concentratingOn.spellName}</span>
          <button
            class="btn btn--small btn--danger"
            onClick={breakConcentration}
          >
            Drop
          </button>
        </div>
      )}

      <div class="health-tracker__actions">
        {lastDamage.value !== null && (
          <button
            class="btn btn--small btn--danger"
            onClick={handleRepeatDamage}
            style={{ marginRight: 'var(--space-sm)' }}
          >
            Repeat -{lastDamage.value}
          </button>
        )}
        <button
          class="btn btn--small btn--secondary"
          onClick={() => numpadTarget.value = 'tempHp'}
        >
          Set Temp HP
        </button>
      </div>

      <NumpadModal
        isOpen={numpadTarget.value !== null}
        onClose={() => numpadTarget.value = null}
        onConfirm={handleNumpadConfirm}
        title={numpadTarget.value === 'hp' ? 'Set HP' : 'Set Temp HP'}
        max={numpadTarget.value === 'hp' ? def.maxHP : 999}
        initialValue={numpadTarget.value === 'hp' ? session.currentHP : session.tempHP}
      />
    </div>
  );
}
