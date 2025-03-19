export class ExtensionSettingsManager<T> {
  readonly settingsKey: string;
  readonly defaultSettings: T;

  public constructor(key: string, defaultSettings: T) {
    this.settingsKey = key;
    this.defaultSettings = defaultSettings;
  }

  public initializeDefaultSettings(): void {
    const settings = SillyTavern.getContext().extensionSettings[this.settingsKey];
    if (!settings) {
      SillyTavern.getContext().extensionSettings[this.settingsKey] = this.defaultSettings;
      this.saveSettings();
      return;
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
}
