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
 * @throws {CustomError<Response>}
 */
export async function saveCharacter(data: Character, updateUI?: boolean) {
  const context = SillyTavern.getContext();
  const formData = new FormData();

  formData.append('ch_name', data.name);
  formData.append('avatar_url', data.avatar ?? '');
  formData.append('description', data.description ?? '');
  formData.append('first_mes', data.first_mes ?? '');
  formData.append('scenario', data.scenario ?? '');
  formData.append('personality', data.personality ?? '');
  formData.append('mes_example', data.mes_example ?? '');
  formData.append('creatorcomment', data.creatorcomment ?? '');
  formData.append('tags', (data.tags ?? []).join(','));

  const avatarUrl = context.getThumbnailUrl('avatar', data.avatar);
  const avatarBlob = await fetch(avatarUrl).then((res) => res.blob());
  const avatarFile = new File([avatarBlob], 'avatar.png', { type: 'image/png' });
  formData.append('avatar', avatarFile);

  const charInnerData = data.data || {};

  formData.append('creator', charInnerData.creator ?? '');
  formData.append('character_version', charInnerData.character_version ?? '');
  formData.append('creator_notes', charInnerData.creator_notes ?? '');
  formData.append('system_prompt', charInnerData.system_prompt ?? '');
  formData.append('post_history_instructions', charInnerData.post_history_instructions ?? '');

  const extensions = charInnerData.extensions || {};
  formData.append('chat', (data as any).chat ?? '');
  formData.append('create_date', (data as any).create_date ?? '');
  formData.append('last_mes', (data as any).last_mes ?? '');
  formData.append('talkativeness', extensions.talkativeness ?? '');
  formData.append('fav', String(extensions.fav ?? false));
  formData.append('world', extensions.world ?? '');

  const depthPrompt = extensions.depth_prompt || {};
  formData.append('depth_prompt_prompt', depthPrompt.prompt ?? '');
  formData.append('depth_prompt_depth', String(depthPrompt.depth ?? 0));
  formData.append('depth_prompt_role', depthPrompt.role ?? '');

  if (Array.isArray(charInnerData.alternate_greetings)) {
    for (const value of charInnerData.alternate_greetings) {
      formData.append('alternate_greetings', value);
    }
  }

  formData.append('json_data', JSON.stringify(data));

  const headers = context.getRequestHeaders();
  // @ts-ignore
  delete headers['Content-Type'];

  const response = await fetch('/api/characters/edit', {
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
