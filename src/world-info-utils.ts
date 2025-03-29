import {
  selected_world_info,
  st_createWorldInfoEntry,
  st_getCharaFilename,
  WI_METADATA_KEY,
  world_info,
} from './config.js';
import { WIEntry } from './types/world-info.js';

export type getActiveWorldInfoInclude = 'all' | 'global' | 'character' | 'chat' | 'persona';

/**
 * @returns Entries by world name. <worldName, entries[]>
 */
export async function getActiveWorldInfo(
  include: getActiveWorldInfoInclude[],
  targetCharacterIndex?: number,
): Promise<Record<string, WIEntry[]>> {
  function includedType(type: string): boolean {
    return include.includes('all') || include.includes(type as getActiveWorldInfoInclude);
  }

  const context = SillyTavern.getContext();
  let entries: Record<string, WIEntry[]> = {};

  const isGlobal = includedType('global');
  if (isGlobal && selected_world_info?.length) {
    for (const worldName of selected_world_info) {
      const worldInfo = await context.loadWorldInfo(worldName);
      if (!worldInfo) {
        continue;
      }

      if (!entries[worldName]) {
        entries[worldName] = [];
      }
      Object.values(worldInfo.entries).forEach((entry) => {
        entries[worldName].push(entry);
      });
    }
  }

  const isChat = includedType('chat');
  if (isChat) {
    const worldName = context.chatMetadata[WI_METADATA_KEY];
    if (worldName && !entries[worldName]) {
      entries[worldName] = [];
      const worldInfo = await context.loadWorldInfo(worldName);
      if (worldInfo) {
        Object.values(worldInfo.entries).forEach((entry) => {
          entries[worldName].push(entry);
        });
      }
    }
  }

  const isCharacter = includedType('character');
  if (isCharacter && targetCharacterIndex) {
    const character = context.characters[targetCharacterIndex];
    let worldsToSearch = new Set<string>();

    const baseWorldName = character?.data?.extensions?.world;
    if (baseWorldName) {
      worldsToSearch.add(baseWorldName);
    }

    const fileName = st_getCharaFilename(targetCharacterIndex);
    const extraCharLore = world_info.charLore?.find((e: any) => e.name === fileName);
    if (extraCharLore) {
      worldsToSearch = new Set([...worldsToSearch, ...extraCharLore.extraBooks]);
    }

    for (const worldName of worldsToSearch) {
      const worldInfo = await context.loadWorldInfo(worldName);
      if (!worldInfo || entries[worldName]) {
        continue;
      }
      entries[worldName] = [];

      Object.values(worldInfo.entries).forEach((entry) => {
        entries[worldName].push(entry);
      });
    }
  }

  const isPersona = includedType('persona');
  if (isPersona) {
    const worldName = context.powerUserSettings.persona_description_lorebook;
    if (worldName && !entries[worldName]) {
      entries[worldName] = [];
      const worldInfo = await context.loadWorldInfo(worldName);
      if (worldInfo) {
        Object.values(worldInfo.entries).forEach((entry) => {
          entries[worldName].push(entry);
        });
      }
    }
  }

  return entries;
}

/**
 * @throws {Error} if entry/world not found
 */
export async function applyWorldInfoEntry({
  entry,
  selectedWorldName,
  skipSave = false,
  skipReload = false,
  operation = 'auto',
}: {
  entry: WIEntry;
  selectedWorldName: string;
  skipSave?: boolean;
  skipReload?: boolean;
  operation?: 'add' | 'update' | 'auto';
}): Promise<WIEntry> {
  const context = SillyTavern.getContext();

  const worldInfo = await context.loadWorldInfo(selectedWorldName);
  if (!worldInfo) {
    throw new Error('Failed to load world info');
  }

  // Find existing entry with the same key if needed
  let targetEntry: WIEntry | undefined;
  if (operation === 'update' || operation === 'auto') {
    const existingEntry = Object.values(worldInfo.entries).find((e) => e.uid === entry.uid);
    if (existingEntry) {
      if (operation === 'auto') {
        // In auto mode, update existing entry
        targetEntry = existingEntry;
      } else if (operation === 'update') {
        targetEntry = existingEntry;
      }
    } else if (operation === 'update') {
      throw new Error('Entry not found for update operation');
    }
  }

  // Create new entry if needed
  if (!targetEntry) {
    targetEntry = st_createWorldInfoEntry(selectedWorldName, worldInfo);
    if (!targetEntry) {
      throw new Error('Failed to create entry');
    }

    // Copy properties from last entry if available
    const values = Object.values(worldInfo.entries);
    const lastEntry = values.length > 0 ? values[values.length - 1] : undefined;
    if (lastEntry) {
      const newId = targetEntry.uid;
      Object.assign(targetEntry, lastEntry);
      targetEntry.uid = newId;
    }
  }

  // Update entry properties
  targetEntry.key = entry.key;
  targetEntry.content = entry.content;
  targetEntry.comment = entry.comment;

  // Save and update UI only if not skipping
  if (!skipSave) {
    await context.saveWorldInfo(selectedWorldName, worldInfo);
  }
  if (!skipReload) {
    context.reloadWorldInfoEditor(selectedWorldName, true);
  }

  return targetEntry;
}
