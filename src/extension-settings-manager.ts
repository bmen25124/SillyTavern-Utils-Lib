export interface VersionChange<F, T> {
  from: string;
  to: string;
  action: (previous: F) => Promise<T>;
}

export interface SettingsInitResult<T> {
  version: {
    changed: boolean;
    old?: string;
    new: string;
  };
  formatVersion: {
    changed: boolean;
    old?: string;
    new: string;
  };
  oldSettings: any | null;
  newSettings: T;
}

export class ExtensionSettingsManager<T> {
  readonly settingsKey: string;
  readonly defaultSettings: T;

  public constructor(key: string, defaultSettings: T) {
    this.settingsKey = key;
    this.defaultSettings = defaultSettings;
  }

  public async initializeSettings<S extends any, _V = S>(
    options: {
      strategy?: 'recursive' | Array<VersionChange<any, any>>;
    } = {},
  ): Promise<SettingsInitResult<T>> {
    const { strategy = 'recursive' } = options;
    const version = (this.defaultSettings as any).version;
    const formatVersion = (this.defaultSettings as any).formatVersion;
    const settings = SillyTavern.getContext().extensionSettings[this.settingsKey];
    const defaultResult: SettingsInitResult<T> = {
      version: {
        changed: false,
        new: version ?? '',
      },
      formatVersion: {
        changed: false,
        new: formatVersion ?? '',
      },
      oldSettings: null,
      newSettings: this.defaultSettings as T,
    };

    if (!settings) {
      SillyTavern.getContext().extensionSettings[this.settingsKey] = this.defaultSettings;
      this.saveSettings();
      return defaultResult;
    }

    const result = {
      ...defaultResult,
      oldSettings: structuredClone(settings),
      version: {
        changed: false,
        old: settings.version,
        new: settings.version,
      },
      formatVersion: {
        changed: false,
        old: settings.formatVersion,
        new: settings.formatVersion,
      },
    };

    if (strategy === 'recursive') {
      if (version && settings.version !== version) {
        result.version.changed = true;
        result.version.new = version;
        settings.version = version;
      }

      if (formatVersion && settings.formatVersion !== formatVersion) {
        result.formatVersion.changed = true;
        result.formatVersion.new = formatVersion;
        settings.formatVersion = formatVersion;
      }

      function initializeRecursively(target: any, defaults: any): boolean {
        let anyChange = false;

        for (const key of Object.keys(defaults)) {
          if (target[key] === undefined) {
            target[key] = defaults[key];
            anyChange = true;
          } else if (typeof defaults[key] === 'object' && defaults[key] !== null) {
            target[key] = target[key] || {};
            if (initializeRecursively(target[key], defaults[key])) {
              anyChange = true;
            }
          }
        }

        return anyChange;
      }

      if (initializeRecursively(settings, this.defaultSettings)) {
        this.saveSettings();
      }
    } else if (Array.isArray(strategy)) {
      if (version && !settings.version) {
        settings.version = version;
        result.version.changed = true;
        result.version.new = version;
      }

      if (formatVersion && !settings.formatVersion) {
        settings.formatVersion = formatVersion;
        result.formatVersion.changed = true;
        result.formatVersion.new = formatVersion;
      }

      let currentSettings = structuredClone(settings) as S;
      let currentFormatVersion = settings.formatVersion;

      try {
        for (const change of strategy) {
          if (currentFormatVersion === change.from) {
            currentSettings = await change.action(currentSettings);
            currentFormatVersion = change.to;
            // @ts-ignore
            currentSettings.formatVersion = change.to;
            const defaultVersion = (this.defaultSettings as any).version;
            if (defaultVersion) {
              // @ts-ignore
              currentSettings.version = defaultVersion;
            }
            result.formatVersion.changed = true;
            result.formatVersion.new = change.to;
          }
        }

        if (result.formatVersion.changed) {
          Object.assign(settings, currentSettings);
          // Delete fields that no longer exist
          for (const key of Object.keys(settings)) {
            // @ts-ignore
            if (!Object.keys(currentSettings).includes(key)) {
              delete settings[key];
            }
          }
          this.saveSettings();
        }
      } catch (error) {
        console.error(`Failed to apply version changes:`, error);
        throw new Error(`Version migration failed: ${error instanceof Error ? error.message : error}`, {
          cause: error,
        });
      }
    }

    result.newSettings = settings as T;
    return result;
  }

  public getSettings(): T {
    return SillyTavern.getContext().extensionSettings[this.settingsKey] as T;
  }

  public updateSetting<K extends keyof T>(key: K, value: T[K]): void {
    SillyTavern.getContext().extensionSettings[this.settingsKey][key] = value;
    this.saveSettings();
  }

  public saveSettings(): void {
    SillyTavern.getContext().saveSettingsDebounced();
  }

  public resetSettings(): void {
    SillyTavern.getContext().extensionSettings[this.settingsKey] = this.defaultSettings;
    this.saveSettings();
  }
}
