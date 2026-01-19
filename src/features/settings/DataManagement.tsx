import { signal } from '@preact/signals';
import { getRepository } from '../../storage';
import { loadAllCharacters, currentDefinition, currentSession } from '../../state';

const isClearing = signal(false);
const clearError = signal<string | null>(null);

export function DataManagement() {
  const handleClearAll = async () => {
    if (!confirm('This will delete ALL characters and data. This cannot be undone. Are you sure?')) {
      return;
    }

    // Double confirm
    if (!confirm('Are you REALLY sure? All data will be permanently deleted.')) {
      return;
    }

    isClearing.value = true;
    clearError.value = null;

    try {
      const repo = getRepository();
      await repo.clear();

      // Reset state
      currentDefinition.value = null;
      currentSession.value = null;

      await loadAllCharacters();

      // Reload the page to get a fresh state
      window.location.reload();
    } catch (error) {
      clearError.value = error instanceof Error ? error.message : 'Failed to clear data';
      isClearing.value = false;
    }
  };

  return (
    <div class="data-management">
      <h3 class="data-management__title">Data Management</h3>

      {clearError.value && (
        <div class="data-management__error">{clearError.value}</div>
      )}

      <div class="data-management__section">
        <p class="data-management__warning">
          Danger zone: These actions cannot be undone.
        </p>

        <button
          class="btn btn--danger"
          onClick={handleClearAll}
          disabled={isClearing.value}
        >
          {isClearing.value ? 'Clearing...' : 'Clear All Data'}
        </button>
      </div>
    </div>
  );
}
