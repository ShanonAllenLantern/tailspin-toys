// Extension: issue-kanban
// Kanban triage board for tailspin-toys GitHub issues.
//
// Fetches live open issues from GitHub (via the `gh` CLI) each time the board
// is opened. The top-three section shows the oldest unassigned issues, which
// statistically represent work with the most accumulated need. Remaining issues
// appear below. Clicking "Start working on this" injects the issue into the
// active Copilot session so work can begin immediately.

import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { joinSession, createCanvas } from "@github/copilot-sdk/extension";

const REPO = "ShanonAllenLantern/tailspin-toys";
const TOP_N = 3;

// Fetch open issues from GitHub using the gh CLI.
async function fetchIssues() {
    return new Promise((resolve) => {
        const isWindows = process.platform === "win32";
        const cmd = isWindows ? "gh.exe" : "gh";
        execFile(
            cmd,
            [
                "issue",
                "list",
                "--repo",
                REPO,
                "--state",
                "open",
                "--limit",
                "50",
                "--json",
                "number,title,body,labels,assignees,createdAt,url",
            ],
            (err, stdout) => {
                if (err) {
                    resolve([]);
                    return;
                }
                try {
                    resolve(JSON.parse(stdout));
                } catch {
                    resolve([]);
                }
            },
        );
    });
}

// Score an issue to determine triage priority (higher = more urgent).
// Unassigned issues rank above assigned; older issues rank above newer ones
// within the same assignment tier.
function scoreIssue(issue) {
    const isUnassigned = issue.assignees.length === 0;
    const ageMs = Date.now() - new Date(issue.createdAt).getTime();
    // Tier: unassigned issues always outrank assigned ones
    return (isUnassigned ? 1_000_000_000 : 0) + ageMs;
}

