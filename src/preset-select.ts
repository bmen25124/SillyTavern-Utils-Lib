import { st_echo } from './config.js';

export interface BuildPresetOptions {
  label?: string; // e.g. "connection profile"
  initialValue?: string;
  initialList?: string[];
  readOnlyValues?: string[];
  onSelectChange?: (previousValue?: string, newValue?: string) => void | Promise<void>;
  create?: {
    onPopupOpen?: () => void | Promise<void>;
    onBeforeCreate?: (value: string) => boolean | Promise<boolean>;
    onAfterCreate?: (value: string) => void | Promise<void>;
  };
  rename?: {
    onPopupOpen?: () => void | Promise<void>;
    onBeforeRename?: (previousValue: string, newValue: string) => boolean | Promise<boolean>;
    onAfterRename?: (previousValue: string, newValue: string) => void | Promise<void>;
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

  const label = options.label || 'preset';
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

    // Add new options from the list
    for (const item of options.initialList) {
      const option = document.createElement('option');
      option.value = item;
      option.textContent = item;

      if (isReadOnly(item)) {
        option.dataset.readonly = 'true';
      }

      select.appendChild(option);
    }
  }

  // Set initial value if provided
  if (options.initialValue) {
    // Find option with matching value or text content
    const option = Array.from(select.options).find(
      (opt) => opt.value === options.initialValue || opt.textContent === options.initialValue,
    );

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
    createButton.title = `Create a new ${label}`;
    createButton.setAttribute('data-i18n', `[title]Create a new ${label}`);

    createButton.addEventListener('click', async () => {
      if (options.create?.onPopupOpen) {
        await options.create.onPopupOpen();
      }

      const newValue = await context.Popup.show.input(
        `Create a new ${label}`,
        `Please enter a name for the new ${label}:`,
        '',
      );

      if (newValue === null || newValue.trim() === '') return;

      const trimmedValue = newValue.trim();

      // Check if a preset with this name already exists
      const exists = Array.from(select.options).some((option) => option.textContent === trimmedValue);

      if (exists) {
        await st_echo('warning', `A ${label} with this name already exists.`);
        return;
      }

      // Run before create hook
      if (options.create?.onBeforeCreate) {
        const shouldProceed = await options.create.onBeforeCreate(trimmedValue);
        if (!shouldProceed) return;
      }

      // Create new option
      const newOption = document.createElement('option');
      newOption.value = trimmedValue;
      newOption.textContent = trimmedValue;
      select.appendChild(newOption);

      // Store previous value before changing
      const prevValue = select.value;

      // Select the new option
      select.value = trimmedValue;

      // Run after create hook
      if (options.create?.onAfterCreate) {
        await options.create.onAfterCreate(trimmedValue);
      }

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
    renameButton.title = `Rename a ${label}`;
    renameButton.setAttribute('data-i18n', `[title]Rename a ${label}`);

    renameButton.addEventListener('click', async () => {
      if (select.selectedIndex === -1) {
        await st_echo('warning', `Please select a ${label} to rename.`);
        return;
      }

      const selectedOption = select.options[select.selectedIndex];
      let selectedValue = selectedOption.value;

      // Check if the selected value is read-only
      if (isReadOnly(selectedValue)) {
        await st_echo('warning', `This ${label} cannot be renamed as it is read-only.`);
        return;
      }

      if (options.rename?.onPopupOpen) {
        await options.rename.onPopupOpen();
      }

      const newValue = await context.Popup.show.input(
        `Rename ${label}`,
        `Please enter a new name for "${selectedValue}":`,
        selectedValue,
      );

      if (newValue === null || newValue.trim() === '' || newValue === selectedValue) return;

      const trimmedValue = newValue.trim();

      // Check if a preset with this name already exists
      const exists = Array.from(select.options).some(
        (option) => option.textContent === trimmedValue && option !== selectedOption,
      );

      if (exists) {
        await st_echo('warning', `A ${label} with this name already exists.`);
        return;
      }

      // Run before rename hook
      if (options.rename?.onBeforeRename) {
        const shouldProceed = await options.rename.onBeforeRename(selectedValue, trimmedValue);
        if (!shouldProceed) return;
      }

      // Rename the option
      selectedOption.value = trimmedValue;
      selectedOption.textContent = trimmedValue;

      // Update the previous value tracker
      if (selectedValue === previousValue) {
        previousValue = trimmedValue;
      }

      // Run after rename hook
      if (options.rename?.onAfterRename) {
        await options.rename.onAfterRename(selectedValue, trimmedValue);
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
    deleteButton.title = `Delete a ${label}`;
    deleteButton.setAttribute('data-i18n', `[title]Delete a ${label}`);

    deleteButton.addEventListener('click', async () => {
      if (select.selectedIndex === -1) {
        await st_echo('warning', `Please select a ${label} to delete.`);
        return;
      }

      const selectedOption = select.options[select.selectedIndex];
      const valueToDelete = selectedOption.value;
      const selectedIndex = select.selectedIndex;

      // Check if the selected value is read-only
      if (isReadOnly(valueToDelete)) {
        await st_echo('warning', `This ${label} cannot be deleted as it is read-only.`);
        return;
      }

      if (options.delete?.onPopupOpen) {
        await options.delete.onPopupOpen();
      }

      const confirmed = await context.Popup.show.confirm(
        `Are you sure you want to delete "${valueToDelete}"?`,
        `Delete ${label}`,
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
