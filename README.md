# Athan Security - 2026 Compliance & Security Scanner

A high-performance Next.js application designed to act as a powerful lead-generation tool for security and privacy consulting. It scans target websites for critical security vulnerabilities and modern privacy law violations (NY SHIELD Act, GDPR, CCPA).

## 🚀 Features

- **Real-Time Analysis**: Scans websites dynamically using parallel fetching for maximum speed.
- **Premium UI/UX**: Dark-mode optimized, animated scan sequences, and sleek visual pass/fail indicators.
- **Security Header Audit**: Checks for 6 critical HTTP response headers:
  - `Strict-Transport-Security` (HSTS)
  - `Content-Security-Policy` (CSP)
  - `X-Frame-Options`
  - `X-Content-Type-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
- **GPC (Global Privacy Control) Detection**: Checks for the presence of `.well-known/gpc.json` to verify compliance with modern California (CPPA) privacy laws.
- **Pre-Consent Tracker Scanning**: Statistically analyzes the target's raw HTML for 12+ major tracking families (Google Analytics, Meta Pixel, TikTok, HubSpot, etc.) that fire before user consent, violating GDPR Article 7.
- **Dark Pattern Advisory**: Educates users on the dangers of "Deceptive Design Patterns" in cookie banners.
- **Regulatory Calendar**: Creates urgency by highlighting upcoming 2026 enforcement deadlines for EU and US privacy laws.

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Deployment**: Optimized for [Vercel](https://vercel.com) Edge/Serverless functions.

## 🧠 How the Scanner Works

1. **User Input**: User enters their URL on the sleek hero section.
2. **API Route Processing (`/api/scan`)**:
   - The server establishes an `AbortController` timeout to prevent hanging requests.
   - It executes a `HEAD` (fallback to `GET`) request to extract the HTTP security headers.
   - **In Parallel**: It fetches `/.well-known/gpc.json` to verify privacy signals.
   - **In Parallel**: It downloads the raw HTML payload and uses a curated signature engine (`KNOWN_TRACKERS` and `INLINE_TRACKER_SIGNATURES`) to detect tracking scripts.
3. **Grading System**:
   - **60% Weight**: Security Headers
   - **15% Weight**: GPC Compliance
   - **25% Weight**: Tracker Hygiene (Points deducted for each tracker found)
4. **Client Rendering**: The results are displayed step-by-step with staggered animations, highlighting vulnerabilities in red to drive conversion toward remediation services.

## 💻 Local Development

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🌍 Deployment to Vercel

1. Push this repository to your GitHub account.
2. Log into [Vercel](https://vercel.com).
3. Click **Add New Project**.
4. Import this repository.
5. Click **Deploy**. Vercel will automatically build and host the application.

## 🔗 Cross-Linking Strategy

To maximize lead generation, deploy this app to a subdomain of your main portfolio (e.g., `scan.sakis-athan.com`).
1. In Vercel, navigate to the project's **Settings > Domains**.
2. Add your subdomain.
3. Configure the provided CNAME record in your domain's DNS settings (e.g., Cloudflare).
4. Add a "Test Your Site" CTA button on your main portfolio pointing to this scanner.

---
*Created by Athanasios (Sakis) Athanasopoulos*
