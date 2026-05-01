import React from 'react';

interface CaptionEditorProps {
  value: string;
  onChange: (val: string) => void;
  platform: 'linkedin' | 'whatsapp' | 'instagram';
  maxChars: number;
}

export default function CaptionEditor({ value, onChange, platform, maxChars }: CaptionEditorProps) {
  const charsLeft = maxChars - value.length;
  const isOverLimit = charsLeft < 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center px-1">
        <span className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
          {platform} Caption
        </span>
        <span className={`text-xs font-mono ${isOverLimit ? 'text-red-400' : 'text-zinc-500'}`}>
          {charsLeft}
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full h-32 bg-zinc-900/50 border ${isOverLimit ? 'border-red-500/50 focus:border-red-500' : 'border-zinc-800 focus:border-zinc-600'} rounded-xl p-3 text-sm text-zinc-300 resize-none outline-none transition-colors`}
        placeholder="Write your caption here..."
      />
    </div>
  );
}
