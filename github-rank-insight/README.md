# GitHub Rank Insight

> Automatically or manually calculate your GitHub Stats rank, and visualize per-metric contributions and grade achievement conditions.

**[🚀 Live Demo](https://pachir1su.github.io/github-rank-insight/)**

---

## Features

### Auto Mode (Default)
- Enter a GitHub username → auto-fetches via GitHub REST API
- Retrieves Stars, Commits, PRs, Issues, Followers automatically
- Works without authentication (60 requests/hour unauthenticated)

### Manual Mode
- Directly input Stars, Commits, PRs, Issues, Followers values
- Works regardless of API rate limits
- Useful for simulating: *"What grade would I reach with these stats?"*

### GitHub Token (Optional)
- Enter a Personal Access Token for 5,000 requests/hour
- Token stored only in browser `localStorage`, never sent to a server

### Results
1. **Grade Card** — Circular gauge + grade letter + percentile
2. **Per-Metric Bar Chart** — CDF percentile and weighted contribution for each metric
3. **Next Grade Requirements** — What's needed to reach the next tier
4. **Grade System Table** — Full S–C grade reference, always visible

### Copy Markdown
Copies your result as a README-ready markdown table.

---

## Grade System

| Grade | Top Percentile |
|-------|---------------|
| S     | 1%            |
| A+    | 12.5%         |
| A     | 25%           |
| A-    | 37.5%         |
| B+    | 50%           |
| B     | 62.5%         |
| B-    | 75%           |
| C+    | 87.5%         |
| C     | rest          |

---

## Algorithm

Implements the exact formula from [anuraghazra/github-readme-stats](https://github.com/anuraghazra/github-readme-stats)'s `calculateRank.js`.

```
exponential_cdf(x) = 1 - 2^(-x)
log_normal_cdf(x)  = x / (1 + x)

score = (stars×4 + prs×3 + commits×2 + issues×1 + followers×1) / 11
percentile = (1 - score) × 100
```

| Metric | Weight | Median | Distribution |
|--------|--------|--------|-------------|
| Stars | 4 | 50 | log-normal |
| Pull Requests | 3 | 50 | exponential |
| Commits | 2 | 250 (all: 1000) | exponential |
| Issues | 1 | 25 | exponential |
| Followers | 1 | 10 | log-normal |

---

## Tech Stack

| Item | Choice | Reason |
|------|--------|--------|
| Language | HTML / CSS / Vanilla JS | Serverless, GitHub Pages ready |
| API | GitHub REST API v3 | Free, no auth required |
| Style | CSS Variables + Grid/Flex | Zero external dependencies |
| Deployment | GitHub Pages | Free, minimal setup |

---

## File Structure

```
github-rank-insight/
├── index.html          # Main app
├── style.css           # Styles (CSS Variables, dark mode)
├── js/
│   ├── main.js         # Event handlers & app entry point
│   ├── calculate.js    # Rank calculation logic
│   ├── api.js          # GitHub API calls
│   └── ui.js           # DOM manipulation & rendering
└── README.md
```

---

## Korean README

한국어 버전은 [README.ko.md](./README.ko.md)를 참고하세요.

---

## License

MIT © [Lee Geon Yeong](https://pachir1su.github.io)
