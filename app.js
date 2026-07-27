// ── Config ──────────────────────────────────────────────
// Jobicy API — free, no key required
// Docs: https://jobicy.com/jobs-rss-feed
const BASE_URL = 'https://jobicy.com/api/v2/remote-jobs';

// ── State ────────────────────────────────────────────────
let allJobs   = [];   // raw results from API
let filtered  = [];   // after filter/sort
let page      = 1;
const PER_PAGE = 9;

// ── DOM refs ─────────────────────────────────────────────
const searchForm    = document.getElementById('searchForm');
const queryInput    = document.getElementById('queryInput');
const locationInput = document.getElementById('locationInput');
const controls      = document.getElementById('controls');
const filterType    = document.getElementById('filterType');
const sortBy        = document.getElementById('sortBy');
const jobGrid       = document.getElementById('jobGrid');
const loader        = document.getElementById('loader');
const errorBox      = document.getElementById('errorBox');
const resultsCount  = document.getElementById('resultsCount');
const loadMoreBtn   = document.getElementById('loadMoreBtn');

// ── Event Listeners ──────────────────────────────────────
searchForm.addEventListener('submit', e => { e.preventDefault(); fetchJobs(); });
filterType.addEventListener('change', applyFiltersAndSort);
sortBy.addEventListener('change', applyFiltersAndSort);

// ── Fetch ────────────────────────────────────────────────
async function fetchJobs() {
  const query    = queryInput.value.trim();
  const keyword  = locationInput.value.trim();
  const q        = keyword ? `${query} ${keyword}` : query;

  showLoader(true);
  showError('');
  jobGrid.innerHTML = '';
  controls.style.display = 'none';
  loadMoreBtn.style.display = 'none';
  resultsCount.textContent = '';
  allJobs = [];
  page = 1;

  const params = new URLSearchParams({ count: '50', tag: q });
  const url = `${BASE_URL}?${params}`;

  try {
    const res = await fetch(url);

    if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`);

    const data = await res.json();

    if (!data.jobs || data.jobs.length === 0) {
      showError('No internships found. Try a different search term.');
      return;
    }

    // Normalize Jobicy fields to match our card builder
    allJobs = data.jobs.map(j => ({
      job_id:                     String(j.id),
      job_title:                  j.jobTitle,
      employer_name:              j.companyName,
      employer_logo:              j.companyLogo,
      job_city:                   j.jobGeo,
      job_country:                '',
      job_is_remote:              true,
      job_employment_type:        normalizeType(j.jobType?.[0] || ''),
      job_description:            j.jobDescription?.replace(/<[^>]*>/g, '') || j.jobExcerpt || '',
      job_apply_link:             j.url,
      job_posted_at_datetime_utc: j.pubDate,
      job_posted_at_timestamp:    new Date(j.pubDate).getTime(),
      job_highlights:             null,
    }));

    controls.style.display = 'flex';
    applyFiltersAndSort();

  } catch (err) {
    showError(`Failed to fetch internships: ${err.message}. Please check your API key or try again later.`);
  } finally {
    showLoader(false);
  }
}

// ── Filter & Sort ────────────────────────────────────────
function applyFiltersAndSort() {
  const type = filterType.value;

  filtered = allJobs.filter(job => {
    if (type && job.job_employment_type !== type) return false;
    return true;
  });

  const sort = sortBy.value;
  if (sort === 'date') {
    filtered.sort((a, b) => (b.job_posted_at_timestamp || 0) - (a.job_posted_at_timestamp || 0));
  } else if (sort === 'company') {
    filtered.sort((a, b) => (a.employer_name || '').localeCompare(b.employer_name || ''));
  }

  page = 1;
  jobGrid.innerHTML = '';
  renderPage();
}

// ── Render ───────────────────────────────────────────────
function renderPage() {
  const start = (page - 1) * PER_PAGE;
  const slice = filtered.slice(start, start + PER_PAGE);

  if (page === 1 && slice.length === 0) {
    resultsCount.textContent = 'No results match your filters.';
    loadMoreBtn.style.display = 'none';
    return;
  }

  resultsCount.textContent = `Showing ${Math.min(page * PER_PAGE, filtered.length)} of ${filtered.length} results`;

  slice.forEach(job => jobGrid.appendChild(buildCard(job)));

  loadMoreBtn.style.display = page * PER_PAGE < filtered.length ? 'inline-block' : 'none';
}

function loadMore() {
  page++;
  renderPage();
}

// ── Card Builder ─────────────────────────────────────────
function buildCard(job) {
  const card = document.createElement('div');
  card.className = 'job-card';

  const logo = job.employer_logo
    ? `<img class="company-logo" src="${job.employer_logo}" alt="${escHtml(job.employer_name)}" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(job.employer_name)}&background=e0e7ff&color=4f46e5&size=44'">`
    : `<img class="company-logo" src="https://ui-avatars.com/api/?name=${encodeURIComponent(job.employer_name || 'Co')}&background=e0e7ff&color=4f46e5&size=44" alt="logo">`;

  const location = job.job_city
    ? `${job.job_city}${job.job_country ? ', ' + job.job_country : ''}`
    : (job.job_country || 'Location N/A');

  const dateStr = job.job_posted_at_datetime_utc
    ? timeAgo(new Date(job.job_posted_at_datetime_utc))
    : '';

  const remoteBadge = job.job_is_remote ? `<span class="badge badge-remote">Remote</span>` : '';
  const typeBadge   = job.job_employment_type
    ? `<span class="badge badge-type">${formatType(job.job_employment_type)}</span>` : '';
  const dateBadge   = dateStr ? `<span class="badge badge-date">${dateStr}</span>` : '';

  card.innerHTML = `
    <div class="card-header">
      ${logo}
      <div>
        <div class="card-title">${escHtml(job.job_title)}</div>
        <div class="card-company">${escHtml(job.employer_name || 'Unknown Company')}</div>
      </div>
    </div>
    <div class="card-meta">
      <span class="badge badge-location">📍 ${escHtml(location)}</span>
      ${typeBadge}${remoteBadge}${dateBadge}
    </div>
    <p class="card-desc">${escHtml(job.job_description || 'No description available.')}</p>
    <div class="card-footer">
      <button class="details-btn" onclick="openModal(${JSON.stringify(job.job_id).replace(/"/g, '&quot;')})">Details</button>
      <a class="apply-btn" href="${job.job_apply_link || '#'}" target="_blank" rel="noopener">Apply →</a>
    </div>
  `;

  return card;
}

