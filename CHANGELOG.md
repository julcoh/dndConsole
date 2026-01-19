# D&D Console - Technical Changelog

This document logs all technical decisions and rationale for the D&D Console project.

---

## 2026-01-05 - Project Initialization

### Decision: Project Structure - Feature Slices Architecture
**Rationale:** Organizing code by feature (hp/, resources/, rolls/, conditions/, spells/) rather than by type (components/, hooks/, utils/) keeps related code co-located. This makes it easier to understand, modify, and delete features without hunting across directories. Each feature owns its UI components, actions, and selectors.

### Decision: Data Model Split - Definition vs Session
**Rationale:** Separating static character data (CharacterDefinition) from runtime state (CharacterSession) provides:
- Cleaner undo/redo (only session state changes during play)
- Simpler rest logic (restore session values without touching definition)
- Future-proof for sync (definitions change rarely, sessions change constantly)
- Clear mental model: "what I am" vs "what's happening now"

### Decision: IndexedDB Only (No localStorage Fallback)
**Rationale:**
- localStorage has a 5MB limit, problematic for spell databases and multiple characters
- IndexedDB is supported in all modern browsers and PWAs
- Maintaining two storage backends adds complexity and testing burden
- Clear error messaging if IndexedDB unavailable is better than silent fallback quirks

### Decision: Typed Macros Over String Parsing
**Rationale:** Storing attacks as structured data (`{ toHit: 7, damage: { dice: "1d8", bonus: 5 } }`) rather than parsing strings like "+7 to hit, 1d8+5 slashing" enables:
- Correct critical hit handling (double dice, not double bonus)
- Great Weapon Fighting reroll logic (reroll 1s and 2s on damage)
- Cleaner UI generation (separate fields for to-hit vs damage)
- No fragile regex parsing that breaks on edge cases

### Decision: Death Saves as Overlay, Not Screen Swap
**Rationale:** When a character drops to 0 HP, showing death saves as an overlay panel (dimming PlayView behind it) is less jarring than a full screen replacement. The player can still see their character info and the overlay can be dismissed when healed, maintaining context.

### Decision: PlayView as Customizable Pinned Dashboard
**Rationale:** Most D&D play involves the same 5-10 actions repeatedly. Rather than navigating tabs during combat, players pin their frequently-used items (attacks, resources, spells) to PlayView. Goal: "one screen 95% of combat time."

### Decision: Smart Rest Defaults with Preview
**Rationale:** Instead of showing checkboxes for every resource on rest, pre-select what should restore based on each resource's `rechargeOn` property. Show a preview of changes before confirming. Still allow manual adjustment for edge cases (interrupted rest, etc.).

### Decision: Preact + Signals Over React
**Rationale:**
- Preact: ~3KB vs React's ~40KB - critical for offline-first PWA
- Signals: Fine-grained reactivity without selector boilerplate
- Preact/signals integrates seamlessly with Preact ecosystem
- Familiar JSX syntax for React developers

### Decision: Vite as Build Tool
**Rationale:**
- Fast dev server with HMR
- Native ESM for modern browsers
- Built-in PWA plugin support
- TypeScript support out of the box
- Simple configuration

### Decision: CSS Variables for Theming
**Rationale:**
- Native browser support, no runtime overhead
- Easy dark/light theme switching via class toggle
- Consistent design tokens across components
- No CSS-in-JS complexity or bundle size

---

## 2026-01-05 - Phase 1: Foundation Complete

### Completed Tasks
- [x] Vite + Preact + TypeScript setup
- [x] PWA manifest + service worker shell (via vite-plugin-pwa)
- [x] TypeScript interfaces (Definition/Session split)
- [x] IndexedDB repository with idb library
- [x] Preact signals store + action log (20-action undo stack)
- [x] Theme system (CSS variables, dark/light)
- [x] Basic app shell with routing (signal-based)

### Implementation Notes

**Project Setup (`package.json`, `vite.config.ts`, `tsconfig.json`)**
- Vite 5 with `@preact/preset-vite` for optimal Preact support
- `vite-plugin-pwa` configured with workbox for offline caching
- TypeScript strict mode enabled with path aliases

