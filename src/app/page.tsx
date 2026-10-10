"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
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
const RETRY_DELAYS = [5, 10, 20] as const;

type ApiResponse = { summary?: string; title?: string; error?: string };

export default function Home() {
  const [url, setUrl] = useState("");
  const [submittedUrl, setSubmittedUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsgIndex, setLoadingMsgIndex] = useState(0);
  const [summary, setSummary] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const copyTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isLoading || retryCountdown !== null) return;
    const interval = setInterval(() => {
      setLoadingMsgIndex((n) => Math.min(n + 1, LOADING_MESSAGES.length - 1));
    }, 2000);
    return () => clearInterval(interval);
  }, [isLoading, retryCountdown]);

  useEffect(
    () => () => {
      if (copyTimeout.current) clearTimeout(copyTimeout.current);
    },
    [],
  );

  // layout.tsx sets the initial <html> theme class before hydration.
  // CSS-only icons avoid reading localStorage during render and hydration mismatches.
  const toggleTheme = () => {
    const root = document.documentElement;
    const dark = !root.classList.contains("dark");
    root.classList.toggle("dark", dark);
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {
      // The current page theme still changes if storage is unavailable.
    }
  };

  const waitWithCountdown = async (seconds: number) => {
    for (let remaining = seconds; remaining > 0; remaining--) {
      setRetryCountdown(remaining);
      await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    }
    setRetryCountdown(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSummary(null);
    setTitle(null);
    setCopyStatus("idle");
    setRetryCountdown(null);
    setRetryAttempt(0);

    const cleanUrl = url.trim();
    let parsed: URL;
    try {
      parsed = new URL(cleanUrl);
    } catch {
      setError("Please enter a valid URL, including https://.");
      return;
    }
    if (!["http:", "https:"].includes(parsed.protocol)) {
      setError("Please enter a valid HTTP or HTTPS URL.");
      return;
    }

    setSubmittedUrl(cleanUrl);
    setLoadingMsgIndex(0);
    setIsLoading(true);

    try {
      let result: ApiResponse | null = null;

      for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
        let response: Response;
        try {
          response = await fetch("/api/summarize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: cleanUrl }),
          });
        } catch {
          if (attempt < RETRY_DELAYS.length) {
            setRetryAttempt(attempt + 1);
            await waitWithCountdown(RETRY_DELAYS[attempt]);
            continue;
          }
          throw new Error(
            "Unable to reach the server. Check your connection and try again.",
          );
        }

        let data: ApiResponse;
        try {
          data = (await response.json()) as ApiResponse;
        } catch {
          throw new Error(
            "The server returned an invalid response. Please try again.",
          );
        }

        if (response.ok) {
          if (typeof data.summary !== "string" || !data.summary.trim()) {
            throw new Error("The server did not return a valid summary.");
          }
          result = data;
          break;
        }

        const retryable = response.status === 429 || response.status === 503;
        if (retryable && attempt < RETRY_DELAYS.length) {
          setRetryAttempt(attempt + 1);
          await waitWithCountdown(RETRY_DELAYS[attempt]);
          continue;
        }
        if (retryable) {
          throw new Error(
            "The AI service is still busy. Please try again in a little while.",
          );
        }
        throw new Error(data.error || "Failed to generate the summary.");
      }

      if (!result?.summary)
        throw new Error("Unable to generate the summary. Please try again.");
      setSummary(result.summary);
      setTitle(result.title?.trim() || "Webpage Summary");
    } catch (caught: unknown) {
      setError(
        caught instanceof Error
          ? caught.message
          : "An unexpected error occurred. Please try again.",
      );
    } finally {
      setRetryCountdown(null);
      setRetryAttempt(0);
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!summary) return;
    try {
      await navigator.clipboard.writeText(summary);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
    if (copyTimeout.current) clearTimeout(copyTimeout.current);
    copyTimeout.current = setTimeout(() => setCopyStatus("idle"), 2000);
  };

  const handleDownloadPdf = () => {
    if (!summary) return;
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 18;
    const maxWidth = pageWidth - margin * 2;
    let y = margin;

    const addText = (text: string, size = 11, bold = false, gap = 3) => {
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      pdf.setFontSize(size);
      const lines = pdf.splitTextToSize(text, maxWidth) as string[];
      for (const line of lines) {
        if (y > pageHeight - margin) {
          pdf.addPage();
          y = margin;
        }
        pdf.text(line, margin, y);
        y += size * 0.5 + 2;
      }
      y += gap;
    };

    addText(title || "AI Web Scraper Summary", 18, true);
    addText(`Source: ${submittedUrl}`, 9);
    addText("Summary", 14, true);

    const plain = summary
      .replace(/```[\s\S]*?```/g, "[Code block omitted]")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, "$1 ($2)")
      .replace(/^\s{0,3}#{1,6}\s+/gm, "")
      .replace(/^\s*[-*+]\s+/gm, "• ")
      .replace(/^\s*\d+\.\s+/gm, "• ")
      .replace(/[>*_`~]/g, "")
      .trim();

    for (const line of plain.split("\n")) {
      if (line.trim()) addText(line.trim(), 11, false, 1);
      else y += 2;
    }

    const filename =
      (title || "summary")
        .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
        .trim()
        .slice(0, 80) || "summary";
    pdf.save(`${filename}.pdf`);
  };

  return (
    <main className="flex-1 px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-10">
        <header className="relative text-center">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="absolute right-0 top-0 rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <svg
              className="hidden h-5 w-5 dark:block"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <svg
              className="block h-5 w-5 dark:hidden"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
              />
            </svg>
          </button>
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            AI Web Scraper
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-lg text-gray-500 dark:text-slate-400">
            Enter a webpage URL below to extract its main content and generate a
            precise AI summary.
          </p>
        </header>

        <section
          className="overflow-hidden border border-gray-200 bg-white shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900 sm:rounded-xl"
          aria-label="URL input section"
        >
          <div className="px-4 py-6 sm:p-8">
            <form onSubmit={handleSubmit} className="sm:flex sm:gap-3">
              <div className="min-w-0 flex-1">
                <label htmlFor="url" className="sr-only">
                  Webpage URL
                </label>
                <input
                  id="url"
                  type="url"
                  placeholder="https://example.com/article"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  disabled={isLoading}
                  required
                  autoComplete="url"
                  className="block w-full rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-gray-900 shadow-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-white sm:text-sm"
                />
              </div>
              <div className="mt-3 sm:mt-0">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="block w-full rounded-lg bg-blue-600 px-6 py-3 font-medium text-white shadow-sm transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-slate-900"
                >
                  {isLoading ? "Processing..." : "Summarize"}
                </button>
              </div>
            </form>

            {isLoading && (
              <div
                className="mt-6 flex items-center justify-center gap-3 text-blue-600 dark:text-blue-400"
                role="status"
                aria-live="polite"
              >
                <svg
                  className="h-5 w-5 shrink-0 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
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
                <p className="text-sm font-medium">
                  {retryCountdown !== null
                    ? `AI service is busy. Retrying in ${retryCountdown}s...`
                    : LOADING_MESSAGES[loadingMsgIndex]}
                </p>
              </div>
            )}
            {retryCountdown !== null && (
              <p className="mt-2 text-center text-xs text-gray-500 dark:text-slate-400">
                Temporary issue. Retry {retryAttempt} of {RETRY_DELAYS.length}.
                Please keep this page open.
              </p>
            )}
          </div>
        </section>

        {error && (
          <div
            className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-900/20"
            role="alert"
          >
            <h2 className="text-sm font-medium text-red-800 dark:text-red-400">
              Unable to generate summary
            </h2>
            <p className="mt-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </p>
            <button
              type="button"
              onClick={() =>
                document.querySelector<HTMLFormElement>("form")?.requestSubmit()
              }
              disabled={isLoading}
              className="mt-3 rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-800 hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60"
            >
              Try again
            </button>
          </div>
        )}

        {summary && (
          <section
            className="overflow-hidden border border-gray-200 bg-white shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-900 sm:rounded-xl"
            aria-label="Summary result"
          >
            <div className="flex flex-col items-start justify-between gap-4 border-b border-gray-100 bg-gray-50/50 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/50 sm:flex-row sm:items-center sm:px-6">
              <div className="min-w-0 flex-1 sm:pr-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Summary
                </h2>
                {title && (
                  <p className="mt-1 truncate text-sm text-gray-500 dark:text-slate-400">
                    Source:{" "}
                    <a
                      href={submittedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline dark:text-blue-400"
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
                  className={`inline-flex items-center rounded-lg border px-4 py-2 text-sm font-medium shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${copyStatus === "copied" ? "border-green-500 bg-green-50 text-green-700 dark:border-green-500/50 dark:bg-green-900/20 dark:text-green-400" : copyStatus === "error" ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"}`}
                  aria-label="Copy summary to clipboard"
                >
                  {copyStatus === "copied"
                    ? "Copied!"
                    : copyStatus === "error"
                      ? "Copy failed"
                      : "Copy Summary"}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus:ring-offset-slate-900"
                >
                  Download PDF
                </button>
              </div>
            </div>
            <div className="overflow-auto px-4 py-6 sm:px-8 sm:py-8">
              <article className="prose prose-blue max-w-none dark:prose-invert">
                <ReactMarkdown>{summary}</ReactMarkdown>
              </article>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
