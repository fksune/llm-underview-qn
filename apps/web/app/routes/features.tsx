import { useNavigate } from "react-router";
import { ALL_FLAGS, type FeatureFlag, useAllFlags, useFeatureToggle } from "~/lib/features";

const LABELS: Record<FeatureFlag, { name: string; desc: string }> = {
  darkMode: { name: "Dark Mode", desc: "Toggle between light and dark color scheme" },
  filterPills: { name: "Filter Pills", desc: "Show sentiment filter buttons above the feedback list" },
  dateSeparators: { name: "Date Separators", desc: "Group feedbacks by date with visual separators" },
};

export default function FeaturesPage() {
  const flags = useAllFlags();
  const toggle = useFeatureToggle();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Feature Flags</h1>
          <button
            onClick={() => navigate("/dashboard")}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
          >
            &larr; Back to Dashboard
          </button>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-3">
        {ALL_FLAGS.map((flag) => {
          const enabled = flags.has(flag);
          return (
            <div
              key={flag}
              className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {LABELS[flag].name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {LABELS[flag].desc}
                </p>
              </div>
              <button
                onClick={() => toggle(flag)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  enabled ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enabled ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </main>
    </div>
  );
}
