import { FC, SelectHTMLAttributes, useMemo } from 'react';

export interface STSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /**
   * Custom class name(s) to append or replace the default 'text_pole' class.
   */
  className?: string;
  /**
   * If set to true, the default 'text_pole' class will not be applied.
   * @default false
   */
  overrideDefaults?: boolean;
}

/**
 * A common select (dropdown) component styled for SillyTavern.
 * Applies the 'text_pole' class by default.
 */
export const STSelect: FC<STSelectProps> = ({ children, className, overrideDefaults = false, ...props }) => {
  const finalClassName = useMemo(() => {
    const classes: (string | undefined)[] = [];

    if (!overrideDefaults) {
      classes.push('text_pole');
    }

    classes.push(className);

    return classes.filter(Boolean).join(' ');
  }, [overrideDefaults, className]);

  return (
    <select className={finalClassName} {...props}>
      {children}
    </select>
  );
};
