import { DropdownItem } from './fancy-dropdown.js';
import Sortable, { SortableEvent } from 'sortablejs';

// --- Interfaces ---

export interface SortableListItemData {
  id: string;
  label: string;
  enabled: boolean;
  canDelete?: boolean;
  canToggle?: boolean;
  showSelect?: boolean;
  canSelect?: boolean;
  selectOptions?: DropdownItem[];
  selectValue?: string;
}

export interface SortableListOptions {
  initialList?: SortableListItemData[];
  showToggleButton?: boolean;
  showDeleteButton?: boolean;
  showSelectInput?: boolean;
  /**
   * Custom function to render the label part of an item.
   * Allows for adding extra elements or styling within the label area.
   * Default just sets textContent.
   */
  renderLabel?: (labelContainer: HTMLElement, itemData: SortableListItemData) => void;
  /**
   * Called after the order changes via drag-and-drop.
   * Passes the new array of item IDs in their order.
   */
  onOrderChange?: (newItemOrderIds: string[]) => void | Promise<void>;
  /**
   * Called when the toggle button is clicked.
   * Passes the item ID and the *new* enabled state.
   */
  onToggle?: (itemId: string, newState: boolean) => void | Promise<void>;
  /**
   * Called when the delete button is clicked.
   * IMPORTANT: This callback should handle confirmation (if needed)
   * and the actual deletion logic.
   * Return `true` if the item should be removed from the UI, `false` otherwise.
   */
  onDelete?: (itemId: string) => boolean | Promise<boolean>;
  /** Called when the select input value changes. */
  onSelectChange?: (itemId: string, newValue: string) => void | Promise<void>;
  /**
   * Options passed directly to SortableJS instance.
   * See https://github.com/SortableJS/Sortable#options
   */
  sortableJsOptions?: Sortable.Options;
}

// --- Component Builder ---

