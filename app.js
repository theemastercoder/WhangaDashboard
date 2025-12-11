// ---------------------------
// Whangamatā Surf Dashboard
// ---------------------------

// ---------------------------
// CONFIG
const LAT = -37.209;
const LON = 175.873;
const WORKER_URL = "https://stormglassproxy.o-mcguinness.workers.dev"; // <-- replace with your Worker URL

// Stormglass marine parameters
const params = "windSpeed,windDirection,waveHeight,swellHeight,swellDirection";

// ---------------------------
// CAMERAS
const CAMS = [
  'https://corolive.nz/whangamata',
  'https://embed.cdn-surfline.com/cams/62ba531abf8f1d75931c9d4f/822692fdfc5bd06fb24529c6e5dc203282e425c4'
];
let currentCam = 0;

function el(id) { return document.getElementById(id); }

// Setup cam buttons
CAMS.forEach((url, i) => {
  const btn = el('camBtn' + (i + 2));
  if (btn) btn.addEventListener('click', () => setCam(i));
});

function setCam(i) {
  currentCam = i;
  CAMS.forEach((_, j) => {
    const btn = el('camBtn' + (j + 2));
    if (btn) btn.classList.toggle('active', i === j);
  });
  const frame = el('camFrame');
  if (frame) frame.src = CAMS[i];
}

// Initialize cam
setCam(0);

// Reload cam every 60 seconds to prevent caching
setInterval(() => {
  const frame = el('camFrame');
  if (frame) frame.src = frame.src.split('?')[0] + '?t=' + Date.now();
}, 60000);

// ---------------------------
// CHARTS
const windChart  = new Chart(el('windChart').getContext('2d'),  { type:'line', data:{labels:[], datasets:[{label:'Wind speed (m/s)', data:[], fill:true}] } });
const rainChart  = new Chart(el('rainChart').getContext('2d'),  { type:'line', data:{labels:[], datasets:[{label:'Precipitation (mm)', data:[], fill:true}] } });
const swellChart = new Chart(el('swellChart').getContext('2d'), { type:'line', data:{labels:[], datasets:[{label:'Wave height (m)', data:[], fill:true}] } });

// ---------------------------
// FETCH Stormglass via Worker
const start = new Date().toISOString();
const end   = new Date(Date.now() + 24*3600*1000).toISOString();

fetch(`${WORKER_URL}?lat=${LAT}&lng=${LON}&params=${params}&start=${start}&end=${end}`)
  .then(res => {
    if (!res.ok) throw new Error("Network response was not ok");
    return res.json();
  })
  .then(data => {
    console.log("Stormglass data via Worker:", data);

    if (!data.hours || data.hours.length === 0) return console.error("No data returned");

    const times = data.hours.map(h => new Date(h.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
    const get = (h, v) => (h[v] && h[v].sg != null) ? h[v].sg : null;

    // Wind Chart
    windChart.data.labels = times;
    windChart.data.datasets[0].data = data.hours.map(h => get(h, 'windSpeed'));
    windChart.update();

    // Fake Rain Chart (Stormglass marine endpoint has no precipitation)
    rainChart.data.labels = times;
    rainChart.data.datasets[0].data = new Array(times.length).fill(0);
    rainChart.update();

    // Swell / Wave Chart
    swellChart.data.labels = times;
    swellChart.data.datasets[0].data = data.hours.map(h => get(h, 'waveHeight'));
    swellChart.update();

    // Summary
    const windSpeeds = data.hours.map(h => get(h,'windSpeed')).filter(v=>v!==null);
    el('avgWind').innerText = windSpeeds.length ? (windSpeeds.reduce((a,b)=>a+b,0)/windSpeeds.length).toFixed(1)+' m/s' : '--';

    const waves = data.hours.map(h => get(h,'waveHeight')).filter(v=>v!==null);
    el('avgSwell').innerText = waves.length ? (waves.reduce((a,b)=>a+b,0)/waves.length).toFixed(1)+' m' : '--';

    const windDirs = data.hours.map(h => get(h,'windDirection')).filter(v=>v!==null);
    if (windDirs.length) {
      el('mapOverlay').innerText = 'Wind dir (avg): ' + Math.round(windDirs.reduce((a,b)=>a+b,0)/windDirs.length)+'°';
    }

  })
  .catch(err => console.error("Error fetching Stormglass data via Worker:", err));
