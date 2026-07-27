import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { fetchInsights, getWebSocketUrl } from "~/lib/api";
import { useAuth } from "~/lib/auth";
import { useFeature, useFeatureToggle } from "~/lib/features";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";

interface Feedback {
  id: string;
  raw_text: string;
  sentiment: string;
  key_items: string[];
  requires_action: boolean;
  created_at: string;
}

const COLORS = { Positive: "#22c55e", Neutral: "#eab308", Negative: "#ef4444" };
type Sentiment = "Positive" | "Neutral" | "Negative" | null;

function computeStats(feedbacks: Feedback[]) {
  const total = feedbacks.length;
  const positive = feedbacks.filter((f) => f.sentiment === "Positive").length;
  const negative = feedbacks.filter((f) => f.sentiment === "Negative").length;
  const neutral = feedbacks.filter((f) => f.sentiment === "Neutral").length;
  const urgent = feedbacks.filter((f) => f.requires_action).length;

  const pieData = [
    { name: "Positive", value: positive },
    { name: "Neutral", value: neutral },
    { name: "Negative", value: negative },
  ].filter((d) => d.value > 0);

  const byDate: Record<string, { date: string; Positive: number; Negative: number; Neutral: number }> = {};
  for (const fb of feedbacks) {
    const key = new Date(fb.created_at).toLocaleDateString();
    if (!byDate[key]) byDate[key] = { date: key, Positive: 0, Negative: 0, Neutral: 0 };
    byDate[key][fb.sentiment as "Positive" | "Negative" | "Neutral"]++;
  }
  const lineData = Object.values(byDate).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return { total, positive, negative, neutral, urgent, pieData, lineData };
}

