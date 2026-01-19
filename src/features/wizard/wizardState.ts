import { signal, computed } from '@preact/signals';
import type { Ability, CharacterClass, ProficiencyLevel, Skill, CharacterDefinition, CharacterSession } from '../../types';
import { getRepository } from '../../storage';
import { loadCharacter, loadAllCharacters } from '../../state';

// Wizard visibility (shared with app and settings)
export const showWizard = signal(false);

// Wizard steps
export type WizardStep = 'basics' | 'abilities' | 'class' | 'skills' | 'equipment' | 'review';

export const WIZARD_STEPS: WizardStep[] = ['basics', 'abilities', 'class', 'skills', 'equipment', 'review'];

// Wizard state
export const currentStep = signal<WizardStep>('basics');
export const isSubmitting = signal(false);
export const submitError = signal<string | null>(null);

// Character data being built
export const wizardData = signal<Partial<CharacterDefinition>>({
  name: '',
  race: '',
  background: '',
  classes: [{ name: '', subclass: '', level: 1 }],
  abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  savingThrowProficiencies: {
    str: 'none', dex: 'none', con: 'none',
    int: 'none', wis: 'none', cha: 'none'
  },
  skillProficiencies: {
    acrobatics: 'none', animalHandling: 'none', arcana: 'none', athletics: 'none',
    deception: 'none', history: 'none', insight: 'none', intimidation: 'none',
    investigation: 'none', medicine: 'none', nature: 'none', perception: 'none',
    performance: 'none', persuasion: 'none', religion: 'none', sleightOfHand: 'none',
    stealth: 'none', survival: 'none'
  },
  maxHP: 10,
  armorClass: 10,
  speed: 30,
  initiativeBonus: 0,
  resourceDefinitions: [],
  attackMacros: [],
  saveMacros: [],
  checkMacros: [],
  spells: [],
  equipment: [],
  currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
  attunedItems: [],
  notes: ''
});

// Step validation
export const stepValid = computed(() => {
  const data = wizardData.value;

  switch (currentStep.value) {
    case 'basics':
      return !!(data.name && data.name.length >= 1 && data.race);
    case 'abilities':
      return true; // Abilities always have defaults
    case 'class':
      return !!(data.classes && data.classes.length > 0 && data.classes[0].name);
    case 'skills':
      return true; // Skills are optional
    case 'equipment':
      return true; // Equipment is optional
    case 'review':
      return true;
    default:
      return false;
  }
});

// Navigation
export function nextStep(): void {
  const idx = WIZARD_STEPS.indexOf(currentStep.value);
  if (idx < WIZARD_STEPS.length - 1) {
    currentStep.value = WIZARD_STEPS[idx + 1];
  }
}

export function prevStep(): void {
  const idx = WIZARD_STEPS.indexOf(currentStep.value);
  if (idx > 0) {
    currentStep.value = WIZARD_STEPS[idx - 1];
  }
}

export function goToStep(step: WizardStep): void {
  currentStep.value = step;
}

// Update wizard data
export function updateWizardData(updates: Partial<CharacterDefinition>): void {
  wizardData.value = { ...wizardData.value, ...updates };
}

export function updateAbilityScore(ability: Ability, score: number): void {
  const current = wizardData.value.abilityScores || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  wizardData.value = {
    ...wizardData.value,
    abilityScores: { ...current, [ability]: score }
  };
}

export function updateSkillProficiency(skill: Skill, level: ProficiencyLevel): void {
  const current = wizardData.value.skillProficiencies || {} as Record<Skill, ProficiencyLevel>;
  wizardData.value = {
    ...wizardData.value,
    skillProficiencies: { ...current, [skill]: level }
  };
}

export function updateSaveProficiency(ability: Ability, level: ProficiencyLevel): void {
  const current = wizardData.value.savingThrowProficiencies || {} as Record<Ability, ProficiencyLevel>;
  wizardData.value = {
    ...wizardData.value,
    savingThrowProficiencies: { ...current, [ability]: level }
  };
}

