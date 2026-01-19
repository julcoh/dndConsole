import { ThemeToggle } from './ThemeToggle';
import { CharacterList } from './CharacterList';
import { ImportExport } from './ImportExport';
import { DDBImport } from './DDBImport';
import { DataManagement } from './DataManagement';
import { showWizard } from '../wizard';

export function SettingsView() {
  return (
    <div class="settings-view">
      <div class="settings-section card">
        <ThemeToggle />
      </div>

      <div class="settings-section card">
        <CharacterList />

        <button
          class="btn btn--primary settings-section__new-btn"
          onClick={() => showWizard.value = true}
        >
          + New Character
        </button>
      </div>

      <div class="settings-section card">
        <DDBImport />
      </div>

      <div class="settings-section card">
        <ImportExport />
      </div>

      <div class="settings-section card">
        <DataManagement />
      </div>

      <div class="settings-section settings-section--about">
        <h3>About</h3>
        <p>D&D Console v0.1.0</p>
        <p class="text-muted">A mobile-friendly character sheet for D&D 5E</p>
      </div>
    </div>
  );
}