// ── Modal ────────────────────────────────────────────────
function openModal(jobId) {
  const job = allJobs.find(j => j.job_id === jobId);
  if (!job) return;

  const location = job.job_city
    ? `${job.job_city}${job.job_country ? ', ' + job.job_country : ''}`
    : (job.job_country || 'N/A');

  const remoteBadge = job.job_is_remote ? `<span class="badge badge-remote">Remote</span>` : '';
  const typeBadge   = job.job_employment_type
    ? `<span class="badge badge-type">${formatType(job.job_employment_type)}</span>` : '';

  const highlights = job.job_highlights
    ? Object.entries(job.job_highlights)
        .map(([k, v]) => `<strong>${k}:</strong>\n${Array.isArray(v) ? v.map(i => `• ${i}`).join('\n') : v}`)
        .join('\n\n')
    : '';

  const desc = highlights || job.job_description || 'No description available.';

  document.getElementById('modalBody').innerHTML = `
    <h2>${escHtml(job.job_title)}</h2>
    <p class="modal-company">${escHtml(job.employer_name || '')} &nbsp;·&nbsp; 📍 ${escHtml(location)}</p>
    <div class="modal-badges">
      <span class="badge badge-location">📍 ${escHtml(location)}</span>
      ${typeBadge}${remoteBadge}
    </div>
    <div class="modal-desc">${escHtml(desc)}</div>
    <a class="modal-apply" href="${job.job_apply_link || '#'}" target="_blank" rel="noopener">Apply Now →</a>
  `;

  document.getElementById('modal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal').style.display = 'none';
  document.body.style.overflow = '';
}

// Close modal on backdrop click
document.getElementById('modal').addEventListener('click', e => {
  if (e.target === document.getElementById('modal')) closeModal();
});

// ── Helpers ──────────────────────────────────────────────
function showLoader(on) { loader.style.display = on ? 'block' : 'none'; }

function showError(msg) {
  errorBox.style.display = msg ? 'block' : 'none';
  errorBox.textContent   = msg;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function normalizeType(t) {
  const s = t.toLowerCase();
  if (s.includes('intern'))   return 'INTERN';
  if (s.includes('full'))     return 'FULLTIME';
  if (s.includes('part'))     return 'PARTTIME';
  if (s.includes('contract')) return 'CONTRACTOR';
  return 'FULLTIME';
}

function formatType(t) {
  const map = { INTERN: 'Internship', FULLTIME: 'Full-time', PARTTIME: 'Part-time', CONTRACTOR: 'Contract' };
  return map[t] || t;
}

function timeAgo(date) {
  const diff = Math.floor((Date.now() - date) / 1000);
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
