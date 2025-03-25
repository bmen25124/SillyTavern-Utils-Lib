import { characters, selected_world_info, st_getCharaFilename, WI_METADATA_KEY, world_info } from './config.js';
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
    const character = characters[targetCharacterIndex];
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
