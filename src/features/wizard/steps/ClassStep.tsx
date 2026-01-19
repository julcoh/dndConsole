import { wizardData, updateClass, updateWizardData, updateSaveProficiency } from '../wizardState';
import type { Ability } from '../../../types';

const CLASSES = [
  { name: 'Barbarian', hitDie: 12, saves: ['str', 'con'] as Ability[] },
  { name: 'Bard', hitDie: 8, saves: ['dex', 'cha'] as Ability[] },
  { name: 'Cleric', hitDie: 8, saves: ['wis', 'cha'] as Ability[] },
  { name: 'Druid', hitDie: 8, saves: ['int', 'wis'] as Ability[] },
  { name: 'Fighter', hitDie: 10, saves: ['str', 'con'] as Ability[] },
  { name: 'Monk', hitDie: 8, saves: ['str', 'dex'] as Ability[] },
  { name: 'Paladin', hitDie: 10, saves: ['wis', 'cha'] as Ability[] },
  { name: 'Ranger', hitDie: 10, saves: ['str', 'dex'] as Ability[] },
  { name: 'Rogue', hitDie: 8, saves: ['dex', 'int'] as Ability[] },
  { name: 'Sorcerer', hitDie: 6, saves: ['con', 'cha'] as Ability[] },
  { name: 'Warlock', hitDie: 8, saves: ['wis', 'cha'] as Ability[] },
  { name: 'Wizard', hitDie: 6, saves: ['int', 'wis'] as Ability[] },
  { name: 'Artificer', hitDie: 8, saves: ['con', 'int'] as Ability[] }
];

export function ClassStep() {
  const data = wizardData.value;
  const currentClass = data.classes?.[0] || { name: '', level: 1 };

  const handleClassChange = (className: string) => {
    updateClass(0, { name: className });

    // Update save proficiencies based on class
    const classData = CLASSES.find(c => c.name === className);
    if (classData) {
      // Reset all saves first
      const abilities: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
      abilities.forEach(ab => updateSaveProficiency(ab, 'none'));

      // Set class save proficiencies
      classData.saves.forEach(ab => updateSaveProficiency(ab, 'proficient'));

      // Update HP based on hit die (max at level 1 + CON mod)
      const conMod = Math.floor(((data.abilityScores?.con || 10) - 10) / 2);
      const level = currentClass.level || 1;
      const maxHP = classData.hitDie + conMod + ((level - 1) * (Math.floor(classData.hitDie / 2) + 1 + conMod));
      updateWizardData({ maxHP: Math.max(1, maxHP) });
    }
  };

  const handleLevelChange = (level: number) => {
    updateClass(0, { level });

    // Recalculate HP
    const classData = CLASSES.find(c => c.name === currentClass.name);
    if (classData) {
      const conMod = Math.floor(((data.abilityScores?.con || 10) - 10) / 2);
      const maxHP = classData.hitDie + conMod + ((level - 1) * (Math.floor(classData.hitDie / 2) + 1 + conMod));
      updateWizardData({ maxHP: Math.max(1, maxHP) });
    }
  };

  const selectedClassData = CLASSES.find(c => c.name === currentClass.name);

  return (
    <div class="wizard-step">
      <h2 class="wizard-step__title">Class</h2>

      <div class="wizard-form">
        <div class="wizard-form__field">
          <label class="wizard-form__label" for="class">Class *</label>
          <select
            id="class"
            class="wizard-form__select"
            value={currentClass.name || ''}
            onChange={(e) => handleClassChange((e.target as HTMLSelectElement).value)}
            required
          >
            <option value="">Select class...</option>
            {CLASSES.map(c => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>

        <div class="wizard-form__field">
          <label class="wizard-form__label" for="level">Level</label>
          <input
            id="level"
            type="number"
            class="wizard-form__input"
            value={currentClass.level || 1}
            min={1}
            max={20}
            onChange={(e) => handleLevelChange(parseInt((e.target as HTMLInputElement).value, 10) || 1)}
          />
        </div>

        <div class="wizard-form__field">
          <label class="wizard-form__label" for="subclass">Subclass</label>
          <input
            id="subclass"
            type="text"
            class="wizard-form__input"
            value={currentClass.subclass || ''}
            onInput={(e) => updateClass(0, { subclass: (e.target as HTMLInputElement).value })}
            placeholder="e.g., Champion, Life Domain"
          />
        </div>

        {selectedClassData && (
          <div class="class-info">
            <p><strong>Hit Die:</strong> d{selectedClassData.hitDie}</p>
            <p><strong>Save Proficiencies:</strong> {selectedClassData.saves.map(s => s.toUpperCase()).join(', ')}</p>
            <p><strong>Max HP:</strong> {data.maxHP || 10}</p>
          </div>
        )}
      </div>
    </div>
  );
}