**Type System (`src/types/`)**
- `character.ts`: CharacterDefinition (static) and CharacterSession (runtime) split
- `resources.ts`: ResourceDefinition with spell slot presets and recharge logic
- `macros.ts`: AttackMacro, SaveMacro, CheckMacro with crit behavior config
- `conditions.ts`: All 15 standard 5E conditions with effects

**Storage Layer (`src/storage/`)**
- IndexedDB-only approach using `idb` library for promise-based API
- Separate object stores for definitions and sessions
- Clear error handling with StorageUnavailableError
- Transaction-safe delete operations (definition + session together)

**State Management (`src/state/`)**
- Preact signals for reactive state (no Redux/context complexity)
- ActionLog with 20-action undo stack, discards future on new action
- Debounced auto-save (1 second) on session changes
- HP modification correctly handles temp HP absorption

**Utilities (`src/utils/`)**
- `dice.ts`: Full dice engine with advantage/disadvantage, crit handling, GWF rerolls
- `derived.ts`: Proficiency bonus, ability modifiers, skill/save calculations

**Theme System (`src/index.css`)**
- CSS custom properties for all colors, spacing, typography
- Dark theme default, light theme via `.theme-light` class
- 44px minimum touch targets for mobile
- Safe area insets for notched devices

**Sample Data (`src/data/sampleTolvis.ts`)**
- Complete Tolvis character (Level 12 Hobgoblin Artificer)
- Demonstrates all data model features: resources, macros, conditions, pinning

---

## 2026-01-05 - Phase 2: Core Play Complete

### Completed Tasks
- [x] Header component with character info, concentration badge, undo button
- [x] HealthTracker with HP bar, temp HP, quick +/- buttons
- [x] NumpadModal for precise HP/temp HP entry
- [x] DeathSavesOverlay (overlay, not screen swap)
- [x] ResourcePool component with pip-based and counter-based views
- [x] SpellSlots grouped display
- [x] RestModal with smart defaults and preview
- [x] Undo button integration in header

### Implementation Notes

**Header (`src/components/layout/Header.tsx`)**
- Sticky header with character name, level, HP
- AC display and concentration spell badge (yellow highlight)
- Undo button (↶) appears when actions available

**Health Tracking (`src/features/hp/`)**
- `HealthTracker.tsx`: Visual HP bar with color gradient (green→yellow→red)
- Temp HP shown as blue overlay on bar
- Quick buttons: -5, -1, +1, +5 for fast HP changes
- Click HP number to open numpad for exact value entry
- `NumpadModal.tsx`: Mobile-friendly numpad for entering values
- `DeathSavesOverlay.tsx`: Overlay panel (not full screen) when downed
  - Success/failure pip tracking
  - Quick heal (1 HP) or dismiss buttons
  - Shows DEAD or Stable states

**Resources (`src/features/resources/`)**
- `ResourcePool.tsx`: Generic component for any resource type
  - Pip view for resources ≤10 (clickable to toggle)
  - Counter view with +/- for resources >10
  - Compact mode for inline display
- `SpellSlots.tsx`: Groups spell slots by level
- `RestModal.tsx`: Smart rest system
  - Auto-selects resources that can recharge on rest type
  - Preview panel shows what will change
  - Long rest fully restores HP and clears temp HP

**App Integration (`src/app.tsx`)**
- Loads sample Tolvis character on startup
- PlayView shows HP tracker, spell slots, class features
- Rest buttons open modal for short/long rest
- DeathSavesOverlay renders globally (z-index 200)

---

## 2026-01-05 - Test Suite Implementation

### Test Coverage: 152 Tests Total

**Unit Tests (Vitest) - 127 tests**
- `dice.test.ts` (28 tests): Dice parsing, rolling, advantage/disadvantage, crits, GWF rerolls
- `derived.test.ts` (25 tests): Ability modifiers, proficiency bonus, skill/save calculations
- `actionLog.test.ts` (22 tests): Undo/redo, action stack management, descriptions
- `resources.test.ts` (17 tests): Recharge calculations, rest filtering, spell slot presets
- `conditions.test.ts` (19 tests): Standard conditions, expiration, round tracking
- `indexedDB.test.ts` (16 tests): CRUD operations, import/export, timestamps

