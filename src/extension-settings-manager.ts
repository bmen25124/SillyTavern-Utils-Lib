export interface VersionChange<F, T> {
  from: string;
  to: string;
  action: (previous: F) => Promise<T> | T;
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

  /**
   * If defaultSettings has "version" and "formatVersion" properties, they will be used to track version and format version changes.
   *
   * For example, if you want to show a notification when a new version is released, you can check "result.version.changed".
   *
   * @param [options={}]
   * @param [options.strategy='recursive'] - 'recursive' will migrate old settings with the default settings.
   *
   * For complex settings, you can specify a custom migration strategy. For example, if you change the field name from "old" to "new", you can use:
   * @example
   * [
   *   {
   *     from: 'FORMAT-0.1.0',
   *     to: 'FORMAT-0.1.1',
   *     action: (previous) => {
   *       const data = {
   *         ...previous,
   *         new: previous.old,
   *       };
   *       delete data.old;
   *       return data;
   *     },
   *   },
   * ]
   */
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

      if (formatVersion && formatVersion !== '*' && settings.formatVersion !== formatVersion) {
        result.formatVersion.changed = true;
        result.formatVersion.new = formatVersion;
        settings.formatVersion = formatVersion;
      }

      function initializeRecursively(target: any, defaults: any): boolean {
        let anyChange = false;

        // Initialize undefined values from defaults and handle nested objects
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

      if (
        initializeRecursively(settings, this.defaultSettings) ||
        result.version.changed ||
        result.formatVersion.changed
      ) {
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
          if ((change.from === '*' || currentFormatVersion === change.from) && currentFormatVersion !== change.to) {
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
          for (const key of Object.keys(settings)) {
            delete settings[key];
          }
          Object.assign(settings, currentSettings);
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
