import { theme } from '../../state';

export function ThemeToggle() {
  const isDark = theme.value === 'dark';

  const handleToggle = () => {
    theme.value = isDark ? 'light' : 'dark';
  };

  return (
    <div class="theme-toggle">
      <span class="theme-toggle__label">Theme</span>
      <button
        class={`theme-toggle__btn ${isDark ? 'theme-toggle__btn--dark' : 'theme-toggle__btn--light'}`}
        onClick={handleToggle}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      >
        <span class="theme-toggle__icon">{isDark ? '\u263E' : '\u2600'}</span>
        <span class="theme-toggle__text">{isDark ? 'Dark' : 'Light'}</span>
      </button>
    </div>
  );
}
