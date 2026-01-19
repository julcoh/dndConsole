import { signal } from '@preact/signals';
import { currentSession, updateSession, endTurn } from '../../state';
import { createCondition, STANDARD_CONDITIONS } from '../../types';
import { ConditionBadge } from './ConditionBadge';
import { Modal } from '../../components/common';

const addConditionOpen = signal(false);
const newConditionName = signal('');
const newConditionSource = signal('');
const newConditionEnds = signal('');
const newConditionRounds = signal('');

export function ConditionList() {
  const session = currentSession.value;
  if (!session) return null;

  const conditions = session.conditions;

  const handleRemove = (conditionId: string) => {
    updateSession(sess => ({
      ...sess,
      conditions: sess.conditions.filter(c => c.id !== conditionId),
      lastModified: new Date().toISOString()
    }), 'Remove condition');
  };

  // Check if any conditions have rounds remaining
  const hasTimedConditions = conditions.some(c => c.roundsRemaining !== undefined && c.roundsRemaining > 0);

  return (
    <div class="condition-list">
      <div class="condition-list__header">
        <h3 class="condition-list__title">Conditions</h3>
        <div class="condition-list__actions">
          {hasTimedConditions && (
            <button
              class="btn btn--small btn--secondary"
              onClick={endTurn}
            >
              End Turn
            </button>
          )}
          <button
            class="btn btn--small"
            onClick={() => addConditionOpen.value = true}
          >
            + Add
          </button>
        </div>
      </div>

      {conditions.length === 0 ? (
        <div class="condition-list__empty">No active conditions</div>
      ) : (
        <div class="condition-list__items">
          {conditions.map(condition => (
            <ConditionBadge
              key={condition.id}
              condition={condition}
              onRemove={() => handleRemove(condition.id)}
            />
          ))}
        </div>
      )}

      <AddConditionModal />
    </div>
  );
}

function AddConditionModal() {
  const handleAdd = () => {
    const name = newConditionName.value.trim();
    if (!name) return;

    const condition = createCondition(name, {
      source: newConditionSource.value.trim() || undefined,
      ends: newConditionEnds.value.trim() || undefined,
      roundsRemaining: newConditionRounds.value ? parseInt(newConditionRounds.value, 10) : undefined
    });

    updateSession(sess => ({
      ...sess,
      conditions: [...sess.conditions, condition],
      lastModified: new Date().toISOString()
    }), `Add ${name}`);

    // Reset form
    newConditionName.value = '';
    newConditionSource.value = '';
    newConditionEnds.value = '';
    newConditionRounds.value = '';
    addConditionOpen.value = false;
  };

  const handleClose = () => {
    addConditionOpen.value = false;
  };

  const selectStandardCondition = (name: string) => {
    newConditionName.value = name;
  };

  return (
    <Modal isOpen={addConditionOpen.value} onClose={handleClose} title="Add Condition">
      <div class="add-condition">
        <div class="add-condition__quick">
          <label class="add-condition__label">Quick Select</label>
          <div class="add-condition__quick-list">
            {STANDARD_CONDITIONS.slice(0, 8).map(c => (
              <button
                key={c.name}
                class={`add-condition__quick-btn ${newConditionName.value === c.name ? 'add-condition__quick-btn--selected' : ''}`}
                onClick={() => selectStandardCondition(c.name)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div class="add-condition__field">
          <label class="add-condition__label">Condition Name</label>
          <input
            type="text"
            class="input"
            value={newConditionName.value}
            onInput={(e) => newConditionName.value = (e.target as HTMLInputElement).value}
            placeholder="e.g., Poisoned"
          />
        </div>

        <div class="add-condition__field">
          <label class="add-condition__label">Source (optional)</label>
          <input
            type="text"
            class="input"
            value={newConditionSource.value}
            onInput={(e) => newConditionSource.value = (e.target as HTMLInputElement).value}
            placeholder="e.g., Giant Spider bite"
          />
        </div>

        <div class="add-condition__row">
          <div class="add-condition__field">
            <label class="add-condition__label">Ends (optional)</label>
            <input
              type="text"
              class="input"
              value={newConditionEnds.value}
              onInput={(e) => newConditionEnds.value = (e.target as HTMLInputElement).value}
              placeholder="e.g., CON DC 14"
            />
          </div>

          <div class="add-condition__field add-condition__field--small">
            <label class="add-condition__label">Rounds</label>
            <input
              type="number"
              class="input"
              value={newConditionRounds.value}
              onInput={(e) => newConditionRounds.value = (e.target as HTMLInputElement).value}
              placeholder="∞"
              min="0"
            />
          </div>
        </div>

        <div class="add-condition__actions">
          <button class="btn btn--secondary" onClick={handleClose}>Cancel</button>
          <button class="btn" onClick={handleAdd} disabled={!newConditionName.value.trim()}>
            Add Condition
          </button>
        </div>
      </div>
    </Modal>
  );
}
