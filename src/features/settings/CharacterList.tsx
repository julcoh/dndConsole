import { signal } from '@preact/signals';
import { useEffect } from 'preact/hooks';
import {
  allDefinitions,
  currentDefinition,
  loadAllCharacters,
  loadCharacter
} from '../../state';
import { getRepository } from '../../storage';
import type { CharacterDefinition } from '../../types';

const isDeleting = signal<string | null>(null);
const deleteError = signal<string | null>(null);

export function CharacterList() {
  useEffect(() => {
    loadAllCharacters();
  }, []);

  const definitions = allDefinitions.value;
  const currentId = currentDefinition.value?.id;

  const handleSelect = async (id: string) => {
    if (id !== currentId) {
      await loadCharacter(id);
    }
  };

  const handleDelete = async (def: CharacterDefinition) => {
    if (def.id === currentId) {
      deleteError.value = 'Cannot delete the currently active character';
      return;
    }

    if (!confirm(`Delete ${def.name}? This cannot be undone.`)) {
      return;
    }

    isDeleting.value = def.id;
    deleteError.value = null;

    try {
      const repo = getRepository();
      await repo.deleteDefinition(def.id);
      await loadAllCharacters();
    } catch (error) {
      deleteError.value = error instanceof Error ? error.message : 'Failed to delete';
    } finally {
      isDeleting.value = null;
    }
  };

  if (definitions.length === 0) {
    return (
      <div class="character-list">
        <h3 class="character-list__title">Characters</h3>
        <p class="character-list__empty">No characters yet</p>
      </div>
    );
  }

  return (
    <div class="character-list">
      <h3 class="character-list__title">Characters ({definitions.length})</h3>

      {deleteError.value && (
        <div class="character-list__error">{deleteError.value}</div>
      )}

      <div class="character-list__items">
        {definitions.map(def => (
          <div
            key={def.id}
            class={`character-list__item ${def.id === currentId ? 'character-list__item--active' : ''}`}
          >
            <button
              class="character-list__select"
              onClick={() => handleSelect(def.id)}
              disabled={def.id === currentId}
            >
              <span class="character-list__name">{def.name}</span>
              <span class="character-list__info">
                {def.race} {def.classes.map(c => `${c.name} ${c.level}`).join('/')}
              </span>
            </button>

            <button
              class="character-list__delete"
              onClick={() => handleDelete(def)}
              disabled={isDeleting.value === def.id || def.id === currentId}
              aria-label={`Delete ${def.name}`}
            >
              {isDeleting.value === def.id ? '...' : '\u2715'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