**E2E Browser Tests (Playwright) - 25 tests**
- App loading and character display
- HP modification (damage/heal buttons, numpad)
- Spell slot pip interaction
- Class feature display
- Rest system buttons
- Undo functionality
- Navigation between tabs
- Header information display
- Responsive design (44px touch targets)
- Data persistence across reload
- Mobile viewport compatibility

### Test Commands
```bash
npm test           # Run unit tests
npm run test:e2e   # Run browser tests
npm run test:all   # Run all tests
npm run test:coverage  # Unit tests with coverage
```

### Technical Notes
- Vitest for unit testing (fast, Vite-native)
- Playwright for E2E (Chromium, Mobile Chrome)
- fake-indexeddb for storage tests
- Tests auto-start dev server for E2E

---

## 2026-01-05 - Phase 3+4: Rolls, Conditions, and Dashboard

### Completed Tasks
- [x] Dice engine integration with UI
- [x] AttackMacroButton, SaveMacroButton, CheckMacroButton
- [x] RollOutput component with crit/fumble highlighting
- [x] RollHistoryPanel with clickable past rolls
- [x] Copy roll results to clipboard
- [x] ConditionBadge with source, ends, and round tracking
- [x] ConditionList with add/remove UI
- [x] Add Condition modal with quick-select standard conditions
- [x] ConcentrationBadge component
- [x] PlayView updated with all macro sections

### Implementation Notes

**Roll System (`src/features/rolls/`)**
- `MacroButton.tsx`: Three button types for attacks, saves, and checks
  - AttackMacroButton: Displays name + to-hit/damage, rolls attack with crit handling
  - SaveMacroButton: Displays name + DC/ability, rolls save against target bonus
  - CheckMacroButton: Displays name + modifier, rolls d20+bonus
  - All buttons update global `currentRoll` signal and add to history
- `RollOutput.tsx`: Rich display of roll results
  - Attack output: To-hit (with CRIT!/FUMBLE tags), damage with type
  - Save output: Roll vs DC with SUCCESS/FAILED indicator
  - Check output: Simple total with breakdown
  - Copy button formats roll for clipboard
- `rollHistory.ts`: Signal-based history (max 10 entries)
- `RollHistoryPanel.tsx`: Compact list of recent rolls, click to re-display

**Condition System (`src/features/conditions/`)**
- `ConditionBadge.tsx`: Displays condition with:
  - Name and remove button
  - Round counter button (click to decrement)
  - Source text (e.g., "Giant Spider bite")
  - Ends text (e.g., "CON DC 14")
  - Optional effects list for standard conditions
- `ConditionList.tsx`: Full condition management
  - Lists all active conditions
  - "+ Add" button opens modal
  - AddConditionModal with quick-select for 8 standard conditions
  - Custom name, source, ends, and rounds fields
- `ConcentrationBadge`: Shows current concentration spell with break button

**PlayView Updates (`src/app.tsx`)**
- CurrentRollDisplay at top (appears when roll made)
- RollHistoryPanel for recent roll recall
- Attacks section with all attackMacros
- Saves section with saveMacros
- Checks section with checkMacros
- Conditions card with full ConditionList
- Maintained spell slots and class features below

### CSS Additions (`src/index.css`)
- `.macro-btn` family: Grid-based macro buttons with type indicators
- `.roll-output` family: Rich roll result display with tags
- `.roll-history` family: Compact history entries
- `.condition-badge` family: Condition cards with round tracking
- `.condition-list` family: Condition management UI
- `.add-condition` family: Modal form styling

---

## 2026-01-05 - Phase 5: Sheet View (Character Reference)

### Completed Tasks
- [x] AbilityScores component with 6-column grid
- [x] SavingThrows component with proficiency indicators
- [x] Skills list (18 skills) with proficiency/expertise
- [x] CombatStats component (AC, Initiative, Speed, Proficiency, Spell DC/Attack)
- [x] Equipment section with currency and attuned items
- [x] Notes display
- [x] Full SheetView replacing placeholder

### Implementation Notes

**Sheet Components (`src/features/sheet/`)**
- `AbilityScores.tsx`: 6-column grid (3x2 on mobile), shows score and modifier
- `SavingThrows.tsx`: Lists 6 saves with proficiency indicators (●/○/◆)
- `Skills.tsx`: All 18 skills with ability abbreviations, sorted alphabetically
- `CombatStats.tsx`: Horizontal stat boxes for quick reference
- `Equipment.tsx`: Currency display, attuned items (highlighted), equipment list

