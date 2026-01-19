# D&D Console - Implementation Plan

## Summary
A lightweight, mobile-first D&D 5E character sheet console. **Offline-first** PWA focused on quick resource tracking during play sessions. Goal: **everything important in 2 taps** on PlayView.

## Core Principle
PlayView is a **customizable dashboard of pinned items**. Sheet/Spells/Gear are "library/reference" tabs, not the combat loop.

## Tech Stack
- **Framework**: Preact + Preact Signals
- **Build**: Vite + TypeScript
- **Storage**: IndexedDB only (no localStorage fallback - show clear error if unavailable)
- **Offline**: PWA with service worker + "New version available" refresh banner
- **Styling**: CSS variables (dark/light themes)

## Project Structure (Feature Slices)
```
dnd-console/
├── index.html
├── manifest.json
├── package.json
├── vite.config.ts
└── src/
    ├── main.tsx
    ├── app.tsx
    ├── sw.ts                        # Service worker
    ├── index.css                    # Global styles + themes
    │
    ├── types/
    │   ├── character.ts             # CharacterDefinition + CharacterSession
    │   ├── resources.ts             # ResourcePool
    │   ├── macros.ts                # AttackMacro, SaveMacro, CheckMacro
    │   └── conditions.ts            # Condition with source/duration
    │
    ├── storage/
    │   ├── repository.ts            # CharacterRepository interface
    │   ├── indexedDB.ts             # IDB implementation
    │   └── migrations.ts            # Schema versioning
    │
    ├── state/
    │   ├── store.ts                 # Main Preact signals store
    │   └── actionLog.ts             # Undo stack (last 20)
    │
    ├── features/
    │   ├── hp/
    │   │   ├── HealthTracker.tsx    # HP + temp HP + death saves overlay
    │   │   ├── DeathSavesOverlay.tsx
    │   │   └── NumpadModal.tsx
    │   │
    │   ├── resources/
    │   │   ├── ResourcePool.tsx     # Generic pool component
    │   │   ├── SpellSlots.tsx       # Standard + pact grouped
    │   │   └── RestModal.tsx        # Smart defaults + preview
    │   │
    │   ├── rolls/
    │   │   ├── DiceRoller.tsx       # Full roller
    │   │   ├── MacroButton.tsx      # One-tap macro execution
    │   │   ├── RollOutput.tsx       # Clean output with crit handling
    │   │   └── RollHistory.tsx
    │   │
    │   ├── conditions/
    │   │   ├── ConditionList.tsx    # Active conditions
    │   │   ├── ConditionBadge.tsx   # With source/duration
    │   │   └── ConcentrationBadge.tsx
    │   │
    │   ├── spells/
    │   │   ├── SpellList.tsx
    │   │   ├── SpellCard.tsx
    │   │   └── SpellSearch.tsx
    │   │
    │   └── wizard/
    │       └── QuickstartWizard.tsx # 10-min character setup
    │
    ├── components/
    │   ├── layout/
    │   │   ├── Header.tsx
    │   │   └── Navigation.tsx
    │   └── common/
    │       ├── Modal.tsx
    │       ├── Toast.tsx
    │       ├── Card.tsx
    │       └── Button.tsx
    │
    ├── pages/
    │   ├── PlayView.tsx             # Pinnable dashboard
    │   ├── SheetView.tsx            # Reference: abilities, saves, skills
    │   ├── SpellsView.tsx           # Reference: spell library
    │   └── SettingsView.tsx         # Character management, theme, export
    │
    ├── utils/
    │   ├── dice.ts                  # Roll engine with crit/reroll support
    │   └── derived.ts               # Proficiency, modifiers
    │
    └── data/
        ├── srdSpells.json           # Licensed SRD spells with attribution
        ├── conditions.ts            # Standard 5E conditions
        └── sampleTolvis.ts          # Test character
```

## Data Model

