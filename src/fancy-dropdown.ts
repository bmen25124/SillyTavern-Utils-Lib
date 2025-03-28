import * as FuseGlobal from 'fuse.js'; // Make sure Fuse.js is installed
import Fuse from 'fuse.js'; // Make sure Fuse.js is installed

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
export function buildFancyDropdown(selector: string, options: FancyDropdownOptions = {}) {
  const $container = $(selector);
  if ($container.length === 0) {
    throw new Error(`Could not find container: ${selector}`);
  }

  // --- Options & Defaults ---
  const placeholder = options.placeholderText || 'Select items...';
  const closeOnSelect = options.closeOnSelect ?? false;
  const enableSearch = options.enableSearch ?? false;
  const searchPlaceholder = options.searchPlaceholderText || 'Search...';
  const searchNoResults = options.searchNoResultsText || 'No results found';
  const searchDebounceMs = options.searchDebounceMs ?? 200;

  let internalInitialList: Array<DropdownItem | string> = [...(options.initialList || [])]; // Modifiable internal copy

  // Clear container and apply base styles
  $container.empty().addClass('fancy-dropdown-container').css({
    position: 'relative',
    'user-select': 'none',
  });

  // --- Create Dropdown Trigger ---
  const $dropdownTrigger = $('<div></div>').addClass('fancy-dropdown-trigger').css({
    padding: '8px 12px',
    border: '1px solid var(--border-color)',
    'background-color': 'var(--bg-color)',
    color: 'var(--text-color)',
    'border-radius': '4px',
    cursor: 'pointer',
    display: 'flex',
    'align-items': 'center',
    'justify-content': 'space-between',
  });
  const $triggerText = $('<span></span>').addClass('fancy-dropdown-trigger-text').text(placeholder);
  const $triggerIcon = $('<i></i>').addClass('fas fa-chevron-down').css('margin-left', '8px');
  $dropdownTrigger.append($triggerText, $triggerIcon);
  $container.append($dropdownTrigger);

  // --- Create Dropdown List (Options Panel) ---
  const $dropdownList = $('<div></div>').addClass('fancy-dropdown-list').css({
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    'max-height': '300px',
    display: 'none', // Hidden by default
    'z-index': 1050,
    border: '1px solid var(--border-color)',
    'border-top': 'none',
    'background-color': 'var(--bg-color-popup, var(--bg-color-secondary, var(--greyCAIbg, var(--grey30))))',
    color: 'var(--text-color)',
    'border-radius': '0 0 4px 4px',
    'box-shadow': '0 4px 8px var(--black50a)',
    // Allow internal scrolling if search is enabled or content overflows
    'overflow-y': 'auto',
  });
  $container.append($dropdownList);

  // --- Create Search Input (if enabled) ---
  let $searchInput: JQuery<HTMLElement> | null = null;
  let $searchContainer: JQuery<HTMLElement> | null = null;
  let $noResultsMessage: JQuery<HTMLElement> | null = null;
  let searchDebounceTimeout: number | null = null;

  if (enableSearch) {
    $searchContainer = $('<div></div>').addClass('fancy-dropdown-search-wrapper').css({
      padding: '8px',
      'border-bottom': '1px solid var(--border-color)', // Separator
      position: 'sticky', // Keep search bar visible while scrolling options
      top: 0, // Stick to the top of the list container
      'background-color': 'inherit', // Inherit background from list
    });

    $searchInput = $('<input type="text">')
      .addClass('fancy-dropdown-search-input')
      .attr('placeholder', searchPlaceholder)
      .css({
        width: '100%',
        padding: '6px 10px',
        border: '1px solid var(--border-color)',
        'border-radius': '3px',
        'box-sizing': 'border-box', // Include padding/border in width
        'background-color': 'var(--bg-color)', // Use main bg for input
        color: 'var(--text-color)',
      })
      .on('click', (e) => e.stopPropagation()); // Prevent closing dropdown

    $searchContainer.append($searchInput);
    $dropdownList.append($searchContainer); // Add search bar to the top of the list

    // Message for no results
    $noResultsMessage = $('<div></div>').addClass('fancy-dropdown-no-results').text(searchNoResults).css({
      padding: '8px 12px',
      'text-align': 'center',
      color: 'var(--text-color-secondary, var(--grey50))', // Dimmer text color
      display: 'none', // Hidden initially
    });
    $dropdownList.append($noResultsMessage);
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
      threshold: 0.4, // Adjust for desired fuzziness (0=exact, 1=match anything)
      isCaseSensitive: false,
      findAllMatches: true, // Find all potential matches
      // Override defaults with user-provided options
      ...(options.searchFuseOptions || {}),
      // Ensure keys handle both string and object types if not overridden
      keys: options.searchFuseOptions?.keys || [
        { name: 'label', weight: 0.7 }, // Prioritize label
        { name: 'value', weight: 0.3 }, // Also search value, lower weight
      ],
    };

    // Fuse works best with objects. Convert strings to {value: string, label: string} for indexing.
    const listForFuse = internalInitialList.map((item) =>
      typeof item === 'string' ? { value: item, label: item } : item,
    );

    // Adjust keys if the original list contained only strings and no specific keys were provided
    if (!options.searchFuseOptions?.keys && internalInitialList.every((item) => typeof item === 'string')) {
      fuseOptions.keys = ['label']; // Search the 'label' field we created
    }

    fuse = new Fuse(listForFuse, fuseOptions as FuseGlobal.IFuseOptions<unknown>); // Use unknown because of the transform
  };

  const updateTriggerText = () => {
    if (selectedValues.length === 0) {
      $triggerText.text(placeholder);
    } else if (selectedValues.length === 1) {
      const selectedValue = selectedValues[0];
      const selectedItem = internalInitialList.find((item) => getItemValue(item) === selectedValue);
      const displayText = selectedItem ? getItemLabel(selectedItem) : selectedValue; // Fallback to value if somehow not found
      $triggerText.text(displayText);
    } else {
      $triggerText.text(`${selectedValues.length} items selected`);
    }
  };

  const updateUI = (filteredValues?: string[]) => {
    let hasVisibleItems = false;
    $dropdownList.find('.fancy-dropdown-item').each(function () {
      const $item = $(this);
      const value = $item.data('value') as string;
      const isSelected = selectedValues.includes(value);

      // Update selection state
      if (isSelected) {
        $item.addClass('selected');
        $item.find('.checkmark').show();
      } else {
        $item.removeClass('selected');
        $item.find('.checkmark').hide();
      }

      // Update visibility based on search filter (if provided)
      if (filteredValues !== undefined) {
        if (filteredValues.includes(value)) {
          $item.show();
          hasVisibleItems = true;
        } else {
          $item.hide();
        }
      } else {
        // If no filter, ensure item is visible (unless filtered before)
        $item.show();
        hasVisibleItems = true; // Assume items exist if no filter
      }
    });

    // Show/hide "No results" message based on search
    if (enableSearch && $noResultsMessage) {
      if (filteredValues !== undefined && !hasVisibleItems) {
        $noResultsMessage.show();
      } else {
        $noResultsMessage.hide();
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

    if (searchTerm.trim() === '') {
      updateUI(undefined); // Empty search, show all
      return;
    }

    const results = fuse.search(searchTerm.trim());
    // Extract the 'value' from the original item in the results
    const matchedValues = results.map((result) => {
      // The item stored by Fuse might be the transformed object or the original
      const originalItem = result.item;
      return typeof originalItem === 'string' ? originalItem : (originalItem as DropdownItem).value;
    });
    updateUI(matchedValues);
  };

  // Debounced search handler
  const handleSearchInput = () => {
    if (!$searchInput) return;
    if (searchDebounceTimeout) {
      clearTimeout(searchDebounceTimeout);
    }
    searchDebounceTimeout = window.setTimeout(() => {
      performSearch($searchInput!.val() as string);
    }, searchDebounceMs);
  };

  const openDropdown = () => {
    if (isOpen) return;
    isOpen = true;
    $dropdownList.slideDown(150);
    $triggerIcon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
    // Focus search input if enabled and visible
    if (enableSearch && $searchInput) {
      // Small delay to ensure the input is visible after slideDown
      setTimeout(() => $searchInput!.focus(), 160);
    }
  };

  const closeDropdown = () => {
    if (!isOpen) return;
    isOpen = false;
    $dropdownList.slideUp(150, () => {
      // Reset search after closing animation completes
      if (enableSearch && $searchInput) {
        $searchInput.val(''); // Clear search input
        performSearch(''); // Reset list visibility
      }
    });
    $triggerIcon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
    if (searchDebounceTimeout) {
      clearTimeout(searchDebounceTimeout); // Clear any pending debounce on close
    }
  };

  // --- Event Handlers ---
  $dropdownTrigger.on('click', (e) => {
    e.stopPropagation();
    isOpen ? closeDropdown() : openDropdown();
  });

  $(document).on('click', (e) => {
    if (
      isOpen &&
      !$container.is(e.target as unknown as Element) &&
      $container.has(e.target as unknown as Element).length === 0
    ) {
      closeDropdown();
    }
  });

  // Attach search handler if enabled
  if (enableSearch && $searchInput) {
    $searchInput.on('input', handleSearchInput);
  }

  // --- Option Item Creation ---
  const addOptionItem = (item: string | DropdownItem, initiallySelected: boolean) => {
    const value = getItemValue(item);
    const label = getItemLabel(item);

    const $item = $('<div></div>')
      .addClass('fancy-dropdown-item')
      .data('value', value)
      .css({
        padding: '8px 12px',
        cursor: 'pointer',
        display: 'flex',
        'align-items': 'center',
        'justify-content': 'space-between',
      })
      .hover(
        function () {
          $(this).css('background-color', 'var(--hover-color, var(--white20a))');
        },
        function () {
          $(this).css('background-color', '');
        },
      );

    $('<span></span>').text(label).appendTo($item);
    const $checkmark = $('<i></i>')
      .addClass('checkmark fa-solid fa-check') // Ensure FontAwesome 6 class for solid check
      .css({
        'margin-left': '8px',
        display: initiallySelected ? 'inline-block' : 'none',
      });
    $item.append($checkmark);

    $item.on('click', function (e) {
      e.stopPropagation();
      const clickedValue = $(this).data('value') as string;
      const previousValues = [...selectedValues];
      let changed = false;

      if (selectedValues.includes(clickedValue)) {
        selectedValues = selectedValues.filter((v) => v !== clickedValue);
        changed = true;
      } else {
        selectedValues.push(clickedValue);
        changed = true;
      }

      // Decide whether to keep search filter active or reset after selection
      // Option 1: Keep filter
      // updateUI(enableSearch ? ($searchInput.val() ? undefined : []) : undefined); // Complex: re-evaluate based on current search term
      // Option 2: Reset filter (simpler user experience?)
      // if (enableSearch && $searchInput) {
      //     $searchInput.val('');
      //     performSearch('');
      // } else {
      //     updateUI();
      // }
      // Option 3 (Compromise): Just update the checkmarks, filter remains
      updateUI(undefined); // Re-render checkmarks, keep current visibility filter

      if (changed && options.onSelectChange) {
        // Use Promise.resolve to handle both sync and async callbacks gracefully
        Promise.resolve(options.onSelectChange(previousValues, selectedValues)).catch((err) =>
          console.error('onSelectChange callback failed:', err),
        );
      }

      if (closeOnSelect) {
        closeDropdown();
      }
    });

    // Append before the 'no results' message if it exists
    if ($noResultsMessage) {
      $item.insertBefore($noResultsMessage);
    } else {
      $dropdownList.append($item);
    }
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
    $container,
    $dropdownTrigger,
    $dropdownList,

    getValues: () => [...selectedValues],

    setValues: (values: string[]) => {
      const previousValues = [...selectedValues];
      const validValues = values.filter((v) => internalInitialList.some((item) => getItemValue(item) === v));
      selectedValues = [...validValues];
      // Reset search when setting values externally? Optional, but often makes sense.
      if (enableSearch && $searchInput && $searchInput.val() !== '') {
        $searchInput.val('');
        performSearch(''); // Show all items after setting
      } else {
        updateUI(); // Just update checkmarks and trigger
      }

      if (options.onSelectChange && JSON.stringify(previousValues) !== JSON.stringify(selectedValues)) {
        Promise.resolve(options.onSelectChange(previousValues, selectedValues)).catch((err) =>
          console.error('onSelectChange callback failed:', err),
        );
      }
    },

    getOptions: () =>
      internalInitialList.map((item) => (typeof item === 'string' ? { value: item, label: item } : item)),

    addOption: (value: string | DropdownItem, select: boolean = false) => {
      const itemValue = getItemValue(value);
      const itemLabel = getItemLabel(value);

      // Check for duplicates
      if (internalInitialList.some((item) => getItemValue(item) === itemValue)) return;

      internalInitialList.push(value);
      addOptionItem(value, select); // Add to DOM

      // Update Fuse index
      initializeFuse(); // Re-initialize Fuse - simpler than patching for now

      let changed = false;
      const previousValues = [...selectedValues];
      if (select && !selectedValues.includes(itemValue)) {
        selectedValues.push(itemValue);
        changed = true;
      }

      // Refresh UI potentially filtering if search is active
      if (enableSearch && $searchInput && $searchInput.val() !== '') {
        performSearch($searchInput.val() as string);
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

      // If nothing was removed, exit
      if (internalInitialList.length === initialLength) return;

      let selectionChanged = false;
      const previousValues = [...selectedValues];
      if (selectedValues.includes(valueToRemove)) {
        selectedValues = selectedValues.filter((v) => v !== valueToRemove);
        selectionChanged = true;
      }

      // Remove from DOM
      $dropdownList.find(`.fancy-dropdown-item[data-value="${valueToRemove}"]`).remove();

      // Update Fuse index
      initializeFuse(); // Re-initialize Fuse

      // Refresh UI potentially filtering if search is active
      if (enableSearch && $searchInput && $searchInput.val() !== '') {
        performSearch($searchInput.val() as string);
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
      const previousValues = [...selectedValues];
      // Select only currently *visible* options if search is active? Or all?
      // Let's select *all* options regardless of current filter.
      const allValues = internalInitialList.map((item) => getItemValue(item));
      selectedValues = [...allValues];

      // Refresh UI potentially filtering if search is active
      if (enableSearch && $searchInput && $searchInput.val() !== '') {
        performSearch($searchInput.val() as string);
      } else {
        updateUI();
      }

      if (options.onSelectChange && JSON.stringify(previousValues) !== JSON.stringify(selectedValues)) {
        Promise.resolve(options.onSelectChange(previousValues, selectedValues)).catch((err) =>
          console.error('onSelectChange callback failed:', err),
        );
      }
    },

    deselectAll: () => {
      const previousValues = [...selectedValues];
      if (selectedValues.length > 0) {
        selectedValues = [];

        // Refresh UI potentially filtering if search is active
        if (enableSearch && $searchInput && $searchInput.val() !== '') {
          performSearch($searchInput.val() as string);
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
      $container.css('pointer-events', 'none').css('opacity', '0.6');
      if (isOpen) closeDropdown(); // Ensure it's closed when disabled
    },

    enable: () => {
      $container.css('pointer-events', 'auto').css('opacity', '1');
    },

    open: openDropdown,
    close: closeDropdown,
    toggle: () => (isOpen ? closeDropdown() : openDropdown()),
  };

  return api;
}
