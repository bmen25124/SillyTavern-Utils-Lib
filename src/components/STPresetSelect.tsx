import React, { FC, useCallback, useMemo } from 'react';
import { STSelect, STButton } from './index.js';
import { st_echo } from '../config.js';

const globalContext = SillyTavern.getContext();

export interface PresetItem {
  value: string;
  label: string;
}

export interface STPresetSelectProps {
  /** The currently selected value. */
  value?: string;
  /** The list of items to display in the dropdown. */
  items: PresetItem[];
  /** A list of values that cannot be renamed or deleted. */
  readOnlyValues?: string[];
  /** A label for the entity being managed (e.g., "Preset", "Profile"). Used in popups. */
  label: string;
  /** A callback fired when the selected item changes. */
  onChange: (newValue?: string, oldValue?: string) => void;
  /** A callback fired when the list of items should be updated (e.g., after creation, renaming, or deletion). */
  onItemsChange: (newItems: PresetItem[]) => void;
  /** Set to true to show the 'Create' button. */
  enableCreate?: boolean;
  /** Set to true to show the 'Rename' button. */
  enableRename?: boolean;
  /** Set to true to show the 'Delete' button. */
  enableDelete?: boolean;

  /**
   * A callback fired when the user clicks 'Create'.
   * Should handle validation and return a confirmation.
   * The returned `value` can be used to transform the user's input.
   */
  onCreate?: (
    newValue: string,
  ) => Promise<{ confirmed: boolean; value?: string }> | { confirmed: boolean; value?: string };
  /**
   * A callback fired when the user clicks 'Rename'.
   * Should handle validation and return a confirmation.
   */
  onRename?: (
    oldValue: string,
    newValue: string,
  ) => Promise<{ confirmed: boolean; value?: string }> | { confirmed: boolean; value?: string };
  /**
   * A callback fired when the user clicks 'Delete'.
   * Should return `true` to confirm deletion.
   */
  onDelete?: (value: string) => Promise<boolean> | boolean;
}

/**
 * A controlled component for managing a list of presets with Create, Rename, and Delete functionality.
 * This is the React version of the original `buildPresetSelect` utility.
 */
export const STPresetSelect: FC<STPresetSelectProps> = ({
  value,
  items,
  readOnlyValues = [],
  label,
  onChange,
  onItemsChange,
  enableCreate = false,
  enableRename = false,
  enableDelete = false,
  onCreate,
  onRename,
  onDelete,
}) => {
  const selectedItem = useMemo(() => items.find((item) => item.value === value), [items, value]);

  const isReadOnly = useCallback((val?: string) => (val ? readOnlyValues.includes(val) : false), [readOnlyValues]);

  const handleCreate = async () => {
    const newValue = await globalContext.Popup.show.input(
      `Create a new ${label}`,
      `Please enter a name for the new ${label}:`,
      '',
    );
    if (!newValue || newValue.trim() === '') return;
    const trimmedValue = newValue.trim();

    if (items.some((item) => item.value === trimmedValue)) {
      await st_echo('warning', `A ${label} with this name already exists.`);
      return;
    }

    let finalValue = trimmedValue;
    if (onCreate) {
      const result = await Promise.resolve(onCreate(trimmedValue));
      if (!result.confirmed) return;
      if (result.value) {
        finalValue = result.value;
      }
    }

    const newItem: PresetItem = { value: finalValue, label: finalValue };
    onItemsChange([...items, newItem]);
    onChange(newItem.value, value);
  };

  const handleRename = async () => {
    if (!selectedItem) {
      await st_echo('warning', `Please select a ${label} to rename.`);
      return;
    }
    if (isReadOnly(selectedItem.value)) {
      await st_echo('warning', `This ${label} cannot be renamed as it is read-only.`);
      return;
    }

    const newValue = await globalContext.Popup.show.input(
      `Rename ${label}`,
      `Please enter a new name for "${selectedItem.label}":`,
      selectedItem.value,
    );
    if (!newValue || newValue.trim() === '' || newValue.trim() === selectedItem.value) return;
    const trimmedValue = newValue.trim();

    if (items.some((item) => item.value === trimmedValue)) {
      await st_echo('warning', `A ${label} with this name already exists.`);
      return;
    }

    let finalValue = trimmedValue;
    if (onRename) {
      const result = await Promise.resolve(onRename(selectedItem.value, trimmedValue));
      if (!result.confirmed) return;
      if (result.value) {
        finalValue = result.value;
      }
    }

    const newItems = items.map((item) =>
      item.value === selectedItem.value ? { value: finalValue, label: finalValue } : item,
    );
    onItemsChange(newItems);
    onChange(finalValue, value);
  };

  const handleDelete = async () => {
    if (!selectedItem) {
      await st_echo('warning', `Please select a ${label} to delete.`);
      return;
    }
    if (isReadOnly(selectedItem.value)) {
      await st_echo('warning', `This ${label} cannot be deleted as it is read-only.`);
      return;
    }

    const confirmed = await globalContext.Popup.show.confirm(
      `Delete ${label}`,
      `Are you sure you want to delete "${selectedItem.label}"?`,
    );
    if (!confirmed) return;

    if (onDelete) {
      const shouldDelete = await Promise.resolve(onDelete(selectedItem.value));
      if (!shouldDelete) return;
    }

    const itemIndex = items.findIndex((item) => item.value === selectedItem.value);
    const newItems = items.filter((item) => item.value !== selectedItem.value);
    onItemsChange(newItems);

    let nextSelectedValue: string | undefined;
    if (newItems.length > 0) {
      // Select the next item in the list, or the previous one if the deleted item was the last.
      const nextIndex = Math.min(itemIndex, newItems.length - 1);
      nextSelectedValue = newItems[nextIndex]?.value;
    }
    onChange(nextSelectedValue, value);
  };

  return (
    <div className="preset-select-container" style={{ display: 'flex', alignItems: 'center' }}>
      <STSelect value={value ?? ''} onChange={(e) => onChange(e.target.value, value)}>
        {items.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </STSelect>

      {enableCreate && (
        <STButton
          className="fa-solid fa-file-circle-plus"
          title={`Create a new ${label}`}
          onClick={handleCreate}
          data-i18n={`[title]Create a new ${label}`}
        />
      )}
      {enableRename && (
        <STButton
          className="fa-solid fa-pencil"
          title={`Rename selected ${label}`}
          onClick={handleRename}
          disabled={!selectedItem}
          data-i18n={`[title]Rename selected ${label}`}
        />
      )}
      {enableDelete && (
        <STButton
          className="fa-solid fa-trash-can"
          title={`Delete selected ${label}`}
          onClick={handleDelete}
          disabled={!selectedItem}
          data-i18n={`[title]Delete selected ${label}`}
        />
      )}
    </div>
  );
};
