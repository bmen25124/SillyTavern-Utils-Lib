import { st_echo } from './config.js';

export interface FancyDropdownOptions {
  label?: string;
  initialValues?: string[];
  initialList?: string[];
  onSelectChange?: (previousValues: string[], newValues: string[]) => void | Promise<void>;
}

/**
 * This is not exactly DROPDOWN, it is list of SELECTED VALUES. Nothing collapsing right now.
 */
export function buildFancyDropdown(selector: string, options: FancyDropdownOptions = {}) {
  // Use jQuery to select the container element
  const $container = $(selector);
  if ($container.length === 0) {
    throw new Error(`Could not find container: ${selector}`);
  }

  // Clear the container and add our custom dropdown
  $container.empty().addClass('fancy-dropdown-container');

  // Create the dropdown list
  const $dropdownList = $('<div></div>').addClass('fancy-dropdown-list').css({
    'max-height': '300px',
    'overflow-y': 'auto',
    border: '1px solid var(--border-color)',
    'background-color': 'var(--bg-color)',
    color: 'var(--text-color)',
    'border-radius': '4px',
  });

  $container.append($dropdownList);

  // Track selected values
  let selectedValues: string[] = [...(options.initialValues || [])];

  // Helper function to update the UI based on selected values
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
  };

  // Add initial options if provided
  if (options.initialList && options.initialList.length > 0) {
    for (const item of options.initialList) {
      const $item = $('<div></div>')
        .addClass('fancy-dropdown-item')
        .data('value', item)
        .css({
          padding: '8px 12px',
          cursor: 'pointer',
          display: 'flex',
          'align-items': 'center',
          'justify-content': 'space-between',
        })
        .hover(
          function () {
            $(this).css('background-color', 'var(--hover-color, #444)');
          },
          function () {
            $(this).css('background-color', '');
          },
        );

      // Add the item text
      $('<span></span>').text(item).appendTo($item);

      // Add checkmark icon
      const $checkmark = $('<i></i>')
        .addClass('checkmark fa-solid fa-check')
        .css({
          'margin-left': '8px',
          display: selectedValues.includes(item) ? 'inline-block' : 'none',
        });

      $item.append($checkmark);

      // Handle click to toggle selection
      $item.on('click', function () {
        const value = $(this).data('value') as string;
        const previousValues = [...selectedValues];

        if (selectedValues.includes(value)) {
          // Remove from selection
          selectedValues = selectedValues.filter((v) => v !== value);
        } else {
          // Add to selection
          selectedValues.push(value);
        }

        // Update UI
        updateUI();

        // Call onSelectChange callback
        if (options.onSelectChange) {
          options.onSelectChange(previousValues, selectedValues);
        }
      });

      $dropdownList.append($item);
    }
  }

  // Initial UI update
  updateUI();

  return {
    $container,
    $dropdownList,
    // Helper methods
    getValues: () => [...selectedValues],
    setValues: (values: string[]) => {
      const previousValues = [...selectedValues];
      selectedValues = [...values];
      updateUI();

      // Call onSelectChange callback
      if (options.onSelectChange && JSON.stringify(previousValues) !== JSON.stringify(selectedValues)) {
        options.onSelectChange(previousValues, selectedValues);
      }
    },
    getOptions: () => options.initialList || [],
    addOption: (value: string, selected: boolean = false) => {
      // Check if option already exists
      if (options.initialList && options.initialList.includes(value)) {
        return;
      }

      // Add to initialList
      if (!options.initialList) {
        options.initialList = [];
      }
      options.initialList.push(value);

      // Create new item
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
            $(this).css('background-color', 'var(--hover-color, #444)');
          },
          function () {
            $(this).css('background-color', '');
          },
        );

      // Add the item text
      $('<span></span>').text(value).appendTo($item);

      // Add checkmark icon
      const $checkmark = $('<i></i>').addClass('checkmark fa-solid fa-check').css({
        'margin-left': '8px',
        display: 'none',
      });

      $item.append($checkmark);

      // Handle click to toggle selection
      $item.on('click', function () {
        const clickedValue = $(this).data('value') as string;
        const previousValues = [...selectedValues];

        if (selectedValues.includes(clickedValue)) {
          // Remove from selection
          selectedValues = selectedValues.filter((v) => v !== clickedValue);
        } else {
          // Add to selection
          selectedValues.push(clickedValue);
        }

        // Update UI
        updateUI();

        // Call onSelectChange callback
        if (options.onSelectChange) {
          options.onSelectChange(previousValues, selectedValues);
        }
      });

      $dropdownList.append($item);

      // If selected, add to selectedValues
      if (selected && !selectedValues.includes(value)) {
        const previousValues = [...selectedValues];
        selectedValues.push(value);
        updateUI();

        // Call onSelectChange callback
        if (options.onSelectChange) {
          options.onSelectChange(previousValues, selectedValues);
        }
      }
    },
    removeOption: (value: string) => {
      // Remove from initialList
      if (options.initialList) {
        options.initialList = options.initialList.filter((v) => v !== value);
      }

      // Remove from selectedValues if present
      if (selectedValues.includes(value)) {
        const previousValues = [...selectedValues];
        selectedValues = selectedValues.filter((v) => v !== value);

        // Call onSelectChange callback
        if (options.onSelectChange) {
          options.onSelectChange(previousValues, selectedValues);
        }
      }

      // Remove from UI
      $dropdownList.find(`.fancy-dropdown-item[data-value="${value}"]`).remove();
    },
    selectAll: () => {
      const previousValues = [...selectedValues];
      selectedValues = [...(options.initialList || [])];
      updateUI();

      // Call onSelectChange callback
      if (options.onSelectChange && JSON.stringify(previousValues) !== JSON.stringify(selectedValues)) {
        options.onSelectChange(previousValues, selectedValues);
      }
    },
    deselectAll: () => {
      const previousValues = [...selectedValues];
      selectedValues = [];
      updateUI();

      // Call onSelectChange callback
      if (options.onSelectChange && previousValues.length > 0) {
        options.onSelectChange(previousValues, selectedValues);
      }
    },
    disable: () => {
      $dropdownList.css('pointer-events', 'none').css('opacity', '0.6');
    },
    enable: () => {
      $dropdownList.css('pointer-events', 'auto').css('opacity', '1');
    },
  };
}
