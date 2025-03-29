import { FullExportData } from './types/index.js';

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

  if (updateUI ?? true) {
    await context.getCharacters();
  }
}
