import { globalAdvantage, setAdvantage } from './rollState';
import type { AdvantageState } from '../../utils/dice';

export function AdvantageToggle() {
  const current = globalAdvantage.value;

  const handleClick = (state: AdvantageState) => {
    // If clicking the active state, reset to normal
    if (current === state) {
      setAdvantage('normal');
    } else {
      setAdvantage(state);
    }
  };

  return (
    <div class="advantage-toggle">
      <button
        class={`advantage-toggle__btn advantage-toggle__btn--adv ${current === 'advantage' ? 'advantage-toggle__btn--active' : ''}`}
        onClick={() => handleClick('advantage')}
        title="Advantage"
      >
        ADV
      </button>
      <span class={`advantage-toggle__indicator ${current !== 'normal' ? 'advantage-toggle__indicator--active' : ''}`}>
        {current === 'normal' ? 'Normal' : current === 'advantage' ? 'Advantage' : 'Disadvantage'}
      </span>
      <button
        class={`advantage-toggle__btn advantage-toggle__btn--dis ${current === 'disadvantage' ? 'advantage-toggle__btn--active' : ''}`}
        onClick={() => handleClick('disadvantage')}
        title="Disadvantage"
      >
        DIS
      </button>
    </div>
  );
}
