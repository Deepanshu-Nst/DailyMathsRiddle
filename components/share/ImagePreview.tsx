import React, { useEffect, useState } from 'react';

interface ImagePreviewProps {
  date: string;
  difficulty: string;
  onLoaded?: (dataUrl: string) => void;
}

export default function ImagePreview({ date, difficulty, onLoaded }: ImagePreviewProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchImage = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/share/image?date=${date}&difficulty=${difficulty}`);
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
  }, [date, difficulty, onLoaded]);

  return (
    <div className="w-full aspect-square bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden flex items-center justify-center relative">
      {loading ? (
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
          <span className="text-xs text-zinc-500 font-medium">Generating image...</span>
        </div>
      ) : dataUrl ? (
        <img src={dataUrl} alt="Riddle preview" className="w-full h-full object-cover" />
      ) : (
        <span className="text-sm text-red-400">Preview unavailable</span>
      )}
    </div>
  );
}