### Split: Definition vs Session
```typescript
// === DEFINITION (mostly static, edited in setup/sheet) ===

interface CharacterDefinition {
  id: string;
  name: string;
  playerName?: string;
  race: string;
  classes: { name: string; subclass?: string; level: number }[];
  background: string;

  abilityScores: AbilityScores;
  // proficiencyBonus DERIVED from level

  savingThrowProficiencies: Record<Ability, 'none' | 'proficient' | 'expertise'>;
  skillProficiencies: Record<Skill, 'none' | 'proficient' | 'expertise'>;

  maxHP: number;
  armorClass: number;
  speed: number;
  initiativeBonus: number;

  spellcastingAbility?: Ability;
  spellSaveDC?: number;
  spellAttackBonus?: number;

  // Resource definitions (max values, recharge rules)
  resourceDefinitions: ResourceDefinition[];

  // Typed macros
  attackMacros: AttackMacro[];
  saveMacros: SaveMacro[];
  checkMacros: CheckMacro[];

  // Spell list (known/prepared)
  spells: CharacterSpell[];

  // Equipment (mostly reference)
  equipment: string[];
  currency: Currency;
  attunedItems: string[];

  notes: string;
  version: number;
}

// === SESSION (changes during play, affected by rest/undo) ===

interface CharacterSession {
  definitionId: string;           // Links to CharacterDefinition

  currentHP: number;
  tempHP: number;

  deathSaves: {
    successes: number;            // 0-3
    failures: number;             // 0-3
  };
  isDowned: boolean;              // Manual toggle (HP 0 can be transient)

  // Current resource values (keyed by resourceDefinition.id)
  resourceCurrents: Record<string, number>;

  // Active conditions with metadata
  conditions: ActiveCondition[];

  // Concentration
  concentratingOn?: {
    spellName: string;
    saveDC?: number;
  };

  // Pinned items for PlayView dashboard
  pinnedItems: PinnedItem[];

  lastModified: string;
}

// === RESOURCES ===

interface ResourceDefinition {
  id: string;
  name: string;                   // "1st Level Slots", "Ki Points"
  category: 'spell_slot' | 'pact_slot' | 'hit_dice' | 'class_feature' | 'item_charge' | 'custom';
  maximum: number;
  slotLevel?: number;             // For spell slots
  dieType?: number;               // For hit dice
  rechargeOn: 'short_rest' | 'long_rest' | 'daily' | 'manual';
  rechargeAmount: 'full' | 'half' | number;
}

// === TYPED MACROS ===

interface AttackMacro {
  id: string;
  name: string;                   // "Longsword"
  toHit: number;                  // +7
  damage: DamageRoll;             // { dice: "1d8", bonus: 5, type: "slashing" }
  versatileDamage?: DamageRoll;   // Two-handed option
  range?: string;                 // "5 ft" or "120 ft"
  tags: string[];                 // ["melee", "finesse"]
  critBehavior: 'double_dice' | 'max_plus_roll';
}

interface DamageRoll {
  dice: string;                   // "2d6"
  bonus: number;
  type: string;                   // "slashing", "fire"
  rerollOn?: number[];            // GWF: reroll 1s and 2s
}

interface SaveMacro {
  id: string;
  name: string;                   // "Fireball"
  saveDC: number;
  saveAbility: Ability;
  damage?: DamageRoll;
  halfOnSave: boolean;
}

interface CheckMacro {
  id: string;
  name: string;                   // "Stealth"
  ability: Ability;
  skill?: Skill;
  bonus: number;                  // Total modifier
}

// === CONDITIONS ===

interface ActiveCondition {
  id: string;
  name: string;                   // "Poisoned"
  source?: string;                // "Giant Spider bite"
  ends?: string;                  // "End of next turn", "CON DC 14", free text
  roundsRemaining?: number;       // Optional countdown
}

// === PINNED ITEMS ===

interface PinnedItem {
  id: string;
  type: 'resource' | 'attack' | 'save' | 'check' | 'spell' | 'condition';
  referenceId: string;            // ID of the thing being pinned
  order: number;
}
```

## MVP Features (Focused)