export function updateClass(index: number, classData: Partial<CharacterClass>): void {
  const classes = [...(wizardData.value.classes || [])];
  classes[index] = { ...classes[index], ...classData };
  wizardData.value = { ...wizardData.value, classes };
}

// Reset wizard
export function resetWizard(): void {
  currentStep.value = 'basics';
  isSubmitting.value = false;
  submitError.value = null;
  wizardData.value = {
    name: '',
    race: '',
    background: '',
    classes: [{ name: '', subclass: '', level: 1 }],
    abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    savingThrowProficiencies: {
      str: 'none', dex: 'none', con: 'none',
      int: 'none', wis: 'none', cha: 'none'
    },
    skillProficiencies: {
      acrobatics: 'none', animalHandling: 'none', arcana: 'none', athletics: 'none',
      deception: 'none', history: 'none', insight: 'none', intimidation: 'none',
      investigation: 'none', medicine: 'none', nature: 'none', perception: 'none',
      performance: 'none', persuasion: 'none', religion: 'none', sleightOfHand: 'none',
      stealth: 'none', survival: 'none'
    },
    maxHP: 10,
    armorClass: 10,
    speed: 30,
    initiativeBonus: 0,
    resourceDefinitions: [],
    attackMacros: [],
    saveMacros: [],
    checkMacros: [],
    spells: [],
    equipment: [],
    currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
    attunedItems: [],
    notes: ''
  };
}

// Submit character
export async function submitCharacter(): Promise<string | null> {
  isSubmitting.value = true;
  submitError.value = null;

  try {
    const data = wizardData.value;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    // Build complete definition
    const definition: CharacterDefinition = {
      id,
      name: data.name || 'Unnamed Character',
      race: data.race || 'Human',
      background: data.background || '',
      classes: data.classes || [{ name: 'Fighter', level: 1 }],
      abilityScores: data.abilityScores || { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
      savingThrowProficiencies: data.savingThrowProficiencies || {
        str: 'none', dex: 'none', con: 'none', int: 'none', wis: 'none', cha: 'none'
      },
      skillProficiencies: data.skillProficiencies || {
        acrobatics: 'none', animalHandling: 'none', arcana: 'none', athletics: 'none',
        deception: 'none', history: 'none', insight: 'none', intimidation: 'none',
        investigation: 'none', medicine: 'none', nature: 'none', perception: 'none',
        performance: 'none', persuasion: 'none', religion: 'none', sleightOfHand: 'none',
        stealth: 'none', survival: 'none'
      },
      maxHP: data.maxHP || 10,
      armorClass: data.armorClass || 10,
      speed: data.speed || 30,
      initiativeBonus: data.initiativeBonus || 0,
      resourceDefinitions: data.resourceDefinitions || [],
      attackMacros: data.attackMacros || [],
      saveMacros: data.saveMacros || [],
      checkMacros: data.checkMacros || [],
      spells: data.spells || [],
      equipment: data.equipment || [],
      currency: data.currency || { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
      attunedItems: data.attunedItems || [],
      notes: data.notes || '',
      version: 1,
      createdAt: now,
      updatedAt: now
    };

    // Save to storage
    const repo = getRepository();
    await repo.saveDefinition(definition);

    // Create initial session
    const session: CharacterSession = {
      id: crypto.randomUUID(),
      definitionId: id,
      currentHP: definition.maxHP,
      tempHP: 0,
      deathSaves: { successes: 0, failures: 0 },
      isDowned: false,
      resourceCurrents: {},
      conditions: [],
      pinnedItems: [],
      lastModified: now
    };
    await repo.saveSession(session);

    // Reload character list and switch to new character
    await loadAllCharacters();
    await loadCharacter(id);

    return id;
  } catch (error) {
    submitError.value = error instanceof Error ? error.message : 'Failed to create character';
    return null;
  } finally {
    isSubmitting.value = false;
  }
}
