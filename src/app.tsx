import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { Header } from './components/layout';
import { HealthTracker, DeathSavesOverlay, ConcentrationCheckPrompt } from './features/hp';
import { SpellSlots, ResourcePool, RestModal } from './features/resources';
import {
  AttackMacroButton,
  SaveMacroButton,
  CheckMacroButton,
  CurrentRollDisplay,
  RollHistoryPanel,
  AdvantageToggle,
  QuickRollButton
} from './features/rolls';
import { ConditionList } from './features/conditions';
import { AbilityScores, SavingThrows, Skills, CombatStats, Equipment } from './features/sheet';
import { SpellsView } from './features/spells';
import { SettingsView } from './features/settings';
import { CharacterWizard, showWizard } from './features/wizard';
import {
  currentDefinition,
  currentSession,
  loadCharacter,
  hasCharacter,
  isLoading,
  loadError
} from './state';
import { initializeSampleCharacter } from './data/sampleTolvis';

// Simple routing with signals
type Route = 'character' | 'settings';
export const currentRoute = signal<Route>('character');

// Rest modal state
const restModalOpen = signal<'short' | 'long' | null>(null);

export function App() {
  useEffect(() => {
    // Initialize sample character on first load
    initializeSampleCharacter().then(() => {
      loadCharacter('tolvis-001');
    });
  }, []);

  if (isLoading.value) {
    return (
      <div class="app">
        <main class="main-content">
          <div class="placeholder">
            <p>Loading...</p>
          </div>
        </main>
      </div>
    );
  }

  if (loadError.value) {
    return (
      <div class="app">
        <main class="main-content">
          <div class="placeholder">
            <h1>Error</h1>
            <p class="text-danger">{loadError.value}</p>
          </div>
        </main>
      </div>
    );
  }

  const handleWizardComplete = (characterId: string) => {
    showWizard.value = false;
    loadCharacter(characterId);
    currentRoute.value = 'character';
  };

  const handleWizardCancel = () => {
    showWizard.value = false;
  };

  return (
    <div class="app">
      <main class="main-content">
        {hasCharacter.value && <Header />}
        {currentRoute.value === 'character' && <CharacterView />}
        {currentRoute.value === 'settings' && <SettingsView />}
      </main>
      <Navigation />
      <DeathSavesOverlay />
      <ConcentrationCheckPrompt />
      <RestModal
        isOpen={restModalOpen.value !== null}
        onClose={() => restModalOpen.value = null}
        restType={restModalOpen.value || 'short'}
      />
      {showWizard.value && (
        <CharacterWizard
          onComplete={handleWizardComplete}
          onCancel={handleWizardCancel}
        />
      )}
    </div>
  );
}

function CharacterView() {
  const def = currentDefinition.value;
  const session = currentSession.value;

  if (!def || !session) {
    return (
      <div class="placeholder">
        <h1>No Character</h1>
        <p>Create or load a character to get started</p>
      </div>
    );
  }

  // Get class feature resources (not spell slots)
  const classFeatures = def.resourceDefinitions.filter(
    r => r.category === 'class_feature' || r.category === 'item_charge'
  );

  // Calculate initiative bonus (DEX mod + any initiative bonus)
  const dexMod = Math.floor((def.abilityScores.dex - 10) / 2);
  const initiativeBonus = dexMod + (def.initiativeBonus || 0);

  return (
    <div class="character-view">
      {/* Left Column - Combat & Actions */}
      <div class="character-view__column character-view__column--combat">
        {/* Character Info Header */}
        <div class="card character-header">
          <h2 class="character-header__name">{def.name}</h2>
          <p class="character-header__details">
            {def.race} {def.classes.map(c => `${c.name} ${c.level}`).join(' / ')}
          </p>
          {def.background && (
            <p class="character-header__background">{def.background}</p>
          )}
        </div>

        <HealthTracker />

        {/* Current Roll Display */}
        <CurrentRollDisplay />

        {/* Roll History */}
        <RollHistoryPanel />

        {/* Advantage Toggle + Initiative */}
        <div class="card">
          <AdvantageToggle />
          <div class="macro-grid">
            <QuickRollButton label="Initiative" bonus={initiativeBonus} type="initiative" />
          </div>
        </div>

        {/* Attack Macros */}
        {def.attackMacros.length > 0 && (
          <div class="macro-section card">
            <h3 class="macro-section__title">Attacks</h3>
            <div class="macro-grid">
              {def.attackMacros.map(macro => (
                <AttackMacroButton key={macro.id} macro={macro} />
              ))}
            </div>
          </div>
        )}

        {/* Save Macros */}
        {def.saveMacros && def.saveMacros.length > 0 && (
          <div class="macro-section card">
            <h3 class="macro-section__title">Saves</h3>
            <div class="macro-grid">
              {def.saveMacros.map(macro => (
                <SaveMacroButton key={macro.id} macro={macro} />
              ))}
            </div>
          </div>
        )}

        {/* Check Macros */}
        {def.checkMacros && def.checkMacros.length > 0 && (
          <div class="macro-section card">
            <h3 class="macro-section__title">Checks</h3>
            <div class="macro-grid">
              {def.checkMacros.map(macro => (
                <CheckMacroButton key={macro.id} macro={macro} />
              ))}
            </div>
          </div>
        )}

        {/* Conditions */}
        <div class="card">
          <ConditionList />
        </div>

        {/* Rest Buttons */}
        <div class="rest-buttons">
          <button
            class="btn btn--secondary"
            onClick={() => restModalOpen.value = 'short'}
          >
            Short Rest
          </button>
          <button
            class="btn btn--secondary"
            onClick={() => restModalOpen.value = 'long'}
          >
            Long Rest
          </button>
        </div>
      </div>

      {/* Middle Column - Abilities & Stats */}
      <div class="character-view__column character-view__column--stats">
        {/* Ability Scores */}
        <AbilityScores />

        {/* Combat Stats */}
        <CombatStats />

        {/* Saving Throws */}
        <SavingThrows />

        {/* Skills */}
        <Skills />
      </div>

      {/* Right Column - Resources & Equipment */}
      <div class="character-view__column character-view__column--resources">
        {/* Spell Slots */}
        <SpellSlots />

        {/* Class Features */}
        {classFeatures.length > 0 && (
          <div class="card">
            <h3 style={{ margin: '0 0 var(--space-sm)', fontSize: 'var(--font-size-md)' }}>
              Features
            </h3>
            {classFeatures.map(r => (
              <ResourcePool key={r.id} resourceId={r.id} compact />
            ))}
          </div>
        )}

        {/* Equipment */}
        <Equipment />

        {/* Notes */}
        {def.notes && (
          <div class="card">
            <h3 style={{ margin: '0 0 var(--space-sm)', fontSize: 'var(--font-size-md)' }}>Notes</h3>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              {def.notes}
            </p>
          </div>
        )}
      </div>

      {/* Full-Width Spells Section */}
      {def.spells.length > 0 && (
        <div class="character-view__spells">
          <SpellsView />
        </div>
      )}
    </div>
  );
}

function Navigation() {
  return (
    <nav class="nav">
      <NavButton route="character" label="Play" />
      <NavButton route="settings" label="Settings" icon="gear" />
    </nav>
  );
}

function NavButton({ route, label, icon }: { route: Route; label: string; icon?: string }) {
  const isActive = currentRoute.value === route;
  return (
    <button
      class={`nav-btn ${isActive ? 'nav-btn--active' : ''}`}
      onClick={() => currentRoute.value = route}
      aria-current={isActive ? 'page' : undefined}
    >
      {icon === 'gear' ? '\u2699' : label}
    </button>
  );
}