### Ship First (Core Loop)
1. **Quickstart Wizard** (10-min setup, not a builder)
   - Name / level / class (free text)
   - Max HP / AC / speed
   - Spellcasting ability + slots preset OR add pools manually
   - Add 3-8 favorites (attacks/features)
   - Done → lands on PlayView

2. **PlayView Dashboard + Pinning**
   - Pinnable cards: resources, attacks, conditions, spells
   - Reorder, collapse cards
   - "Pin to Play" from any reference tab
   - Goal: one screen 95% of the time

3. **HP + Temp HP + Death Saves Overlay**
   - Quick +/- buttons
   - Tap HP number → numpad modal
   - Death saves as **overlay panel** (not screen swap)
   - Manual "Downed" toggle
   - Dismiss overlay when healed

4. **Resource Pools + Smart Rest**
   - Generic ResourcePool component
   - Rest modal with **smart defaults** based on rechargeOn
   - Presets: "Rules default" / "Manual"
   - Preview what will change
   - Still editable before confirm

5. **Typed Macros + Clean Roll Output**
   - AttackMacro: toHit → damage (with crit detection)
   - SaveMacro: show DC, roll damage if failed
   - CheckMacro: ability/skill check
   - **Crit handling**: double dice (configurable)
   - **Reroll support**: GWF reroll 1s/2s on damage
   - Copy result to clipboard
   - Roll history (last 10)

6. **Conditions with Source/Duration**
   - Add condition with optional: source, ends, round counter
   - Decrement round counter button
   - Concentration badge prominent near HP
   - "Taking damage while concentrating" reminder

7. **Persistence + Undo**
   - IndexedDB only (clear error if unavailable)
   - Auto-save (debounced)
   - Undo button (last 20 session actions)
   - JSON export/import for backup

8. **PWA / Offline**
   - manifest.json + icons
   - Service worker caching
   - "New version available → Refresh" banner
   - Works offline after first load

9. **UX Essentials**
   - Dark/light theme (dark default)
   - Wake Lock toggle (screen stays on)
   - Toast feedback
   - 44px+ touch targets

### Defer (Post-MVP)
- Full GearView (keep just currency + attunement in Settings)
- Big spell database polish (keep favorites + basic search)
- Natural language damage input ("42 damage")
- Advanced dice parsing
- Sheet editing (use wizard for setup, JSON for complex edits)

## UI Layout

### PlayView (Customizable Dashboard)
```
┌─────────────────────────────────┐
│  Tolvis  Lvl 12  HP: 63/76     │  ← Header (sticky)
│  AC: 22  [CONC: Haste]  [undo] │
├─────────────────────────────────┤
│                                 │
│  ┌─ HP ────────────────────────┐│  ← Always visible
│  │     [63] / 76   Temp: 16   ││
│  │  [−5] [−1]  [+1] [+5]      ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─ Pinned ────────────────────┐│  ← User's pinned items
│  │ [Longsword +7]  [Fireball] ││
│  │ 1st: ●●●○  Ki: ●●●●○      ││
│  │ [Poisoned - 2 rounds]      ││
│  └─────────────────────────────┘│
│                                 │
│  [Short Rest]  [Long Rest]     │
│                                 │
├─────────────────────────────────┤
│ [Play] [Sheet] [Spells] [⚙]   │
└─────────────────────────────────┘
```

### Death Saves Overlay (at HP <= 0)
```
┌─────────────────────────────────┐
│  ┌─ DOWNED ───────────────────┐ │
│  │                            │ │
│  │  Successes:  ● ● ○         │ │
│  │  Failures:   ● ○ ○         │ │
│  │                            │ │
│  │  [Heal]  [Dismiss]         │ │
│  └────────────────────────────┘ │
│  (rest of PlayView dimmed)      │
└─────────────────────────────────┘
```

### Roll Output
```
┌─────────────────────────────────┐
│  Longsword Attack               │
│  To Hit: 24 (17 + 7) ← CRIT!   │
│  Damage: 18 (4+5 + 4+5) slash  │
│                    [Copy] [×]   │
└─────────────────────────────────┘
```

## Quickstart Wizard Flow

