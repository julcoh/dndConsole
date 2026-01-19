import { signal } from '@preact/signals';
import { currentDefinition, updateCurrency, updateEquipment, updateAttunedItems } from '../../state';
import { Modal } from '../../components/common';

const editingCurrency = signal(false);
const currencyForm = signal({ cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 });

const editingEquipment = signal(false);
const equipmentForm = signal<string[]>([]);
const newEquipmentItem = signal('');

const editingAttuned = signal(false);
const attunedForm = signal<string[]>([]);
const newAttunedItem = signal('');

export function Equipment() {
  const def = currentDefinition.value;
  if (!def) return null;

  const { currency, equipment, attunedItems } = def;

  // Format currency display
  const currencyParts: string[] = [];
  if (currency.pp > 0) currencyParts.push(`${currency.pp} pp`);
  if (currency.gp > 0) currencyParts.push(`${currency.gp} gp`);
  if (currency.ep > 0) currencyParts.push(`${currency.ep} ep`);
  if (currency.sp > 0) currencyParts.push(`${currency.sp} sp`);
  if (currency.cp > 0) currencyParts.push(`${currency.cp} cp`);

  const handleEditCurrency = () => {
    currencyForm.value = { ...currency };
    editingCurrency.value = true;
  };

  const handleSaveCurrency = () => {
    updateCurrency(currencyForm.value);
    editingCurrency.value = false;
  };

  const handleCurrencyChange = (type: 'cp' | 'sp' | 'ep' | 'gp' | 'pp', value: string) => {
    const numValue = Math.max(0, parseInt(value, 10) || 0);
    currencyForm.value = { ...currencyForm.value, [type]: numValue };
  };

  // Equipment editing
  const handleEditEquipment = () => {
    equipmentForm.value = [...equipment];
    newEquipmentItem.value = '';
    editingEquipment.value = true;
  };

  const handleSaveEquipment = () => {
    updateEquipment(equipmentForm.value);
    editingEquipment.value = false;
  };

  const handleAddEquipmentItem = () => {
    if (newEquipmentItem.value.trim()) {
      equipmentForm.value = [...equipmentForm.value, newEquipmentItem.value.trim()];
      newEquipmentItem.value = '';
    }
  };

  const handleRemoveEquipmentItem = (index: number) => {
    equipmentForm.value = equipmentForm.value.filter((_, i) => i !== index);
  };

  // Attuned items editing
  const handleEditAttuned = () => {
    attunedForm.value = [...attunedItems];
    newAttunedItem.value = '';
    editingAttuned.value = true;
  };

  const handleSaveAttuned = () => {
    updateAttunedItems(attunedForm.value);
    editingAttuned.value = false;
  };

  const handleAddAttunedItem = () => {
    if (newAttunedItem.value.trim() && attunedForm.value.length < 3) {
      attunedForm.value = [...attunedForm.value, newAttunedItem.value.trim()];
      newAttunedItem.value = '';
    }
  };

  const handleRemoveAttunedItem = (index: number) => {
    attunedForm.value = attunedForm.value.filter((_, i) => i !== index);
  };

  return (
    <div class="equipment card">
      {/* Currency */}
      <div class="equipment__section">
        <div class="equipment__header">
          <h4 class="equipment__heading">Currency</h4>
          <button class="btn btn--small btn--secondary" onClick={handleEditCurrency}>
            Edit
          </button>
        </div>
        <div class="equipment__currency">
          {currencyParts.length > 0 ? currencyParts.join(', ') : 'None'}
        </div>
      </div>

      {/* Attuned Items */}
      <div class="equipment__section">
        <div class="equipment__header">
          <h4 class="equipment__heading">Attuned Items ({attunedItems.length}/3)</h4>
          <button class="btn btn--small btn--secondary" onClick={handleEditAttuned}>
            Edit
          </button>
        </div>
        {attunedItems.length > 0 ? (
          <ul class="equipment__list">
            {attunedItems.map((item, i) => (
              <li key={i} class="equipment__item equipment__item--attuned">
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p class="equipment__empty">No attuned items</p>
        )}
      </div>

      {/* Equipment List */}
      <div class="equipment__section">
        <div class="equipment__header">
          <h4 class="equipment__heading">Equipment</h4>
          <button class="btn btn--small btn--secondary" onClick={handleEditEquipment}>
            Edit
          </button>
        </div>
        {equipment.length > 0 ? (
          <ul class="equipment__list">
            {equipment.map((item, i) => (
              <li key={i} class="equipment__item">{item}</li>
            ))}
          </ul>
        ) : (
          <p class="equipment__empty">No equipment</p>
        )}
      </div>

      {/* Currency Edit Modal */}
      <Modal
        isOpen={editingCurrency.value}
        onClose={() => editingCurrency.value = false}
        title="Edit Currency"
      >
        <div class="currency-edit">
          <div class="currency-edit__row">
            <label class="currency-edit__field">
              <span>PP</span>
              <input
                type="number"
                class="input"
                value={currencyForm.value.pp}
                onInput={(e) => handleCurrencyChange('pp', (e.target as HTMLInputElement).value)}
                min={0}
              />
            </label>
            <label class="currency-edit__field">
              <span>GP</span>
              <input
                type="number"
                class="input"
                value={currencyForm.value.gp}
                onInput={(e) => handleCurrencyChange('gp', (e.target as HTMLInputElement).value)}
                min={0}
              />
            </label>
          </div>
          <div class="currency-edit__row">
            <label class="currency-edit__field">
              <span>EP</span>
              <input
                type="number"
                class="input"
                value={currencyForm.value.ep}
                onInput={(e) => handleCurrencyChange('ep', (e.target as HTMLInputElement).value)}
                min={0}
              />
            </label>
            <label class="currency-edit__field">
              <span>SP</span>
              <input
                type="number"
                class="input"
                value={currencyForm.value.sp}
                onInput={(e) => handleCurrencyChange('sp', (e.target as HTMLInputElement).value)}
                min={0}
              />
            </label>
            <label class="currency-edit__field">
              <span>CP</span>
              <input
                type="number"
                class="input"
                value={currencyForm.value.cp}
                onInput={(e) => handleCurrencyChange('cp', (e.target as HTMLInputElement).value)}
                min={0}
              />
            </label>
          </div>
          <div class="currency-edit__actions">
            <button class="btn btn--secondary" onClick={() => editingCurrency.value = false}>
              Cancel
            </button>
            <button class="btn" onClick={handleSaveCurrency}>
              Save
            </button>
          </div>
        </div>
      </Modal>

      {/* Equipment Edit Modal */}
      <Modal
        isOpen={editingEquipment.value}
        onClose={() => editingEquipment.value = false}
        title="Edit Equipment"
      >
        <div class="equipment-edit">
          <div class="equipment-edit__list">
            {equipmentForm.value.map((item, i) => (
              <div key={i} class="equipment-edit__item">
                <span>{item}</span>
                <button
                  class="btn btn--small btn--danger"
                  onClick={() => handleRemoveEquipmentItem(i)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <div class="equipment-edit__add">
            <input
              type="text"
              class="input"
              placeholder="Add item..."
              value={newEquipmentItem.value}
              onInput={(e) => newEquipmentItem.value = (e.target as HTMLInputElement).value}
              onKeyDown={(e) => e.key === 'Enter' && handleAddEquipmentItem()}
            />
            <button class="btn btn--small" onClick={handleAddEquipmentItem}>
              Add
            </button>
          </div>
          <div class="equipment-edit__actions">
            <button class="btn btn--secondary" onClick={() => editingEquipment.value = false}>
              Cancel
            </button>
            <button class="btn" onClick={handleSaveEquipment}>
              Save
            </button>
          </div>
        </div>
      </Modal>

      {/* Attuned Items Edit Modal */}
      <Modal
        isOpen={editingAttuned.value}
        onClose={() => editingAttuned.value = false}
        title="Edit Attuned Items"
      >
        <div class="equipment-edit">
          <p class="equipment-edit__hint">Maximum 3 attuned items</p>
          <div class="equipment-edit__list">
            {attunedForm.value.map((item, i) => (
              <div key={i} class="equipment-edit__item">
                <span>{item}</span>
                <button
                  class="btn btn--small btn--danger"
                  onClick={() => handleRemoveAttunedItem(i)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          {attunedForm.value.length < 3 && (
            <div class="equipment-edit__add">
              <input
                type="text"
                class="input"
                placeholder="Add attuned item..."
                value={newAttunedItem.value}
                onInput={(e) => newAttunedItem.value = (e.target as HTMLInputElement).value}
                onKeyDown={(e) => e.key === 'Enter' && handleAddAttunedItem()}
              />
              <button class="btn btn--small" onClick={handleAddAttunedItem}>
                Add
              </button>
            </div>
          )}
          <div class="equipment-edit__actions">
            <button class="btn btn--secondary" onClick={() => editingAttuned.value = false}>
              Cancel
            </button>
            <button class="btn" onClick={handleSaveAttuned}>
              Save
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