**CSS Additions (`src/index.css`)**
- `.ability-scores` / `.ability-score`: Responsive grid layout
- `.combat-stats` / `.combat-stat`: Flex wrap stat boxes
- `.saving-throws` / `.saving-throw`: Proficiency indicator styling
- `.skills` / `.skill`: Compact skill list with ability tags
- `.equipment`: Sections for currency, attunement, gear

**Utility Functions Added (`src/utils/derived.ts`)**
- `getSaveModifier(score, proficiency, profBonus)`: Simplified save calculation
- `getSkillModifier(score, proficiency, profBonus)`: Simplified skill calculation

---

## 2026-01-06 - Phase 5.5: Spell Database Scraper

### Completed Tasks
- [x] Web scraper for dnd5e.wikidot.com/spells
- [x] Class-specific spell list scraping with level data
- [x] JSON database output (spells.json, class-spells.json)
- [x] Optional full scrape mode for spell descriptions
- [x] npm scripts for running scraper

### Implementation Notes

**Scraper Script (`scripts/scrape-spells.mjs`)**
- ESM module using cheerio for HTML parsing and native fetch
- Parses YUI tabset structure used by wikidot for spell level tabs
- Rate limiting (200ms delay) to be respectful to server
- Retry logic with exponential backoff for failed requests
- Multiple parsing strategies for different page structures

**Data Output**
- `src/data/spells.json`: 574 unique spells with:
  - name, url, level, school
  - castingTime, range, duration, components
  - isRitual, isConcentration flags
  - classes array (which classes can use the spell)
- `src/data/class-spells.json`: Spells organized by class and level

**NPM Scripts**
```bash
npm run scrape:spells       # Quick scrape (class lists only)
npm run scrape:spells:full  # Full scrape with spell details
```

**CLI Options**
- `--full`: Scrape individual spell pages for full descriptions
- `--class=X`: Only scrape spells for specific class
- `--limit=N`: Limit to N spells (for testing)

---

## 2026-01-06 - Phase 6: Spells View

### Completed Tasks
- [x] SpellList component with level grouping
- [x] SpellCard with concentration/ritual tags
- [x] Cast spell (slot consumption)
- [x] Spell search and filter (by level, school, name)
- [x] Browse spells by class
- [x] "My Spells" vs "Browse" tabs

### Implementation Notes

**Spell Types (`src/types/spells.ts`)**
- `SpellData`: Full spell information from database
- `SpellComponents`: V, S, M breakdown
- `SpellDatabase`: JSON database schema
- Helper functions for level text, school abbreviations, component display

**Spell Store (`src/features/spells/spellStore.ts`)**
- `spellDatabase`: Signal holding all spells
- `loadSpellDatabase()`: Fetches and caches spell JSON
- `getSpellsForClass()`: Filters spells by class
- `canCastSpell()`: Checks if character has available spell slots
- `castSpell()`: Consumes spell slot when casting

**Components (`src/features/spells/`)**
- `SpellCard.tsx`: Expandable spell card showing all details
  - Concentration (C) and Ritual (R) tags
  - Cast button with slot consumption
  - Prepare toggle for non-cantrips
- `SpellRow.tsx`: Compact row for spell lists
- `SpellList.tsx`: Searchable, filterable spell list
  - Search by name, school, description
  - Filter by level (cantrips-9th)
  - Filter by school (8 schools)
  - Prepared only toggle
  - Grouped by spell level
- `SpellsView.tsx`: Main view with tabs
  - "My Spells" tab: Character's known spells
  - "Browse" tab: Browse all spells by class

**CSS Additions (`src/index.css`)**
- `.spells-view__*`: Tab navigation, view layout
- `.spell-list__*`: Search, filters, count, groups
- `.spell-card__*`: Expandable card with details
- `.spell-row__*`: Compact list item
- `.spell-group__*`: Level-grouped sections

---

## Next: Phase 7 - Settings & Character Management

### Planned Tasks
- [ ] Character creation wizard
- [ ] Character list / picker
- [ ] Import / export character
- [ ] Theme toggle (dark/light)
- [ ] Clear data option
