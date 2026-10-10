# AI Web Scraper & Summarizer

A full-stack web application that extracts the main readable content from a webpage and uses Google's Gemini AI to generate a concise summary.

## Features

- **Web Scraping:** Extracts readable webpage content using Mozilla Readability and JSDOM.
- **AI Summarization:** Generates summaries using Google's Gemini API.
- **Markdown Rendering:** Displays summaries with readable formatting.
- **URL Validation:** Validates submitted URLs before processing.
- **Loading States:** Shows progress while the webpage is being processed.
- **Error Handling:** Displays useful error messages when requests fail.
- **Copy Summary:** Copy the generated summary to your clipboard.
- **Download PDF:** Download the summary as a PDF.
- **Dark Mode:** Switch between dark and light themes.
- **Responsive UI:** Works across different screen sizes.

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- Google Gemini API (`@google/genai`)
- JSDOM
- Mozilla Readability
- Zod
- React Markdown
- jsPDF

## Live Demo

**Live URL:** Add your deployed application URL here.

## Getting Started

### Prerequisites

- Node.js
- npm
- A Google Gemini API key

Get your API key from [Google AI Studio](https://aistudio.google.com/apikey).

### 1. Clone the Repository

```bash
git clone https://github.com/TEJASWADPILLEWAR7/ai-web-scraper-summarizer.git
cd ai-web-scraper-summarizer
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root directory, in the same directory as `package.json`.

Add your Gemini API key:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Replace `your_gemini_api_key_here` with your actual API key.

**Important:** Never commit `.env.local` or expose your API key in frontend code.

### 4. Start the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production

```bash
npm run build
```

To start the production server locally after building:

```bash
npm run start
```

## How It Works

1. Enter a webpage URL into the input field.
2. The frontend sends the URL to the backend API.
3. The API validates the URL and fetches the webpage.
4. JSDOM and Mozilla Readability extract the main readable text.
5. The extracted text is sent to Google Gemini for summarization.
6. The API returns the page title and generated summary.
7. The frontend displays the summary, with options to copy or download it.

## Project Structure

```text
src/
├── app/
│   ├── api/
│   │   └── summarize/
│   │       └── route.ts
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
└── lib/
    ├── scraper.ts
    └── security.ts
```

## Limitations

- Some websites may block automated requests.
- Websites that require JavaScript to render their content may not be fully supported.
- Pages without enough readable text may fail to produce a summary.
- Network failures and AI API errors may interrupt requests.
- Gemini API quotas and rate limits may apply.

## Deployment

This application can be deployed on [Vercel](https://vercel.com/).

1. Push the project to GitHub.
2. Import the repository into Vercel.
3. Add `GEMINI_API_KEY` under the project's environment variables.
4. Deploy the application.
5. Add your deployed URL to the Live Demo section above.

Do not upload your `.env.local` file to GitHub. Configure environment variables separately in Vercel.

## License

Created as a Full Stack Developer application assignment.