function formatAge(createdAt) {
    const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
    if (days === 0) return "today";
    if (days === 1) return "1 day ago";
    if (days < 30) return `${days} days ago`;
    const months = Math.floor(days / 30);
    return months === 1 ? "1 month ago" : `${months} months ago`;
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// Truncate body to a reasonable preview length.
function preview(body, maxLen = 220) {
    if (!body) return "No description provided.";
    const stripped = body.replace(/##[^\n]*/g, "").replace(/- \[ \]/g, "").trim();
    return stripped.length > maxLen ? stripped.slice(0, maxLen).trimEnd() + "…" : stripped;
}

function renderCard(issue, isPriority) {
    const age = formatAge(issue.createdAt);
    const assigned =
        issue.assignees.length > 0
            ? issue.assignees.map((a) => `@${escapeHtml(a.login)}`).join(", ")
            : "Unassigned";
    const labels = issue.labels.map((l) => `<span class="label">${escapeHtml(l.name)}</span>`).join(" ");

    return `
    <article class="card${isPriority ? " priority" : ""}" aria-label="Issue ${issue.number}: ${escapeHtml(issue.title)}">
      <header class="card-header">
        <span class="issue-number">#${issue.number}</span>
        <h3 class="card-title">${escapeHtml(issue.title)}</h3>
      </header>
      ${labels ? `<div class="labels">${labels}</div>` : ""}
      <p class="card-description">${escapeHtml(preview(issue.body))}</p>
      <footer class="card-footer">
        <div class="meta">
          <span class="meta-item">${age}</span>
          <span class="meta-sep">·</span>
          <span class="meta-item">${escapeHtml(assigned)}</span>
        </div>
        <div class="card-actions">
          <a class="gh-link" href="${escapeHtml(issue.url)}" target="_blank" rel="noopener">GitHub ↗</a>
          <button
            class="work-btn${isPriority ? "" : " secondary"}"
            data-number="${issue.number}"
            data-title="${escapeHtml(issue.title)}"
            data-url="${escapeHtml(issue.url)}"
          >Start working →</button>
        </div>
      </footer>
    </article>`;
}

function renderHtml(serverUrl, issues) {
    const sorted = [...issues].sort((a, b) => scoreIssue(b) - scoreIssue(a));
    const top = sorted.slice(0, TOP_N);
    const rest = sorted.slice(TOP_N);

    const topCards = top.length
        ? top.map((i) => renderCard(i, true)).join("")
        : `<p class="empty">No open issues.</p>`;

    const restCards = rest.length
        ? rest.map((i) => renderCard(i, false)).join("")
        : `<p class="empty">No further open issues.</p>`;

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Tailspin Toys – Issue Triage</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg: #0f172a; --surface: #1e293b; --surface-hi: #273549;
    --border: #334155; --text: #e2e8f0; --muted: #94a3b8;
    --accent: #6366f1; --accent-hi: #818cf8;
    --green: #22c55e; --yellow: #eab308;
    --radius: 10px; --gap: 16px;
  }
  body {
    background: var(--bg); color: var(--text);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    font-size: 14px; line-height: 1.55; min-height: 100vh;
    padding: 24px 20px 48px;
  }
  .page-header { margin-bottom: 28px; display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .page-header h1 { font-size: 1.4rem; font-weight: 700; letter-spacing: -0.02em; }
  .page-header p { color: var(--muted); margin-top: 4px; font-size: 0.85rem; }
  .refresh-btn {
    background: var(--surface-hi); color: var(--muted); border: 1px solid var(--border);
    border-radius: 6px; padding: 6px 14px; font-size: 0.8rem; font-weight: 600;
    cursor: pointer; transition: color 0.15s, border-color 0.15s; white-space: nowrap;
    flex-shrink: 0;
  }
  .refresh-btn:hover { color: var(--text); border-color: var(--accent); }
  .section-label {
    display: flex; align-items: center; gap: 10px;
    font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.08em; color: var(--muted); margin-bottom: 14px;
  }
  .section-label::after { content: ''; flex: 1; height: 1px; background: var(--border); }
  .priority-label { color: var(--yellow); }
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: var(--gap); margin-bottom: 36px; }
  .card {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 16px;
    display: flex; flex-direction: column; gap: 10px;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .card:hover { border-color: var(--accent); box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 20%, transparent); }
  .card.priority { border-color: #4a4010; background: linear-gradient(160deg, #1e293b 60%, #252210 100%); }
  .card.priority:hover { border-color: var(--yellow); box-shadow: 0 0 0 1px color-mix(in srgb, var(--yellow) 25%, transparent); }
  .card-header { display: flex; align-items: flex-start; gap: 10px; }
  .issue-number {
    flex-shrink: 0; background: var(--surface-hi); border: 1px solid var(--border);
    border-radius: 6px; padding: 2px 7px; font-size: 0.72rem; font-weight: 600;
    color: var(--muted); margin-top: 2px;
  }
  .card-title { font-size: 0.9rem; font-weight: 600; line-height: 1.4; }
  .labels { display: flex; flex-wrap: wrap; gap: 5px; }
  .label {
    background: color-mix(in srgb, var(--accent) 15%, transparent);
    color: var(--accent-hi); border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
    border-radius: 4px; padding: 1px 7px; font-size: 0.7rem; font-weight: 600;
  }
  .card-description { font-size: 0.8rem; color: var(--muted); flex: 1; }
  .card-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; padding-top: 8px; border-top: 1px solid var(--border); }
  .meta { display: flex; align-items: center; gap: 5px; font-size: 0.75rem; color: var(--muted); }
  .meta-sep { opacity: 0.4; }
  .card-actions { display: flex; align-items: center; gap: 8px; }
  .gh-link { font-size: 0.75rem; color: var(--muted); text-decoration: none; transition: color 0.15s; }
  .gh-link:hover { color: var(--accent-hi); }
  .work-btn {
    background: var(--accent); color: #fff; border: none; border-radius: 6px;
    padding: 5px 12px; font-size: 0.78rem; font-weight: 600; cursor: pointer;
    transition: background 0.15s, opacity 0.15s; white-space: nowrap;
  }
  .work-btn:hover { background: var(--accent-hi); }
  .work-btn:active { opacity: 0.8; }
  .work-btn.secondary { background: var(--surface-hi); color: var(--text); border: 1px solid var(--border); }
  .work-btn.secondary:hover { background: #2d3f58; border-color: var(--accent); color: var(--accent-hi); }
  .work-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .empty { color: var(--muted); font-size: 0.85rem; padding: 12px 0; }
  .toast {
    position: fixed; bottom: 20px; right: 20px;
    background: var(--green); color: #052e16; font-weight: 600; font-size: 0.85rem;
    padding: 10px 18px; border-radius: 8px; opacity: 0; pointer-events: none;
    transition: opacity 0.25s; z-index: 100;
  }
  .toast.show { opacity: 1; }
</style>
</head>
<body>
<header class="page-header">
  <div>
    <h1>🎮 Tailspin Toys – Issue Triage</h1>
    <p>Oldest unassigned issues surface first. Click "Start working" to load into your session.</p>
  </div>
  <button class="refresh-btn" id="refreshBtn">↺ Refresh</button>
</header>

<section aria-label="Priority issues">
  <div class="section-label priority-label">⚡ Needs attention — unassigned &amp; waiting longest</div>
  <div class="cards" id="topCards">${topCards}</div>
</section>

<section aria-label="Remaining issues">
  <div class="section-label">Other open issues</div>
  <div class="cards" id="restCards">${restCards}</div>
</section>

<div class="toast" id="toast" role="status" aria-live="polite"></div>

<script>
  const SERVER = ${JSON.stringify(serverUrl)};

  function showToast(msg) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 3200);
  }

  // Wire up "Start working" buttons via event delegation.
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.work-btn');
    if (!btn || btn.disabled) return;
    const { number, title, url } = btn.dataset;
    btn.disabled = true;
    btn.textContent = 'Loading…';
    try {
      const res = await fetch(SERVER + 'start-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number, title, url }),
      });
      if (res.ok) {
        showToast('Issue #' + number + ' added to session ✓');
        btn.textContent = '✓ In session';
      } else {
        btn.disabled = false;
        btn.textContent = 'Start working →';
        showToast('Something went wrong — try again');
      }
    } catch {
      btn.disabled = false;
      btn.textContent = 'Start working →';
      showToast('Could not reach extension server');
    }
  });

  // Refresh button reloads the page to pick up new issue data from GitHub.
  document.getElementById('refreshBtn').addEventListener('click', () => {
    window.location.reload();
  });
