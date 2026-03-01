export default function CEODashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900 mb-4">CEO Dashboard</h1>
      <p className="text-gray-600 mb-6">Overview of bookings, revenue, active jobs, and outbreak risk score.</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Bookings", value: "—" },
          { label: "Revenue (PHP)", value: "—" },
          { label: "Active Jobs", value: "—" },
          { label: "Outbreak Risk", value: "—" },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-lg shadow p-5">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-2xl font-bold mt-1">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
