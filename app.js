// ---------------------------
// CONFIG
const WEATHER_LAT = -37.216906;
const WEATHER_LON = 175.87488;
const SURF_LAT    = -37.208123;
const SURF_LON    = 175.882323;
const WORKER_URL  = "https://stormglassproxy.o-mcguinness.workers.dev"; // Stormglass for waves

const CAMS = [
  'https://corolive.nz/whangamata',
  'https://embed.cdn-surfline.com/cams/62ba531abf8f1d75931c9d4f/822692fdfc5bd06fb24529c6e5dc203282e425c4'
];
let currentCam = 0;

function el(id) { return document.getElementById(id); }

// ---------------------------
// CAMERAS
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
const windChart = new Chart(el('windChart').getContext('2d'), {
  type:'line', data:{labels:[], datasets:[{label:'Wind speed', data:[], fill:true, backgroundColor:'rgba(59,130,246,0.2)', borderColor:'#3b82f6'}]}
});
const rainChart = new Chart(el('rainChart').getContext('2d'), {
  type:'line', data:{labels:[], datasets:[{label:'Precipitation', data:[], fill:true, backgroundColor:'rgba(16,185,129,0.2)', borderColor:'#10b981'}]}
});
const uvChart = new Chart(el('uvChart').getContext('2d'), {
  type:'line', data:{labels:[], datasets:[{label:'UV Index', data:[], fill:true, backgroundColor:'rgba(245,158,11,0.2)', borderColor:'#f59e0b'}]}
});
const waveChart = new Chart(el('waveChart').getContext('2d'), {
  type:'line', data:{labels:[], datasets:[{label:'Wave Height', data:[], fill:true, backgroundColor:'rgba(239,68,68,0.2)', borderColor:'#ef4444'}]}
});

// ---------------------------
// FETCH Open-Meteo (Weather)
async function fetchWeather() {
  const start = new Date().toISOString().split('T')[0];
  const end = new Date(Date.now() + 24*3600*1000).toISOString().split('T')[0];

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${WEATHER_LAT}&longitude=${WEATHER_LON}&hourly=wind_speed_10m,wind_direction_10m,precipitation,uv_index&timezone=auto&start_date=${start}&end_date=${end}`;
  const res = await fetch(url);
  const data = await res.json();
  const times = data.hourly.time.map(t => new Date(t).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));

  // Wind chart
  windChart.data.labels = times;
  windChart.data.datasets[0].data = data.hourly.wind_speed_10m;
  windChart.update();

  // Rain chart
  rainChart.data.labels = times;
  rainChart.data.datasets[0].data = data.hourly.precipitation;
  rainChart.update();

  // UV chart
  uvChart.data.labels = times;
  uvChart.data.datasets[0].data = data.hourly.uv_index;
  uvChart.update();

  // Daily summary
  const windAvg = data.hourly.wind_speed_10m.reduce((a,b)=>a+b,0)/data.hourly.wind_speed_10m.length;
  const rainTotal = data.hourly.precipitation.reduce((a,b)=>a+b,0);
  const uvAvg = data.hourly.uv_index.reduce((a,b)=>a+b,0)/data.hourly.uv_index.length;

  el('avgWind').innerText = windAvg.toFixed(1)+' m/s';
  el('totalRain').innerText = rainTotal.toFixed(1)+' mm';
  el('avgUV').innerText = uvAvg.toFixed(1);
}

// ---------------------------
// FETCH Stormglass (Waves)
async function fetchWaves() {
  const params = "waveHeight,swellHeight,swellDirection";
  const start = new Date().toISOString();
  const end = new Date(Date.now() + 24*3600*1000).toISOString();
  const url = `${WORKER_URL}?lat=${SURF_LAT}&lng=${SURF_LON}&params=${params}&start=${start}&end=${end}`;

  const res = await fetch(url);
  const data = await res.json();
  if (!data.hours || data.hours.length===0) return;

  const times = data.hours.map(h => new Date(h.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
  const get = (h,v) => (h[v] && h[v].sg != null)? h[v].sg:null;

  waveChart.data.labels = times;
  waveChart.data.datasets[0].data = data.hours.map(h => get(h,'waveHeight'));
  waveChart.update();

  // Daily average
  const avgWave = data.hours.map(h => get(h,'waveHeight')).filter(v=>v!==null);
  el('avgWave').innerText = avgWave.length ? (avgWave.reduce((a,b)=>a+b,0)/avgWave.length).toFixed(1)+' m':'--';
}

// ---------------------------
// INIT
fetchWeather();
fetchWaves();
setInterval(fetchWeather, 30*60*1000); // Refresh every 30 mins
setInterval(fetchWaves, 30*60*1000);
