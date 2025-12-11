// ---------------------------
// Whangamatā Surf Dashboard (Open-Meteo)
// ---------------------------

// ---------------------------
// CONFIG
const LAT = -37.209;
const LON = 175.873;

// ---------------------------
// CAMERAS
const CAMS = [
  'https://corolive.nz/whangamata',
  'https://embed.cdn-surfline.com/cams/62ba531abf8f1d75931c9d4f/822692fdfc5bd06fb24529c6e5dc203282e425c4'
];
let currentCam = 0;

function el(id) { return document.getElementById(id); }

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

setCam(0);

setInterval(() => {
  const frame = el('camFrame');
  if (frame) frame.src = frame.src.split('?')[0] + '?t=' + Date.now();
}, 60000);

// ---------------------------
// CHARTS
const windChart  = new Chart(el('windChart').getContext('2d'),  { type:'line', data:{labels:[], datasets:[{label:'Wind speed (m/s)', data:[], fill:true}] } });
const rainChart  = new Chart(el('rainChart').getContext('2d'),  { type:'line', data:{labels:[], datasets:[{label:'Precipitation (mm)', data:[], fill:true}] } });

// ---------------------------
// FETCH Open-Meteo
const start = new Date().toISOString().split('T')[0];
const end   = new Date(Date.now() + 24*3600*1000).toISOString().split('T')[0];

fetch(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&hourly=wind_speed_10m,wind_direction_10m,precipitation&timezone=auto&start_date=${start}&end_date=${end}`)
  .then(res => {
    if (!res.ok) throw new Error("Network response was not ok");
    return res.json();
  })
  .then(data => {
    console.log("Open-Meteo data:", data);

    if (!data.hourly || !data.hourly.time) return console.error("No hourly data returned");

    const times = data.hourly.time.map(t => new Date(t).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));

    // Wind Chart
    windChart.data.labels = times;
    windChart.data.datasets[0].data = data.hourly.wind_speed_10m;
    windChart.update();

    // Rain Chart
    rainChart.data.labels = times;
    rainChart.data.datasets[0].data = data.hourly.precipitation;
    rainChart.update();

    // Summary
    const windSpeeds = data.hourly.wind_speed_10m.filter(v=>v!==null);
    el('avgWind').innerText = windSpeeds.length ? (windSpeeds.reduce((a,b)=>a+b,0)/windSpeeds.length).toFixed(1)+' m/s' : '--';

    const windDirs = data.hourly.wind_direction_10m.filter(v=>v!==null);
    if (windDirs.length) {
      el('mapOverlay').innerText = 'Wind dir (avg): ' + Math.round(windDirs.reduce((a,b)=>a+b,0)/windDirs.length)+'°';
    }

  })
  .catch(err => console.error("Error fetching Open-Meteo data:", err));
