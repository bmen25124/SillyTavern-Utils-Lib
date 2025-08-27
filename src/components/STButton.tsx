import { FC, ButtonHTMLAttributes, useMemo } from 'react';

export interface STButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Custom class name(s) to append to the default SillyTavern classes.
   * This can include utility classes or icon classes (e.g., 'fa-solid fa-plus').
   * If `overrideDefaults` is true, this class name will replace the default classes.
   */
  className?: string;

  /**
   * If set to true, the default SillyTavern classes ('menu_button', 'interactable') will NOT be applied.
   * This allows for complete control over the button's classes via the `className` prop.
   * @default false
   */
  overrideDefaults?: boolean;
}

/**
 * A common button component styled for SillyTavern.
 * It applies 'menu_button interactable' classes by default.
 * The original MyFancyButton component has been replaced with this.
 * For clarity, you may want to rename the file from `MyFancyButton.tsx` to `STButton.tsx`.
 */
export const STButton: FC<STButtonProps> = ({ children, className, overrideDefaults = false, ...props }) => {
  const finalClassName = useMemo(() => {
    const classes: (string | undefined)[] = [];

    if (!overrideDefaults) {
      classes.push('menu_button', 'interactable');
    }

    classes.push(className);

    return classes.filter(Boolean).join(' ');
  }, [overrideDefaults, className]);

  return (
    <button className={finalClassName} {...props}>
      {children}
    </button>
  );
};
