import { signal, computed } from '@preact/signals';
import type { SpellData } from '../../types/spells';
import type { CharacterSpell } from '../../types/character';
import { getSpellLevelText } from '../../types/spells';
import { SpellCard, SpellRow } from './SpellCard';

// Filter/search state
export const spellSearchQuery = signal('');
export const spellLevelFilter = signal<number | null>(null);
export const spellSchoolFilter = signal<string | null>(null);
export const showPreparedOnly = signal(false);

// Track which spell is expanded (showing full description)
export const expandedSpell = signal<string | null>(null);

interface SpellListProps {
  spells: SpellData[];
  characterSpells?: CharacterSpell[];
  onPrepareToggle?: (spellName: string) => void;
  onCast?: (spellName: string, level: number) => void;
  canCastAtLevel?: (level: number) => boolean;
  compact?: boolean;
}

export function SpellList({
  spells,
  characterSpells = [],
  onPrepareToggle,
  onCast,
  canCastAtLevel,
  compact = false
}: SpellListProps) {
  // Create a map for quick lookup of prepared state
  const preparedMap = new Map(
    characterSpells.map(cs => [cs.name.toLowerCase(), cs.prepared])
  );

  // Filter spells
  const filteredSpells = computed(() => {
    let result = spells;

    // Search filter
    const query = spellSearchQuery.value.toLowerCase();
    if (query) {
      result = result.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.school.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query)
      );
    }

    // Level filter
    if (spellLevelFilter.value !== null) {
      result = result.filter(s => s.level === spellLevelFilter.value);
    }

    // School filter
    if (spellSchoolFilter.value) {
      result = result.filter(s =>
        s.school.toLowerCase() === spellSchoolFilter.value?.toLowerCase()
      );
    }

    // Prepared only filter
    if (showPreparedOnly.value) {
      result = result.filter(s =>
        preparedMap.get(s.name.toLowerCase()) === true
      );
    }

    return result;
  });

  // Group by level
  const groupedSpells = computed(() => {
    const groups: Map<number, SpellData[]> = new Map();

    for (const spell of filteredSpells.value) {
      if (!groups.has(spell.level)) {
        groups.set(spell.level, []);
      }
      groups.get(spell.level)!.push(spell);
    }

    // Sort levels
    return Array.from(groups.entries()).sort((a, b) => a[0] - b[0]);
  });

  return (
    <div class="spell-list">
      {/* Search and Filters */}
      <div class="spell-list__filters">
        <input
          type="search"
          class="spell-list__search"
          placeholder="Search spells..."
          value={spellSearchQuery.value}
          onInput={(e) => spellSearchQuery.value = (e.target as HTMLInputElement).value}
        />

        <div class="spell-list__filter-row">
          <select
            class="spell-list__select"
            value={spellLevelFilter.value ?? ''}
            onChange={(e) => {
              const val = (e.target as HTMLSelectElement).value;
              spellLevelFilter.value = val === '' ? null : parseInt(val);
            }}
          >
            <option value="">All Levels</option>
            <option value="0">Cantrips</option>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(l => (
              <option key={l} value={l}>{l}{['st', 'nd', 'rd'][l - 1] || 'th'}</option>
            ))}
          </select>

          <select
            class="spell-list__select"
            value={spellSchoolFilter.value ?? ''}
            onChange={(e) => {
              const val = (e.target as HTMLSelectElement).value;
              spellSchoolFilter.value = val === '' ? null : val;
            }}
          >
            <option value="">All Schools</option>
            {['Abjuration', 'Conjuration', 'Divination', 'Enchantment', 'Evocation', 'Illusion', 'Necromancy', 'Transmutation'].map(s => (
              <option key={s} value={s.toLowerCase()}>{s}</option>
            ))}
          </select>

          {characterSpells.length > 0 && (
            <label class="spell-list__checkbox">
              <input
                type="checkbox"
                checked={showPreparedOnly.value}
                onChange={(e) => showPreparedOnly.value = (e.target as HTMLInputElement).checked}
              />
              Prepared
            </label>
          )}
        </div>
      </div>

      {/* Spell count */}
      <div class="spell-list__count">
        {filteredSpells.value.length} spell{filteredSpells.value.length !== 1 ? 's' : ''}
      </div>

      {/* Grouped spell list */}
      <div class="spell-list__groups">
        {groupedSpells.value.map(([level, levelSpells]) => (
          <div key={level} class="spell-group">
            <h3 class="spell-group__header">{getSpellLevelText(level)}</h3>
            <div class="spell-group__items">
              {levelSpells.map(spell => (
                compact ? (
                  <SpellRow
                    key={spell.name}
                    spell={spell}
                    isPrepared={preparedMap.get(spell.name.toLowerCase()) === true}
                    onClick={() => expandedSpell.value = expandedSpell.value === spell.name ? null : spell.name}
                  />
                ) : (
                  <SpellCard
                    key={spell.name}
                    spell={spell}
                    isPrepared={preparedMap.get(spell.name.toLowerCase()) === true}
                    onPrepareToggle={onPrepareToggle ? () => onPrepareToggle(spell.name) : undefined}
                    onCast={onCast ? (level) => onCast(spell.name, level) : undefined}
                    canCast={canCastAtLevel ? canCastAtLevel(spell.level) : true}
                    expanded={expandedSpell.value === spell.name}
                    onToggleExpand={() => expandedSpell.value = expandedSpell.value === spell.name ? null : spell.name}
                  />
                )
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredSpells.value.length === 0 && (
        <div class="spell-list__empty">
          No spells match your filters
        </div>
      )}
    </div>
  );
}
