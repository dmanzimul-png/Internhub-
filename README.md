# InternHub 🎓

**InternHub** is a web application that helps students and recent graduates discover real internship and job opportunities worldwide. It fetches live listings from the Jobicy API and lets users search, filter, sort, and apply — all from one clean, responsive interface.

🌐 **Live Demo (via Load Balancer, HTTPS):** https://www.elvisonline.tech
🎥 **Demo Video:** [Watch on YouTube](#) *(update after recording)*

---

## Features

- 🔍 Search internships by role and additional keywords (e.g. Python, React)
- 🏷️ Filter by employment type (Internship, Full-time, Part-time, Contract)
- 📅 Sort by Relevance, Date Posted, or Company A–Z
- 📋 View full job details in a modal popup
- 🔗 Direct Apply button linking to original job posting
- ⚠️ Graceful error handling for API failures and empty results
- 📱 Fully responsive — works on mobile and desktop

---

## Tech Stack

| Layer          | Technology                                         |
|----------------|-----------------------------------------------------|
| Frontend       | HTML5, CSS3, Vanilla JS                             |
| API            | Jobicy Remote Jobs API (free, no key required)      |
| Web servers    | Nginx (static file serving) on two Ubuntu servers   |
| Load balancer  | HAProxy — round-robin, SSL termination, HTTP→HTTPS redirect |

---

## Infrastructure

| Server  | Role                                  | IP               |
|---------|----------------------------------------|------------------|
| web-01  | Nginx web server, serves InternHub    | 54.197.181.240   |
| web-02  | Nginx web server, serves InternHub    | 54.152.40.132    |
| lb-01   | HAProxy load balancer (round robin)   | 18.206.121.71    |

**Domain:** `www.elvisonline.tech` → points to lb-01, secured with a Let's Encrypt SSL certificate. HAProxy terminates SSL and redirects all HTTP traffic to HTTPS with a 301.

---

## API Used

**Jobicy Remote Jobs API**
- Documentation: https://jobicy.com/jobs-rss-feed
- Provider: Jobicy
- Endpoint: `GET https://jobicy.com/api/v2/remote-jobs`
- Auth: None required — fully free and open (**no API key needed**)
- Rate limit: No strict limit on free usage

> ⚠️ **API Key Note:** This application requires no API key. Jobicy is a fully public, free API. No credentials are needed to run or deploy this project.

> Credit: [Jobicy](https://jobicy.com) — Remote Jobs API

---

## Running Locally

### Prerequisites
- Any modern browser (Chrome, Firefox, Edge)
- No API key or backend server needed

### Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/dmanzimul-png/Internhub-.git
   cd Internhub-
   ```

2. Serve the folder locally (opening `index.html` directly via `file://` can block the API fetch in some browsers, so a simple local server is safest):
   ```bash
   python3 -m http.server 8000
   ```
   Then open `http://localhost:8000` in your browser.

3. Type a role in the search box (e.g. `software engineer intern`) and hit **Search**.

> No build step, no dependencies, no server required beyond a static file server.

---

## Deployment Guide

### 1. Push code to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/dmanzimul-png/Internhub-.git
git push -u origin main
```

### 2. Deploy to web-01 and web-02

Both servers were already provisioned with Nginx from an earlier infrastructure project. Deployment is automated with `deploy-webserver.sh`:

```bash
# Copy the script to each server, then run it there:
scp -i ~/.ssh/school deploy-webserver.sh ubuntu@<web-ip>:~/
ssh -i ~/.ssh/school ubuntu@<web-ip>
sudo apt install -y git   # if not already installed
bash deploy-webserver.sh dmanzimul-png
```

The script:
- Installs Nginx (if not already present)
- Clones this repository into `/var/www/internhub`
- Writes an Nginx server block that serves `/var/www/internhub` as the site root
- Enables the site and reloads Nginx

✅ Verify each server independently:
```bash
curl -s http://54.197.181.240 | grep -o InternHub
curl -s http://54.152.40.132  | grep -o InternHub
```

### 3. Load balancer (lb-01)

Unlike a fresh setup, `lb-01` already had **HAProxy** installed and configured from an earlier networking project, load balancing between web-01 and web-02 on port 80 using round-robin. Because both servers were re-deployed with InternHub in place of their previous content, HAProxy began serving InternHub automatically — no load balancer reconfiguration was needed.

HAProxy on lb-01 also:
- Terminates SSL on port 443 using a Let's Encrypt certificate for `www.elvisonline.tech`
- Redirects all HTTP (port 80) traffic to HTTPS with a 301

✅ Verify load balancing (run several times, note the responses come from either server):
```bash
curl -sI https://www.elvisonline.tech
curl -sI https://www.elvisonline.tech
curl -sI https://www.elvisonline.tech
```

✅ Verify HTTP → HTTPS redirect:
```bash
curl -sIL http://www.elvisonline.tech
```
Expect a `301 Moved Permanently` followed by a `200 OK`.

> Note: `setup-loadbalancer.sh` in this repo shows how to configure a load balancer with Nginx from scratch, in case you're deploying to a fresh load balancer server that doesn't already have HAProxy set up.

---

## Security

- No API keys used — Jobicy API is fully public
- All user input is HTML-escaped before rendering (XSS protection)
- Traffic to the deployed site is encrypted end-to-end via HAProxy SSL termination
- `.gitignore` prevents sensitive files from being committed

---

## Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| JSearch API free tier blocked `/search` endpoint | Switched to Jobicy API — free, no key, works in browser |
| Company logos failing to load | `onerror` fallback to UI Avatars initials image |
| Long job descriptions overflowing cards | CSS `line-clamp` truncates to 3 lines; full text shown in modal |
| Pagination without a backend | Client-side slicing of cached `allJobs` array |
| Deploy script wrote files to the wrong path | Fixed by pointing Nginx `root` directly at the git clone target directory |

---

## Credits

- [Jobicy API](https://jobicy.com/jobs-rss-feed) — live remote job listings
- [UI Avatars](https://ui-avatars.com/) — fallback company logo generation
- [Nginx](https://nginx.org/) — web server (web-01, web-02)
- [HAProxy](https://www.haproxy.org/) — load balancer and SSL termination (lb-01)
- [Let's Encrypt](https://letsencrypt.org/) — free SSL certificate

---

## License

MIT