export function buildSortableList(selector: string | HTMLElement, options: SortableListOptions = {}) {
  const container = typeof selector === 'string' ? document.querySelector<HTMLElement>(selector) : selector;
  if (!container) {
    throw new Error(`Could not find container: ${selector}`);
  }

  // --- Options & Defaults ---
  const showToggleButton = options.showToggleButton ?? false;
  const showDeleteButton = options.showDeleteButton ?? false;
  const showSelectInput = options.showSelectInput ?? false;
  let internalList: SortableListItemData[] = [...(options.initialList || [])];
  let sortableInstance: Sortable | null = null;

  // --- Clear Container & Apply Base Styles ---
  container.innerHTML = '';
  container.classList.add('sortable-list-container');

  const listElement = document.createElement('ul');
  listElement.className = 'sortable-list';
  Object.assign(listElement.style, {
    listStyle: 'none',
    padding: '0',
    margin: '0',
  });
  container.appendChild(listElement);

  // --- Helper Functions ---

  const getItemData = (itemId: string): SortableListItemData | undefined => {
    return internalList.find((item) => item.id === itemId);
  };

  const getItemElement = (itemId: string): HTMLLIElement | null => {
    return listElement.querySelector<HTMLLIElement>(`li[data-id="${itemId}"]`);
  };

  // Function to create the DOM for a single list item
  const createItemElement = (itemData: SortableListItemData): HTMLLIElement => {
    const listItem = document.createElement('li');
    listItem.className = 'sortable-list-item';
    listItem.dataset.id = itemData.id;

    Object.assign(listItem.style, {
      display: 'flex',
      alignItems: 'center',
      padding: '8px 12px',
      border: '1px solid var(--SmartThemeBorderColor, #ccc)',
      color: 'var(--SmartThemeBodyColor, #333)',
      marginBottom: '2px',
    });

    // 1. Drag Handle
    const dragHandle = document.createElement('span');
    dragHandle.className = 'drag-handle';
    dragHandle.innerHTML = '<i class="fas fa-bars"></i>';
    Object.assign(dragHandle.style, {
      cursor: 'grab',
      marginRight: '10px',
      color: 'var(--SmartThemeBodyColor, #555)',
      flexShrink: '0',
    });
    listItem.appendChild(dragHandle);

    // 2. Label Container
    const labelContainer = document.createElement('span');
    labelContainer.className = 'item-label';
    labelContainer.style.flexGrow = '1';
    labelContainer.style.marginRight = '10px';
    labelContainer.style.overflow = 'hidden';
    labelContainer.style.textOverflow = 'ellipsis';
    labelContainer.style.whiteSpace = 'nowrap';
    if (options.renderLabel) {
      options.renderLabel(labelContainer, itemData);
    } else {
      labelContainer.textContent = itemData.label;
    }
    listItem.appendChild(labelContainer);

    const defaultRightMargin = '10px';

    // 3. Select Input
    const shouldShowSelectForItem = itemData.showSelect ?? true;
    const canSelect = itemData.canSelect ?? true;
    let selectElement: HTMLSelectElement | null = null;

    if (showSelectInput && shouldShowSelectForItem) {
      if (canSelect) {
        selectElement = document.createElement('select');
        selectElement.className = 'select-input text_pole';
        selectElement.style.marginRight = defaultRightMargin;
        selectElement.style.flexShrink = '0';
        selectElement.style.width = 'unset';

        if (itemData.selectOptions && itemData.selectOptions.length > 0) {
          itemData.selectOptions.forEach((opt) => {
            const optionElement = document.createElement('option');
            optionElement.value = opt.value;
            optionElement.textContent = opt.label;
            if (opt.value === itemData.selectValue) {
              optionElement.selected = true;
            }
            selectElement!.appendChild(optionElement);
          });
        } else {
          // Add a default placeholder option if no options provided
          const placeholderOption = document.createElement('option');
          placeholderOption.textContent = '--'; // Simple placeholder
          placeholderOption.disabled = true;
          placeholderOption.selected = true; // Show placeholder initially
          selectElement.appendChild(placeholderOption);
          selectElement.disabled = true; // Also disable the select itself
        }

        selectElement.addEventListener('change', (e) => {
          e.stopPropagation(); // Prevent interference with drag/other clicks
          handleSelectChange(itemData.id, e);
        });
        listItem.appendChild(selectElement);
      } else {
        // Render simple placeholder span for spacing if select is disabled for item
        const placeholder = document.createElement('span');
        placeholder.style.marginRight = defaultRightMargin;
        // Add width/content if text_pole doesn't provide enough default spacing
        // placeholder.style.width = '...'; // Example if needed
        placeholder.style.display = 'inline-block';
        placeholder.style.flexShrink = '0';
        listItem.appendChild(placeholder);
      }
    } else if (showSelectInput && !shouldShowSelectForItem) {
      // Render placeholder if globally enabled but hidden for this item
      const placeholder = document.createElement('span');
      placeholder.style.marginRight = defaultRightMargin;
      placeholder.style.display = 'inline-block';
      placeholder.style.flexShrink = '0';
      listItem.appendChild(placeholder);
    }

    // 4. Toggle Button (Optional)
    const canToggle = itemData.canToggle ?? true;
    if (showToggleButton && canToggle) {
      const toggleButtonElement = document.createElement('span');
      toggleButtonElement.className = 'toggle-button';
      toggleButtonElement.innerHTML = `<i class="fas ${itemData.enabled ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>`;
      Object.assign(toggleButtonElement.style, {
        cursor: 'pointer',
        marginRight: defaultRightMargin,
        fontSize: '1.2em',
        color: itemData.enabled ? 'var(--success-color, #4CAF50)' : 'var(--SmartThemeBodyColor, #555)',
        flexShrink: '0', // Prevent shrinking
        // Optional: width: '24px', textAlign: 'center' for alignment
      });
      toggleButtonElement.addEventListener('click', (e) => {
        e.stopPropagation();
        handleToggle(itemData.id);
      });
      listItem.appendChild(toggleButtonElement);
    } else if (showToggleButton && !canToggle) {
      const placeholder = document.createElement('span');
      placeholder.style.marginRight = defaultRightMargin;
      // placeholder.style.width = '24px'; // Example if needed for alignment
      placeholder.style.display = 'inline-block';
      placeholder.style.flexShrink = '0';
      listItem.appendChild(placeholder);
    }

    // 5. Delete Button (Optional)
    const canDelete = itemData.canDelete ?? true;
    if (showDeleteButton && canDelete) {
      const deleteButtonElement = document.createElement('span');
      deleteButtonElement.className = 'delete-button';
      deleteButtonElement.innerHTML = '<i class="fas fa-trash-can"></i>';
      Object.assign(deleteButtonElement.style, {
        cursor: 'pointer',
        color: 'var(--error-color, #f44336)',
        // No margin needed if it's the last element
        flexShrink: '0', // Prevent shrinking
        // Optional: width: '18px', textAlign: 'center' for alignment
      });
      deleteButtonElement.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDelete(itemData.id);
      });
      listItem.appendChild(deleteButtonElement);
    } else if (showDeleteButton && !canDelete) {
      const placeholder = document.createElement('span');
      // No margin needed if it's the last element
      // placeholder.style.width = '18px'; // Example if needed for alignment
      placeholder.style.display = 'inline-block';
      placeholder.style.flexShrink = '0';
      listItem.appendChild(placeholder);
    }

    // Apply enabled/disabled visual state to the whole item
    if (showToggleButton) {
      listItem.style.opacity = itemData.enabled ? '1' : '0.6';
    }

    return listItem;
  };

  // Function to render the entire list
  const renderList = () => {
    listElement.innerHTML = '';
    internalList.forEach((itemData) => {
      const itemElement = createItemElement(itemData);
      listElement.appendChild(itemElement);
    });
  };

  // Function to update a single item's visuals
  const updateItemVisuals = (itemId: string, updatedFields: Partial<Omit<SortableListItemData, 'id'>> = {}) => {
    const itemData = getItemData(itemId);
    const itemElement = getItemElement(itemId);
    if (!itemData || !itemElement) return;

    // Determine if a full re-render of the item is safer/required
    const requiresFullReRender =
      ('label' in updatedFields && options.renderLabel) ||
      'selectOptions' in updatedFields ||
      'showSelect' in updatedFields ||
      'canSelect' in updatedFields ||
      'canToggle' in updatedFields ||
      'canDelete' in updatedFields;

    if (requiresFullReRender) {
      const newItemElement = createItemElement(itemData);
      itemElement.replaceWith(newItemElement);
      return;
    }

    // --- Update specific parts ---

    if ('label' in updatedFields && !options.renderLabel) {
      const labelEl = itemElement.querySelector<HTMLElement>('.item-label');
      if (labelEl) labelEl.textContent = itemData.label;
    }

    if ('selectValue' in updatedFields && showSelectInput) {
      const selectEl = itemElement.querySelector<HTMLSelectElement>('.select-input');
      if (selectEl) {
        // Ensure value exists, fall back to empty string if null/undefined
        selectEl.value = itemData.selectValue ?? '';
        // If the new value isn't actually an option, the browser might select nothing
        // or the first option. Consider adding validation or handling here if needed.
      }
    }

    if ('enabled' in updatedFields && showToggleButton && (itemData.canToggle ?? true)) {
      const toggleIcon = itemElement.querySelector<HTMLElement>('.toggle-button i');
      const toggleButtonSpan = itemElement.querySelector<HTMLElement>('.toggle-button');
      if (toggleIcon) {
        toggleIcon.className = `fas ${itemData.enabled ? 'fa-toggle-on' : 'fa-toggle-off'}`;
      }
      if (toggleButtonSpan) {
        toggleButtonSpan.style.color = itemData.enabled
          ? 'var(--success-color, #4CAF50)'
          : 'var(--SmartThemeBodyColor, #555)';
      }
    }

    if ('enabled' in updatedFields && showToggleButton) {
      itemElement.style.opacity = itemData.enabled ? '1' : '0.6';
      const selectEl = itemElement.querySelector<HTMLSelectElement>('.select-input');
      if (selectEl) {
        selectEl.disabled = !itemData.enabled || !(itemData.canSelect ?? true);
      }
    }
  };

  // --- Event Handlers ---

  const handleToggle = async (itemId: string) => {
    const itemIndex = internalList.findIndex((item) => item.id === itemId);
    if (itemIndex === -1 || !(internalList[itemIndex].canToggle ?? true)) return;

    const item = internalList[itemIndex];
    const newState = !item.enabled;

    if (options.onToggle) {
      try {
        await Promise.resolve(options.onToggle(itemId, newState));
      } catch (err) {
        console.error('onToggle callback failed:', err);
        return;
      }
    }

    const updates = { enabled: newState };
    internalList[itemIndex] = { ...item, ...updates };
    updateItemVisuals(itemId, updates);
  };

  const handleDelete = async (itemId: string) => {
    const itemIndex = internalList.findIndex((item) => item.id === itemId);
    if (itemIndex === -1 || !(internalList[itemIndex].canDelete ?? true)) return;

    let shouldRemove = true;
    if (options.onDelete) {
      try {
        shouldRemove = await Promise.resolve(options.onDelete(itemId));
      } catch (err) {
        console.error('onDelete callback failed:', err);
        shouldRemove = false;
      }
    }

    if (shouldRemove) {
      internalList.splice(itemIndex, 1);
      getItemElement(itemId)?.remove();
    }
  };

  const handleSelectChange = async (itemId: string, event: Event) => {
    const itemIndex = internalList.findIndex((item) => item.id === itemId);
    if (itemIndex === -1 || !(internalList[itemIndex].canSelect ?? true)) return;

    const item = internalList[itemIndex];
    const selectElement = event.target as HTMLSelectElement;
    const newValue = selectElement.value;

    if (options.onSelectChange) {
      try {
        await Promise.resolve(options.onSelectChange(itemId, newValue));
      } catch (err) {
        console.error('onSelectChange callback failed:', err);
        selectElement.value = item.selectValue ?? ''; // Revert UI
        return;
      }
    }

    const updates = { selectValue: newValue };
    internalList[itemIndex] = { ...item, ...updates };
    // Don't need updateItemVisuals here unless select change affects other parts visually
  };

  // --- SortableJS Initialization ---
  const initializeSortable = () => {
    if (sortableInstance) {
      sortableInstance.destroy();
    }

    const sortableOptions: Sortable.Options = {
      handle: '.drag-handle',
      animation: 150,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      filter: '.select-input, .toggle-button, .delete-button', // Prevent drag on controls
      preventOnFilter: false,
      onEnd: (event: SortableEvent) => {
        const { oldIndex, newIndex } = event;
        if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) {
          return;
        }

        // Reorder internalList based on the final DOM order
        const currentIdsOrder = Array.from(listElement.children)
          .map((el) => (el as HTMLLIElement).dataset.id)
          .filter((id) => id !== undefined) as string[];
        internalList.sort((a, b) => {
          const indexA = currentIdsOrder.indexOf(a.id);
          const indexB = currentIdsOrder.indexOf(b.id);
          return indexA - indexB;
        });

        const newOrderIds = internalList.map((listItemData) => listItemData.id);

        if (options.onOrderChange) {
          Promise.resolve(options.onOrderChange(newOrderIds)).catch((err) =>
            console.error('onOrderChange callback failed:', err),
          );
        }
      },
      ...(options.sortableJsOptions || {}),
    };

    sortableInstance = Sortable.create(listElement, sortableOptions);
  };

  // --- Initial Render & Setup ---
  renderList();
  initializeSortable();

  // --- Public API ---
  const api = {
    /** Gets the current list of items with their data. */
    getList: (): SortableListItemData[] => [...internalList],

    /** Gets the current order of item IDs. */
    getOrder: (): string[] => internalList.map((item) => item.id),

    /** Adds a new item to the list. */
    addItem: (itemData: SortableListItemData, index?: number): void => {
      // Prevent duplicate IDs
      if (internalList.some((item) => item.id === itemData.id)) {
        console.warn(`SortableList: Item with ID "${itemData.id}" already exists. Skipping add.`);
        return;
      }
      const effectiveIndex =
        index === undefined || index < 0 || index > internalList.length ? internalList.length : index;

      internalList.splice(effectiveIndex, 0, itemData);

      const newItemElement = createItemElement(itemData);
      const elementAtIndex = listElement.children[effectiveIndex] as HTMLLIElement | undefined;
      listElement.insertBefore(newItemElement, elementAtIndex ?? null); // Handles appending if index is out of bounds

      // SortableJS usually adapts, re-init rarely needed for adds/removes unless issues arise
    },
    removeItem: (itemId: string): void => {
      const itemIndex = internalList.findIndex((item) => item.id === itemId);
      if (itemIndex > -1) {
        internalList.splice(itemIndex, 1);
        getItemElement(itemId)?.remove();
      }
    },

    /** Updates the data and visuals for an existing item. */
    updateItem: (itemId: string, updates: Partial<Omit<SortableListItemData, 'id'>>): void => {
      const itemIndex = internalList.findIndex((item) => item.id === itemId);
      if (itemIndex > -1) {
        const currentItem = internalList[itemIndex];
        if ('id' in updates) {
          console.warn('SortableList: Cannot change item ID via updateItem.');
          delete (updates as Partial<SortableListItemData>).id;
        }
        internalList[itemIndex] = { ...currentItem, ...updates };
        updateItemVisuals(itemId, updates);
      }
    },

    /** Replaces the entire list content. */
    setList: (newListData: SortableListItemData[]): void => {
      internalList = [...newListData];
      renderList();
      initializeSortable();
    },

    /** Destroys the SortableJS instance and removes elements. */
    destroy: (): void => {
      if (sortableInstance) {
        sortableInstance.destroy();
        sortableInstance = null;
      }
      container.innerHTML = '';
      container.classList.remove('sortable-list-container');
      internalList = [];
    },

    /** Gets the underlying SortableJS instance for advanced manipulation (use with caution). */
    getSortableInstance: (): Sortable | null => sortableInstance,
  };

  return api;
}
