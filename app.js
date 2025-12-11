// ---------------------------
// Whangamatā Surf Dashboard (Stormglass)
// ---------------------------

const LAT = -37.209;
const LON = 175.873;
const STORMGLASS_KEY = "<YOUR_API_KEY>"; // replace with your key

// cams
const CAMS = [
  'https://corolive.nz/whangamata',
  'https://embed.cdn-surfline.com/cams/62ba531abf8f1d75931c9d4f/822692fdfc5bd06fb24529c6e5dc203282e425c4'
];
let currentCam = 0;

// helper
function el(id){ return document.getElementById(id); }

// ---------------------------
// cam buttons
CAMS.forEach((url,i)=>{
  const btn = el('camBtn'+(i+2));
  if(btn) btn.addEventListener('click',()=>setCam(i));
});

function setCam(i){
  currentCam=i;
  CAMS.forEach((_,j)=>{
    const btn = el('camBtn'+(j+2));
    if(btn) btn.classList.toggle('active', i===j);
  });
  const frame = el('camFrame');
  if(frame) frame.src=CAMS[i];
}
setCam(0);

// ---------------------------
// cam auto refresh
function refreshCam(){
  const frame = el('camFrame');
  if(frame){
    frame.src = frame.src.split('?')[0] + '?t=' + Date.now();
  }
}
setInterval(refreshCam, 60*1000);

// ---------------------------
// charts
const uvChart = new Chart(el('uvChart').getContext('2d'), {type:'line', data:{labels:[], datasets:[{label:'UV index', data:[], fill:true}]}});
const windChart = new Chart(el('windChart').getContext('2d'), {type:'line', data:{labels:[], datasets:[{label:'Wind speed (m/s)', data:[], fill:true}]}});
const rainChart = new Chart(el('rainChart').getContext('2d'), {type:'line', data:{labels:[], datasets:[{label:'Precipitation (mm)', data:[], fill:true}]}});
const swellChart = new Chart(el('swellChart').getContext('2d'), {type:'line', data:{labels:[], datasets:[{label:'Wave height (m)', data:[], fill:true}]}});
const tideChart = new Chart(el('tideChart').getContext('2d'), {type:'line', data:{labels:[], datasets:[{label:'Tide / Sea level (m)', data:[], fill:true}]}});

// ---------------------------
// fetch Stormglass
async function fetchStormglass(){
  const params = [
    'airTemperature',
    'precipitation',
    'windSpeed',
    'windDirection',
    'waveHeight',
    'waveDirection',
    'swellHeight',
    'swellDirection',
    'uvIndex'
  ].join(',');
  
  const url = `https://api.stormglass.io/v2/weather/point?lat=${LAT}&lng=${LON}&params=${params}`;

  try{
    const resp = await fetch(url, {headers:{'Authorization': STORMGLASS_KEY}});
    if(!resp.ok){ console.error('Stormglass fetch failed', resp.status, resp.statusText); return; }
    const data = await resp.json();
    if(!data.hours){ console.error('Invalid data', data); return; }

    const extract = v => data.hours.map(h => h[v]?.sg||null);
    const times = data.hours.map(h=>new Date(h.time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));

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

    // Swell / Wave
    swellChart.data.labels = times;
    swellChart.data.datasets[0].data = extract('waveHeight');
    swellChart.update();

    // Tide chart placeholder (no tide in Stormglass)
    tideChart.data.labels = times;
    tideChart.data.datasets[0].data = Array(times.length).fill(null);
    tideChart.update();

    // summary averages
    const windData = extract('windSpeed').filter(v=>v!==null);
    el('avgWind').innerText = windData.length ? (windData.reduce((a,b)=>a+b,0)/windData.length).toFixed(1)+' m/s' : '--';
    const swellData = extract('waveHeight').filter(v=>v!==null);
    el('avgSwell').innerText = swellData.length ? (swellData.reduce((a,b)=>a+b,0)/swellData.length).toFixed(1)+' m' : '--';
    const windDirData = extract('windDirection').filter(v=>v!==null);
    if(windDirData.length){ el('mapOverlay').innerText = 'Wind dir (avg): '+Math.round(windDirData.reduce((a,b)=>a+b,0)/windDirData.length)+'°'; }

    // Sunset placeholder
    el('sunset').innerText = 'Sunset: --';

  }catch(err){ console.error('fetchStormglass error', err);}
}

// call once on page load
fetchStormglass();
