import { JSDOM, VirtualConsole } from "jsdom";
import { Readability } from "@mozilla/readability";

export async function scrapeWebpage(
  url: string,
): Promise<{ title: string; text: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "AI-Web-Scraper-Bot/1.0",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch webpage: HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type");

    if (!contentType || !contentType.includes("text/html")) {
      throw new Error(
        "The provided URL does not point to a valid HTML webpage.",
      );
    }

    const contentLength = response.headers.get("content-length");

    if (contentLength && parseInt(contentLength, 10) > 5 * 1024 * 1024) {
      throw new Error("The webpage is too large to process safely.");
    }

    const html = await response.text();

    if (!html.trim()) {
      throw new Error("The webpage returned empty content.");
    }

    const virtualConsole = new VirtualConsole();
    const dom = new JSDOM(html, { url, virtualConsole });

    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent) {
      throw new Error(
        "Could not extract readable text. The page might require JavaScript to render.",
      );
    }

    const cleanText = article.textContent.replace(/\s+/g, " ").trim();
    const pageTitle = article.title ? article.title.trim() : "Unknown Title";

    return {
      title: pageTitle,
      text: cleanText.slice(0, 40000),
    };
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "The request timed out while trying to fetch the webpage.",
      );
    }
    throw error;
  }
}
