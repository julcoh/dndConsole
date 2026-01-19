import { signal } from '@preact/signals';
import { extractCharacterIdFromUrl, parseDDBCharacter } from '../../utils/ddbImport';
import { getRepository } from '../../storage';
import { loadAllCharacters, loadCharacter } from '../../state';

const importMethod = signal<'url' | 'json'>('json');
const importUrl = signal('');
const importJson = signal('');
const importStatus = signal<'idle' | 'importing' | 'success' | 'error'>('idle');
const statusMessage = signal('');

export function DDBImport() {
  const handleImportFromJson = async () => {
    const jsonText = importJson.value.trim();
    if (!jsonText) {
      importStatus.value = 'error';
      statusMessage.value = 'Please paste the JSON data';
      return;
    }

    importStatus.value = 'importing';
    statusMessage.value = 'Parsing character data...';

    try {
      const json = JSON.parse(jsonText);

      // Handle both wrapped {data: ...} and unwrapped responses
      const ddbCharacter = json.data || json;

      if (!ddbCharacter.name || !ddbCharacter.race) {
        throw new Error('Invalid D&D Beyond character data');
      }

      // Parse into our format
      const { definition, session } = parseDDBCharacter(ddbCharacter);

      statusMessage.value = 'Saving character...';

      // Save to storage
      const repo = getRepository();
      await repo.importCharacter(definition, session);

      // Reload character list
      await loadAllCharacters();

      // Switch to imported character
      await loadCharacter(definition.id);

      importStatus.value = 'success';
      statusMessage.value = `Successfully imported ${definition.name}!`;
      importJson.value = '';
    } catch (error) {
      importStatus.value = 'error';
      if (error instanceof SyntaxError) {
        statusMessage.value = 'Invalid JSON format. Make sure you copied the entire response.';
      } else {
        statusMessage.value = error instanceof Error ? error.message : 'Import failed';
      }
    }
  };

  const getApiUrl = () => {
    const url = importUrl.value.trim();
    const characterId = extractCharacterIdFromUrl(url);
    if (characterId) {
      return `https://character-service.dndbeyond.com/character/v5/character/${characterId}`;
    }
    return null;
  };

  const apiUrl = getApiUrl();

  return (
    <div class="ddb-import">
      <h3 class="ddb-import__title">Import from D&D Beyond</h3>

      <div class="ddb-import__tabs">
        <button
          class={`ddb-import__tab ${importMethod.value === 'json' ? 'ddb-import__tab--active' : ''}`}
          onClick={() => importMethod.value = 'json'}
        >
          Paste JSON
        </button>
        <button
          class={`ddb-import__tab ${importMethod.value === 'url' ? 'ddb-import__tab--active' : ''}`}
          onClick={() => importMethod.value = 'url'}
        >
          Get API URL
        </button>
      </div>

      {importMethod.value === 'json' ? (
        <>
          <p class="ddb-import__help">
            Paste the character JSON from D&D Beyond's API below.
          </p>

          <textarea
            class="input ddb-import__textarea"
            placeholder='{"id": 12345, "name": "Character Name", ...}'
            value={importJson.value}
            onInput={(e) => importJson.value = (e.target as HTMLTextAreaElement).value}
            disabled={importStatus.value === 'importing'}
            rows={6}
          />

          <button
            class="btn"
            onClick={handleImportFromJson}
            disabled={importStatus.value === 'importing' || !importJson.value.trim()}
          >
            {importStatus.value === 'importing' ? 'Importing...' : 'Import Character'}
          </button>

          <details class="ddb-import__details">
            <summary>How to get character JSON</summary>
            <ol class="ddb-import__instructions">
              <li>Go to your character on D&D Beyond</li>
              <li>Open browser DevTools (F12 or right-click → Inspect)</li>
              <li>Go to the Network tab and refresh the page</li>
              <li>Filter by "character" and find the API request</li>
              <li>Click it, go to Response tab, and copy all the JSON</li>
              <li>Or use the "Get API URL" tab to get a direct link</li>
            </ol>
          </details>
        </>
      ) : (
        <>
          <p class="ddb-import__help">
            Enter your D&D Beyond character URL to get the API endpoint.
          </p>

          <div class="ddb-import__input-row">
            <input
              type="text"
              class="input ddb-import__input"
              placeholder="https://www.dndbeyond.com/characters/12345678"
              value={importUrl.value}
              onInput={(e) => importUrl.value = (e.target as HTMLInputElement).value}
            />
          </div>

          {apiUrl && (
            <div class="ddb-import__api-url">
              <p class="ddb-import__help">
                Open this URL in a new tab, then copy the JSON response:
              </p>
              <a
                href={apiUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="ddb-import__link"
              >
                {apiUrl}
              </a>
              <p class="ddb-import__help" style={{ marginTop: 'var(--space-sm)' }}>
                After copying the JSON, switch to "Paste JSON" tab and paste it there.
              </p>
            </div>
          )}

          <details class="ddb-import__details">
            <summary>Why can't we fetch directly?</summary>
            <p class="ddb-import__note">
              D&D Beyond's API blocks requests from other websites (CORS policy).
              You need to open the API URL directly in your browser to access the data.
            </p>
          </details>
        </>
      )}

      {statusMessage.value && (
        <div class={`ddb-import__status ddb-import__status--${importStatus.value}`}>
          {statusMessage.value}
        </div>
      )}
    </div>
  );
}
