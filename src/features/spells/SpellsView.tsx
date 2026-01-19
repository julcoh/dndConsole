import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import { SpellList, spellSearchQuery, spellLevelFilter, spellSchoolFilter, showPreparedOnly } from './SpellList';
import {
  spellDatabase,
  spellDatabaseLoaded,
  spellDatabaseError,
  loadSpellDatabase,
  getSpellsForClass,
  canCastSpell,
  castSpell
} from './spellStore';
import { currentDefinition, toggleSpellPrepared } from '../../state';

// View mode: character spells or spell browser
const viewMode = signal<'character' | 'browse'>('character');
const browseClass = signal<string>('wizard');

export function SpellsView() {
  const def = currentDefinition.value;

  // Load spell database on mount
  useEffect(() => {
    loadSpellDatabase();
  }, []);

  // Reset filters when switching views
  useEffect(() => {
    spellSearchQuery.value = '';
    spellLevelFilter.value = null;
    spellSchoolFilter.value = null;
    showPreparedOnly.value = false;
  }, [viewMode.value]);

  if (!def) {
    return (
      <div class="placeholder">
        <h1>No Character</h1>
        <p>Create or load a character to view spells</p>
      </div>
    );
  }

  if (spellDatabaseError.value) {
    return (
      <div class="placeholder">
        <h1>Error</h1>
        <p class="text-danger">{spellDatabaseError.value}</p>
        <button class="btn btn--primary" onClick={() => loadSpellDatabase()}>
          Retry
        </button>
      </div>
    );
  }

  if (!spellDatabaseLoaded.value) {
    return (
      <div class="placeholder">
        <p>Loading spell database...</p>
      </div>
    );
  }

  // Get spells to display
  const spellsToShow = viewMode.value === 'character'
    ? spellDatabase.value.filter(s =>
        def.spells.some(cs => cs.name.toLowerCase() === s.name.toLowerCase())
      )
    : getSpellsForClass(browseClass.value);

  return (
    <div class="spells-view">
      {/* View Mode Toggle */}
      <div class="spells-view__tabs">
        <button
          class={`spells-view__tab ${viewMode.value === 'character' ? 'spells-view__tab--active' : ''}`}
          onClick={() => viewMode.value = 'character'}
        >
          My Spells ({def.spells.length})
        </button>
        <button
          class={`spells-view__tab ${viewMode.value === 'browse' ? 'spells-view__tab--active' : ''}`}
          onClick={() => viewMode.value = 'browse'}
        >
          Browse
        </button>
      </div>

      {/* Browse Class Selector */}
      {viewMode.value === 'browse' && (
        <div class="spells-view__class-select">
          <select
            class="spell-list__select"
            value={browseClass.value}
            onChange={(e) => browseClass.value = (e.target as HTMLSelectElement).value}
          >
            {['Artificer', 'Bard', 'Cleric', 'Druid', 'Paladin', 'Ranger', 'Sorcerer', 'Warlock', 'Wizard'].map(c => (
              <option key={c} value={c.toLowerCase()}>{c}</option>
            ))}
          </select>
        </div>
      )}

      {/* Spell List */}
      <SpellList
        spells={spellsToShow}
        characterSpells={def.spells}
        onCast={(name, level) => castSpell(name, level)}
        canCastAtLevel={(level) => canCastSpell(level)}
        onPrepareToggle={(name) => toggleSpellPrepared(name)}
      />
    </div>
  );
}
