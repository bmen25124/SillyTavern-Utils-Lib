import React, { FC, useState, useEffect, useMemo, useCallback } from 'react';
import { STSelect } from './STSelect.js';
import { ConnectAPIMap } from '../types/index.js';
import { ConnectionProfile } from '../types/profiles.js';

const globalContext = SillyTavern.getContext();

// Helper function to replicate the filtering logic from the original source
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

export interface STConnectionProfileSelectProps {
  /**
   * The initially selected profile ID. The component will manage its state internally afterwards.
   */
  initialSelectedProfileId?: string;

  /**
   * The allowed API types to display in the dropdown, mapping the internal type to a display label.
   * @default { openai: 'Chat Completion', textgenerationwebui: 'Text Completion' }
   */
  allowedTypes?: Record<string, string>;

  /**
   * Placeholder text for when no profile is selected.
   * @default 'Select a Connection Profile'
   */
  placeholder?: string;

  /**
   * Callback fired when the user selects a different profile from the dropdown.
   * Also fires with `undefined` if the currently selected profile is deleted or becomes unsupported.
   */
  onChange?: (profile?: ConnectionProfile) => void;

  /**
   * Callback fired when a new, supported profile is created in SillyTavern.
   */
  onCreate?: (profile: ConnectionProfile) => void;

  /**
   * Callback fired when a profile is updated in SillyTavern.
   */
  onUpdate?: (oldProfile: ConnectionProfile, newProfile: ConnectionProfile) => void;

  /**
   * Callback fired when a supported profile is deleted in SillyTavern.
   */
  onDelete?: (profile: ConnectionProfile) => void;
}

/**
 * A React component that renders a dropdown of supported SillyTavern connection profiles.
 * It automatically updates when profiles are created, updated, or deleted.
 */
export const STConnectionProfileSelect: FC<STConnectionProfileSelectProps> = ({
  initialSelectedProfileId,
  allowedTypes = { openai: 'Chat Completion', textgenerationwebui: 'Text Completion' },
  placeholder = 'Select a Connection Profile',
  onChange,
  onCreate,
  onUpdate,
  onDelete,
}) => {
  const [selectedId, setSelectedId] = useState(initialSelectedProfileId ?? '');
  const [lastUpdated, setLastUpdated] = useState(Date.now()); // State to force re-render on global changes

  const { isEnabled, profiles, connectApiMap } = useMemo(() => {
    const isConnectionManagerDisabled =
      globalContext.extensionSettings.disabledExtensions?.includes('connection-manager');
    if (isConnectionManagerDisabled) {
      console.error('Connection Manager extension is disabled.');
      return { isEnabled: false, profiles: [], connectApiMap: {} };
    }
    return {
      isEnabled: true,
      profiles: globalContext.extensionSettings.connectionManager?.profiles ?? [],
      connectApiMap: globalContext.CONNECT_API_MAP,
    };
  }, [lastUpdated]); // Reruns when we detect a change from events

  useEffect(() => {
    if (!isEnabled) return;

    // Handler for creation
    const handleCreate = (profile: ConnectionProfile) => {
      if (isProfileSupported(profile, allowedTypes, connectApiMap)) {
        setLastUpdated(Date.now());
        onCreate?.(profile);
      }
    };

    // Handler for updates
    const handleUpdate = (oldProfile: ConnectionProfile, newProfile: ConnectionProfile) => {
      const wasSupported = isProfileSupported(oldProfile, allowedTypes, connectApiMap);
      const isNowSupported = isProfileSupported(newProfile, allowedTypes, connectApiMap);

      // If the profile was or is now supported, we need to update the list
      if (wasSupported || isNowSupported) {
        setLastUpdated(Date.now());
      }
      onUpdate?.(oldProfile, newProfile);

      // If the currently selected profile is the one being updated and it's no longer supported, deselect it.
      if (selectedId === oldProfile.id && !isNowSupported) {
        setSelectedId('');
        onChange?.(undefined);
      }
    };

    // Handler for deletions
    const handleDelete = (profile: ConnectionProfile) => {
      if (isProfileSupported(profile, allowedTypes, connectApiMap)) {
        setLastUpdated(Date.now());
        onDelete?.(profile);

        // If the deleted profile was the one selected, deselect it.
        if (selectedId === profile.id) {
          setSelectedId('');
          onChange?.(undefined);
        }
      }
    };

    // @ts-ignore - ST event types are not formally defined
    globalContext.eventSource.on('CONNECTION_PROFILE_CREATED', handleCreate);
    // @ts-ignore
    globalContext.eventSource.on('CONNECTION_PROFILE_UPDATED', handleUpdate);
    // @ts-ignore
    globalContext.eventSource.on('CONNECTION_PROFILE_DELETED', handleDelete);

    return () => {
      // @ts-ignore
      globalContext.eventSource.removeListener('CONNECTION_PROFILE_CREATED', handleCreate);
      // @ts-ignore
      globalContext.eventSource.removeListener('CONNECTION_PROFILE_UPDATED', handleUpdate);
      // @ts-ignore
      globalContext.eventSource.removeListener('CONNECTION_PROFILE_DELETED', handleDelete);
    };
  }, [isEnabled, selectedId, allowedTypes, connectApiMap, onChange, onCreate, onUpdate, onDelete]);

  // Memoize the expensive filtering and sorting logic
  const groupedAndSortedProfiles = useMemo(() => {
    if (!isEnabled) return [];

    const supported = profiles.filter((p) => isProfileSupported(p, allowedTypes, connectApiMap));
    const groups: Record<string, { label: string; profiles: ConnectionProfile[] }> = {};

    for (const [apiType, groupLabel] of Object.entries(allowedTypes)) {
      groups[apiType] = { label: groupLabel, profiles: [] };
    }

    for (const profile of supported) {
      const apiMap = connectApiMap[profile.api!];
      if (groups[apiMap.selected]) {
        groups[apiMap.selected].profiles.push(profile);
      }
    }

    // Sort profiles within each group alphabetically by name
    for (const group of Object.values(groups)) {
      group.profiles.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
    }

    return Object.values(groups).filter((g) => g.profiles.length > 0);
  }, [isEnabled, profiles, allowedTypes, connectApiMap]);

  const handleSelectChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const newId = event.target.value;
      setSelectedId(newId);
      const profile = profiles.find((p) => p.id === newId);
      onChange?.(profile);
    },
    [profiles, onChange],
  );

  if (!isEnabled) {
    return <STSelect disabled={true} value="" children={<option>Connection Manager disabled</option>} />;
  }

  return (
    <STSelect value={selectedId} onChange={handleSelectChange}>
      <option value="">{placeholder}</option>
      {groupedAndSortedProfiles.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </optgroup>
      ))}
    </STSelect>
  );
};
