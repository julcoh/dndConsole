import { wizardData, updateWizardData } from '../wizardState';

const RACES = [
  'Human', 'Elf', 'Dwarf', 'Halfling', 'Gnome', 'Half-Elf', 'Half-Orc',
  'Tiefling', 'Dragonborn', 'Goliath', 'Aasimar', 'Firbolg', 'Kenku',
  'Tabaxi', 'Tortle', 'Hobgoblin', 'Bugbear', 'Goblin', 'Kobold', 'Orc'
];

const BACKGROUNDS = [
  'Acolyte', 'Charlatan', 'Criminal', 'Entertainer', 'Folk Hero',
  'Guild Artisan', 'Hermit', 'Noble', 'Outlander', 'Sage',
  'Sailor', 'Soldier', 'Urchin', 'Custom'
];

export function BasicsStep() {
  const data = wizardData.value;

  return (
    <div class="wizard-step">
      <h2 class="wizard-step__title">Basic Information</h2>

      <div class="wizard-form">
        <div class="wizard-form__field">
          <label class="wizard-form__label" for="name">Character Name *</label>
          <input
            id="name"
            type="text"
            class="wizard-form__input"
            value={data.name || ''}
            onInput={(e) => updateWizardData({ name: (e.target as HTMLInputElement).value })}
            placeholder="Enter character name"
            required
          />
        </div>

        <div class="wizard-form__field">
          <label class="wizard-form__label" for="race">Race *</label>
          <select
            id="race"
            class="wizard-form__select"
            value={data.race || ''}
            onChange={(e) => updateWizardData({ race: (e.target as HTMLSelectElement).value })}
            required
          >
            <option value="">Select race...</option>
            {RACES.map(race => (
              <option key={race} value={race}>{race}</option>
            ))}
          </select>
        </div>

        <div class="wizard-form__field">
          <label class="wizard-form__label" for="background">Background</label>
          <select
            id="background"
            class="wizard-form__select"
            value={data.background || ''}
            onChange={(e) => updateWizardData({ background: (e.target as HTMLSelectElement).value })}
          >
            <option value="">Select background...</option>
            {BACKGROUNDS.map(bg => (
              <option key={bg} value={bg}>{bg}</option>
            ))}
          </select>
        </div>

        <div class="wizard-form__field">
          <label class="wizard-form__label" for="playerName">Player Name</label>
          <input
            id="playerName"
            type="text"
            class="wizard-form__input"
            value={data.playerName || ''}
            onInput={(e) => updateWizardData({ playerName: (e.target as HTMLInputElement).value })}
            placeholder="Your name (optional)"
          />
        </div>
      </div>
    </div>
  );
}
