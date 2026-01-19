import type { SpellData } from '../../types/spells';
import { SCHOOL_ABBREV, getSpellLevelText, getComponentsAbbrev } from '../../types/spells';

interface SpellCardProps {
  spell: SpellData;
  isPrepared?: boolean;
  onPrepareToggle?: () => void;
  onCast?: (level: number) => void;
  canCast?: boolean;
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export function SpellCard({
  spell,
  isPrepared = false,
  onPrepareToggle,
  onCast,
  canCast = true,
  expanded = false,
  onToggleExpand
}: SpellCardProps) {
  const schoolAbbrev = SCHOOL_ABBREV[spell.school.toLowerCase()] || spell.school.substring(0, 3);

  return (
    <div class={`spell-card ${expanded ? 'spell-card--expanded' : ''}`}>
      <div class="spell-card__header" onClick={onToggleExpand}>
        <div class="spell-card__info">
          <span class={`spell-card__chevron ${expanded ? 'spell-card__chevron--expanded' : ''}`}>&#9658;</span>
          <span class="spell-card__name">{spell.name}</span>
          <div class="spell-card__tags">
            <span class="spell-card__school">{schoolAbbrev}</span>
            {spell.isConcentration && <span class="spell-card__tag spell-card__tag--conc">C</span>}
            {spell.isRitual && <span class="spell-card__tag spell-card__tag--ritual">R</span>}
          </div>
        </div>
        <div class="spell-card__meta">
          <span class="spell-card__components">{getComponentsAbbrev(spell.components)}</span>
          <span class="spell-card__time">{spell.castingTime}</span>
        </div>
      </div>

      {expanded && (
        <div class="spell-card__details">
          <div class="spell-card__props">
            <div class="spell-card__prop">
              <strong>Level:</strong> {getSpellLevelText(spell.level)}
            </div>
            <div class="spell-card__prop">
              <strong>Range:</strong> {spell.range}
            </div>
            <div class="spell-card__prop">
              <strong>Duration:</strong> {spell.duration}
            </div>
            {spell.components.materials && (
              <div class="spell-card__prop spell-card__prop--full">
                <strong>Materials:</strong> {spell.components.materials}
              </div>
            )}
          </div>

          <div class="spell-card__description">
            {spell.description}
          </div>

          {spell.atHigherLevels && (
            <div class="spell-card__higher">
              <strong>At Higher Levels:</strong> {spell.atHigherLevels}
            </div>
          )}

          <div class="spell-card__actions">
            {onPrepareToggle && spell.level > 0 && (
              <button
                class={`btn btn--sm ${isPrepared ? 'btn--primary' : 'btn--secondary'}`}
                onClick={(e) => { e.stopPropagation(); onPrepareToggle(); }}
              >
                {isPrepared ? 'Prepared' : 'Prepare'}
              </button>
            )}
            {onCast && (
              <button
                class="btn btn--sm btn--primary"
                onClick={(e) => { e.stopPropagation(); onCast(spell.level); }}
                disabled={!canCast}
              >
                Cast
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Compact version for spell lists
interface SpellRowProps {
  spell: SpellData;
  isPrepared?: boolean;
  onClick?: () => void;
}

export function SpellRow({ spell, isPrepared = false, onClick }: SpellRowProps) {
  const schoolAbbrev = SCHOOL_ABBREV[spell.school.toLowerCase()] || spell.school.substring(0, 3);

  return (
    <div class={`spell-row ${isPrepared ? 'spell-row--prepared' : ''}`} onClick={onClick}>
      <span class="spell-row__name">{spell.name}</span>
      <div class="spell-row__tags">
        <span class="spell-row__school">{schoolAbbrev}</span>
        {spell.isConcentration && <span class="spell-row__tag">C</span>}
        {spell.isRitual && <span class="spell-row__tag">R</span>}
      </div>
    </div>
  );
}
