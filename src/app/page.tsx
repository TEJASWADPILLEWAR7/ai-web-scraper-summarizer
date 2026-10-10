"use client";

import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { jsPDF } from "jspdf";

const LOADING_MESSAGES = [
  "Connecting to the webpage...",
  "Fetching webpage content...",
  "Extracting the main article...",
  "Cleaning up the content...",
  "Preparing your AI summary...",
  "Almost there...",
];

export default function Home() {
  const [url, setUrl] = useState("");
  const [submittedUrl, setSubmittedUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [summary, setSummary] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    const nextTheme = !isDark;
    setIsDark(nextTheme);

    if (nextTheme) {
      document.documentElement.classList.add("dark");
      localStorage.theme = "dark";
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.theme = "light";
    }
  };

  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setLoadingMsgIndex((prev) =>
        prev < LOADING_MESSAGES.length - 1 ? prev + 1 : prev,
      );
    }, 2000);

    return () => clearInterval(interval);
  }, [isLoading]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSummary(null);
    setTitle(null);
    setCopyStatus("idle");

    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setError("Please enter a valid URL.");
      return;
    }

    try {
      new URL(trimmedUrl);
    } catch {
      setError("Invalid URL format. Please include http:// or https://");
      return;
    }

    setSubmittedUrl(trimmedUrl);
    setLoadingMsgIndex(0);
    setIsLoading(true);

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate summary");
      }

      setSummary(data.summary);
      setTitle(data.title || "Unknown Title");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!summary || copyStatus === "copied") return;

    try {
      await navigator.clipboard.writeText(summary);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }

    setTimeout(() => setCopyStatus("idle"), 2000);
  };

  const handleDownloadPdf = () => {
    if (!summary) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - margin * 2;
    let y = margin;

    const addText = (
      text: string,
      fontSize: number,
      fontStyle: "normal" | "bold" = "normal",
    ) => {
      doc.setFont("helvetica", fontStyle);
      doc.setFontSize(fontSize);

      const lines = doc.splitTextToSize(text, maxWidth) as string[];
      const lineHeight = fontSize * 0.5;

      for (const line of lines) {
        if (y > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }

        doc.text(line, margin, y);
        y += lineHeight;
      }

      y += 4;
    };

    addText(title || "AI Web Scraper Summary", 18, "bold");
    addText(`Source: ${submittedUrl}`, 10);
    addText("Summary", 14, "bold");

    const plainSummary = summary
      .replace(/```[\s\S]*?```/g, "[Code block]")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/^\s{0,3}#{1,6}\s+/gm, "")
      .replace(/[>*_`~]/g, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    for (const paragraph of plainSummary.split("\n")) {
      if (paragraph.trim()) {
        addText(paragraph.trim(), 11);
      } else {
        y += 3;
      }
    }

    const filename =
      (title || "summary")
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
        .trim()
        .slice(0, 80) || "summary";

    doc.save(`${filename}.pdf`);
  };

  return (
    <main className="flex-1 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-10">
        <header className="relative text-center">
          <button
            onClick={toggleTheme}
            className="absolute right-0 top-0 p-2 rounded-full text-gray-500 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Toggle dark mode"
            type="button"
          >
            {isDark ? (
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            )}
          </button>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl text-gray-900 dark:text-white">
            AI Web Scraper
          </h1>
          <p className="mt-3 text-lg text-gray-500 dark:text-slate-400 max-w-xl mx-auto">
            Enter a webpage URL below to extract its main content and generate a
            precise AI summary.
          </p>
        </header>

        <section
          className="bg-white dark:bg-slate-900 shadow-sm border border-gray-200 dark:border-slate-800 sm:rounded-xl overflow-hidden transition-colors"
          aria-label="URL Input Section"
        >
          <div className="px-4 py-6 sm:p-8">
            <form onSubmit={handleSubmit} className="sm:flex gap-3">
              <div className="min-w-0 flex-1">
                <label htmlFor="url" className="sr-only">
                  Webpage URL
                </label>
                <input
                  id="url"
                  type="url"
                  placeholder="https://example.com/article"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isLoading}
                  required
                  className="block w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-slate-700 bg-transparent text-gray-900 dark:text-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-60 disabled:cursor-not-allowed outline-none transition-all"
                />
              </div>
              <div className="mt-3 sm:mt-0 sm:w-auto">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="block w-full py-3 px-6 rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed font-medium transition-all"
                >
                  Summarize
                </button>
              </div>
            </form>

            {isLoading && (
              <div className="mt-6 flex items-center justify-center space-x-3 text-blue-600 dark:text-blue-400">
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <p className="text-sm font-medium animate-pulse transition-opacity duration-500">
                  {LOADING_MESSAGES[loadingMsgIndex]}
                </p>
              </div>
            )}
          </div>
        </section>

        {error && (
          <div
            className="rounded-xl bg-red-50 dark:bg-red-900/20 p-4 border border-red-200 dark:border-red-900/50"
            role="alert"
          >
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-400">
                  Error
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {summary && (
          <section
            className="bg-white dark:bg-slate-900 shadow-sm sm:rounded-xl overflow-hidden border border-gray-200 dark:border-slate-800 transition-colors"
            aria-label="Summary Result"
          >
            <div className="px-4 py-4 sm:px-6 flex justify-between items-start sm:items-center border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex-col sm:flex-row gap-4">
              <div className="flex-1 min-w-0 pr-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Summary
                </h3>
                {title && (
                  <p className="mt-1 text-sm text-gray-500 dark:text-slate-400 truncate">
                    Source:{" "}
                    <a
                      href={submittedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {title}
                    </a>
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={copyStatus === "copied"}
                  className={`inline-flex items-center px-4 py-2 border shadow-sm text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 focus:ring-blue-500 transition-all ${
                    copyStatus === "copied"
                      ? "border-green-500 text-green-700 bg-green-50 dark:border-green-500/50 dark:text-green-400 dark:bg-green-900/20"
                      : copyStatus === "error"
                        ? "border-red-300 text-red-700 bg-red-50 dark:border-red-800 dark:text-red-400 dark:bg-red-900/20"
                        : "border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700"
                  }`}
                  aria-label="Copy summary to clipboard"
                >
                  {copyStatus === "copied" ? (
                    <>
                      <svg
                        className="w-4 h-4 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      Copied!
                    </>
                  ) : copyStatus === "error" ? (
                    "Failed to copy"
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4 mr-2 opacity-70"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                      Copy Summary
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="inline-flex items-center px-4 py-2 border border-gray-200 dark:border-slate-700 shadow-sm text-sm font-medium rounded-lg text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 focus:ring-blue-500"
                >
                  Download PDF
                </button>
              </div>
            </div>

            <div className="px-4 py-6 sm:px-8 sm:py-8 overflow-auto">
              <article className="prose prose-blue dark:prose-invert max-w-none">
                <ReactMarkdown>{summary}</ReactMarkdown>
              </article>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