</script>
</body>
</html>`;
}

// Per-instance state: instanceId → { server, url }
const servers = new Map();

async function startServer(instanceId, sendToSession) {
    const server = createServer(async (req, res) => {
        // CORS preflight
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        if (req.method === "OPTIONS") {
            res.writeHead(204);
            res.end();
            return;
        }

        if (req.method === "POST" && req.url === "/start-issue") {
            let body = "";
            req.on("data", (chunk) => (body += chunk));
            req.on("end", () => {
                try {
                    const { number, title, url } = JSON.parse(body);
                    sendToSession(number, title, url);
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ ok: true }));
                } catch {
                    res.writeHead(400);
                    res.end("Bad request");
                }
            });
            return;
        }

        // Serve the board: fetch live issues on every page load so Refresh works.
        const entry = servers.get(instanceId);
        const selfUrl = entry ? entry.url : "http://127.0.0.1:0/";
        const issues = await fetchIssues();
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(renderHtml(selfUrl, issues));
    });

    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    const port = typeof address === "object" && address ? address.port : 0;
    return { server, url: `http://127.0.0.1:${port}/` };
}

const session = await joinSession({
    canvases: [
        createCanvas({
            id: "issue-kanban",
            displayName: "Issue Triage Board",
            description: "Kanban triage board for tailspin-toys GitHub issues",

            open: async (ctx) => {
                let entry = servers.get(ctx.instanceId);
                if (!entry) {
                    entry = await startServer(ctx.instanceId, (number, title, url) => {
                        session.send({
                            prompt: `I'd like to work on GitHub issue #${number}: "${title}". The issue is at ${url}. Please help me implement it following the project's coding standards and guidelines.`,
                        });
                    });
                    servers.set(ctx.instanceId, entry);
                }
                return { title: "Issue Triage Board", url: entry.url };
            },

            onClose: async (ctx) => {
                const entry = servers.get(ctx.instanceId);
                if (entry) {
                    servers.delete(ctx.instanceId);
                    await new Promise((resolve) => entry.server.close(() => resolve()));
                }
            },

            actions: [],
        }),
    ],
});
