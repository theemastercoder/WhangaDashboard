// ---------------------------
// Whangamatā Surf Dashboard — simplified working fetch style
// ---------------------------

const LAT = -37.209;
const LON = 175.873;
const API_KEY = "0bf997b2-d660-11f0-a8f4-0242ac130003-0bf9988e-d660-11f0-a8f4-0242ac130003"; // replace with your Stormglass key

// cams
const CAMS = [
  'https://corolive.nz/whangamata',
  'https://embed.cdn-surfline.com/cams/62ba531abf8f1d75931c9d4f/822692fdfc5bd06fb24529c6e5dc203282e425c4'
];
let currentCam = 0;
function el(id) { return document.getElementById(id); }

// ---------------------------
// Cam setup
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
// Charts

const windChart  = new Chart(el('windChart').getContext('2d'),  { type:'line', data:{labels:[], datasets:[{label:'Wind speed (m/s)', data:[], fill:true}] } });
const rainChart  = new Chart(el('rainChart').getContext('2d'),  { type:'line', data:{labels:[], datasets:[{label:'Precipitation (mm)', data:[], fill:true}] } });
const swellChart = new Chart(el('swellChart').getContext('2d'), { type:'line', data:{labels:[], datasets:[{label:'Wave height (m)', data:[], fill:true}] } });

// ---------------------------
// Fetch Stormglass weather (simplified working pattern)
const params = 'windSpeed,windDirection,waveHeight,swellHeight,swellDirection,precipitation';

fetch(`https://api.stormglass.io/v2/weather/point?lat=${LAT}&lng=${LON}&params=${params}`, {
  headers: { 'Authorization': API_KEY }
})
.then(response => response.json())
.then(data => {
  if (!data.hours) return console.error('No data returned');

  const times = data.hours.map(h => new Date(h.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
  const get = (h, v) => (h[v] && h[v].sg != null) ? h[v].sg : null;



  // Wind
  windChart.data.labels = times;
  windChart.data.datasets[0].data = data.hours.map(h => get(h, 'windSpeed'));
  windChart.update();

  // Rain
  rainChart.data.labels = times;
  rainChart.data.datasets[0].data = data.hours.map(h => get(h, 'precipitation'));
  rainChart.update();

  // Swell / Wave
  swellChart.data.labels = times;
  swellChart.data.datasets[0].data = data.hours.map(h => get(h, 'waveHeight'));
  swellChart.update();

  // Summary
  const windSpeeds = data.hours.map(h => get(h, 'windSpeed')).filter(v => v!==null);
  el('avgWind').innerText = windSpeeds.length ? (windSpeeds.reduce((a,b)=>a+b,0)/windSpeeds.length).toFixed(1)+' m/s' : '--';
  const waves = data.hours.map(h => get(h, 'waveHeight')).filter(v => v!==null);
  el('avgSwell').innerText = waves.length ? (waves.reduce((a,b)=>a+b,0)/waves.length).toFixed(1)+' m' : '--';
  const windDirs = data.hours.map(h => get(h,'windDirection')).filter(v=>v!==null);
  if(windDirs.length) el('mapOverlay').innerText = 'Wind dir (avg): ' + Math.round(windDirs.reduce((a,b)=>a+b,0)/windDirs.length)+'°';

})
.catch(err => console.error('Stormglass fetch error', err));
