import React, { FC, useEffect, useRef } from 'react';
import Sortable, { SortableEvent } from 'sortablejs';
import { STSelect } from './STSelect.js';
import { DropdownItem } from '../../fancy-dropdown.js';
import { STButton } from './STButton.js';

// --- Interfaces ---

export interface SortableListItemData {
  id: string;
  label: string | React.ReactNode;
  enabled: boolean;
  canDelete?: boolean;
  canToggle?: boolean;
  showSelect?: boolean;
  canSelect?: boolean;
  selectOptions?: DropdownItem[];
  selectValue?: string;
}

export interface STSortableListProps {
  /** The array of items to display and sort. */
  items: SortableListItemData[];
  /** Callback fired when the list items change (e.g., reordered, toggled, deleted, select changed). */
  onItemsChange: (newItems: SortableListItemData[]) => void;

  showToggleButton?: boolean;
  showDeleteButton?: boolean;
  showSelectInput?: boolean;

  /**
   * Options passed directly to the SortableJS instance.
   * See https://github.com/SortableJS/Sortable#options
   */
  sortableJsOptions?: Sortable.Options;
}

// --- Internal Item Component ---
export interface STSortableListItemProps {
  item: SortableListItemData;
  showToggleButton?: boolean;
  showDeleteButton?: boolean;
  showSelectInput?: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onSelectChange: (id: string, newValue: string) => void;
}

export const STSortableListItem: FC<STSortableListItemProps> = React.memo(
  ({ item, showToggleButton, showDeleteButton, showSelectInput, onToggle, onDelete, onSelectChange }) => {
    const {
      id,
      label,
      enabled,
      canDelete = true,
      canToggle = true,
      showSelect = true,
      canSelect = true,
      selectOptions = [],
      selectValue,
    } = item;

    const listItemStyle: React.CSSProperties = {
      display: 'flex',
      alignItems: 'center',
      padding: '8px 12px',
      border: '1px solid var(--SmartThemeBorderColor, #ccc)',
      color: 'var(--SmartThemeBodyColor, #333)',
      marginBottom: '2px',
      opacity: showToggleButton && !enabled ? 0.6 : 1,
    };

    const iconStyle: React.CSSProperties = { cursor: 'pointer', flexShrink: 0 };
    const placeholderStyle: React.CSSProperties = { display: 'inline-block', flexShrink: 0, marginRight: '10px' };

    return (
      <li className="sortable-list-item" style={listItemStyle} data-id={id}>
        <span
          className="drag-handle fas fa-bars"
          style={{ cursor: 'grab', marginRight: '10px', color: 'var(--SmartThemeBodyColor, #555)', flexShrink: 0 }}
        />
        <span
          className="item-label"
          style={{
            flexGrow: 1,
            marginRight: '10px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {label}
        </span>

        {/* Select Input */}
        {showSelectInput && showSelect && canSelect && (
          <STSelect
            value={selectValue}
            onChange={(e) => onSelectChange(id, e.target.value)}
            disabled={!enabled}
            style={{ marginRight: '10px', flexShrink: 0, width: 'unset' }}
          >
            {selectOptions.length === 0 ? (
              <option disabled>--</option>
            ) : (
              selectOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            )}
          </STSelect>
        )}
        {showSelectInput && (!showSelect || !canSelect) && <span style={placeholderStyle} />}

        {/* Toggle Button */}
        {showToggleButton && canToggle && (
          <STButton
            overrideDefaults
            className={`toggle-button fas ${enabled ? 'fa-toggle-on' : 'fa-toggle-off'}`}
            style={{
              ...iconStyle,
              marginRight: '10px',
              fontSize: '1.2em',
              color: enabled ? 'var(--success-color, #4CAF50)' : 'var(--SmartThemeBodyColor, #555)',
              backgroundColor: 'transparent',
              border: 'none',
            }}
            onClick={() => onToggle(id)}
          />
        )}
        {showToggleButton && !canToggle && <span style={placeholderStyle} />}

        {/* Delete Button */}
        {showDeleteButton && canDelete && (
          <STButton
            overrideDefaults
            className="delete-button fas fa-trash-can"
            style={{
              ...iconStyle,
              color: 'var(--error-color, #f44336)',
              backgroundColor: 'transparent',
              border: 'none',
            }}
            onClick={() => onDelete(id)}
          />
        )}
        {showDeleteButton && !canDelete && <span style={{ ...placeholderStyle, marginRight: 0 }} />}
      </li>
    );
  },
);

// --- Main Component ---

/**
 * A controlled component that renders a drag-and-drop sortable list using SortableJS.
 * This is the React version of the original `buildSortableList` utility.
 */
export const STSortableList: FC<STSortableListProps> = ({
  items,
  onItemsChange,
  showToggleButton = false,
  showDeleteButton = false,
  showSelectInput = false,
  sortableJsOptions = {},
}) => {
  const listRef = useRef<HTMLUListElement>(null);
  const sortableInstance = useRef<Sortable | null>(null);

  useEffect(() => {
    if (listRef.current) {
      sortableInstance.current = Sortable.create(listRef.current, {
        handle: '.drag-handle',
        animation: 150,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        dragClass: 'sortable-drag',
        filter: 'select, button, .toggle-button, .delete-button', // Prevent drag on controls
        preventOnFilter: false,
        ...sortableJsOptions,
        onEnd: (event: SortableEvent) => {
          const { oldIndex, newIndex } = event;
          if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) {
            return;
          }

          // Create a new array with the updated order and notify the parent
          const newItems = Array.from(items);
          const [movedItem] = newItems.splice(oldIndex, 1);
          newItems.splice(newIndex, 0, movedItem);
          onItemsChange(newItems);
        },
      });
    }

    return () => {
      // Clean up the Sortable instance when the component unmounts
      sortableInstance.current?.destroy();
      sortableInstance.current = null;
    };
  }, [items, onItemsChange, sortableJsOptions]); // Re-create if options or callbacks change

  const handleToggle = (id: string) => {
    onItemsChange(items.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item)));
  };

  const handleDelete = (id: string) => {
    // Deletion logic (including confirmation) should be handled by the parent.
    // Here we just notify the parent that a deletion was requested.
    onItemsChange(items.filter((item) => item.id !== id));
  };

  const handleSelectChange = (id: string, newValue: string) => {
    onItemsChange(items.map((item) => (item.id === id ? { ...item, selectValue: newValue } : item)));
  };

  return (
    <ul ref={listRef} className="sortable-list" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {items.map((item) => (
        <STSortableListItem
          key={item.id}
          item={item}
          showToggleButton={showToggleButton}
          showDeleteButton={showDeleteButton}
          showSelectInput={showSelectInput}
          onToggle={handleToggle}
          onDelete={handleDelete}
          onSelectChange={handleSelectChange}
        />
      ))}
    </ul>
  );
};
