import { signal } from '@preact/signals';
import { currentDefinition, loadCharacter, loadAllCharacters } from '../../state';
import { getRepository } from '../../storage';

const exportStatus = signal<'idle' | 'exporting' | 'success' | 'error'>('idle');
const importStatus = signal<'idle' | 'importing' | 'success' | 'error'>('idle');
const statusMessage = signal<string>('');

export function ImportExport() {
  const currentId = currentDefinition.value?.id;
  const currentName = currentDefinition.value?.name;

  const handleExport = async () => {
    if (!currentId) return;

    exportStatus.value = 'exporting';
    statusMessage.value = '';

    try {
      const repo = getRepository();
      const data = await repo.exportCharacter(currentId);

      if (!data) {
        throw new Error('Character not found');
      }

      // Create downloadable JSON file
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      // Create and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentName || 'character'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      exportStatus.value = 'success';
      statusMessage.value = 'Character exported successfully';
    } catch (error) {
      exportStatus.value = 'error';
      statusMessage.value = error instanceof Error ? error.message : 'Export failed';
    }
  };

  const handleImport = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    importStatus.value = 'importing';
    statusMessage.value = '';

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // Validate structure
      if (!data.definition || !data.definition.id || !data.definition.name || !data.session) {
        throw new Error('Invalid character file format');
      }

      const repo = getRepository();
      await repo.importCharacter(data.definition, data.session);

      // Reload character list
      await loadAllCharacters();

      // Switch to imported character
      await loadCharacter(data.definition.id);

      importStatus.value = 'success';
      statusMessage.value = `Imported ${data.definition.name}`;
    } catch (error) {
      importStatus.value = 'error';
      statusMessage.value = error instanceof Error ? error.message : 'Import failed';
    }

    // Reset file input
    input.value = '';
  };

  return (
    <div class="import-export">
      <h3 class="import-export__title">Import / Export</h3>

      {statusMessage.value && (
        <div class={`import-export__status import-export__status--${exportStatus.value === 'error' || importStatus.value === 'error' ? 'error' : 'success'}`}>
          {statusMessage.value}
        </div>
      )}

      <div class="import-export__actions">
        <button
          class="btn btn--secondary"
          onClick={handleExport}
          disabled={!currentId || exportStatus.value === 'exporting'}
        >
          {exportStatus.value === 'exporting' ? 'Exporting...' : 'Export Current'}
        </button>

        <label class="btn btn--secondary import-export__import-btn">
          {importStatus.value === 'importing' ? 'Importing...' : 'Import Character'}
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            disabled={importStatus.value === 'importing'}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      <p class="import-export__help">
        Export saves the current character to a JSON file. Import loads a character from a previously exported file.
      </p>
    </div>
  );
}
