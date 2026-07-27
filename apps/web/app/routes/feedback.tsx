import { useState } from "react";
import { submitFeedback } from "~/lib/api";

export default function FeedbackPage() {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSubmitting(true);
    setMessage(null);
    try {
      await submitFeedback(text);
      setMessage({ type: "success", text: "Thank you for your feedback!" });
      setText("");
    } catch {
      setMessage({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-linear-to-br from-orange-50 via-white to-yellow-50 flex flex-col">
      <div
        className="absolute top-0 left-0 min-h-screen min-w-screen opacity-15 blur-sm z-0"
        style={{ backgroundImage: "url('/feedback-bg.jpg')", backgroundSize: "cover" }}
      >
      </div>
      <div className="flex justify-end p-6 z-20">
        <a
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-orange-950 font-medium bg-amber-300 shadow-yellow-400/30 shadow-sm outline outline-amber-900/20 rounded-full px-5 py-2  hover:shadow-md transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Admin Login
        </a>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-16 z-20">
        <div className="w-full max-w-lg">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-orange-950">Share Your Experience</h1>
            <p className="text-orange-950/50 mt-2">We value your feedback — every review helps us improve</p>
          </div>

          <div className="bg-white rounded-2xl shadow-amber-400/20 shadow-lg outline outline-amber-700/5 p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="hidden text-sm font-medium text-gray-700 mb-2">Your Review</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="The pizza was amazing and the service was outstanding..."
                  rows={5}
                  className="w-full rounded-xl border border-gray-200 px-5 py-4 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent resize-none transition-all"
                />
                <p className="text-xs text-gray-400 mt-1.5 text-right">{text.length} characters</p>
              </div>

              <button
                type="submit"
                disabled={submitting || !text.trim()}
                className="w-full rounded-xl bg-linear-to-r from-orange-500 to-orange-600 px-5 py-3.5 text-sm font-semibold text-white hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-orange-800/40 transition-all"
              >
                {submitting ? (
                  <span className="inline-flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Submitting...
                  </span>
                ) : (
                  "Submit Review"
                )}
              </button>
            </form>

            {message && (
              <div
                className={`mt-5 text-sm p-4 rounded-2xl flex items-start gap-3 ${
                  message.type === "success"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {message.type === "success" ? (
                  <svg className="w-5 h-5 shrink-0 mt-0.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )}
                <span>{message.text}</span>
              </div>
            )}
          </div>

          <p className="text-xs text-orange-950/50 text-center mt-6">
            Your feedback is anonymous and helps us serve you better!
          </p>
        </div>
      </div>
    </div>
  );
}