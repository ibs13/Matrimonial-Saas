export default function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-12 h-12' : 'w-8 h-8';
  return (
    <div
      className={`${sz} border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin`}
    />
  );
}
