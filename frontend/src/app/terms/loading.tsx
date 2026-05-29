export default function TermsLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-surface-100 rounded-xl" />
      <div className="h-4 w-32 bg-surface-100 rounded-xl" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="h-5 w-56 bg-surface-100 rounded-xl" />
          <div className="h-4 w-full bg-surface-100 rounded-xl" />
          <div className="h-4 w-5/6 bg-surface-100 rounded-xl" />
          <div className="h-4 w-4/6 bg-surface-100 rounded-xl" />
        </div>
      ))}
    </div>
  );
}
