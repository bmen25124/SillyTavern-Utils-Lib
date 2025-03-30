import { st_echo } from './config.js';
import { DropdownItem } from './fancy-dropdown.js';

export interface BuildPresetOptions {
  label?: (value: string) => string; // e.g. "connection profile" or a function that returns label
  initialValue?: string;
  initialList?: Array<string | DropdownItem>;
  readOnlyValues?: string[];
  onSelectChange?: (previousValue?: string, newValue?: string) => void | Promise<void>;
  create?: {
    onPopupOpen?: () => void | Promise<void>;
    onBeforeCreate?: (value: string) => boolean | Promise<boolean>;
    /**
     * @returns return string if you want to modify the value
     */
    onAfterCreate?: (value: string) => string | void | Promise<string | void>;
  };
  rename?: {
    onPopupOpen?: () => void | Promise<void>;
    onBeforeRename?: (previousValue: string, newValue: string) => boolean | Promise<boolean>;
    /**
     * @returns return string if you want to modify the value
     */
    onAfterRename?: (previousValue: string, newValue: string) => string | void | Promise<string | void>;
  };
  delete?: {
    onPopupOpen?: () => void | Promise<void>;
    onBeforeDelete?: (value: string) => boolean | Promise<boolean>;
    onAfterDelete?: (value: string) => void | Promise<void>;
  };
}

