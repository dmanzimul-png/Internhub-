# InternHub 🎓

**InternHub** is a web application that helps students and recent graduates discover real internship and job opportunities worldwide. It fetches live listings from the Jobicy API and lets users search, filter, sort, and apply — all from one clean, responsive interface.

🌐 **Live Demo (Load Balancer):** `http://<lb01-ip>` *(update after deployment)*  
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

| Layer    | Technology                    |
|----------|-------------------------------|
| Frontend | HTML5, CSS3, Vanilla JS       |
| API      | Jobicy Remote Jobs API (free) |
| Server   | Nginx (static file serving)   |
| LB       | Nginx (reverse proxy)         |

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
- No API key or server needed

### Steps

1. Clone the repository:
   ```bash
   git clone https://github.com/<your-username>/internhub.git
   cd internhub
   ```

2. Open `index.html` directly in your browser:
   ```bash
   # Windows
   start index.html

   # macOS / Linux
   open index.html
   ```

3. Type a role in the search box (e.g. `software engineer`) and hit **Search**.

> No build step, no dependencies, no server required.

---

## Deployment Guide

### 1. Push code to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/<your-username>/internhub.git
git push -u origin main
```

---

### 2. Deploy to Web01 and Web02

SSH into each server and run:

```bash
# Copy the deploy script to the server first, then:
bash deploy-webserver.sh <your-github-username>
```

Or manually:

```bash
sudo apt update && sudo apt install -y nginx
sudo git clone https://github.com/<your-username>/internhub.git /var/www/internhub

sudo tee /etc/nginx/sites-available/internhub > /dev/null <<EOF
server {
    listen 80;
    server_name _;
    root /var/www/internhub;
    index index.html;
    location / {
        try_files \$uri \$uri/ =404;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/internhub /etc/nginx/sites-enabled/internhub
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

✅ Verify: Open `http://<web01-ip>` and `http://<web02-ip>` in your browser.

---

### 3. Configure Load Balancer (Lb01)

SSH into Lb01 and run:

```bash
bash setup-loadbalancer.sh <web01-ip> <web02-ip>
```

Or manually:

```bash
sudo apt update && sudo apt install -y nginx

sudo tee /etc/nginx/sites-available/internhub-lb > /dev/null <<EOF
upstream internhub_backend {
    server <web01-ip>;
    server <web02-ip>;
}

server {
    listen 80;
    server_name _;

    location / {
        proxy_pass         http://internhub_backend;
        proxy_set_header   Host            \$host;
        proxy_set_header   X-Real-IP       \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/internhub-lb /etc/nginx/sites-enabled/internhub-lb
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

✅ Verify load balancing is working:
```bash
# Run this several times — you should see traffic alternating between Web01 and Web02
for i in {1..6}; do curl -s http://<lb01-ip> | grep -o 'InternHub'; done
```

Expected output: each request is served (Nginx round-robin distributes between the two servers). You can also add a unique identifier per server to confirm:
```bash
# On Web01 — add a comment to index.html
echo '<!-- served by web01 -->' | sudo tee -a /var/www/internhub/Internhub-/index.html

# On Web02
echo '<!-- served by web02 -->' | sudo tee -a /var/www/internhub/Internhub-/index.html

# Then from your local machine, run multiple times and check the comment:
curl -s http://<lb01-ip> | grep 'served by'
```

You should see `web01` and `web02` alternating, confirming the load balancer is distributing traffic correctly.

---

## Security

- No API keys used — Jobicy API is fully public
- All user input is HTML-escaped before rendering (XSS protection)
- `.gitignore` prevents sensitive files from being committed

---

## Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| JSearch API free tier blocked `/search` endpoint | Switched to Jobicy API — free, no key, works in browser |
| Company logos failing to load | `onerror` fallback to UI Avatars initials image |
| Long job descriptions overflowing cards | CSS `line-clamp` truncates to 3 lines; full text shown in modal |
| Pagination without a backend | Client-side slicing of cached `allJobs` array |

---

## Credits

- [Jobicy API](https://jobicy.com/jobs-rss-feed) — live remote job listings
- [UI Avatars](https://ui-avatars.com/) — fallback company logo generation
- [Nginx](https://nginx.org/) — web server and load balancer

---

## License

MIT