function formatDateSeparator(dateStr: string): string | null {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return null;
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";

  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function groupByDate(feedbacks: Feedback[]): { label: string | null; items: Feedback[] }[] {
  const groups: Record<string, Feedback[]> = {};
  for (const fb of feedbacks) {
    const key = new Date(fb.created_at).toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(fb);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
    .map(([dateKey, items]) => ({
      label: formatDateSeparator(dateKey),
      items,
    }));
}

export default function DashboardPage() {
  const { token, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [filter, setFilter] = useState<Sentiment>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const filterPillsEnabled = useFeature("filterPills");
  const dateSeparatorsEnabled = useFeature("dateSeparators");
  const darkModeEnabled = useFeature("darkMode");
  const toggleFeature = useFeatureToggle();

  useEffect(() => {
    if (!isAuthenticated || !token) {
      navigate("/login");
      return;
    }

    fetchInsights(token)
      .then(setFeedbacks)
      .catch(() => navigate("/login"));

    const ws = new WebSocket(getWebSocketUrl(token));
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setFeedbacks((prev) => [data, ...prev]);
      } catch {
        // ignore
      }
    };
    ws.onclose = () => {
      wsRef.current = null;
    };
    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [isAuthenticated, token, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!isAuthenticated) return null;

  const stats = computeStats(feedbacks);

  const filtered = filter
    ? feedbacks.filter((f) => f.sentiment === filter)
    : feedbacks;

  const grouped = useMemo(
    () => (dateSeparatorsEnabled ? groupByDate(filtered) : [{ label: null, items: filtered }]),
    [filtered, dateSeparatorsEnabled]
  );

  const FILLS = ["#22c55e", "#eab308", "#ef4444"];

  const sentimentColor = (s: string) => {
    switch (s) {
      case "Positive":
        return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
      case "Negative":
        return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
      default:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300";
    }
  };

  const chartTextColor = darkModeEnabled ? "#9ca3af" : "#6b7280";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 transition-colors">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Feedback Dashboard</h1>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/features")}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
            >
              Features
            </button>
            {darkModeEnabled && (
              <button
                onClick={() => toggleFeature("darkMode")}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                title="Toggle dark mode"
              >
                {darkModeEnabled ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            )}
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {feedbacks.length === 0 && (
          <p className="text-gray-400 dark:text-gray-600 text-center py-12">No feedback yet. Submit a review to see it here.</p>
        )}

        {feedbacks.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm transition-colors">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Reviews</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{stats.total}</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm transition-colors">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Positive</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.positive}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{stats.total ? Math.round(stats.positive / stats.total * 100) : 0}% of total</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm transition-colors">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Negative</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.negative}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{stats.total ? Math.round(stats.negative / stats.total * 100) : 0}% of total</p>
              </div>
              <div className={`rounded-2xl border p-5 shadow-sm transition-colors ${stats.urgent > 0 ? "bg-red-50 dark:bg-red-950 border-red-300 dark:border-red-800" : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800"}`}>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Urgent Action</p>
                <p className={`text-3xl font-bold mt-1 ${stats.urgent > 0 ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}`}>
                  {stats.urgent}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">requires immediate attention</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm transition-colors">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Sentiment Trend Over Time</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={stats.lineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={darkModeEnabled ? "#374151" : "#e5e7eb"} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: chartTextColor }} />
                    <YAxis tick={{ fontSize: 11, fill: chartTextColor }} allowDecimals={false} />
                    <Tooltip contentStyle={darkModeEnabled ? { backgroundColor: "#1f2937", border: "1px solid #374151", color: "#f3f4f6" } : undefined} />
                    <Legend iconType="circle" wrapperStyle={darkModeEnabled ? { color: "#d1d5db" } : undefined} />
                    <Line type="monotone" dataKey="Positive" stroke={COLORS.Positive} strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Neutral" stroke={COLORS.Neutral} strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Negative" stroke={COLORS.Negative} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm transition-colors">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Sentiment Breakdown</h2>
                <div className="flex items-center justify-center">
                  <ResponsiveContainer width={240} height={220}>
                    <PieChart>
                      <Pie
                        data={stats.pieData}
                        cx="50%" cy="50%"
                        innerRadius={50}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {stats.pieData.map((entry) => (
                          <Cell key={entry.name} fill={COLORS[entry.name as keyof typeof COLORS]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={darkModeEnabled ? { backgroundColor: "#1f2937", border: "1px solid #374151", color: "#f3f4f6" } : undefined} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 text-sm">
                    {stats.pieData.map((d) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[d.name as keyof typeof COLORS] }} />
                        <span className="text-gray-600 dark:text-gray-400">{d.name}</span>
                        <span className="font-semibold text-gray-900 dark:text-white">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {filterPillsEnabled && feedbacks.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {([null, "Positive", "Neutral", "Negative"] as const).map((s) => (
              <button
                key={s ?? "all"}
                onClick={() => setFilter(s)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  filter === s
                    ? "bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white"
                    : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
                }`}
              >
                {s ?? "All"}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.label ?? "today"}>
              {dateSeparatorsEnabled && group.label && (
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {group.label}
                  </span>
                  <hr className="flex-1 border-gray-200 dark:border-gray-800" />
                </div>
              )}
              <div className="space-y-4">
                {group.items.map((fb) => (
                  <div
                    key={fb.id}
                    className={`rounded-2xl border p-5 bg-white dark:bg-gray-900 shadow-sm transition-colors ${
                      fb.requires_action ? "border-red-400 ring-1 ring-red-200 dark:ring-red-900" : "border-gray-200 dark:border-gray-800"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap flex-1">{fb.raw_text}</p>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${sentimentColor(fb.sentiment)}`}>
                          {fb.sentiment}
                        </span>
                        {fb.requires_action && (
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-600 text-white animate-pulse">
                            URGENT
                          </span>
                        )}
                      </div>
                    </div>
                    {fb.key_items.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {fb.key_items.map((item, i) => (
                          <span key={i} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                            {item}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="mt-2 text-[10px] text-gray-400 dark:text-gray-500">
                      {new Date(fb.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
