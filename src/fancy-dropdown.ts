import * as FuseGlobal from 'fuse.js';
import Fuse from 'fuse.js';

export interface DropdownItem {
  value: string;
  label: string;
}

export interface FancyDropdownOptions {
  placeholderText?: string;
  initialValues?: string[];
  initialList?: Array<string | DropdownItem>;
  onSelectChange?: (previousValues: string[], newValues: string[]) => void | Promise<void>;
  closeOnSelect?: boolean;
  /**
   * default true
   */
  multiple?: boolean;
  // --- Search Options ---
  enableSearch?: boolean;
  searchPlaceholderText?: string;
  searchNoResultsText?: string;
  searchDebounceMs?: number; // Default: 200ms
  searchFuseOptions?: FuseGlobal.IFuseOptions<DropdownItem | string>;
}

/**
 * Builds a collapsing dropdown menu that allows multiple selections with checkmarks and optional fuzzy search.
 */
export function buildFancyDropdown(selector: string | HTMLElement, options: FancyDropdownOptions = {}) {
  const container = typeof selector === 'string' ? document.querySelector<HTMLElement>(selector) : selector;
  if (!container) {
    throw new Error(`Could not find container: ${selector}`);
  }

  // --- Options & Defaults ---
  const placeholder = options.placeholderText || 'Select items...';
  const closeOnSelect = options.closeOnSelect ?? false;
  const enableSearch = options.enableSearch ?? false;
  const multiple = options.multiple ?? true;
  const searchPlaceholder = options.searchPlaceholderText || 'Search...';
  const searchNoResults = options.searchNoResultsText || 'No results found';
  const searchDebounceMs = options.searchDebounceMs ?? 200;

  let internalInitialList: Array<DropdownItem | string> = [...(options.initialList || [])]; // Modifiable internal copy

  // Clear container and apply base styles
  container.innerHTML = ''; // Clear existing content
  container.classList.add('fancy-dropdown-container');
  Object.assign(container.style, {
    position: 'relative',
    userSelect: 'none', // Note: 'user-select' becomes 'userSelect'
  });

  // --- Create Dropdown Trigger ---
  const dropdownTrigger = document.createElement('div');
  dropdownTrigger.className = 'fancy-dropdown-trigger';
  Object.assign(dropdownTrigger.style, {
    padding: '8px 12px',
    border: '1px solid var(--border-color)',
    backgroundColor: 'var(--bg-color)',
    color: 'var(--text-color)',
    borderRadius: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  });

  const triggerText = document.createElement('span');
  triggerText.className = 'fancy-dropdown-trigger-text';
  triggerText.textContent = placeholder;

  const triggerIcon = document.createElement('i');
  triggerIcon.className = 'fas fa-chevron-down'; // Assuming FontAwesome 5/6 setup
  triggerIcon.style.marginLeft = '8px';

  dropdownTrigger.append(triggerText, triggerIcon);
  container.append(dropdownTrigger);

  // --- Create Dropdown List (Options Panel) ---
  const dropdownList = document.createElement('div');
  dropdownList.className = 'fancy-dropdown-list';
  Object.assign(dropdownList.style, {
    position: 'absolute',
    top: '100%',
    left: '0',
    right: '0',
    maxHeight: '300px',
    display: 'none', // Hidden by default
    zIndex: '1050',
    border: '1px solid var(--border-color)',
    borderTop: 'none',
    backgroundColor: 'var(--bg-color-popup, var(--bg-color-secondary, var(--greyCAIbg, var(--grey30))))',
    color: 'var(--text-color)',
    borderRadius: '0 0 4px 4px',
    boxShadow: '0 4px 8px var(--black50a)',
    overflowY: 'auto',
  });
  container.append(dropdownList);

  // --- Create Search Input (if enabled) ---
  let searchInput: HTMLInputElement | null = null;
  let searchContainer: HTMLDivElement | null = null;
  let noResultsMessage: HTMLDivElement | null = null;
  let searchDebounceTimeout: number | null = null;

  if (enableSearch) {
    searchContainer = document.createElement('div');
    searchContainer.className = 'fancy-dropdown-search-wrapper';
    Object.assign(searchContainer.style, {
      padding: '8px',
      borderBottom: '1px solid var(--border-color)', // Separator
      position: 'sticky', // Keep search bar visible while scrolling options
      top: '0', // Stick to the top of the list container
      backgroundColor: 'inherit', // Inherit background from list
    });

    searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'fancy-dropdown-search-input';
    searchInput.placeholder = searchPlaceholder;
    Object.assign(searchInput.style, {
      width: '100%',
      padding: '6px 10px',
      border: '1px solid var(--border-color)',
      borderRadius: '3px',
      boxSizing: 'border-box', // Include padding/border in width
      backgroundColor: 'var(--bg-color)', // Use main bg for input
      color: 'var(--text-color)',
    });

    // Prevent closing dropdown when clicking inside search input
    searchInput.addEventListener('click', (e) => e.stopPropagation());

    searchContainer.append(searchInput);
    dropdownList.append(searchContainer); // Add search bar to the top of the list

    // Message for no results
    noResultsMessage = document.createElement('div');
    noResultsMessage.className = 'fancy-dropdown-no-results';
    noResultsMessage.textContent = searchNoResults;
    Object.assign(noResultsMessage.style, {
      padding: '8px 12px',
      textAlign: 'center',
      color: 'var(--text-color-secondary, var(--grey50))', // Dimmer text color
      display: 'none', // Hidden initially
    });
    dropdownList.append(noResultsMessage);
  }

  // --- State and Helper Functions ---
  let isOpen = false;
  let selectedValues: string[] = [...(options.initialValues || [])];
  let fuse: Fuse<DropdownItem | string> | null = null;

  // Helper to get the display label for an item
  const getItemLabel = (item: string | DropdownItem): string => (typeof item === 'string' ? item : item.label);

  // Helper to get the value for an item
  const getItemValue = (item: string | DropdownItem): string => (typeof item === 'string' ? item : item.value);

  // Helper to create the Fuse.js index
  const initializeFuse = () => {
    if (!enableSearch) return;

    const fuseOptions: FuseGlobal.IFuseOptions<DropdownItem | string> = {
      // Default Fuse.js options - allow overriding
      includeScore: false,
      threshold: 0.4,
      isCaseSensitive: false,
      findAllMatches: true,
      ...(options.searchFuseOptions || {}),
      // Ensure keys handle both string and object types if not overridden
      keys: options.searchFuseOptions?.keys || [
        { name: 'label', weight: 0.7 },
        { name: 'value', weight: 0.3 },
      ],
    };

    const listForFuse = internalInitialList.map((item) =>
      typeof item === 'string' ? { value: item, label: item } : item,
    );

    if (!options.searchFuseOptions?.keys && internalInitialList.every((item) => typeof item === 'string')) {
      fuseOptions.keys = ['label'];
    }

    // Type assertion needed as Fuse constructor expects a consistent type,
    // but our transformation makes it technically mixed.
    fuse = new Fuse(listForFuse as any[], fuseOptions as FuseGlobal.IFuseOptions<any>);
  };

  const updateTriggerText = () => {
    if (selectedValues.length === 0) {
      triggerText.textContent = placeholder;
    } else if (selectedValues.length === 1) {
      const selectedValue = selectedValues[0];
      const selectedItem = internalInitialList.find((item) => getItemValue(item) === selectedValue);
      const displayText = selectedItem ? getItemLabel(selectedItem) : selectedValue;
      triggerText.textContent = displayText;
    } else {
      triggerText.textContent = `${selectedValues.length} items selected`;
    }
  };

  const updateUI = (filteredValues?: string[]) => {
    let hasVisibleItems = false;
    const items = dropdownList.querySelectorAll<HTMLElement>('.fancy-dropdown-item');

    items.forEach((itemElement) => {
      const value = itemElement.dataset.value as string;
      const isSelected = selectedValues.includes(value);
      const checkmark = itemElement.querySelector<HTMLElement>('.checkmark');

      // Update selection state
      if (isSelected) {
        itemElement.classList.add('selected');
        if (checkmark) checkmark.style.display = 'inline-block';
      } else {
        itemElement.classList.remove('selected');
        if (checkmark) checkmark.style.display = 'none';
      }

      // Update visibility based on search filter (if provided)
      if (filteredValues !== undefined) {
        if (filteredValues.includes(value)) {
          itemElement.style.display = 'flex'; // Assuming items use flex
          hasVisibleItems = true;
        } else {
          itemElement.style.display = 'none';
        }
      } else {
        // If no filter, ensure item is visible
        itemElement.style.display = 'flex'; // Assuming items use flex
        hasVisibleItems = true; // Assume items exist if no filter
      }
    });

    // Show/hide "No results" message based on search
    if (enableSearch && noResultsMessage) {
      if (filteredValues !== undefined && !hasVisibleItems) {
        noResultsMessage.style.display = 'block';
      } else {
        noResultsMessage.style.display = 'none';
      }
    }

    updateTriggerText();
  };

  // Function to perform search and update list visibility
  const performSearch = (searchTerm: string) => {
    if (!enableSearch || !fuse) {
      updateUI(); // No search, just ensure UI is correct
      return;
    }

    const trimmedSearchTerm = searchTerm.trim();
    if (trimmedSearchTerm === '') {
      updateUI(undefined); // Empty search, show all
      return;
    }

    const results = fuse.search(trimmedSearchTerm);
    // Extract the 'value' from the original item structure Fuse returns
    const matchedValues = results.map((result) => {
      // Fuse returns the item it was initialized with in result.item
      const originalItem = result.item as DropdownItem; // Cast based on how we initialize fuse
      return originalItem.value;
    });
    updateUI(matchedValues);
  };

  // Debounced search handler
  const handleSearchInput = () => {
    if (!searchInput) return;
    if (searchDebounceTimeout) {
      clearTimeout(searchDebounceTimeout);
    }
    searchDebounceTimeout = window.setTimeout(() => {
      if (searchInput) {
        // Check again inside timeout
        performSearch(searchInput.value);
      }
    }, searchDebounceMs);
  };

  const openDropdown = () => {
    if (isOpen) return;
    isOpen = true;
    // Replace slideDown with simple display change
    dropdownList.style.display = 'block'; // Or 'flex' if list itself is a flex container
    triggerIcon.classList.remove('fa-chevron-down');
    triggerIcon.classList.add('fa-chevron-up');

    // Focus search input if enabled and visible
    if (enableSearch && searchInput) {
      // Small delay might still be needed depending on browser rendering
      setTimeout(() => searchInput?.focus(), 50); // Reduced delay
    }
  };

  const closeDropdown = () => {
    if (!isOpen) return;
    isOpen = false;
    // Replace slideUp with simple display change
    dropdownList.style.display = 'none';

    // Reset search after closing (immediately, as no animation)
    if (enableSearch && searchInput) {
      searchInput.value = ''; // Clear search input
      performSearch(''); // Reset list visibility
    }

    triggerIcon.classList.remove('fa-chevron-up');
    triggerIcon.classList.add('fa-chevron-down');

    if (searchDebounceTimeout) {
      clearTimeout(searchDebounceTimeout); // Clear any pending debounce on close
    }
  };

  // --- Event Handlers ---
  dropdownTrigger.addEventListener('click', (e) => {
    e.stopPropagation();
    isOpen ? closeDropdown() : openDropdown();
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (isOpen && container && !container.contains(e.target as Node)) {
      closeDropdown();
    }
  });

  // Attach search handler if enabled
  if (enableSearch && searchInput) {
    searchInput.addEventListener('input', handleSearchInput);
  }

  // --- Option Item Creation ---
  const addOptionItem = (item: string | DropdownItem, initiallySelected: boolean) => {
    const value = getItemValue(item);
    const label = getItemLabel(item);

    const itemElement = document.createElement('div');
    itemElement.className = 'fancy-dropdown-item';
    itemElement.dataset.value = value; // Use dataset for data attributes
    Object.assign(itemElement.style, {
      padding: '8px 12px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    });

    // Hover effect using mouseenter/mouseleave
    itemElement.addEventListener('mouseenter', () => {
      itemElement.style.backgroundColor = 'var(--hover-color, var(--white20a))';
    });
    itemElement.addEventListener('mouseleave', () => {
      itemElement.style.backgroundColor = ''; // Reset to default
    });

    const itemLabelSpan = document.createElement('span');
    itemLabelSpan.textContent = label;
    itemElement.append(itemLabelSpan);

    const checkmark = document.createElement('i');
    checkmark.className = 'checkmark fa-solid fa-check'; // FontAwesome 6 solid check
    Object.assign(checkmark.style, {
      marginLeft: '8px',
      display: initiallySelected ? 'inline-block' : 'none',
    });
    itemElement.append(checkmark);

    itemElement.addEventListener('click', function (e) {
      e.stopPropagation();
      // Use currentTarget to ensure we get the element the listener was attached to
      const clickedValue = (e.currentTarget as HTMLElement).dataset.value as string;
      const previousValues = [...selectedValues];
      let changed = false;

      if (!multiple) {
        // Single selection mode
        if (selectedValues.includes(clickedValue)) {
          // Allow deselecting
          selectedValues = [];
          changed = true;
        } else {
          selectedValues = [clickedValue];
          changed = true;
        }
      } else {
        // Multiple selection mode
        const index = selectedValues.indexOf(clickedValue);
        if (index > -1) {
          selectedValues.splice(index, 1); // More efficient removal
          changed = true;
        } else {
          selectedValues.push(clickedValue);
          changed = true;
        }
      }

      // Just update the checkmarks, keep current visibility filter
      updateUI(undefined); // Re-render checkmarks

      if (changed && options.onSelectChange) {
        Promise.resolve(options.onSelectChange(previousValues, selectedValues)).catch((err) =>
          console.error('onSelectChange callback failed:', err),
        );
      }

      if (closeOnSelect) {
        closeDropdown();
      }
    });

    // Append before the 'no results' message if it exists
    if (noResultsMessage) {
      dropdownList.insertBefore(itemElement, noResultsMessage);
    } else {
      dropdownList.append(itemElement);
    }
    return itemElement; // Return the created element if needed later
  };

  // --- Initialization ---
  if (internalInitialList.length > 0) {
    internalInitialList.forEach((item) => {
      const value = getItemValue(item);
      addOptionItem(item, selectedValues.includes(value));
    });
  }

  initializeFuse(); // Initialize Fuse.js after initial items are added
  updateUI(); // Initial UI state

  // --- Public API ---
  const api = {
    container, // Expose the main container element
    dropdownTrigger, // Expose trigger element
    dropdownList, // Expose list element

    getValues: () => [...selectedValues],

    setValues: (values: string[]) => {
      const previousValues = [...selectedValues];
      // Ensure values exist in the list
      const validValues = values.filter((v) => internalInitialList.some((item) => getItemValue(item) === v));
      selectedValues = [...validValues];

      // Reset search when setting values externally
      if (enableSearch && searchInput && searchInput.value !== '') {
        searchInput.value = '';
        performSearch(''); // Show all items after setting
      } else {
        updateUI(); // Just update checkmarks and trigger
      }

      // Avoid triggering callback if values didn't actually change
      const changed = JSON.stringify(previousValues.sort()) !== JSON.stringify(selectedValues.sort());
      if (changed && options.onSelectChange) {
        Promise.resolve(options.onSelectChange(previousValues, selectedValues)).catch((err) =>
          console.error('onSelectChange callback failed:', err),
        );
      }
    },

    getOptions: () =>
      internalInitialList.map((item) => (typeof item === 'string' ? { value: item, label: item } : item)),

    addOption: (value: string | DropdownItem, select: boolean = false) => {
      const itemValue = getItemValue(value);

      // Check for duplicates
      if (internalInitialList.some((item) => getItemValue(item) === itemValue)) return;

      internalInitialList.push(value);
      addOptionItem(value, select); // Add to DOM

      initializeFuse(); // Re-initialize Fuse

      let changed = false;
      const previousValues = [...selectedValues];
      if (select && !selectedValues.includes(itemValue)) {
        if (multiple) {
          selectedValues.push(itemValue);
        } else {
          selectedValues = [itemValue]; // Replace in single select mode
        }
        changed = true;
      } else if (select && !multiple && selectedValues.length > 0 && selectedValues[0] !== itemValue) {
        // If single select mode and trying to select a different item
        selectedValues = [itemValue];
        changed = true;
      }

      // Refresh UI potentially filtering if search is active
      if (enableSearch && searchInput && searchInput.value !== '') {
        performSearch(searchInput.value);
      } else {
        updateUI();
      }

      if (changed && options.onSelectChange) {
        Promise.resolve(options.onSelectChange(previousValues, selectedValues)).catch((err) =>
          console.error('onSelectChange callback failed:', err),
        );
      }
    },

    removeOption: (valueToRemove: string) => {
      const initialLength = internalInitialList.length;
      internalInitialList = internalInitialList.filter((item) => getItemValue(item) !== valueToRemove);

      if (internalInitialList.length === initialLength) return; // Nothing removed

      let selectionChanged = false;
      const previousValues = [...selectedValues];
      const indexToRemove = selectedValues.indexOf(valueToRemove);
      if (indexToRemove > -1) {
        selectedValues.splice(indexToRemove, 1);
        selectionChanged = true;
      }

      // Remove from DOM
      const itemToRemove = dropdownList.querySelector<HTMLElement>(
        `.fancy-dropdown-item[data-value="${valueToRemove}"]`,
      );
      itemToRemove?.remove();

      initializeFuse(); // Re-initialize Fuse

      if (enableSearch && searchInput && searchInput.value !== '') {
        performSearch(searchInput.value);
      } else {
        updateUI();
      }

      if (selectionChanged && options.onSelectChange) {
        Promise.resolve(options.onSelectChange(previousValues, selectedValues)).catch((err) =>
          console.error('onSelectChange callback failed:', err),
        );
      }
    },

    selectAll: () => {
      if (!multiple) return; // Select all only makes sense for multiple mode

      const previousValues = [...selectedValues];
      const allValues = internalInitialList.map(getItemValue);
      selectedValues = [...new Set([...selectedValues, ...allValues])]; // Use Set to avoid duplicates if some were already selected

      const changed = JSON.stringify(previousValues.sort()) !== JSON.stringify(selectedValues.sort());

      if (enableSearch && searchInput && searchInput.value !== '') {
        performSearch(searchInput.value); // Re-apply filter, but update checks
      } else {
        updateUI();
      }

      if (changed && options.onSelectChange) {
        Promise.resolve(options.onSelectChange(previousValues, selectedValues)).catch((err) =>
          console.error('onSelectChange callback failed:', err),
        );
      }
    },

    deselectAll: () => {
      const previousValues = [...selectedValues];
      if (selectedValues.length > 0) {
        selectedValues = [];

        if (enableSearch && searchInput && searchInput.value !== '') {
          performSearch(searchInput.value); // Re-apply filter, update checks
        } else {
          updateUI();
        }

        if (options.onSelectChange) {
          Promise.resolve(options.onSelectChange(previousValues, selectedValues)).catch((err) =>
            console.error('onSelectChange callback failed:', err),
          );
        }
      }
    },

    disable: () => {
      container.style.pointerEvents = 'none';
      container.style.opacity = '0.6';
      if (isOpen) closeDropdown(); // Ensure it's closed when disabled
    },

    enable: () => {
      container.style.pointerEvents = 'auto';
      container.style.opacity = '1';
    },

    open: openDropdown,
    close: closeDropdown,
    toggle: () => (isOpen ? closeDropdown() : openDropdown()),
  };

  return api;
}
