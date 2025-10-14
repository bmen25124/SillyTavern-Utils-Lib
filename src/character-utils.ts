import { Character, FullExportData } from './types/index.js';

export class CustomError<T> extends Error {
  readonly data?: T;
  constructor(message: string, data?: T) {
    super(message);
    this.data = data;
  }

  toString() {
    return this.message;
  }
}

/**
 * @throws {CustomError<Response>}
 */
export async function createCharacter(data: FullExportData, updateUI?: boolean) {
  const context = SillyTavern.getContext();

  const formData = new FormData();
  formData.append('avatar', new Blob([JSON.stringify(data)], { type: 'application/json' }), 'character.json');
  formData.append('file_type', 'json');

  const headers = context.getRequestHeaders();
  // @ts-ignore
  delete headers['Content-Type'];
  const response = await fetch('/api/characters/import', {
    method: 'POST',
    headers,
    body: formData,
    cache: 'no-cache',
  });

  if (!response.ok) {
    throw new CustomError(response.statusText, response);
  }

  if (updateUI) {
    await context.getCharacters();
  }
}

/**
 * Saves character data by merging new attributes into the existing character card
 * using the `/api/characters/merge-attributes` endpoint.
 *
 * This function updates character data, not the avatar image file itself.
 * The `data.avatar` property must be the character's filename (e.g., "bob.png")
 * to identify which character to update on the backend.
 *
 * @param {Partial<Character> & { avatar: string }} data - An object with the character
 *   attributes to update. The `avatar` field (filename) is required.
 * @param {boolean} [updateUI=false] - If true, refreshes the character list UI after saving.
 * @throws {CustomError<Response>}
 */
export async function saveCharacter(data: Partial<Character> & { avatar: string }, updateUI?: boolean) {
  const context = SillyTavern.getContext();

  if (!data.avatar) {
    throw new Error('`data.avatar` (character filename) is required to save character attributes.');
  }

  const headers = context.getRequestHeaders();

  const response = await fetch('/api/characters/merge-attributes', {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
    cache: 'no-cache',
  });

  if (!response.ok) {
    // Attempt to parse a JSON error response from the server for a better error message.
    const errorData = await response.json().catch(() => ({ message: response.statusText }));
    throw new CustomError(errorData.message || `Request failed with status ${response.status}`, response);
  }

  if (updateUI) {
    await context.getCharacters();
  }
}