export function buildPresetSelect(selector: string, options: BuildPresetOptions = {}) {
  const context = SillyTavern.getContext();
  const readOnlyValues = options.readOnlyValues || [];

  const select = document.querySelector<HTMLSelectElement>(selector);
  if (!select) {
    throw new Error(`Could not find preset select: ${selector}`);
  }

  const getLabel = (value: string) => (options.label ? options.label(value) : value);
  const container = document.createElement('div');
  container.className = 'preset-select-container';
  container.style.display = 'flex';
  container.style.alignItems = 'center';

  const isReadOnly = (value: string): boolean => {
    return readOnlyValues.includes(value);
  };

  // Wrap the select in the container
  select.parentNode?.insertBefore(container, select);
  container.appendChild(select);

  // Add initial options if provided
  if (options.initialList && options.initialList.length > 0) {
    // Clear existing options first
    select.innerHTML = '';

    const getItemValue = (item: string | DropdownItem): string => (typeof item === 'string' ? item : item.value);

    // Add new options from the list
    for (const item of options.initialList) {
      const option = document.createElement('option');
      const value = getItemValue(item);
      option.value = value;
      option.textContent = getLabel(value);

      if (isReadOnly(value)) {
        option.dataset.readonly = 'true';
      }

      select.appendChild(option);
    }
  }

  // Set initial value if provided
  if (options.initialValue) {
    // Find option with matching value
    const option = Array.from(select.options).find((opt) => opt.value === options.initialValue);

    if (option) {
      select.value = option.value;
    }
  }

  // Track previous value for onSelectChange
  let previousValue: string | undefined = select.value;

  // Set up change event handler for the select
  select.addEventListener('change', async () => {
    const newValue = select.value;
    if (options.onSelectChange && previousValue !== newValue) {
      await options.onSelectChange(previousValue, newValue);
    }
    previousValue = newValue;
  });

  // Add Create button if enabled
  if (options.create) {
    const createButton = document.createElement('i');
    createButton.className = 'menu_button fa-solid fa-file-circle-plus';
    const createLabel = getLabel('');
    createButton.title = `Create a new ${createLabel}`;
    createButton.setAttribute('data-i18n', `[title]Create a new ${createLabel}`);

    createButton.addEventListener('click', async () => {
      if (options.create?.onPopupOpen) {
        await options.create.onPopupOpen();
      }

      const popupLabel = getLabel('');
      const newValue = await context.Popup.show.input(
        `Create a new ${popupLabel}`,
        `Please enter a name for the new ${popupLabel}:`,
        '',
      );

      if (newValue === null || newValue.trim() === '') return;

      let trimmedValue = newValue.trim();

      // Check if a preset with this name already exists
      const exists = Array.from(select.options).some((option) => option.value === trimmedValue);

      if (exists) {
        await st_echo('warning', `A ${getLabel(trimmedValue)} with this name already exists.`);
        return;
      }

      // Run before create hook
      if (options.create?.onBeforeCreate) {
        const shouldProceed = await options.create.onBeforeCreate(trimmedValue);
        if (!shouldProceed) return;
      }

      // Run after create hook and potentially update the value
      if (options.create?.onAfterCreate) {
        const result = await options.create.onAfterCreate(trimmedValue);
        if (typeof result === 'string') {
          trimmedValue = result;
        }
      }

      // Create new option
      const newOption = document.createElement('option');
      newOption.value = trimmedValue;
      newOption.textContent = getLabel(trimmedValue);
      select.appendChild(newOption);

      // Store previous value before changing
      const prevValue = select.value;

      // Select the new option
      select.value = trimmedValue;

      // Trigger onSelectChange if the value actually changed
      if (options.onSelectChange && prevValue !== trimmedValue) {
        await options.onSelectChange(prevValue, trimmedValue);
      }
      previousValue = trimmedValue;
    });

    container.appendChild(createButton);
  }

  // Add Rename button if enabled
  if (options.rename) {
    const renameButton = document.createElement('i');
    renameButton.className = 'menu_button fa-solid fa-pencil';
    const renameLabel = getLabel('');
    renameButton.title = `Rename a ${renameLabel}`;
    renameButton.setAttribute('data-i18n', `[title]Rename a ${renameLabel}`);

    renameButton.addEventListener('click', async () => {
      if (select.selectedIndex === -1) {
        await st_echo('warning', `Please select a ${getLabel('')} to rename.`);
        return;
      }

      const selectedOption = select.options[select.selectedIndex];
      let selectedValue = selectedOption.value;

      // Check if the selected value is read-only
      if (isReadOnly(selectedValue)) {
        await st_echo('warning', `This ${getLabel(selectedValue)} cannot be renamed as it is read-only.`);
        return;
      }

      if (options.rename?.onPopupOpen) {
        await options.rename.onPopupOpen();
      }

      const newValue = await context.Popup.show.input(
        `Rename ${getLabel(selectedValue)}`,
        `Please enter a new name for "${selectedValue}":`,
        selectedValue,
      );

      if (newValue === null || newValue.trim() === '' || newValue === selectedValue) return;

      let trimmedValue = newValue.trim();

      // Check if a preset with this name already exists
      const exists = Array.from(select.options).some(
        (option) => option.value === trimmedValue && option !== selectedOption,
      );

      if (exists) {
        await st_echo('warning', `A ${getLabel(trimmedValue)} with this name already exists.`);
        return;
      }

      // Run before rename hook
      if (options.rename?.onBeforeRename) {
        const shouldProceed = await options.rename.onBeforeRename(selectedValue, trimmedValue);
        if (!shouldProceed) return;
      }

      // Run after rename hook and potentially update the value
      if (options.rename?.onAfterRename) {
        const result = await options.rename.onAfterRename(selectedValue, trimmedValue);
        if (typeof result === 'string') {
          trimmedValue = result;
        }
      }

      // Rename the option
      selectedOption.value = trimmedValue;
      selectedOption.textContent = getLabel(trimmedValue);

      // Update the previous value tracker
      if (selectedValue === previousValue) {
        previousValue = trimmedValue;
      }

      // Trigger onSelectChange since the currently selected option changed its value
      if (options.onSelectChange && select.value === trimmedValue) {
        await options.onSelectChange(selectedValue, trimmedValue);
      }
    });

    container.appendChild(renameButton);
  }

  // Add Delete button if enabled
  if (options.delete) {
    const deleteButton = document.createElement('i');
    deleteButton.className = 'menu_button fa-solid fa-trash-can';
    const deleteLabel = getLabel('');
    deleteButton.title = `Delete a ${deleteLabel}`;
    deleteButton.setAttribute('data-i18n', `[title]Delete a ${deleteLabel}`);

    deleteButton.addEventListener('click', async () => {
      if (select.selectedIndex === -1) {
        await st_echo('warning', `Please select a ${getLabel('')} to delete.`);
        return;
      }

      const selectedOption = select.options[select.selectedIndex];
      const valueToDelete = selectedOption.value;
      const selectedIndex = select.selectedIndex;

      // Check if the selected value is read-only
      if (isReadOnly(valueToDelete)) {
        await st_echo('warning', `This ${getLabel(valueToDelete)} cannot be deleted as it is read-only.`);
        return;
      }

      if (options.delete?.onPopupOpen) {
        await options.delete.onPopupOpen();
      }

      const confirmed = await context.Popup.show.confirm(
        `Delete ${getLabel(valueToDelete)}`,
        `Are you sure you want to delete "${valueToDelete}"?`,
      );

      if (!confirmed) return;

      // Run before delete hook
      if (options.delete?.onBeforeDelete) {
        const shouldProceed = await options.delete.onBeforeDelete(valueToDelete);
        if (!shouldProceed) return;
      }

      // Store the value to delete for later reference
      const deletedValue = valueToDelete;

      // Determine the next option to select after deletion
      let nextSelectedIndex = -1;
      let nextValue = undefined;

      if (select.options.length > 1) {
        // Try to select the next option, or the previous if we're at the end
        nextSelectedIndex = selectedIndex < select.options.length - 1 ? selectedIndex : selectedIndex - 1;
        nextValue = select.options[nextSelectedIndex].value;
      }

      // Remove the option
      select.removeChild(selectedOption);

      // Select the next available option if there is one
      if (nextSelectedIndex >= 0) {
        select.selectedIndex = nextSelectedIndex;
        previousValue = nextValue;

        // Trigger onSelectChange
        if (options.onSelectChange) {
          await options.onSelectChange(deletedValue, nextValue);
        }
      } else {
        // No options left, trigger onSelectChange with undefined as new value
        if (options.onSelectChange) {
          await options.onSelectChange(deletedValue, undefined);
        }
        previousValue = undefined;
      }

      // Run after delete hook
      if (options.delete?.onAfterDelete) {
        await options.delete.onAfterDelete(deletedValue);
      }
    });

    container.appendChild(deleteButton);
  }

  return {
    select,
    container,
  };
}
