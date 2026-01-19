import { currentStep, wizardData, resetWizard, submitCharacter, type WizardStep } from './wizardState';
import { BasicsStep } from './steps/BasicsStep';
import { AbilitiesStep } from './steps/AbilitiesStep';
import { ClassStep } from './steps/ClassStep';
import { SkillsStep } from './steps/SkillsStep';
import { EquipmentStep } from './steps/EquipmentStep';
import { ReviewStep } from './steps/ReviewStep';
import { signal } from '@preact/signals';

const STEPS: { key: WizardStep; label: string }[] = [
  { key: 'basics', label: 'Basics' },
  { key: 'abilities', label: 'Abilities' },
  { key: 'class', label: 'Class' },
  { key: 'skills', label: 'Skills' },
  { key: 'equipment', label: 'Equipment' },
  { key: 'review', label: 'Review' }
];

const isSubmitting = signal(false);
const submitError = signal<string | null>(null);

interface Props {
  onComplete: (characterId: string) => void;
  onCancel: () => void;
}

export function CharacterWizard({ onComplete, onCancel }: Props) {
  const step = currentStep.value;
  const stepIndex = STEPS.findIndex(s => s.key === step);
  const data = wizardData.value;

  const canGoNext = (): boolean => {
    switch (step) {
      case 'basics':
        return Boolean(data.name && data.race);
      case 'class':
        return Boolean(data.classes?.[0]?.name);
      default:
        return true;
    }
  };

  const canSubmit = (): boolean => {
    return Boolean(
      data.name &&
      data.race &&
      data.classes?.[0]?.name
    );
  };

  const goToStep = (targetStep: WizardStep) => {
    currentStep.value = targetStep;
  };

  const goNext = () => {
    if (stepIndex < STEPS.length - 1) {
      currentStep.value = STEPS[stepIndex + 1].key;
    }
  };

  const goBack = () => {
    if (stepIndex > 0) {
      currentStep.value = STEPS[stepIndex - 1].key;
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;

    isSubmitting.value = true;
    submitError.value = null;

    try {
      const characterId = await submitCharacter();
      if (characterId) {
        resetWizard();
        onComplete(characterId);
      } else {
        submitError.value = 'Failed to create character';
      }
    } catch (err) {
      submitError.value = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      isSubmitting.value = false;
    }
  };

  const handleCancel = () => {
    resetWizard();
    onCancel();
  };

  const renderStep = () => {
    switch (step) {
      case 'basics':
        return <BasicsStep />;
      case 'abilities':
        return <AbilitiesStep />;
      case 'class':
        return <ClassStep />;
      case 'skills':
        return <SkillsStep />;
      case 'equipment':
        return <EquipmentStep />;
      case 'review':
        return <ReviewStep />;
    }
  };

  return (
    <div class="character-wizard">
      <div class="wizard-header">
        <h1 class="wizard-header__title">Create Character</h1>
        <button class="wizard-header__close" onClick={handleCancel} aria-label="Cancel">
          ✕
        </button>
      </div>

      <nav class="wizard-nav">
        {STEPS.map((s, i) => (
          <button
            key={s.key}
            class={`wizard-nav__step ${s.key === step ? 'wizard-nav__step--active' : ''} ${i < stepIndex ? 'wizard-nav__step--complete' : ''}`}
            onClick={() => goToStep(s.key)}
            disabled={i > stepIndex && !canGoNext()}
          >
            <span class="wizard-nav__number">{i + 1}</span>
            <span class="wizard-nav__label">{s.label}</span>
          </button>
        ))}
      </nav>

      <div class="wizard-content">
        {renderStep()}
      </div>

      {submitError.value && (
        <div class="wizard-error">
          {submitError.value}
        </div>
      )}

      <div class="wizard-footer">
        <button
          class="btn btn--secondary"
          onClick={goBack}
          disabled={stepIndex === 0}
        >
          Back
        </button>

        <div class="wizard-footer__spacer" />

        {step === 'review' ? (
          <button
            class="btn btn--primary"
            onClick={handleSubmit}
            disabled={!canSubmit() || isSubmitting.value}
          >
            {isSubmitting.value ? 'Creating...' : 'Create Character'}
          </button>
        ) : (
          <button
            class="btn btn--primary"
            onClick={goNext}
            disabled={!canGoNext()}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
