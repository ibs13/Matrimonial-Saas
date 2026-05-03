import type { MatchLevel } from '@/types';

const LEVEL_STYLES: Record<MatchLevel, string> = {
  Low:       'bg-gray-100 text-gray-600',
  Fair:      'bg-yellow-100 text-yellow-700',
  Good:      'bg-blue-100 text-blue-700',
  Great:     'bg-green-100 text-green-700',
  Excellent: 'bg-purple-100 text-purple-700',
};

const LEVEL_LABELS: Record<MatchLevel, string> = {
  Low:       'Low match',
  Fair:      'Fair match',
  Good:      'Good match',
  Great:     'Great match',
  Excellent: 'Excellent match',
};

export default function MatchBadge({
  score,
  level,
  size = 'md',
}: {
  score: number;
  level: MatchLevel;
  size?: 'sm' | 'md';
}) {
  const style = LEVEL_STYLES[level] ?? LEVEL_STYLES.Low;
  const label = LEVEL_LABELS[level] ?? level;

  if (size === 'sm') {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${style}`}>
        {score}% · {label}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${style}`}>
      <span className="text-base">💘</span>
      {score}% · {label}
    </span>
  );
}
