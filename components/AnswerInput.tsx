'use client';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface AnswerInputProps {
  value: string;
  onChange: (val: string) => void;
  onSubmit: () => void;
  status: 'idle' | 'correct' | 'incorrect';
  disabled?: boolean;
}

export default function AnswerInput({ value, onChange, onSubmit, status, disabled }: AnswerInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !disabled && value.trim()) {
      onSubmit();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your solution..."
          disabled={disabled}
          error={status === 'incorrect'}
          className={status === 'correct' ? 'border-success ring-1 ring-success/20 text-success' : ''}
        />
        <Button 
          variant="primary"
          size="lg"
          onClick={onSubmit} 
          disabled={disabled || !value.trim()}
          className="shrink-0 px-8"
        >
          Submit
        </Button>
      </div>
      <div className="h-6">
        {status === 'incorrect' && (
          <p className="text-xs font-semibold text-error anim-shake">
            That answer is incorrect. Try again.
          </p>
        )}
        {status === 'correct' && (
          <p className="text-xs font-semibold text-success anim-fade-up">
            Correct.
          </p>
        )}
      </div>
    </div>
  );
}
