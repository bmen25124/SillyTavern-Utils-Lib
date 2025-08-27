import React, { FC, useState, useEffect, useRef, useMemo } from 'react';
import Fuse, { IFuseOptions } from 'fuse.js';
import { STInput } from './STInput.js';

export interface DropdownItem {
  value: string;
  label: string;
}

export interface STFancyDropdownProps {
  /** The list of available items for the dropdown. */
  items: DropdownItem[];
  /** The currently selected value or values. */
  value: string[];
  /** Callback fired when the selection changes. */
  onChange: (newValues: string[]) => void;

  placeholder?: string;
  closeOnSelect?: boolean;
  multiple?: boolean;
  disabled?: boolean;
  /** Optional callback to control selection changes. Return false to prevent selection. */
  onBeforeSelection?: (currentValues: string[], proposedValues: string[]) => Promise<boolean> | boolean;

  // --- Search Options ---
  enableSearch?: boolean;
  searchPlaceholder?: string;
  searchNoResultsText?: string;
  searchFuseOptions?: IFuseOptions<DropdownItem>;
}

/**
 * A controlled component that provides a multi-select dropdown with fuzzy search capabilities.
 * This is the React version of the original `buildFancyDropdown` utility.
 */
export const STFancyDropdown: FC<STFancyDropdownProps> = ({
  items,
  value: selectedValues,
  onChange,
  placeholder = 'Select items...',
  closeOnSelect = false,
  multiple = true,
  disabled = false,
  onBeforeSelection,
  enableSearch = false,
  searchPlaceholder = 'Search...',
  searchNoResultsText = 'No results found',
  searchFuseOptions,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset search term when the dropdown is closed
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  // Memoize Fuse.js instance creation
  const fuse = useMemo(() => {
    if (!enableSearch) return null;
    const options: IFuseOptions<DropdownItem> = {
      includeScore: false,
      threshold: 0.4,
      keys: ['label', 'value'],
      ...searchFuseOptions,
    };
    return new Fuse(items, options);
  }, [items, enableSearch, searchFuseOptions]);

  // Memoize the filtered list based on the search term
  const filteredItems = useMemo(() => {
    if (!enableSearch || !searchTerm.trim() || !fuse) {
      return items;
    }
    return fuse.search(searchTerm.trim()).map((result) => result.item);
  }, [items, searchTerm, enableSearch, fuse]);

  const handleItemClick = async (clickedValue: string) => {
    let newValues: string[];

    if (!multiple) {
      newValues = selectedValues.includes(clickedValue) ? [] : [clickedValue];
    } else {
      newValues = selectedValues.includes(clickedValue)
        ? selectedValues.filter((v) => v !== clickedValue)
        : [...selectedValues, clickedValue];
    }

    if (onBeforeSelection) {
      const canProceed = await Promise.resolve(onBeforeSelection(selectedValues, newValues));
      if (!canProceed) return;
    }

    onChange(newValues);

    if (closeOnSelect) {
      setIsOpen(false);
    }
  };

  const triggerText = useMemo(() => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length === 1) {
      return items.find((item) => item.value === selectedValues[0])?.label ?? selectedValues[0];
    }
    return `${selectedValues.length} items selected`;
  }, [selectedValues, items, placeholder]);

  return (
    <div
      ref={containerRef}
      className="fancy-dropdown-container"
      style={{
        position: 'relative',
        userSelect: 'none',
        opacity: disabled ? 0.6 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      {/* Trigger */}
      <div
        className="fancy-dropdown-trigger"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        style={{
          padding: '8px 12px',
          border: '1px solid var(--border-color)',
          backgroundColor: 'var(--bg-color)',
          color: 'var(--text-color)',
          borderRadius: '4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span className="fancy-dropdown-trigger-text">{triggerText}</span>
        <i className={`fas ${isOpen ? 'fa-chevron-up' : 'fa-chevron-down'}`} style={{ marginLeft: '8px' }} />
      </div>

      {/* Dropdown List */}
      {isOpen && (
        <div
          className="fancy-dropdown-list"
          style={{
            position: 'absolute',
            top: '100%',
            left: '0',
            right: '0',
            maxHeight: '300px',
            zIndex: 1050,
            border: '1px solid var(--border-color)',
            borderTop: 'none',
            backgroundColor: 'var(--bg-color-popup, var(--bg-color-secondary, var(--greyCAIbg, var(--grey30))))',
            color: 'var(--text-color)',
            borderRadius: '0 0 4px 4px',
            boxShadow: '0 4px 8px var(--black50a)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {enableSearch && (
            <div
              style={{
                padding: '8px',
                borderBottom: '1px solid var(--border-color)',
                position: 'sticky',
                top: 0,
                backgroundColor: 'inherit',
              }}
            >
              <STInput
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          )}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <FancyDropdownItem
                  key={item.value}
                  item={item}
                  isSelected={selectedValues.includes(item.value)}
                  onClick={handleItemClick}
                />
              ))
            ) : (
              <div
                style={{
                  padding: '8px 12px',
                  textAlign: 'center',
                  color: 'var(--text-color-secondary, var(--grey50))',
                }}
              >
                {searchNoResultsText}
              </div>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

// Memoized item component for performance
export const FancyDropdownItem: FC<{ item: DropdownItem; isSelected: boolean; onClick: (value: string) => void }> =
  React.memo(({ item, isSelected, onClick }) => {
    const [isHovered, setIsHovered] = useState(false);
    return (
      <li
        onClick={() => onClick(item.value)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          padding: '8px 12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: isSelected
            ? 'var(--accent-color-bg, var(--link-color))'
            : isHovered
              ? 'var(--hover-color, var(--white20a))'
              : 'transparent',
        }}
      >
        <span>{item.label}</span>
        {isSelected && <i className="checkmark fa-solid fa-check" style={{ marginLeft: '8px' }} />}
      </li>
    );
  });
