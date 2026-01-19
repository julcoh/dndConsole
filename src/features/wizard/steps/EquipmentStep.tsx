import { wizardData, updateWizardData } from '../wizardState';

export function EquipmentStep() {
  const data = wizardData.value;
  const currency = data.currency || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };
  const equipment = data.equipment || [];

  const handleCurrencyChange = (type: 'cp' | 'sp' | 'ep' | 'gp' | 'pp', value: string) => {
    const numValue = parseInt(value, 10) || 0;
    updateWizardData({
      currency: { ...currency, [type]: Math.max(0, numValue) }
    });
  };

  const handleEquipmentChange = (value: string) => {
    // Split by newlines to get equipment list
    const items = value.split('\n').filter(item => item.trim());
    updateWizardData({ equipment: items });
  };

  const handleACChange = (value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      updateWizardData({ armorClass: Math.max(1, Math.min(30, numValue)) });
    }
  };

  const handleSpeedChange = (value: string) => {
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      updateWizardData({ speed: Math.max(0, numValue) });
    }
  };

  return (
    <div class="wizard-step">
      <h2 class="wizard-step__title">Equipment & Stats</h2>

      <div class="wizard-form">
        <div class="wizard-form__row">
          <div class="wizard-form__field wizard-form__field--small">
            <label class="wizard-form__label" for="ac">Armor Class</label>
            <input
              id="ac"
              type="number"
              class="wizard-form__input"
              value={data.armorClass || 10}
              min={1}
              max={30}
              onChange={(e) => handleACChange((e.target as HTMLInputElement).value)}
            />
          </div>

          <div class="wizard-form__field wizard-form__field--small">
            <label class="wizard-form__label" for="speed">Speed (ft)</label>
            <input
              id="speed"
              type="number"
              class="wizard-form__input"
              value={data.speed || 30}
              min={0}
              step={5}
              onChange={(e) => handleSpeedChange((e.target as HTMLInputElement).value)}
            />
          </div>
        </div>

        <div class="wizard-form__field">
          <label class="wizard-form__label">Starting Gold</label>
          <div class="currency-inputs">
            <div class="currency-input">
              <input
                type="number"
                class="wizard-form__input wizard-form__input--currency"
                value={currency.gp}
                min={0}
                onChange={(e) => handleCurrencyChange('gp', (e.target as HTMLInputElement).value)}
              />
              <span class="currency-label">GP</span>
            </div>
            <div class="currency-input">
              <input
                type="number"
                class="wizard-form__input wizard-form__input--currency"
                value={currency.sp}
                min={0}
                onChange={(e) => handleCurrencyChange('sp', (e.target as HTMLInputElement).value)}
              />
              <span class="currency-label">SP</span>
            </div>
            <div class="currency-input">
              <input
                type="number"
                class="wizard-form__input wizard-form__input--currency"
                value={currency.cp}
                min={0}
                onChange={(e) => handleCurrencyChange('cp', (e.target as HTMLInputElement).value)}
              />
              <span class="currency-label">CP</span>
            </div>
          </div>
        </div>

        <div class="wizard-form__field">
          <label class="wizard-form__label" for="equipment">Equipment (one per line)</label>
          <textarea
            id="equipment"
            class="wizard-form__textarea"
            value={equipment.join('\n')}
            onInput={(e) => handleEquipmentChange((e.target as HTMLTextAreaElement).value)}
            placeholder="Longsword&#10;Chain mail&#10;Shield&#10;Explorer's pack"
            rows={6}
          />
        </div>

        <div class="wizard-form__field">
          <label class="wizard-form__label" for="notes">Notes</label>
          <textarea
            id="notes"
            class="wizard-form__textarea"
            value={data.notes || ''}
            onInput={(e) => updateWizardData({ notes: (e.target as HTMLTextAreaElement).value })}
            placeholder="Character backstory, traits, bonds, flaws..."
            rows={4}
          />
        </div>
      </div>
    </div>
  );
}
