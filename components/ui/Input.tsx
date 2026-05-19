import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  inputSize?: 'sm' | 'md' | 'lg';
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, inputSize = 'md', ...props }, ref) => {
    const sizeStyles = {
      sm: 'text-[13px] py-2 px-3',
      md: '',
      lg: 'input-lg',
    };

    const styles = [
      'input',
      sizeStyles[inputSize],
      error ? 'border-error ring-1 ring-error/20' : '',
      className,
    ].filter(Boolean).join(' ');

    return <input ref={ref} className={styles} {...props} />;
  }
);

Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    const styles = [
      'input min-h-[100px] resize-y',
      error ? 'border-error ring-1 ring-error/20' : '',
      className,
    ].join(' ');

    return <textarea ref={ref} className={styles} {...props} />;
  }
);

Textarea.displayName = 'Textarea';
