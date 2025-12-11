// ---------------------------
// Whangamatā Surf Dashboard (Stormglass version)
// ---------------------------

// Your coordinates
const LAT = -37.209;
const LON = 175.873;

// Stormglass API key
const STORMGLASS_KEY = "0bf997b2-d660-11f0-a8f4-0242ac130003-0bf9988e-d660-11f0-a8f4-0242ac130003";

// Cams
const CAMS = [
  'https://corolive.nz/whangamata',
  'https://embed.cdn-surfline.com/cams/62ba531abf8f1d75931c9d4f/822692fdfc5bd06fb24529c6e5dc203282e425c4'
  'https://webcams.selectsolutions.co.nz/cddd3df5-ea07-47ac-9eec-39e3f01ca740.html'
  
];
let currentCam = 0;

// Helper
function el(id) { return document.getElementById(id); }

// ---------------------------
// Cam switch logic
// ---------------------------
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

// Initial cam
setCam(0);

// ---------------------------
// Cam auto-refresh every 60s
// ---------------------------
function refreshCam() {
  const frame = el('camFrame');
  if (frame) {
    frame.src = frame.src.split('?')[0] + '?t=' + Date.now();
  }
}
setInterval(refreshCam, 60 * 1000);

// ---------------------------
// Charts (Chart.js)
const uvChart    = new Chart(el('uvChart').getContext('2d'), { type:'line', data:{labels:[], datasets:[{label:'UV index', data:[], fill:true}] } });
const windChart  = new Chart(el('windChart').getContext('2d'), { type:'line', data:{labels:[], datasets:[{label:'Wind speed (m/s)', data:[], fill:true}] } });
const rainChart  = new Chart(el('rainChart').getContext('2d'), { type:'line', data:{labels:[], datasets:[{label:'Precipitation (mm)', data:[], fill:true}] } });
const swellChart = new Chart(el('swellChart').getContext('2d'), { type:'line', data:{labels:[], datasets:[{label:'Wave height (m)', data:[], fill:true}] } });
const tideChart  = new Chart(el('tideChart').getContext('2d'), { type:'line', data:{labels:[], datasets:[{label:'Tide / Sea level (m)', data:[], fill:true}] } });

// ---------------------------
// Fetch Stormglass data once
// ---------------------------
async function fetchStormglass() {
  const params = [
    'airTemperature',
    'precipitation',
    'windSpeed',
    'windDirection',
    'waveHeight',
    'waveDirection',
    'swellHeight',
    'swellDirection',
    'uvIndex',
    'tideHeight'
  ].join(',');

  const url = `https://api.stormglass.io/v2/weather/point?lat=${LAT}&lng=${LON}&params=${params}`;

  try {
    const resp = await fetch(url, {
      headers: {
        'Authorization': STORMGLASS_KEY
      }
    });
    if (!resp.ok) {
      console.error('Stormglass fetch failed:', resp.status, resp.statusText);
      return;
    }

    const data = await resp.json();
    if (!data.hours) {
      console.error('Stormglass: invalid data', data);
      return;
    }

    // Use the first available source for each variable
    const extract = (variable) => data.hours.map(h => h[variable]?.sg || null);
    const times = data.hours.map(h => new Date(h.time).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' }));

    // UV
    uvChart.data.labels = times;
    uvChart.data.datasets[0].data = extract('uvIndex');
    uvChart.update();

    // Wind
    windChart.data.labels = times;
    windChart.data.datasets[0].data = extract('windSpeed');
    windChart.update();

    // Rain
    rainChart.data.labels = times;
    rainChart.data.datasets[0].data = extract('precipitation');
    rainChart.update();

    // Swell / wave height
    swellChart.data.labels = times;
    swellChart.data.datasets[0].data = extract('waveHeight');
    swellChart.update();

    // Tide
    tideChart.data.labels = times;
    tideChart.data.datasets[0].data = extract('tideHeight');
    tideChart.update();

    // Summary: average wind
    const windData = extract('windSpeed').filter(v => v !== null);
    const avgWind = (windData.reduce((a,b)=>a+b,0)/windData.length).toFixed(1) + ' m/s';
    el('avgWind').innerText = avgWind;

    // Summary: average swell
    const swellData = extract('waveHeight').filter(v => v !== null);
    const avgSwell = (swellData.reduce((a,b)=>a+b,0)/swellData.length).toFixed(1) + ' m';
    el('avgSwell').innerText = avgSwell;

    // Average wind direction
    const windDirData = extract('windDirection').filter(v => v !== null);
    if (windDirData.length) {
      const avgDir = Math.round(windDirData.reduce((a,b)=>a+b,0)/windDirData.length);
      el('mapOverlay').innerText = 'Wind dir (avg): ' + avgDir + '°';
    }

    // Sunset placeholder: Stormglass may not provide sunset directly; you could compute or skip

  } catch (err) {
    console.error('fetchStormglass error', err);
  }
}

// Fetch data once
fetchStormglass();
