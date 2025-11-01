import { FC, TextareaHTMLAttributes, useMemo } from 'react';

export interface STTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /**
   * Custom class name(s) to append or replace the default SillyTavern classes.
   */
  className?: string;
  /**
   * If set to true, the default 'text_pole textarea_compact' classes will not be applied.
   * @default false
   */
  overrideDefaults?: boolean;
}

/**
 * A common textarea component styled for SillyTavern.
 * Applies 'text_pole textarea_compact' classes by default.
 */
export const STTextarea: FC<STTextareaProps> = ({ children, className, overrideDefaults = false, ...props }) => {
  const finalClassName = useMemo(() => {
    const classes: (string | undefined)[] = [];

    if (!overrideDefaults) {
      classes.push('text_pole', 'textarea_compact');
    }

    classes.push(className);

    return classes.filter(Boolean).join(' ');
  }, [overrideDefaults, className]);

  return (
    <textarea className={finalClassName} {...props}>
      {children}
    </textarea>
  );
};
