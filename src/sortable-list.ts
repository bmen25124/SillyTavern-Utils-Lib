import Sortable, { SortableEvent } from 'sortablejs';

// --- Interfaces ---

export interface SortableListItemData {
  id: string; // Unique identifier for the item
  label: string;
  enabled: boolean;
  canDelete?: boolean; // Defaults to true if showDeleteButton is true
  canToggle?: boolean; // Defaults to true if showToggleButton is true
}

export interface SortableListOptions {
  initialList?: SortableListItemData[];
  showToggleButton?: boolean; // Default: false
  showDeleteButton?: boolean; // Default: false
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
  let internalList: SortableListItemData[] = [...(options.initialList || [])];
  let sortableInstance: Sortable | null = null;

  // --- Clear Container & Apply Base Styles ---
  container.innerHTML = '';
  container.classList.add('sortable-list-container');
  // Add styles if needed, e.g., container.style.border = '1px solid #ccc';

  const listElement = document.createElement('ul'); // Use UL for semantic list
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
    listItem.dataset.id = itemData.id; // Store ID on the element

    Object.assign(listItem.style, {
      display: 'flex',
      alignItems: 'center',
      padding: '8px 12px',
      borderBottom: '1px solid var(--border-color, #eee)',
      backgroundColor: 'var(--bg-color-secondary, #fff)',
      color: 'var(--text-color, #333)',
      marginBottom: '2px', // Small gap between items
    });

    // 1. Drag Handle
    const dragHandle = document.createElement('span');
    dragHandle.className = 'drag-handle';
    dragHandle.innerHTML = '<i class="fas fa-bars"></i>'; // Font Awesome grip icon
    Object.assign(dragHandle.style, {
      cursor: 'grab',
      marginRight: '10px',
      color: 'var(--text-color-secondary, #aaa)',
    });
    listItem.appendChild(dragHandle);

    // 2. Label Container (allows custom rendering)
    const labelContainer = document.createElement('span');
    labelContainer.className = 'item-label';
    labelContainer.style.flexGrow = '1'; // Take up remaining space
    labelContainer.style.marginRight = '10px';
    if (options.renderLabel) {
      options.renderLabel(labelContainer, itemData);
    } else {
      labelContainer.textContent = itemData.label; // Default rendering
    }
    listItem.appendChild(labelContainer);

