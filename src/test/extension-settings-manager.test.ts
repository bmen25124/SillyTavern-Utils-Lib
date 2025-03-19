import { ExtensionSettingsManager } from '../extension-settings-manager';

// Mock SillyTavern context
const mockSaveSettingsDebounced = jest.fn();
interface MockContext {
  extensionSettings: { [key: string]: any };
  saveSettingsDebounced: jest.Mock;
}

const mockContext: MockContext = {
  extensionSettings: {},
  saveSettingsDebounced: mockSaveSettingsDebounced,
};

// @ts-ignore - mock global
global.SillyTavern = {
  getContext: () => mockContext,
};

describe('ExtensionSettingsManager', () => {
  beforeEach(() => {
    mockContext.extensionSettings = {};
    mockSaveSettingsDebounced.mockClear();
  });

  describe('initializeSettings', () => {
    interface SettingsV1 {
      oldValue: string;
      version?: string;
      formatVersion?: string;
    }

    interface SettingsV1Extended extends SettingsV1 {
      metadata?: string;
    }

    interface SettingsV2 {
      updatedValue: string;
      metadata: string;
      version?: string;
      formatVersion?: string;
    }

    const defaultSettings: SettingsV2 = {
      updatedValue: '',
      metadata: '',
      version: '1.0.0',
      formatVersion: 'FORMAT-0.1.1',
    };

    it('should create new settings if none exist', async () => {
      const manager = new ExtensionSettingsManager<SettingsV2>('test', defaultSettings);
      const result = await manager.initializeSettings();

      expect(mockContext.extensionSettings.test).toEqual(defaultSettings);
      expect(result.version.changed).toBe(false);
      expect(result.version.old).toBeUndefined();
      expect(result.version.new).toBe('1.0.0');
      expect(result.formatVersion.changed).toBe(false);
      expect(result.formatVersion.old).toBeUndefined();
      expect(result.formatVersion.new).toBe('FORMAT-0.1.1');
      expect(result.oldSettings).toBeNull();
      expect(result.newSettings).toEqual(defaultSettings);
    });

    it('should update version and format version', async () => {
      const oldSettings: SettingsV2 = {
        updatedValue: 'test',
        metadata: 'old',
        version: '0.9.0',
        formatVersion: 'FORMAT-0.1.0',
      };

      mockContext.extensionSettings.test = oldSettings;

      const manager = new ExtensionSettingsManager<SettingsV2>('test', defaultSettings);
      const result = await manager.initializeSettings();

      // Verify version tracking
      expect(result.version.changed).toBe(true);
      expect(result.version.old).toBe('0.9.0');
      expect(result.version.new).toBe(defaultSettings.version);
      expect(result.formatVersion.changed).toBe(true);
      expect(result.formatVersion.old).toBe('FORMAT-0.1.0');
      expect(result.formatVersion.new).toBe(defaultSettings.formatVersion);

      // Verify settings states
      const expectedOldSettings = {
        updatedValue: 'test',
        metadata: 'old',
        version: '0.9.0',
        formatVersion: 'FORMAT-0.1.0',
      };
      expect(result.oldSettings).toEqual(expectedOldSettings);

      expect(mockContext.extensionSettings.test).toEqual({
        ...expectedOldSettings,
        version: result.version.new,
        formatVersion: result.formatVersion.new,
      });
    });

    it('should apply recursive strategy', async () => {
      const oldSettings = {
        updatedValue: 'test',
      };

      mockContext.extensionSettings.test = oldSettings;

      const manager = new ExtensionSettingsManager<SettingsV2>('test', defaultSettings);
      await manager.initializeSettings();

      expect(mockContext.extensionSettings.test).toEqual({
        ...oldSettings,
        metadata: '',
      });
      expect(mockSaveSettingsDebounced).toHaveBeenCalled();
    });

    it('should apply version changes with automatic formatVersion', async () => {
      const oldSettings: SettingsV1 = {
        oldValue: 'test',
        version: '0.9.0',
        formatVersion: 'FORMAT-0.1.0',
      };

      mockContext.extensionSettings.test = oldSettings;

      const manager = new ExtensionSettingsManager<SettingsV2>('test', defaultSettings);
      const result = await manager.initializeSettings<SettingsV1>({
        strategy: [
          {
            from: 'FORMAT-0.1.0',
            to: 'FORMAT-0.1.1',
            // formatVersion is handled by the manager
            action: async (previous: SettingsV1): Promise<SettingsV1Extended> => ({
              ...previous,
              oldValue: `migrated_${previous.oldValue}`,
              metadata: 'migrated',
            }),
          },
        ],
      });

      // Verify format version tracking
      expect(result.formatVersion.changed).toBe(true);
      expect(result.formatVersion.old).toBe('FORMAT-0.1.0');
      expect(result.formatVersion.new).toBe('FORMAT-0.1.1');

      // Then verify the complete final state
      const expectedSettings = {
        oldValue: 'migrated_test',
        metadata: 'migrated',
        formatVersion: 'FORMAT-0.1.1',
        version: '1.0.0',
      };
      expect(mockContext.extensionSettings.test).toEqual(expectedSettings);
      expect(mockSaveSettingsDebounced).toHaveBeenCalled();
    });

    it('should handle migration errors and preserve original settings', async () => {
      // Setup initial settings
      const oldSettings: SettingsV1 = {
        oldValue: 'test',
        formatVersion: 'FORMAT-0.1.0',
        version: '0.9.0',
      };

      mockContext.extensionSettings.test = structuredClone(oldSettings);

      const manager = new ExtensionSettingsManager<SettingsV2>('test', defaultSettings);
      const migrationError = new Error('Custom migration error');

      // Attempt migration that will fail
      await expect(
        manager.initializeSettings<SettingsV1>({
          strategy: [
            {
              from: 'FORMAT-0.1.0',
              to: 'FORMAT-0.1.1',
              action: async (prev: SettingsV1): Promise<SettingsV1Extended> => {
                throw migrationError;
              },
            },
          ],
        }),
      ).rejects.toThrow('Version migration failed: Custom migration error');

      // Verify settings are preserved and formatVersion hasn't changed
      expect(mockContext.extensionSettings.test).toEqual(oldSettings);
      expect(mockContext.extensionSettings.test.formatVersion).toBe('FORMAT-0.1.0');
      expect(mockSaveSettingsDebounced).not.toHaveBeenCalled();
    });

    it('should skip non-matching version changes', async () => {
      const oldSettings: SettingsV1 = {
        oldValue: 'test',
        formatVersion: 'FORMAT-0.1.0',
      };

      mockContext.extensionSettings.test = oldSettings;

      const manager = new ExtensionSettingsManager<SettingsV2>('test', defaultSettings);
      const result = await manager.initializeSettings<SettingsV1>({
        strategy: [
          {
            from: 'FORMAT-0.0.9',
            to: 'FORMAT-0.1.0',
            action: async () => {
              throw new Error('Should not be called');
            },
          },
        ],
      });

      // Verify version state remains unchanged
      expect(result.formatVersion.changed).toBe(false);
      expect(result.formatVersion.old).toBe('FORMAT-0.1.0');
      expect(result.formatVersion.new).toBe('FORMAT-0.1.0');

      // Verify settings weren't modified
      expect(mockContext.extensionSettings.test).toEqual(oldSettings);
    });

    it('should apply multiple version changes in sequence', async () => {
      interface SettingsV1Base {
        oldValue?: string;
        formatVersion?: string;
      }

      interface SettingsV1WithMeta extends SettingsV1Base {
        metadata?: string;
      }

      interface SettingsV2Intermediate {
        updatedValue: string;
        metadata: string;
        formatVersion?: string;
      }

      interface SettingsV2Final extends SettingsV2Intermediate {
        extraData: string;
        version?: string;
        formatVersion?: string;
      }

      // Initial settings
      const oldSettings: SettingsV1Base = {
        oldValue: 'initial',
        formatVersion: 'FORMAT-0.1.0',
      };

      mockContext.extensionSettings.test = structuredClone(oldSettings);

      const manager = new ExtensionSettingsManager<SettingsV2Final>('test', {
        updatedValue: '',
        metadata: '',
        extraData: '',
        version: '1.0.0',
        formatVersion: 'FORMAT-0.1.3',
      });

      const result = await manager.initializeSettings<SettingsV1Base, SettingsV2Final>({
        strategy: [
          {
            // Step 1: Add metadata field
            from: 'FORMAT-0.1.0',
            to: 'FORMAT-0.1.1',
            action: async (prev: SettingsV1Base): Promise<SettingsV1WithMeta> => ({
              ...prev,
              metadata: 'added metadata',
            }),
          },
          {
            // Step 2: Convert to new structure
            from: 'FORMAT-0.1.1',
            to: 'FORMAT-0.1.2',
            action: async (prev: SettingsV1WithMeta): Promise<SettingsV2Intermediate> => {
              const newSettings: SettingsV2Intermediate & SettingsV1WithMeta = {
                ...prev,
                updatedValue: prev.oldValue ?? '',
                metadata: prev.metadata ?? '',
              };
              delete newSettings.oldValue;
              return newSettings;
            },
          },
          {
            // Step 3: Add extra data field
            from: 'FORMAT-0.1.2',
            to: 'FORMAT-0.1.3',
            action: async (prev: SettingsV2Intermediate): Promise<SettingsV2Final> => ({
              ...prev,
              extraData: 'new field',
            }),
          },
        ],
      });

      // Verify format version changes
      expect(result.formatVersion.changed).toBe(true);
      expect(result.formatVersion.old).toBe('FORMAT-0.1.0');
      expect(result.formatVersion.new).toBe('FORMAT-0.1.3');

      // Verify the complete migration chain result
      expect(mockContext.extensionSettings.test).toEqual({
        updatedValue: 'initial',
        metadata: 'added metadata',
        extraData: 'new field',
        formatVersion: 'FORMAT-0.1.3',
        version: '1.0.0',
      });

      // Verify oldSettings preserved the initial state
      expect(result.oldSettings).toEqual(oldSettings);
      expect(mockSaveSettingsDebounced).toHaveBeenCalled();
    });
  });
});
