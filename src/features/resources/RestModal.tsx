import { signal } from '@preact/signals';
import { useMemo, useEffect, useRef } from 'preact/hooks';
import { Modal } from '../../components/common';
import { currentDefinition, currentSession, updateSession } from '../../state';
import { getResourcesForRest, calculateRechargeAmount } from '../../types';

interface RestModalProps {
  isOpen: boolean;
  onClose: () => void;
  restType: 'short' | 'long';
}

const selectedResources = signal<Set<string>>(new Set());
const hitDiceToSpend = signal<number>(0);
const hitDiceRolls = signal<number[]>([]);

export function RestModal({ isOpen, onClose, restType }: RestModalProps) {
  const def = currentDefinition.value;
  const session = currentSession.value;
  const hasInitialized = useRef(false);

  // Get resources that can recharge on this rest type
  const eligibleResources = useMemo(() => {
    if (!def) return [];
    return getResourcesForRest(def.resourceDefinitions, restType);
  }, [def, restType]);

  // Get hit dice resource
  const hitDiceResource = useMemo(() => {
    if (!def) return null;
    return def.resourceDefinitions.find(r => r.category === 'hit_dice');
  }, [def]);

  // Initialize selection with smart defaults when modal opens
  useEffect(() => {
    if (isOpen && !hasInitialized.current && session) {
      hasInitialized.current = true;
      const defaults = new Set<string>();
      eligibleResources.forEach(r => {
        const current = session.resourceCurrents[r.id] ?? r.maximum;
        if (current < r.maximum) {
          defaults.add(r.id);
        }
      });
      selectedResources.value = defaults;
      hitDiceToSpend.value = 0;
      hitDiceRolls.value = [];
    }
    if (!isOpen) {
      hasInitialized.current = false;
    }
  }, [isOpen, eligibleResources, session]);

  // Early return after hooks
  if (!def || !session) return null;

  const toggleResource = (id: string) => {
    const next = new Set(selectedResources.value);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    selectedResources.value = next;
  };

  // Hit dice calculations
  const currentHitDice = hitDiceResource
    ? session.resourceCurrents[hitDiceResource.id] ?? hitDiceResource.maximum
    : 0;
  const dieType = hitDiceResource?.dieType ?? 8;
  const conMod = Math.floor((def.abilityScores.con - 10) / 2);

  const handleSpendHitDie = () => {
    const availableHitDice = currentHitDice - hitDiceRolls.value.length;
    if (availableHitDice <= 0) return;

    // Roll the hit die
    const roll = Math.floor(Math.random() * dieType) + 1;
    const healing = Math.max(1, roll + conMod); // Minimum 1 HP

    // Update state
    hitDiceRolls.value = [...hitDiceRolls.value, healing];
  };

  const hitDiceHealing = hitDiceRolls.value.reduce((sum, r) => sum + r, 0);

  // Calculate preview changes (not a computed signal - just a regular calculation)
  const getPreviewChanges = () => {
    const changes: { name: string; from: number; to: number }[] = [];

    eligibleResources.forEach(r => {
      if (!selectedResources.value.has(r.id)) return;
      const current = session.resourceCurrents[r.id] ?? r.maximum;
      const newValue = calculateRechargeAmount(r, current);
      if (newValue !== current) {
        changes.push({ name: r.name, from: current, to: newValue });
      }
    });

    // Long rest: restore HP
    if (restType === 'long' && session.currentHP < def.maxHP) {
      changes.push({ name: 'HP', from: session.currentHP, to: def.maxHP });
    }

    // Short rest: hit dice healing
    if (restType === 'short' && hitDiceHealing > 0) {
      const newHP = Math.min(def.maxHP, session.currentHP + hitDiceHealing);
      changes.push({ name: 'HP (Hit Dice)', from: session.currentHP, to: newHP });
    }

    return changes;
  };

  const previewChanges = getPreviewChanges();

  const handleConfirm = () => {
    updateSession(sess => {
      const newResourceCurrents = { ...sess.resourceCurrents };

      // Recharge eligible resources
      eligibleResources.forEach(r => {
        if (!selectedResources.value.has(r.id)) return;
        const current = newResourceCurrents[r.id] ?? r.maximum;
        newResourceCurrents[r.id] = calculateRechargeAmount(r, current);
      });

      // Spend hit dice
      if (hitDiceResource && hitDiceRolls.value.length > 0) {
        const currentHD = newResourceCurrents[hitDiceResource.id] ?? hitDiceResource.maximum;
        newResourceCurrents[hitDiceResource.id] = Math.max(0, currentHD - hitDiceRolls.value.length);
      }

      // Calculate new HP
      let newHP = sess.currentHP;
      if (restType === 'long') {
        newHP = def.maxHP;
      } else if (hitDiceHealing > 0) {
        newHP = Math.min(def.maxHP, sess.currentHP + hitDiceHealing);
      }

      return {
        ...sess,
        resourceCurrents: newResourceCurrents,
        currentHP: newHP,
        tempHP: restType === 'long' ? 0 : sess.tempHP,
        // Clear death saves on long rest
        deathSaves: restType === 'long' ? { successes: 0, failures: 0 } : sess.deathSaves,
        isDowned: restType === 'long' ? false : sess.isDowned,
        // Clear concentration on long rest (you wouldn't maintain concentration overnight)
        concentratingOn: restType === 'long' ? undefined : sess.concentratingOn,
        lastModified: new Date().toISOString()
      };
    }, `${restType === 'short' ? 'Short' : 'Long'} Rest`);

    selectedResources.value = new Set();
    hitDiceToSpend.value = 0;
    hitDiceRolls.value = [];
    onClose();
  };

  const handleClose = () => {
    selectedResources.value = new Set();
    hitDiceToSpend.value = 0;
    hitDiceRolls.value = [];
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={restType === 'short' ? 'Short Rest' : 'Long Rest'}
    >
      <div class="rest-modal">
        {/* Hit Dice (Short Rest only) */}
        {restType === 'short' && hitDiceResource && currentHitDice > 0 && (
          <div class="rest-modal__hit-dice">
            <h4>Spend Hit Dice</h4>
            <p class="rest-modal__hit-dice-info">
              Available: {currentHitDice - hitDiceRolls.value.length} d{dieType} (CON: {conMod >= 0 ? '+' : ''}{conMod})
            </p>

            {hitDiceRolls.value.length > 0 && (
              <div class="rest-modal__rolls">
                {hitDiceRolls.value.map((roll, i) => (
                  <span key={i} class="rest-modal__roll">+{roll}</span>
                ))}
                <span class="rest-modal__total">= {hitDiceHealing} HP</span>
              </div>
            )}

            <button
              class="btn btn--small"
              onClick={handleSpendHitDie}
              disabled={currentHitDice - hitDiceRolls.value.length <= 0}
            >
              Roll d{dieType}
            </button>
          </div>
        )}

        <div class="rest-modal__resources">
          {eligibleResources.map(r => {
            const current = session.resourceCurrents[r.id] ?? r.maximum;
            const isSelected = selectedResources.value.has(r.id);
            const wouldChange = current < r.maximum;

            return (
              <label key={r.id} class="rest-modal__item">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleResource(r.id)}
                />
                <span class={wouldChange ? '' : 'text-muted'}>
                  {r.name} ({current}/{r.maximum})
                </span>
              </label>
            );
          })}
        </div>

        {previewChanges.length > 0 && (
          <div class="rest-modal__preview">
            <h4>Preview</h4>
            <ul>
              {previewChanges.map((change, i) => (
                <li key={i}>
                  {change.name}: {change.from} \u2192 {change.to}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div class="rest-modal__actions">
          <button class="btn btn--secondary" onClick={handleClose}>Cancel</button>
          <button class="btn" onClick={handleConfirm}>
            Take {restType === 'short' ? 'Short' : 'Long'} Rest
          </button>
        </div>
      </div>
    </Modal>
  );
}
