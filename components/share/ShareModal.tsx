'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Riddle } from '@/types';
import ImagePreview from './ImagePreview';
import CaptionEditor from './CaptionEditor';
import {
  PLATFORM_LIMITS,
  generateLinkedInCaption,
  generateWhatsAppCaption
} from '@/lib/share/generateCaption';
import {
  getLinkedInShareUrl,
  getWhatsAppShareUrl
} from '@/lib/share/getShareUrl';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://daily-maths-riddle.vercel.app";

interface ShareModalProps {
  riddle: Riddle;
  date: string;
  onClose: () => void;
}

type Platform = 'linkedin' | 'whatsapp' | 'instagram';

export default function ShareModal({ riddle, date, onClose }: ShareModalProps) {
  const [platform, setPlatform] = useState<Platform>('linkedin');
  const [captions, setCaptions] = useState<Record<Platform, string>>({
    linkedin: '',
    whatsapp: '',
    instagram: '',
  });
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const shareUrl = `${BASE_URL}/riddle/${date}?difficulty=${riddle.difficulty}`;

  useEffect(() => {
    if (shareUrl) {
      const input = { riddle, date, url: shareUrl };
      const li = generateLinkedInCaption(input);
      setCaptions({
        linkedin: li,
        whatsapp: generateWhatsAppCaption(input),
        instagram: li, // reuse linkedin for instagram
      });
    }
  }, [riddle, date, shareUrl]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleShare = async (p: Platform) => {
    const text = captions[p];
    
    if (p === 'instagram') {
      // Instagram flow: Download image + Copy caption
      if (imageDataUrl) {
        try {
          const a = document.createElement('a');
          a.href = imageDataUrl;
          a.download = `advaitai-riddle-${date}.svg`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          await navigator.clipboard.writeText(text);
          handleToast('Image downloaded + caption copied. Post on Instagram.');
        } catch (e) {
          handleToast('Failed to download image or copy caption.');
        }
      } else {
        handleToast('Please wait for image to generate.');
      }
      return;
    }

    if (p === 'linkedin') {
      try {
        await navigator.clipboard.writeText(text);
        handleToast('Caption copied. Paste it on LinkedIn.');
      } catch (e) {
        handleToast('Failed to copy caption. Proceeding anyway.');
      }
      const url = getLinkedInShareUrl(shareUrl);
      setTimeout(() => {
        window.open(url, '_blank', 'noopener,noreferrer');
      }, 800);
      return;
    }

    if (p === 'whatsapp') {
      const url = getWhatsAppShareUrl(text, shareUrl);
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
  };

  const currentMaxChars = PLATFORM_LIMITS[platform === 'instagram' ? 'linkedin' : platform];

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 100 }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 6 }}
        transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
        className="modal-card w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col md:flex-row relative shadow-2xl"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 900, minHeight: 500 }}
      >
        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: -20, x: '-50%' }}
              className="absolute top-4 left-1/2 bg-zinc-800 text-zinc-100 px-5 py-2.5 rounded-full text-sm font-medium z-50 border border-zinc-700 shadow-xl"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 z-10 text-zinc-500 hover:text-white transition-colors bg-zinc-900/80 hover:bg-zinc-800 rounded-full p-2 border border-zinc-800 hover:border-zinc-700"
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>

        {/* LEFT: Riddle Context */}
        <div className="w-full md:w-[45%] p-8 md:p-10 border-b md:border-b-0 md:border-r border-zinc-800/60 bg-zinc-900/30 flex flex-col">
          <h2 className="font-display text-2xl font-bold mb-8 text-zinc-100">Share your ritual</h2>
          
          <div className="flex-1 flex flex-col">
            <span className="text-[11px] font-semibold tracking-widest text-zinc-500 uppercase mb-3 block">
              Riddle Preview
            </span>
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6 flex flex-col gap-4 shadow-inner">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-zinc-800/80 rounded-md text-zinc-300 border border-zinc-700/50">
                  {riddle.category}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 bg-zinc-800/80 rounded-md text-zinc-400 border border-zinc-700/50">
                  {riddle.difficulty}
                </span>
              </div>
              <p className="text-zinc-200 text-[15px] leading-relaxed font-medium">
                {riddle.question}
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT: Platform Settings & Action */}
        <div className="flex-1 p-8 md:p-10 bg-zinc-950 flex flex-col relative">
          
          {/* Platform Tabs */}
          <div className="flex gap-1 p-1.5 bg-zinc-900/80 rounded-xl mb-8 border border-zinc-800/80 w-full max-w-sm mr-auto">
            {(['linkedin', 'whatsapp', 'instagram'] as Platform[]).map(p => (
              <button
                key={p}
                onClick={() => setPlatform(p)}
                className={`flex-1 py-2 text-xs font-semibold tracking-wide rounded-lg capitalize transition-all duration-200 ${
                  platform === p 
                    ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700' 
                    : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Content Layout */}
          <div className="flex flex-col sm:flex-row gap-6 mb-8 flex-1">
            {/* Asset Preview */}
            <div className="w-full sm:w-[140px] flex-shrink-0">
              <span className="text-[11px] font-semibold tracking-widest text-zinc-500 uppercase mb-3 block">
                Asset
              </span>
              <div className="rounded-xl overflow-hidden shadow-2xl border border-zinc-800 bg-zinc-900 aspect-square">
                <ImagePreview 
                  date={date} 
                  difficulty={riddle.difficulty} 
                  onLoaded={setImageDataUrl} 
                />
              </div>
            </div>

            {/* Caption Editor */}
            <div className="flex-1 flex flex-col">
              <CaptionEditor
                value={captions[platform]}
                onChange={(val) => setCaptions({ ...captions, [platform]: val })}
                platform={platform}
                maxChars={currentMaxChars}
              />
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={() => handleShare(platform)}
            className="w-full mt-auto py-4 bg-zinc-100 text-zinc-950 rounded-xl font-bold text-[15px] tracking-wide hover:bg-white hover:scale-[1.01] active:scale-[0.99] transition-all shadow-[0_0_20px_rgba(255,255,255,0.05)]"
          >
            {platform === 'instagram' ? 'Download Image & Copy Caption' : `Share to ${platform.charAt(0).toUpperCase() + platform.slice(1)}`}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
