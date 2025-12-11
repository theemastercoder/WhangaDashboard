// --------------------------------------
// Whangamatā Surf Dashboard — app.js
// Uses Open‑Meteo marine API for waves, wind, UV, rain, tide, sunset
// --------------------------------------

const LAT  = -37.209;
const LON  = 175.873;
const TZ   = 'Pacific/Auckland';

// List of working public cams (embedable or URL) — add more if you find stable ones
const CAMS = [
  'https://corolive.nz/whangamata',
  'https://embed.cdn-surfline.com/cams/62ba531abf8f1d75931c9d4f/822692fdfc5bd06fb24529c6e5dc203282e425c4'
];

let currentCam = 0;

function el(id) { return document.getElementById(id); }

// Setup cam‑switch buttons
CAMS.forEach((url, i) => {
  const btn = el('camBtn' + (i + 2));
  if (btn) {
    btn.addEventListener('click', () => setCam(i));
  }
});

function setCam(i) {
  currentCam = i;
  CAMS.forEach((_, j) => {
    const btn = el('camBtn' + (j + 2));
    if (btn) btn.classList.toggle('active', j === i);
  });
  const frame = el('camFrame');
  if (frame) frame.src = CAMS[i];
}

// initialize first cam
setCam(0);

// Setup charts using Chart.js
const uvChart    = new Chart(el('uvChart').getContext('2d'),    { type:'line', data:{labels:[],datasets:[{label:'UV index',data:[],fill:true}] } });
const windChart  = new Chart(el('windChart').getContext('2d'),  { type:'line', data:{labels:[],datasets:[{label:'Wind speed (m/s)',data:[],fill:true}] } });
const rainChart  = new Chart(el('rainChart').getContext('2d'),  { type:'line', data:{labels:[],datasets:[{label:'Precipitation (mm)',data:[],fill:true}] } });
const swellChart = new Chart(el('swellChart').getContext('2d'), { type:'line', data:{labels:[],datasets:[{label:'Wave height (m)',data:[],fill:true}] } });
const tideChart  = new Chart(el('tideChart').getContext('2d'),  { type:'line', data:{labels:[],datasets:[{label:'Sea level + tide (m)',data:[],fill:true}] } });

async function fetchData() {
  const apiUrl = `https://api.open-meteo.com/v1/marine` +
    `?latitude=${LAT}&longitude=${LON}` +
    `&hourly=wave_height,wave_direction,wave_period,wind_speed,wind_direction,uv_index,precipitation` +
    `&daily=sunrise,sunset` +
    `&timezone=${encodeURIComponent(TZ)}`;

  try {
    const resp = await fetch(apiUrl);
    if (!resp.ok) {
      console.error('Open‑Meteo fetch failed:', resp.status, resp.statusText);
      return;
    }
    const data = await resp.json();
    if (!data.hourly) {
      console.error('Open‑Meteo: no hourly data', data);
      return;
    }

    const times = data.hourly.time.map(s =>
      new Date(s).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })
    );

    // UV
    uvChart.data.labels = times;
    uvChart.data.datasets[0].data = data.hourly.uv_index;
    uvChart.update();

    // Wind
    windChart.data.labels = times;
    windChart.data.datasets[0].data = data.hourly.wind_speed;
    windChart.update();

    // Rain
    rainChart.data.labels = times;
    rainChart.data.datasets[0].data = data.hourly.precipitation;
    rainChart.update();

    // Swell / Wave height
    swellChart.data.labels = times;
    swellChart.data.datasets[0].data = data.hourly.wave_height;
    swellChart.update();

    // Tide / Sea level (approx via wave_height or sea_level if supported)
    tideChart.data.labels = times;
    tideChart.data.datasets[0].data = data.hourly.sea_level_height_msl
      ? data.hourly.sea_level_height_msl
      : data.hourly.wave_height;
    tideChart.update();

    // Summary numbers
    const avgWind = (data.hourly.wind_speed.reduce((a,b)=>a+b,0) / data.hourly.wind_speed.length).toFixed(1) + ' m/s';
    const avgWave = (data.hourly.wave_height.reduce((a,b)=>a+b,0) / data.hourly.wave_height.length).toFixed(1) + ' m';
    el('avgWind').innerText = avgWind;
    el('avgSwell').innerText = avgWave;

    if (data.daily && data.daily.sunset && data.daily.sunset.length) {
      const sunset = new Date(data.daily.sunset[0]).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' });
      el('sunset').innerText = 'Sunset: ' + sunset;
    }

    // Simple wind‑direction average (not very meaningful, but placeholder)
    if (data.hourly.wind_direction) {
      const avgDir = Math.round(data.hourly.wind_direction.reduce((a,b)=>a+b,0) / data.hourly.wind_direction.length);
      el('mapOverlay').innerText = 'Wind dir (avg): ' + avgDir + '°';
    }

  } catch (err) {
    console.error('fetchData error', err);
  }
}

// Initial fetch + repeat every 10 minutes
fetchData();
setInterval(fetchData, 10 * 60 * 1000);
