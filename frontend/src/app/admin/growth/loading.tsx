export default function GrowthLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-64 bg-surface-100 rounded-xl animate-pulse" />
      <div className="h-32 bg-gradient-to-r from-surface-100 to-surface-200 rounded-2xl animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-4 h-24 animate-pulse bg-surface-50" />
        ))}
      </div>
      <div className="card p-5 h-48 animate-pulse bg-surface-50" />
    </div>
  );
}
