import { useCallback, useState } from 'react';
import { buildCaerbannogScoreEntryFromManualInput } from '../../../lib/caerbannog/leaderboard';
import {
  readCaerbannogLocalScores,
  submitCaerbannogScoreToCloud,
  writeCaerbannogLocalScore,
  type CaerbannogStoredScore,
} from '../../../lib/caerbannog/localLeaderboard';

type PanelVariant = 'compact' | 'stacked';

export default function CaerbannogScoreSubmitPanel({
  variant = 'compact',
  className = '',
}: {
  variant?: PanelVariant;
  className?: string;
}) {
  const [name, setName] = useState('Test Knight');
  const [score, setScore] = useState('99999');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    const built = buildCaerbannogScoreEntryFromManualInput(name, score);
    if (!built.ok) {
      setMessage(null);
      setError(built.errors[0] ?? 'Could not submit that score.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const { scores } = await submitCaerbannogScoreToCloud(built.entry);
      writeCaerbannogLocalScore(built.entry);
      const posted = scores.some(
        (row: CaerbannogStoredScore) =>
          row.name.toLocaleLowerCase() === built.entry.name.toLocaleLowerCase() &&
          row.score === built.entry.score,
      );
      setMessage(
        posted
          ? `Posted ${built.entry.name} (${built.entry.score.toLocaleString()}) to the database.`
          : `Submitted ${built.entry.name} (${built.entry.score.toLocaleString()}) to the database.`,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not submit that score to the database.');
    } finally {
      setIsSubmitting(false);
      readCaerbannogLocalScores();
    }
  }, [name, score]);

  const isCompact = variant === 'compact';

  return (
    <form
      className={`not-prose rounded-2xl border border-theme-grid bg-[color:color-mix(in_srgb,var(--surface-elevated)_96%,transparent)] p-3 shadow-[0_12px_40px_rgba(15,23,42,0.12)] backdrop-blur ${className}`}
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit();
      }}
    >
      <p className="m-0 text-[10px] font-bold uppercase tracking-[0.22em] text-[var(--text-muted)]">
        Caerbannog score submit
      </p>
      <p className="mt-1 mb-0 text-xs leading-5 text-[var(--text-muted)]">
        Sets a name and score for the hidden rabbit defense game (vectors page).
      </p>
      <div
        className={
          isCompact
            ? 'mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end'
            : 'mt-3 flex flex-col gap-2'
        }
      >
        <label className={`flex flex-col gap-1 text-xs text-[var(--text-primary)] ${isCompact ? 'min-w-[8rem] flex-1' : ''}`}>
          <span>Name</span>
          <input
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
              setMessage(null);
            }}
            maxLength={24}
            autoComplete="nickname"
            className="rounded-lg border border-[var(--grid-line)] bg-[var(--bg-primary)] px-3 py-2 text-sm outline-none focus:border-[var(--accent-blue)]"
          />
        </label>
        <label className={`flex flex-col gap-1 text-xs text-[var(--text-primary)] ${isCompact ? 'min-w-[6rem] sm:max-w-[9rem]' : ''}`}>
          <span>Score</span>
          <input
            value={score}
            onChange={(event) => {
              setScore(event.target.value);
              setError(null);
              setMessage(null);
            }}
            inputMode="numeric"
            className="rounded-lg border border-[var(--grid-line)] bg-[var(--bg-primary)] px-3 py-2 text-sm outline-none focus:border-[var(--accent-blue)]"
          />
        </label>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg border border-[var(--accent-blue)] bg-[var(--accent-blue)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50 sm:shrink-0"
        >
          {isSubmitting ? 'Submitting…' : 'Submit score'}
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 mb-0 text-xs text-[var(--accent-red)]">{error}</p>
      ) : null}
      {message ? <p className="mt-2 mb-0 text-xs text-emerald-700 dark:text-emerald-300">{message}</p> : null}
    </form>
  );
}
