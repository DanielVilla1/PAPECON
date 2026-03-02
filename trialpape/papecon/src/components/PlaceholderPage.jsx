/**
 * Generic placeholder page used for features that are not yet implemented.
 * Shows the page title and a "coming soon" message styled to match the app theme.
 */
export default function PlaceholderPage({ title, description }) {
  return (
    <div className="space-y-0">
      {/* ── Page Hero Banner ──────────────────────── */}
      <section className="relative bg-primary text-white overflow-hidden pb-12">
        <div className="max-w-7xl mx-auto px-6 py-14">
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">{title}</h1>
          <p className="mt-2 text-white/70 text-lg max-w-xl">
            {description || "This feature is under development."}
          </p>
        </div>
        <div className="absolute bottom-0 left-0 w-full leading-none">
          <svg viewBox="0 0 1440 200" className="w-full h-auto" preserveAspectRatio="none">
            <path d="M0,100 C360,200 1080,0 1440,100 L1440,200 L0,200 Z" fill="#F8F9FA" />
          </svg>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="bg-white rounded-xl shadow-md p-10 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mb-5">
            <svg className="w-10 h-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <p className="text-xl font-bold text-primary">Coming Soon</p>
          <p className="text-sm text-gray-500 mt-2">This page will be built in a future sprint.</p>
        </div>
      </div>
    </div>
  );
}