    // 3. Toggle Button (Optional)
    const canToggle = itemData.canToggle ?? true;
    if (showToggleButton && canToggle) {
      const toggleButton = document.createElement('span');
      toggleButton.className = 'toggle-button';
      toggleButton.innerHTML = `<i class="fas ${itemData.enabled ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>`;
      Object.assign(toggleButton.style, {
        cursor: 'pointer',
        marginRight: '10px',
        color: itemData.enabled ? 'var(--accent-color, #4CAF50)' : 'var(--text-color-secondary, #aaa)',
        fontSize: '1.2em', // Make toggle slightly larger
      });
      toggleButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent interfering with drag
        handleToggle(itemData.id);
      });
      listItem.appendChild(toggleButton);
    } else if (showToggleButton && !canToggle) {
      // Add a placeholder or disabled indicator if needed
      const placeholder = document.createElement('span');
      placeholder.style.width = '24px'; // Approximate width of button
      placeholder.style.marginRight = '10px';
      listItem.appendChild(placeholder);
    }

    // 4. Delete Button (Optional)
    const canDelete = itemData.canDelete ?? true;
    if (showDeleteButton && canDelete) {
      const deleteButton = document.createElement('span');
      deleteButton.className = 'delete-button';
      deleteButton.innerHTML = '<i class="fas fa-trash-can"></i>'; // Font Awesome trash icon
      Object.assign(deleteButton.style, {
        cursor: 'pointer',
        color: 'var(--error-color, #f44336)',
      });
      deleteButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent interfering with drag
        handleDelete(itemData.id);
      });
      listItem.appendChild(deleteButton);
    } else if (showDeleteButton && !canDelete) {
      // Add a placeholder or disabled indicator if needed
      const placeholder = document.createElement('span');
      placeholder.style.width = '18px'; // Approximate width of button
      listItem.appendChild(placeholder);
    }

    // Apply enabled/disabled visual state to the whole item (optional)
    if (showToggleButton) {
      listItem.style.opacity = itemData.enabled ? '1' : '0.6';
    }

    return listItem;
  };

  // Function to render the entire list
  const renderList = () => {
    listElement.innerHTML = ''; // Clear existing items
    internalList.forEach((itemData) => {
      const itemElement = createItemElement(itemData);
      listElement.appendChild(itemElement);
    });
    // Re-initialize SortableJS if it was already active
    // (needed if items are added/removed externally)
    // initializeSortable(); // Consider if needed based on API usage
  };

  // Function to update a single item's visuals (more efficient than full re-render)
  const updateItemVisuals = (itemId: string) => {
    const itemData = getItemData(itemId);
    const itemElement = getItemElement(itemId);
    if (!itemData || !itemElement) return;

    // Update Label (if custom renderer used, it might need full re-render or specific update logic)
    if (!options.renderLabel) {
      const labelEl = itemElement.querySelector<HTMLElement>('.item-label');
      if (labelEl) labelEl.textContent = itemData.label;
    } else {
      // For custom renderers, a targeted update or full item re-render might be safer
      // For simplicity here, we might just re-render the single item:
      const newItemElement = createItemElement(itemData);
      itemElement.replaceWith(newItemElement);
      return; // Exit early as the element reference is now invalid
    }

    // Update Toggle Button
    const toggleButton = itemElement.querySelector<HTMLElement>('.toggle-button i');
    if (toggleButton && showToggleButton && (itemData.canToggle ?? true)) {
      toggleButton.className = `fas ${itemData.enabled ? 'fa-toggle-on' : 'fa-toggle-off'}`;
      toggleButton.parentElement!.style.color = itemData.enabled
        ? 'var(--accent-color, #4CAF50)'
        : 'var(--text-color-secondary, #aaa)';
    }

    // Update Opacity
    if (showToggleButton) {
      itemElement.style.opacity = itemData.enabled ? '1' : '0.6';
    }

    // Delete button doesn't usually change state visually unless canDelete changes
  };

  // --- Event Handlers ---

  const handleToggle = async (itemId: string) => {
    const itemIndex = internalList.findIndex((item) => item.id === itemId);
    if (itemIndex === -1) return;

    const item = internalList[itemIndex];
    const newState = !item.enabled;

    // Call external handler first
    if (options.onToggle) {
      try {
        await Promise.resolve(options.onToggle(itemId, newState));
      } catch (err) {
        console.error('onToggle callback failed:', err);
        return; // Don't update UI if callback fails
      }
    }

    // Update internal state
    internalList[itemIndex] = { ...item, enabled: newState };

    // Update visuals for the specific item
    updateItemVisuals(itemId);
  };

  const handleDelete = async (itemId: string) => {
    const itemIndex = internalList.findIndex((item) => item.id === itemId);
    if (itemIndex === -1) return;

    let shouldRemove = true; // Assume removal unless callback returns false
    if (options.onDelete) {
      try {
        shouldRemove = await Promise.resolve(options.onDelete(itemId));
      } catch (err) {
        console.error('onDelete callback failed:', err);
        shouldRemove = false; // Don't remove if callback fails
      }
    }

    if (shouldRemove) {
      // Remove from internal state
      internalList.splice(itemIndex, 1);
      // Remove from DOM
      const itemElement = getItemElement(itemId);
      itemElement?.remove();
      // Optional: Notify about order change if deletion affects it significantly?
      // Usually not needed unless deletion triggers a re-sort.
    }
  };

  // --- SortableJS Initialization ---
  const initializeSortable = () => {
    if (sortableInstance) {
      sortableInstance.destroy(); // Clean up previous instance if re-initializing
    }

    const sortableOptions: Sortable.Options = {
      handle: '.drag-handle', // Restrict dragging to the handle
      animation: 150, // Animation duration
      ghostClass: 'sortable-ghost', // Class for the drop placeholder
      chosenClass: 'sortable-chosen', // Class for the chosen item
      dragClass: 'sortable-drag', // Class for the dragging item
      onEnd: (event: SortableEvent) => {
        const { oldIndex, newIndex } = event;
        if (oldIndex === undefined || newIndex === undefined || oldIndex === newIndex) {
          return; // No change in position
        }

        // Update internal array order
        const [movedItem] = internalList.splice(oldIndex, 1);
        internalList.splice(newIndex, 0, movedItem);

        // Get the new order of IDs from the data array
        const newOrderIds = internalList.map((item) => item.id);

        // Call the order change callback
        if (options.onOrderChange) {
          Promise.resolve(options.onOrderChange(newOrderIds)).catch((err) =>
            console.error('onOrderChange callback failed:', err),
          );
        }
      },
      // Merge user-provided options
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
        index === undefined || index < 0 || index > internalList.length
          ? internalList.length // Append to end if index is invalid/missing
          : index;

      internalList.splice(effectiveIndex, 0, itemData);
      // Re-render the whole list might be simplest here,
      // or insert the new element directly into the DOM at the correct position.
      renderList();
      initializeSortable(); // Sortable might need re-init after DOM changes
    },

    /** Removes an item by its ID. */
    removeItem: (itemId: string): void => {
      const itemIndex = internalList.findIndex((item) => item.id === itemId);
      if (itemIndex > -1) {
        internalList.splice(itemIndex, 1);
        const itemElement = getItemElement(itemId);
        itemElement?.remove();
        // Consider re-initializing SortableJS if necessary
      }
    },

    /** Updates the data and visuals for an existing item. */
    updateItem: (itemId: string, updates: Partial<Omit<SortableListItemData, 'id'>>): void => {
      const itemIndex = internalList.findIndex((item) => item.id === itemId);
      if (itemIndex > -1) {
        // Merge updates, ensuring not to overwrite the ID
        const currentItem = internalList[itemIndex];
        internalList[itemIndex] = { ...currentItem, ...updates, id: itemId };
        updateItemVisuals(itemId); // Update DOM efficiently
      }
    },

    /** Replaces the entire list content. */
    setList: (newListData: SortableListItemData[]): void => {
      internalList = [...newListData];
      renderList();
      initializeSortable(); // Re-initialize SortableJS
    },

    /** Destroys the SortableJS instance and removes elements. */
    destroy: (): void => {
      if (sortableInstance) {
        sortableInstance.destroy();
        sortableInstance = null;
      }
      container.innerHTML = ''; // Clear the container
      // Remove class? container.classList.remove('sortable-list-container');
      internalList = []; // Clear internal data
    },

    /** Gets the underlying SortableJS instance for advanced manipulation (use with caution). */
    getSortableInstance: (): Sortable | null => sortableInstance,
  };

  return api;
}
