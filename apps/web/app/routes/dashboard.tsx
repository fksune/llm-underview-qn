import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { fetchInsights, getWebSocketUrl } from "~/lib/api";
import { useAuth } from "~/lib/auth";
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

export default function DashboardPage() {
  const { token, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

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

  const sentimentColor = (s: string) => {
    switch (s) {
      case "Positive":
        return "bg-green-100 text-green-800";
      case "Negative":
        return "bg-red-100 text-red-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Feedback Dashboard</h1>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {feedbacks.length === 0 && (
          <p className="text-gray-400 text-center py-12">No feedback yet. Submit a review to see it here.</p>
        )}

        {feedbacks.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Total Reviews</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Positive</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.positive}</p>
                <p className="text-xs text-gray-400">{stats.total ? Math.round(stats.positive / stats.total * 100) : 0}% of total</p>
              </div>
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Negative</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.negative}</p>
                <p className="text-xs text-gray-400">{stats.total ? Math.round(stats.negative / stats.total * 100) : 0}% of total</p>
              </div>
              <div className={`rounded-2xl border p-5 shadow-sm ${stats.urgent > 0 ? "bg-red-50 border-red-300" : "bg-white border-gray-200"}`}>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Urgent Action</p>
                <p className={`text-3xl font-bold mt-1 ${stats.urgent > 0 ? "text-red-600" : "text-gray-900"}`}>
                  {stats.urgent}
                </p>
                <p className="text-xs text-gray-400">requires immediate attention</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Sentiment Trend Over Time</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={stats.lineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Legend iconType="circle" />
                    <Line type="monotone" dataKey="Positive" stroke={COLORS.Positive} strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Neutral" stroke={COLORS.Neutral} strokeWidth={2} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="Negative" stroke={COLORS.Negative} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">Sentiment Breakdown</h2>
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
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 text-sm">
                    {stats.pieData.map((d) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[d.name as keyof typeof COLORS] }} />
                        <span className="text-gray-600">{d.name}</span>
                        <span className="font-semibold text-gray-900">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        <div className="space-y-4">
          {feedbacks.map((fb) => (
            <div
              key={fb.id}
              className={`rounded-2xl border p-5 bg-white shadow-sm ${
                fb.requires_action ? "border-red-400 ring-1 ring-red-200" : "border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-gray-800 whitespace-pre-wrap flex-1">{fb.raw_text}</p>
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
                    <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2 text-[10px] text-gray-400">
                {new Date(fb.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}