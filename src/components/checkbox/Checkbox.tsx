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
  return (
    <div className={`${styles.checkbox} ${className || ''}`} {...props}>
      <div
        className={`${styles['checkbox-inner']} ${checked ? styles.checked : ''} ${disabled ? styles.disabled : ''} ${styles[color]}`}
        onClick={() => {
          if (disabled) return;
          if (onClick) onClick(!checked);
        }}
      />
      {label && <span className={styles['checkbox-label']}>{label}</span>}
    </div>
  );
};
