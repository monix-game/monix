import React from 'react';
import styles from './Slider.module.css';

interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  min: number;
  max: number;
  step?: number;
  value: number;
  onValueChange: (value: number) => void;
}

export const Slider: React.FC<SliderProps> = ({
  min,
  max,
  step,
  value,
  onValueChange,
  ...props
}) => {
  return (
    <div className={styles['slider-container']}>
      <span className={styles['slider-label']}>{Math.round((value / max) * 100)}%</span>
      <input
        type="range"
        className={styles.slider}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onValueChange(Number(e.target.value))}
        {...props}
      />
    </div>
  );
};
