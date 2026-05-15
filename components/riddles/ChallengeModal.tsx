import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { AlertTriangle, Send, CheckCircle2 } from 'lucide-react';

interface ChallengeModalProps {
  isOpen: boolean;
  onClose: () => void;
  riddleId: string;
  riddleQuestion: string;
}

export function ChallengeModal({ isOpen, onClose, riddleId }: ChallengeModalProps) {
  const [proposedAnswer, setProposedAnswer] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [proofText, setProofText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          riddleId,
          proposedAnswer,
          reasoning,
          proofText
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setProposedAnswer('');
        setReasoning('');
        setProofText('');
      }, 3000);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Dispute Answer" 
      className="max-w-lg"
    >
      {success ? (
        <div className="flex flex-col items-center text-center py-12 gap-4">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center text-success mb-2">
            <CheckCircle2 size={40} />
          </div>
          <h3 className="text-xl font-bold text-text-1">Dispute Filed Successfully</h3>
          <p className="text-sm text-text-3 max-w-xs">
            Our mathematical review team will analyze your reasoning. You&apos;ll receive a notification and bonus XP if your claim is verified.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="flex items-start gap-4 p-4 bg-warning/5 border border-warning/10 rounded-xl mb-2">
            <AlertTriangle className="text-warning shrink-0 mt-0.5" size={18} />
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-warning uppercase tracking-wider">Academic Integrity</span>
              <p className="text-xs text-text-2 leading-relaxed">
                Only file a dispute if you are mathematically certain the official answer is incorrect. Frivolous disputes may impact your reputation rank.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="label">Proposed Correct Answer</label>
            <Input
              required
              value={proposedAnswer}
              onChange={(e) => setProposedAnswer(e.target.value)}
              placeholder="What should the answer be?"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="label">Mathematical Reasoning</label>
            <Textarea
              required
              minLength={10}
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="Explain the error in logic step-by-step..."
              className="min-h-[120px]"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="label">Reference / Proof (Optional)</label>
            <Input
              value={proofText}
              onChange={(e) => setProofText(e.target.value)}
              placeholder="WolframAlpha link, theorem name, etc."
            />
          </div>

          {error && (
            <p className="text-xs font-bold text-error bg-error/5 p-3 rounded-lg border border-error/10">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-4 border-t border-border mt-2">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={onClose} 
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : (
                <>
                  <Send size={16} />
                  File Dispute
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

