import {
  CAERBANNOG_DEFAULTS,
  selectBestCaerbannogScoresByUniqueName,
  type CaerbannogLeaderboardScore,
} from './leaderboard';

export type CaerbannogStoredScore = CaerbannogLeaderboardScore & { id?: string };

export const readCaerbannogLocalScores = (): CaerbannogStoredScore[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(CAERBANNOG_DEFAULTS.localStorageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) {
      return selectBestCaerbannogScoresByUniqueName(parsed as CaerbannogStoredScore[]);
    }
  } catch {
    return [];
  }
  return [];
};

export const writeCaerbannogLocalScore = (score: CaerbannogStoredScore): CaerbannogStoredScore[] => {
  const next = selectBestCaerbannogScoresByUniqueName([...readCaerbannogLocalScores(), score]);
  try {
    window.localStorage.setItem(CAERBANNOG_DEFAULTS.localStorageKey, JSON.stringify(next));
  } catch {
    // Local scores are optional; callers can still show the in-memory row.
  }
  return next;
};

const readApiError = async (response: Response, fallback: string) => {
  try {
    const body = await response.json();
    if (typeof body.error === 'string' && body.error.trim()) {
      return body.error;
    }
  } catch {
    // Keep the status fallback when the body is not JSON.
  }
  return fallback;
};

export const submitCaerbannogScoreToCloud = async (
  entry: CaerbannogLeaderboardScore,
): Promise<{ scores: CaerbannogStoredScore[] }> => {
  const runResponse = await fetch('/api/caerbannog/run', {
    method: 'POST',
    headers: { accept: 'application/json' },
  });
  if (!runResponse.ok) {
    throw new Error(await readApiError(runResponse, `Caerbannog run request failed: ${runResponse.status}`));
  }
  const runBody = await runResponse.json();
  const runId = typeof runBody.runId === 'string' ? runBody.runId : '';
  if (!runId) {
    throw new Error('Caerbannog run token was missing.');
  }

  const response = await fetch('/api/caerbannog/leaderboard', {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({
      runId,
      name: entry.name,
      score: entry.score,
      wave: entry.wave,
      enemiesSlain: entry.enemiesSlain,
      goldCollected: entry.goldCollected,
    }),
  });
  if (!response.ok) {
    throw new Error(await readApiError(response, `Caerbannog score submit failed: ${response.status}`));
  }
  const body = await response.json();
  const scores = Array.isArray(body.scores) ? body.scores : [];
  return { scores };
};
