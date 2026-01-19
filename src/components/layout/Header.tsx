import { currentDefinition, currentSession, totalLevel, canUndoAction, undoLastAction } from '../../state';

export function Header() {
  const def = currentDefinition.value;
  const session = currentSession.value;

  if (!def || !session) {
    return (
      <header class="header">
        <div class="header__name">No Character Loaded</div>
      </header>
    );
  }

  const concentration = session.concentratingOn;

  return (
    <header class="header">
      <div class="header__main">
        <span class="header__name">{def.name}</span>
        <span class="header__level">Lvl {totalLevel.value}</span>
        <span class="header__hp">
          HP: {session.currentHP}/{def.maxHP}
        </span>
      </div>
      <div class="header__secondary">
        <span class="header__ac">AC: {def.armorClass}</span>
        {concentration && (
          <span class="header__concentration">
            CONC: {concentration.spellName}
          </span>
        )}
        {canUndoAction.value && (
          <button class="header__undo" onClick={undoLastAction} title="Undo">
            ↶
          </button>
        )}
      </div>
    </header>
  );
}
