import React from 'react';
import styles from './Checkbox.module.css';

interface CheckboxProps {
  checked?: boolean;
  label?: string;
  color?: 'primary' | 'blue' | 'red' | 'purple';
  disabled?: boolean;
  className?: string;
  onClick?: (value: boolean) => void;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked = false,
  label,
  color = 'primary',
  disabled,
  className,
  onClick,
  ...props
}) => {
  const toggle = () => {
    if (!disabled && onClick) onClick(!checked);
  };

  return (
    <div className={`${styles.checkbox} ${className || ''}`} {...props}>
      <div
        className={`${styles['checkbox-inner']} ${checked ? styles.checked : ''} ${disabled ? styles.disabled : ''} ${styles[color]}`}
        onClick={toggle}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggle();
          }
        }}
        role="checkbox"
        aria-checked={checked}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
      />
      {label && (
        <span className={styles['checkbox-label']} onClick={toggle}>
          {label}
        </span>
      )}
    </div>
  );
};