```
Step 1: Basics
┌─────────────────────────────────┐
│  Character Name: [Tolvis     ] │
│  Level: [12]  Class: [Artificer]│
│  Race: [Hobgoblin            ] │
│                        [Next →]│
└─────────────────────────────────┘

Step 2: Combat Stats
┌─────────────────────────────────┐
│  Max HP: [76]   AC: [22]       │
│  Speed: [35]    Init: [+3]     │
│                        [Next →]│
└─────────────────────────────────┘

Step 3: Abilities (optional, can skip)
┌─────────────────────────────────┐
│  STR [10] DEX [16] CON [16]    │
│  INT [20] WIS [14] CHA [10]    │
│              [Skip] [Next →]   │
└─────────────────────────────────┘

Step 4: Spellcasting (optional)
┌─────────────────────────────────┐
│  Caster? [Yes]                  │
│  Ability: [INT]  DC: [17]      │
│  Slots: [Use Artificer preset] │
│              [Skip] [Next →]   │
└─────────────────────────────────┘

Step 5: Quick Favorites (add 3-8)
┌─────────────────────────────────┐
│  Add your most-used actions:    │
│                                 │
│  [+ Attack] [+ Feature] [+ Spell]│
│                                 │
│  Added:                         │
│  • Longsword (+7, 1d8+5)       │
│  • Flash of Genius (5/long)    │
│                                 │
│                        [Done →]│
└─────────────────────────────────┘
```

## Commands

```bash
npm run dev        # Dev server (localhost:3000)
npm run build      # Production build
npm run preview    # Preview build
npm run lint       # ESLint
npm run typecheck  # TypeScript
```

## Implementation Order

### Phase 1: Foundation (Week 1)
1. Vite + Preact + TS setup
2. PWA manifest + service worker shell
3. TypeScript interfaces (Definition/Session split)
4. IndexedDB repository
5. Preact signals store + action log
6. Theme system (CSS variables)
7. Basic app shell with routing

### Phase 2: Core Play (Week 2)
1. Header component
2. HealthTracker + NumpadModal
3. DeathSavesOverlay (not screen swap)
4. ResourcePool component
5. RestModal with smart defaults
6. Undo functionality

### Phase 3: Rolls + Macros (Week 3)
1. Dice engine with crit/reroll
2. AttackMacro execution + output
3. SaveMacro + CheckMacro
4. MacroButton component
5. RollHistory
6. Copy to clipboard

### Phase 4: Conditions + Dashboard (Week 4)
1. ConditionBadge with source/duration
2. ConcentrationBadge
3. PlayView pinning system
4. Pin/unpin from reference tabs
5. Card reordering

### Phase 5: Wizard + Polish (Week 5)
1. QuickstartWizard (5 steps)
2. JSON export/import
3. Wake Lock toggle
4. Toast notifications
5. Tolvis sample character
6. Mobile testing + PWA install

## Key Design Decisions

- **Definition vs Session split**: Cleaner rest/undo/sync
- **Typed macros**: Correct crit/reroll handling, not fragile string parsing
- **Death saves overlay**: Less jarring than screen swap
- **Smart rest defaults**: Pre-select based on rechargeOn, not manual checkboxes
- **PlayView pinning**: One screen 95% of combat time
- **Feature slices**: Each feature owns UI + actions + selectors
- **IDB only**: No localStorage fallback complexity
- **Quickstart wizard**: Prevents blank app syndrome

## Future Phases

### Phase 2: Polish
- Full spell database with search
- Equipment/gear management
- Sheet editing UI
- Natural language damage input

### Phase 3: Cloud
- Firebase/Supabase backend
- User accounts
- Cross-device sync

### Phase 4: Advanced
- Combat tracker (initiative)
- Party view
- D&D Beyond import

## Reference Files
- `Resources/Tolvis Resources.pdf` - Real-world tracking reference
- `Resources/Tolvis's Character Sheet - D&D Beyond.html` - Character data
- `Resources/5E_CharacterSheet_Fillable.pdf` - Standard fields
