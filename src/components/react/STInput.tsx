import React, { FC, InputHTMLAttributes, useMemo } from 'react';

export interface STInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /**
   * For checkboxes, this text will be displayed inside the associated label.
   */
  label?: string | React.ReactNode;
  /**
   * Custom class name(s) to append or replace the default SillyTavern classes.
   */
  className?: string;
  /**
   * If set to true, default SillyTavern classes will not be applied.
   * For text/number inputs, this removes 'text_pole'.
   * For checkboxes, this removes 'checkbox_label' from the wrapping label.
   * @default false
   */
  overrideDefaults?: boolean;
}

/**
 * A common input component styled for SillyTavern.
 * - Applies 'text_pole' class to text, number, etc.
 * - Wraps checkboxes in a 'checkbox_label' label.
 */
export const STInput: FC<STInputProps> = ({ label, className, overrideDefaults = false, type = 'text', ...props }) => {
  const finalClassName = useMemo(() => {
    const classes: (string | undefined)[] = [];

    if (!overrideDefaults) {
      if (type === 'text' || type === 'number' || type === 'password' || type === 'email' || type === 'search') {
        classes.push('text_pole');
      }
    }

    classes.push(className);

    return classes.filter(Boolean).join(' ');
  }, [overrideDefaults, className, type]);

  if (type === 'checkbox') {
    // For checkboxes, className applies to the label wrapper.
    const labelClassName = overrideDefaults ? className : `checkbox_label ${className ?? ''}`.trim();

    return (
      <label className={labelClassName}>
        <input type="checkbox" {...props} />
        {label && <span>{label}</span>}
      </label>
    );
  }

  return <input type={type} className={finalClassName} {...props} />;
};
