export interface BuildPresetOptions {
  label?: string; // e.g. "connection profile"
  initialValue?: string;
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

  const select = document.querySelector<HTMLSelectElement>(selector);
  if (!select) {
    throw new Error(`Could not find preset select: ${selector}`);
  }

  const label = options.label || 'preset';
  const container = document.createElement('div');
  container.className = 'preset-select-container';
  container.style.display = 'flex';
  container.style.alignItems = 'center';

  // Wrap the select in the container
  select.parentNode?.insertBefore(container, select);
  container.appendChild(select);

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
        await context.Popup.show.confirm(`A ${label} with this name already exists.`, 'Error');
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

      // Select the new option
      select.value = trimmedValue;

      // Run after create hook
      if (options.create?.onAfterCreate) {
        await options.create.onAfterCreate(trimmedValue);
      }
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
        await context.Popup.show.confirm(`Please select a ${label} to rename.`, 'Error');
        return;
      }

      const selectedOption = select.options[select.selectedIndex];
      const previousValue = selectedOption.value;

      if (options.rename?.onPopupOpen) {
        await options.rename.onPopupOpen();
      }

      const newValue = await context.Popup.show.input(
        `Rename ${label}`,
        `Please enter a new name for "${previousValue}":`,
        previousValue,
      );

      if (newValue === null || newValue.trim() === '' || newValue === previousValue) return;

      const trimmedValue = newValue.trim();

      // Check if a preset with this name already exists
      const exists = Array.from(select.options).some(
        (option) => option.textContent === trimmedValue && option !== selectedOption,
      );

      if (exists) {
        await context.Popup.show.confirm(`A ${label} with this name already exists.`, 'Error');
        return;
      }

      // Run before rename hook
      if (options.rename?.onBeforeRename) {
        const shouldProceed = await options.rename.onBeforeRename(previousValue, trimmedValue);
        if (!shouldProceed) return;
      }

      // Rename the option
      selectedOption.value = trimmedValue;
      selectedOption.textContent = trimmedValue;

      // Run after rename hook
      if (options.rename?.onAfterRename) {
        await options.rename.onAfterRename(previousValue, trimmedValue);
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
        await context.Popup.show.confirm(`Please select a ${label} to delete.`, 'Error');
        return;
      }

      const selectedOption = select.options[select.selectedIndex];
      const valueToDelete = selectedOption.value;

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

      // Remove the option
      select.removeChild(selectedOption);

      // Run after delete hook
      if (options.delete?.onAfterDelete) {
        await options.delete.onAfterDelete(valueToDelete);
      }
    });

    container.appendChild(deleteButton);
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

  return {
    select,
    container,
  };
}
