import React, { useEffect, useState } from 'react';

interface ImagePreviewProps {
  date: string;
  difficulty: string;
  streak?: number;
  isSolved?: boolean;
  onLoaded?: (dataUrl: string) => void;
}

export default function ImagePreview({ date, difficulty, streak = 0, isSolved = false, onLoaded }: ImagePreviewProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchImage = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/share/image?date=${date}&difficulty=${difficulty}&streak=${streak}&isSolved=${isSolved}`);
        const data = await res.json();
        if (active && data.image_data_url) {
          setDataUrl(data.image_data_url);
          onLoaded?.(data.image_data_url);
        }
      } catch (err) {
        console.error('Failed to load image preview:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchImage();
    return () => { active = false; };
  }, [date, difficulty, streak, isSolved, onLoaded]);

  return (
    <div className="w-full aspect-square rounded-xl border border-border bg-bg-muted overflow-hidden flex items-center justify-center">
      {loading ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-5 h-5 border-2 border-text-4 border-t-text-2 rounded-full animate-spin" />
          <span className="text-xs text-text-3">Generating…</span>
        </div>
      ) : dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt="Challenge preview" className="w-full h-full object-cover" />
      ) : (
        <span className="text-sm text-text-3">Preview unavailable</span>
      )}
    </div>
  );
}
