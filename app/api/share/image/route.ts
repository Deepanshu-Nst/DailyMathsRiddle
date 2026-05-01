import { NextRequest, NextResponse } from 'next/server';
import { getRiddleByDateAndDifficulty } from '@/lib/riddle-bank';
import { generateRiddleImage } from '@/lib/share/imageGenerator';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  const difficulty = searchParams.get('difficulty') ?? 'medium';

  if (!date) {
    return NextResponse.json({ error: 'Date is required' }, { status: 400 });
  }

  try {
    const riddle = getRiddleByDateAndDifficulty(date, difficulty);

    const imageDataUrl = generateRiddleImage({
      question: riddle.question,
      difficulty: riddle.difficulty,
      category: riddle.category,
      date,
    });

    return NextResponse.json({
      image_data_url: imageDataUrl,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Image generation failed', detail: msg }, { status: 500 });
  }
}
