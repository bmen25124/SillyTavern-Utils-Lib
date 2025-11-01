import { ConnectAPIMap } from './types/index.js';
import { ConnectionProfile } from './types/profiles.js';

/**
 * Checks if a given connection profile is of a type that is supported by the provided allow-list.
 * This logic is shared between the React and Vue components.
 */
export const isProfileSupported = (
  profile: ConnectionProfile | undefined,
  allowedTypes: Record<string, string>,
  connectApiMap: ConnectAPIMap,
): boolean => {
  if (!profile || !profile.api) {
    return false;
  }

  const apiMap = connectApiMap[profile.api];
  if (!apiMap || !Object.hasOwn(allowedTypes, apiMap.selected)) {
    return false;
  }

  // The original logic checks for a valid source/type depending on the API
  switch (apiMap.selected) {
    case 'openai':
      return !!apiMap.source;
    case 'textgenerationwebui':
      return !!apiMap.type;
  }

  return false;
};