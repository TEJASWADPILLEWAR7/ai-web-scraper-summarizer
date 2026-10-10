# AI Web Scraper

A full-stack web application built with Next.js that extracts the main content from any webpage and generates a concise, formatted AI summary.

![Application Screenshot](./public/screenshot-placeholder.png) _(Note: Add a real screenshot of the application here before final submission)_

## Features

- **Intelligent Web Scraping:** Extracts clean, readable text from provided URLs using Mozilla Readability and JSDOM, bypassing navigation menus and footer junk.
- **AI Summarization:** Utilizes Google's Gemini API (`gemini-3-flash-preview`) to accurately summarize large web articles.
- **Markdown Rendering:** Displays the AI-generated summary with proper typography, headings, and lists.
- **Robust Security:** Implements Server-Side Request Forgery (SSRF) protections, payload size limits (5MB), and URL validation.
- **Modern UI:** Built with React Server Components, Tailwind CSS, and strict TypeScript.
- **Automated Testing:** Includes Vitest for critical security and validation logic.

## Technology Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **Scraping:** JSDOM + Mozilla Readability
- **AI:** Google Gen AI SDK (`@google/genai`)
- **Validation:** Zod
- **Testing:** Vitest

## Architecture and Request Flow

1. **Client:** The user submits a URL via the React frontend (`src/app/page.tsx`).
2. **Validation:** The frontend performs basic format validation and sends a POST request.
3. **API Route:** The backend (`src/app/api/summarize/route.ts`) rigorously validates the URL format and hostname (blocking internal IPs).
4. **Scraper:** The scraper (`src/lib/scraper.ts`) fetches the HTML, aborts if the file is over 5MB, extracts the page title, and isolates the main readable text.
5. **AI Generation:** The clean text is sent to the Gemini API with strict prompt instructions.
6. **Response:** The backend returns the title and summary to the frontend, which renders it using `react-markdown`.

## Prerequisites

- Node.js (v18 or higher)
- npm
- A free Google Gemini API Key

## Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/your-username/ai-web-scraper.git](https://github.com/your-username/ai-web-scraper.git)
   cd ai-web-scraper
   ```
