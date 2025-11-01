<template>
  <select v-if="isEnabled" class="text_pole" :value="selectedId" @change="handleSelectChange">
    <option value="">{{ placeholder }}</option>
    <optgroup v-for="group in groupedAndSortedProfiles" :key="group.label" :label="group.label">
      <option v-for="profile in group.profiles" :key="profile.id" :value="profile.id">
        {{ profile.name }}
      </option>
    </optgroup>
  </select>
  <select v-else class="text_pole" disabled>
    <option>Connection Manager disabled</option>
  </select>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import type { ConnectionProfile } from '../../types/profiles.js';
import type { ConnectAPIMap } from '../../types/index.js';
import { isProfileSupported } from '../../profile-utils.js';

const globalContext = SillyTavern.getContext();

// Props
const props = withDefaults(
  defineProps<{
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
  }>(),
  {
    initialSelectedProfileId: '',
    allowedTypes: () => ({ openai: 'Chat Completion', textgenerationwebui: 'Text Completion' }),
    placeholder: 'Select a Connection Profile',
  },
);

// Emits
const emit = defineEmits<{
  /**
   * Callback fired when the user selects a different profile from the dropdown.
   * Also fires with `undefined` if the currently selected profile is deleted or becomes unsupported.
   */
  (e: 'onChange', profile?: ConnectionProfile): void;
  /**
   * Callback fired when a new, supported profile is created in SillyTavern.
   */
  (e: 'onCreate', profile: ConnectionProfile): void;
  /**
   * Callback fired when a profile is updated in SillyTavern.
   */
  (e: 'onUpdate', oldProfile: ConnectionProfile, newProfile: ConnectionProfile): void;
  /**
   * Callback fired when a supported profile is deleted in SillyTavern.
   */
  (e: 'onDelete', profile: ConnectionProfile): void;
}>();

// State
const selectedId = ref(props.initialSelectedProfileId);
const lastUpdated = ref(Date.now()); // To trigger re-computation when ST context changes

// Watch for external changes to the initial ID
watch(
  () => props.initialSelectedProfileId,
  (newId) => {
    selectedId.value = newId;
  },
);

// Computed properties for ST context data
const contextData = computed(() => {
  // This dependency ensures re-computation when ST context changes
  lastUpdated.value;

  const isConnectionManagerDisabled =
    globalContext.extensionSettings.disabledExtensions?.includes('connection-manager');
  if (isConnectionManagerDisabled) {
    console.error('Connection Manager extension is disabled.');
    return { isEnabled: false, profiles: [], connectApiMap: {} };
  }
  return {
    isEnabled: true,
    profiles: (globalContext.extensionSettings.connectionManager?.profiles ?? []) as ConnectionProfile[],
    connectApiMap: globalContext.CONNECT_API_MAP as ConnectAPIMap,
  };
});

const isEnabled = computed(() => contextData.value.isEnabled);
const profiles = computed(() => contextData.value.profiles);
const connectApiMap = computed(() => contextData.value.connectApiMap);

// Grouping and sorting logic
const groupedAndSortedProfiles = computed(() => {
  if (!isEnabled.value) return [];

  const supported = profiles.value.filter((p) => isProfileSupported(p, props.allowedTypes, connectApiMap.value));
  const groups: Record<string, { label: string; profiles: ConnectionProfile[] }> = {};

  for (const [apiType, groupLabel] of Object.entries(props.allowedTypes)) {
    groups[apiType] = { label: groupLabel, profiles: [] };
  }

  for (const profile of supported) {
    const apiMap = connectApiMap.value[profile.api!];
    if (apiMap && groups[apiMap.selected]) {
      groups[apiMap.selected].profiles.push(profile);
    }
  }

  // Sort profiles within each group alphabetically by name
  for (const group of Object.values(groups)) {
    group.profiles.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''));
  }

  return Object.values(groups).filter((g) => g.profiles.length > 0);
});

// Event handlers
const handleSelectChange = (event: Event) => {
  const newId = (event.target as HTMLSelectElement).value;
  selectedId.value = newId;
  const profile = profiles.value.find((p: ConnectionProfile) => p.id === newId);
  emit('onChange', profile);
};

// Lifecycle hooks for event listeners
let handleCreate: (profile: ConnectionProfile) => void;
let handleUpdate: (oldProfile: ConnectionProfile, newProfile: ConnectionProfile) => void;
let handleDelete: (profile: ConnectionProfile) => void;

onMounted(() => {
  if (!isEnabled.value) return;

  handleCreate = (profile: ConnectionProfile) => {
    if (isProfileSupported(profile, props.allowedTypes, connectApiMap.value)) {
      lastUpdated.value = Date.now();
      emit('onCreate', profile);
    }
  };

  handleUpdate = (oldProfile: ConnectionProfile, newProfile: ConnectionProfile) => {
    const wasSupported = isProfileSupported(oldProfile, props.allowedTypes, connectApiMap.value);
    const isNowSupported = isProfileSupported(newProfile, props.allowedTypes, connectApiMap.value);

    if (wasSupported || isNowSupported) {
      lastUpdated.value = Date.now();
    }
    emit('onUpdate', oldProfile, newProfile);

    if (selectedId.value === oldProfile.id && !isNowSupported) {
      selectedId.value = '';
      emit('onChange', undefined);
    }
  };

  handleDelete = (profile: ConnectionProfile) => {
    if (isProfileSupported(profile, props.allowedTypes, connectApiMap.value)) {
      lastUpdated.value = Date.now();
      emit('onDelete', profile);

      if (selectedId.value === profile.id) {
        selectedId.value = '';
        emit('onChange', undefined);
      }
    }
  };

  // @ts-ignore - ST event types are not formally defined
  globalContext.eventSource.on('CONNECTION_PROFILE_CREATED', handleCreate);
  // @ts-ignore
  globalContext.eventSource.on('CONNECTION_PROFILE_UPDATED', handleUpdate);
  // @ts-ignore
  globalContext.eventSource.on('CONNECTION_PROFILE_DELETED', handleDelete);
});

onUnmounted(() => {
  if (!isEnabled.value) return;
  // @ts-ignore
  globalContext.eventSource.removeListener('CONNECTION_PROFILE_CREATED', handleCreate);
  // @ts-ignore
  globalContext.eventSource.removeListener('CONNECTION_PROFILE_UPDATED', handleUpdate);
  // @ts-ignore
  globalContext.eventSource.removeListener('CONNECTION_PROFILE_DELETED', handleDelete);
});
</script>