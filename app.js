// Whangamatā Surf Dashboard — Stormglass (weather + tide)

// Coordinates
const LAT = -37.209;
const LON = 175.873;
const API_KEY = "0bf997b2-d660-11f0-a8f4-0242ac130003-0bf9988e-d660-11f0-a8f4-0242ac130003";  // replace with your key

// Cam config
const CAMS = [
  'https://corolive.nz/whangamata',
  'https://embed.cdn-surfline.com/cams/62ba531abf8f1d75931c9d4f/822692fdfc5bd06fb24529c6e5dc203282e425c4'
];
let currentCam = 0;

function el(id) { return document.getElementById(id); }

// Setup cam buttons
CAMS.forEach((url, i) => {
  const btn = el('camBtn'+(i+2));
  if (btn) btn.addEventListener('click', () => setCam(i));
});

function setCam(i) {
  currentCam = i;
  CAMS.forEach((_, j) => {
    const btn = el('camBtn'+(j+2));
    if (btn) btn.classList.toggle('active', i === j);
  });
  const frame = el('camFrame');
  if (frame) frame.src = CAMS[i];
}
setCam(0);

// Auto‑refresh cam every minute
function refreshCam(){
  const frame = el('camFrame');
  if(frame) frame.src = frame.src.split('?')[0] + '?t=' + Date.now();
}
setInterval(refreshCam, 60 * 1000);

// Charts
const uvChart    = new Chart(el('uvChart').getContext('2d'),    { type:'line', data:{labels:[], datasets:[{label:'UV index', data:[], fill:true}] } });
const windChart  = new Chart(el('windChart').getContext('2d'),  { type:'line', data:{labels:[], datasets:[{label:'Wind speed (m/s)', data:[], fill:true}] } });
const rainChart  = new Chart(el('rainChart').getContext('2d'),  { type:'line', data:{labels:[], datasets:[{label:'Precipitation (mm)', data:[], fill:true}] } });
const swellChart = new Chart(el('swellChart').getContext('2d'), { type:'line', data:{labels:[], datasets:[{label:'Wave height (m)', data:[], fill:true}] } });
const seaChart   = new Chart(el('tideChart').getContext('2d'),  { type:'line', data:{labels:[], datasets:[{label:'Sea level (m)', data:[], fill:true}] } });

async function fetchStormglass() {
  // 1) Fetch marine/weather data
  const weatherParams = [
    'windSpeed',
    'windDirection',
    'waveHeight',
    'waveDirection',
    'swellHeight',
    'swellDirection',
    'precipitation',
    'uvIndex'
  ].join(',');

  const weatherUrl = `https://api.stormglass.io/v2/weather/point?lat=${LAT}&lng=${LON}&params=${weatherParams}`;
  
  let weatherData;
  try {
    const resp = await fetch(weatherUrl, {
      headers: { 'Authorization': API_KEY }
    });
    if (!resp.ok) {
      console.error('Stormglass weather fetch failed', resp.status, resp.statusText);
      return;
    }
    weatherData = await resp.json();
    if (!weatherData.hours) {
      console.error('Stormglass: no weather hours data', weatherData);
      return;
    }
  } catch (e) {
    console.error('Stormglass weather request error', e);
    return;
  }

  // 2) Fetch tide / sea‑level data
  const tideUrl = `https://api.stormglass.io/v2/tide/sea-level/point?lat=${LAT}&lng=${LON}`;
  let tideData;
  try {
    const resp2 = await fetch(tideUrl, {
      headers: { 'Authorization': API_KEY }
    });
    if (!resp2.ok) {
      console.error('Stormglass tide fetch failed', resp2.status, resp2.statusText);
      // continue without tide
    } else {
      tideData = await resp2.json();
    }
  } catch (e) {
    console.error('Stormglass tide request error', e);
  }

  // Process weather data
  const times = weatherData.hours.map(h => new Date(h.time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}));
  const get = (h, v) => (h[v] && h[v].sg != null) ? h[v].sg : null;

  // UV
  uvChart.data.labels = times;
  uvChart.data.datasets[0].data = weatherData.hours.map(h => get(h, 'uvIndex'));
  uvChart.update();

  // Wind
  windChart.data.labels = times;
  windChart.data.datasets[0].data = weatherData.hours.map(h => get(h, 'windSpeed'));
  windChart.update();

  // Rain
  rainChart.data.labels = times;
  rainChart.data.datasets[0].data = weatherData.hours.map(h => get(h, 'precipitation'));
  rainChart.update();

  // Swell / Wave
  swellChart.data.labels = times;
  swellChart.data.datasets[0].data = weatherData.hours.map(h => get(h, 'waveHeight'));
  swellChart.update();

  // Sea‑level / tide, if available
  if (tideData && tideData.data) {
    const seaTimes = tideData.data.map(pt => new Date(pt.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
    const seaLevels = tideData.data.map(pt => pt.height);
    seaChart.data.labels = seaTimes;
    seaChart.data.datasets[0].data = seaLevels;
    seaChart.update();
  } else {
    // Clear tide chart or leave empty
    seaChart.data.labels = [];
    seaChart.data.datasets[0].data = [];
    seaChart.update();
  }

  // Summary: averages
  const windSpeeds = weatherData.hours.map(h => get(h, 'windSpeed')).filter(v=>v!==null);
  const avgWind = windSpeeds.length ? ( windSpeeds.reduce((a,b)=>a+b,0) / windSpeeds.length ).toFixed(1)+' m/s' : '--';
  el('avgWind').innerText = avgWind;

  const waves = weatherData.hours.map(h => get(h, 'waveHeight')).filter(v=>v!==null);
  const avgSwell = waves.length ? ( waves.reduce((a,b)=>a+b,0) / waves.length ).toFixed(1)+' m' : '--';
  el('avgSwell').innerText = avgSwell;

  const windDirs = weatherData.hours.map(h => get(h, 'windDirection')).filter(v=>v!==null);
  if (windDirs.length) {
    const avgDir = Math.round(windDirs.reduce((a,b)=>a+b,0)/windDirs.length);
    el('mapOverlay').innerText = 'Wind dir (avg): '+avgDir+'°';
  }

  // (Sunset / astronomy data not available via weather endpoint; you could use a separate astronomy endpoint if needed)
}

// Run once on load
fetchStormglass();
