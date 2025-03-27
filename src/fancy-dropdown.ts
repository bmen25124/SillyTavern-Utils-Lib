import { st_echo } from './config.js';

export interface FancyDropdownOptions {
  placeholderText?: string; // Text shown when nothing is selected
  initialValues?: string[];
  initialList?: string[];
  onSelectChange?: (previousValues: string[], newValues: string[]) => void | Promise<void>;
  closeOnSelect?: boolean; // Option to close dropdown after selecting/deselecting an item
}

/**
 * Builds a collapsing dropdown menu that allows multiple selections with checkmarks.
 */
export function buildFancyDropdown(selector: string, options: FancyDropdownOptions = {}) {
  // Use jQuery to select the container element
  const $container = $(selector);
  if ($container.length === 0) {
    throw new Error(`Could not find container: ${selector}`);
  }

  const placeholder = options.placeholderText || 'Select items...';
  const closeOnSelect = options.closeOnSelect ?? false; // Default to false for multi-select

  // Clear the container and add our custom dropdown structure
  $container.empty().addClass('fancy-dropdown-container').css({
    position: 'relative', // Needed for absolute positioning of the list
    'user-select': 'none', // Prevent text selection on trigger
  });

  // --- Create the Dropdown Trigger ---
  const $dropdownTrigger = $('<div></div>').addClass('fancy-dropdown-trigger').css({
    padding: '8px 12px',
    border: '1px solid var(--border-color)', // Use --border-color
    'background-color': 'var(--bg-color)', // Keep using --bg-color for the trigger itself
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

  // --- Create the Dropdown List (Options Panel) ---
  const $dropdownList = $('<div></div>').addClass('fancy-dropdown-list').css({
    position: 'absolute',
    top: '100%', // Position below the trigger
    left: 0,
    right: 0,
    'max-height': '300px',
    'overflow-y': 'auto',
    border: '1px solid var(--border-color)', // Use --border-color for consistency
    'border-top': 'none', // Avoid double border with trigger
    'background-color': 'var(--bg-color-popup, var(--bg-color-secondary, var(--greyCAIbg, var(--grey30))))',
    color: 'var(--text-color)',
    'border-radius': '0 0 4px 4px',
    'z-index': 1050, // Ensure it appears above other elements (adjust if needed)
    display: 'none', // Hidden by default
    'box-shadow': '0 4px 8px var(--black50a)', // Use a shadow variable
  });

  $container.append($dropdownList);

  // --- State and Helper Functions ---
  let isOpen = false;
  let selectedValues: string[] = [...(options.initialValues || [])];

  // Helper to update the trigger text based on selection
  const updateTriggerText = () => {
    if (selectedValues.length === 0) {
      $triggerText.text(placeholder);
    } else if (selectedValues.length === 1) {
      // Optionally show the single selected item, or just count
      $triggerText.text(selectedValues[0]);
      // $triggerText.text('1 item selected');
    } else {
      $triggerText.text(`${selectedValues.length} items selected`);
    }
  };

  // Helper function to update the UI (checkmark visibility)
  const updateUI = () => {
    $dropdownList.find('.fancy-dropdown-item').each(function () {
      const $item = $(this);
      const value = $item.data('value') as string;

      if (selectedValues.includes(value)) {
        $item.addClass('selected');
        $item.find('.checkmark').show();
      } else {
        $item.removeClass('selected');
        $item.find('.checkmark').hide();
      }
    });
    updateTriggerText(); // Update trigger text whenever UI updates
  };

  // Helper to open the dropdown
  const openDropdown = () => {
    if (isOpen) return;
    isOpen = true;
    $dropdownList.slideDown(150); // Use slideDown for animation
    $triggerIcon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
  };

  // Helper to close the dropdown
  const closeDropdown = () => {
    if (!isOpen) return;
    isOpen = false;
    $dropdownList.slideUp(150); // Use slideUp for animation
    $triggerIcon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
  };

  // --- Event Handlers ---

  // Toggle dropdown on trigger click
  $dropdownTrigger.on('click', (e) => {
    e.stopPropagation(); // Prevent document click handler from firing immediately
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  });

  // Close dropdown if clicked outside
  $(document).on('click', (e) => {
    // If the click is outside the container and the dropdown is open, close it
    if (
      isOpen &&
      !$container.is(e.target as unknown as Element) &&
      $container.has(e.target as unknown as Element).length === 0
    ) {
      closeDropdown();
    }
  });

  // Function to add a single option item to the list
  const addOptionItem = (value: string, initiallySelected: boolean) => {
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
        }, // Reverts to the list background on hover out
      );

    $('<span></span>').text(value).appendTo($item);

    const $checkmark = $('<i></i>')
      .addClass('checkmark fa-solid fa-check')
      .css({
        'margin-left': '8px',
        display: initiallySelected ? 'inline-block' : 'none',
      });

    $item.append($checkmark);

    $item.on('click', function (e) {
      e.stopPropagation(); // Prevent trigger click handler
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

      updateUI(); // Update checkmarks and trigger text

      if (changed && options.onSelectChange) {
        options.onSelectChange(previousValues, selectedValues);
      }

      if (closeOnSelect) {
        closeDropdown();
      }
    });

    $dropdownList.append($item);
  };

  // --- Initialization ---

  // Add initial options if provided
  if (options.initialList && options.initialList.length > 0) {
    options.initialList.forEach((item) => {
      addOptionItem(item, selectedValues.includes(item));
    });
  }

  // Initial UI and trigger text update
  updateUI();

  // --- Public API ---
  return {
    $container,
    $dropdownTrigger,
    $dropdownList,

    getValues: () => [...selectedValues],

    setValues: (values: string[]) => {
      const previousValues = [...selectedValues];
      // Ensure all provided values actually exist as options
      const validValues = values.filter((v) => (options.initialList || []).includes(v));
      selectedValues = [...validValues];
      updateUI();

      if (options.onSelectChange && JSON.stringify(previousValues) !== JSON.stringify(selectedValues)) {
        options.onSelectChange(previousValues, selectedValues);
      }
    },

    getOptions: () => [...(options.initialList || [])],

    addOption: (value: string, select: boolean = false) => {
      if (!options.initialList) options.initialList = [];
      if (options.initialList.includes(value)) return; // Don't add duplicates

      options.initialList.push(value);
      addOptionItem(value, select); // Add to DOM

      if (select) {
        const previousValues = [...selectedValues];
        if (!selectedValues.includes(value)) {
          selectedValues.push(value);
          updateUI(); // Update checkmark and trigger text
          if (options.onSelectChange) {
            options.onSelectChange(previousValues, selectedValues);
          }
        }
      } else {
        updateUI(); // May need to update trigger if placeholder was shown
      }
    },

    removeOption: (value: string) => {
      if (options.initialList) {
        options.initialList = options.initialList.filter((v) => v !== value);
      }

      let changed = false;
      const previousValues = [...selectedValues];
      if (selectedValues.includes(value)) {
        selectedValues = selectedValues.filter((v) => v !== value);
        changed = true;
      }

      $dropdownList.find(`.fancy-dropdown-item[data-value="${value}"]`).remove();
      updateUI(); // Update trigger text

      if (changed && options.onSelectChange) {
        options.onSelectChange(previousValues, selectedValues);
      }
    },

    selectAll: () => {
      const previousValues = [...selectedValues];
      selectedValues = [...(options.initialList || [])];
      updateUI();

      if (options.onSelectChange && JSON.stringify(previousValues) !== JSON.stringify(selectedValues)) {
        options.onSelectChange(previousValues, selectedValues);
      }
    },

    deselectAll: () => {
      const previousValues = [...selectedValues];
      if (selectedValues.length > 0) {
        selectedValues = [];
        updateUI();
        if (options.onSelectChange) {
          options.onSelectChange(previousValues, selectedValues);
        }
      }
    },

    disable: () => {
      $container.css('pointer-events', 'none').css('opacity', '0.6');
      closeDropdown(); // Ensure it's closed when disabled
    },

    enable: () => {
      $container.css('pointer-events', 'auto').css('opacity', '1');
    },

    open: openDropdown,
    close: closeDropdown,
    toggle: () => (isOpen ? closeDropdown() : openDropdown()),
  };
}
