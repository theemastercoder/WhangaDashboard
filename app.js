const WEATHER_LAT = -37.216906;
const WEATHER_LON = 175.87488;
const SURF_LAT    = -37.208123;
const SURF_LON    = 175.882323;

const CAMS = [
  'https://corolive.nz/whangamata',
  'https://embed.cdn-surfline.com/cams/62ba531abf8f1d75931c9d4f/822692fdfc5bd06fb24529c6e5dc203282e425c4'
];
let currentCam = 0;
let currentDate = new Date();

function el(id){return document.getElementById(id);}

// ---------------------------
// Cameras
CAMS.forEach((url,i)=>{
  const btn = el('camBtn'+(i+2));
  if(btn) btn.addEventListener('click',()=>setCam(i));
});
function setCam(i){
  currentCam=i;
  CAMS.forEach((_,j)=>{
    const btn=el('camBtn'+(j+2));
    if(btn) btn.classList.toggle('active',i===j);
  });
  el('camFrame').src = CAMS[i];
}
setCam(0);
setInterval(()=>{ el('camFrame').src=el('camFrame').src.split('?')[0]+'?t='+Date.now(); }, 60000);

// ---------------------------
// Charts
function createChart(ctx,label,bgColor,borderColor,stacked=false){
  return new Chart(ctx,{
    type:'line',
    data:{labels:[], datasets:[{label:label,data:[],fill:true,backgroundColor:bgColor,borderColor:borderColor,pointRadius:0}]},
    options:{
      responsive:true,
      plugins:{legend:{display:true}},
      scales:{x:{display:true},y:{beginAtZero:true, stacked:stacked}}
    }
  });
}

const windChart = createChart(el('windChart').getContext('2d'),'Wind Speed','rgba(59,130,246,0.2)','#3b82f6');
const rainChart = createChart(el('rainChart').getContext('2d'),'Precipitation','rgba(16,185,129,0.2)','#10b981');
const uvChart   = createChart(el('uvChart').getContext('2d'),'UV Index','rgba(245,158,11,0.2)','#f59e0b');

// Wave chart with two datasets: Swell (bottom) + Wind Waves (top)
const waveChart = new Chart(el('waveChart').getContext('2d'),{
  type:'bar',
  data:{labels:[], datasets:[
    {label:'Swell', data:[], backgroundColor:'rgba(239,68,68,0.5)'},
    {label:'Wind Waves', data:[], backgroundColor:'rgba(239,68,68,1)'}
  ]},
  options:{
    responsive:true,
    plugins:{legend:{display:true}},
    scales:{x:{stacked:true}, y:{stacked:true, beginAtZero:true}}
  }
});

// ---------------------------
// Update date display
function updateDateDisplay(){
  const options={weekday:'long', year:'numeric', month:'short', day:'numeric'};
  el('dateDisplay').innerText = currentDate.toLocaleDateString(undefined,options);
}

// ---------------------------
// Fetch weather
async function fetchWeather(){
  const dateStr = currentDate.toISOString().split('T')[0];
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${WEATHER_LAT}&longitude=${WEATHER_LON}&hourly=wind_speed_10m,precipitation,uv_index&timezone=auto&start_date=${dateStr}&end_date=${dateStr}`;
  const res = await fetch(url);
  if(!res.ok){console.error('Weather fetch failed',res.status); return;}
  const data = await res.json();
  const hours = data.hourly.time.map(t=>new Date(t).getHours()+':00');

  windChart.data.labels = hours;
  windChart.data.datasets[0].data = data.hourly.wind_speed_10m;
  windChart.update();

  rainChart.data.labels = hours;
  rainChart.data.datasets[0].data = data.hourly.precipitation;
  rainChart.update();

  uvChart.data.labels = hours;
  uvChart.data.datasets[0].data = data.hourly.uv_index;
  uvChart.update();

  // Summary
  const windAvg = data.hourly.wind_speed_10m.reduce((a,b)=>a+b,0)/data.hourly.wind_speed_10m.length;
  const rainTotal = data.hourly.precipitation.reduce((a,b)=>a+b,0);
  const uvAvg = data.hourly.uv_index.reduce((a,b)=>a+b,0)/data.hourly.uv_index.length;
  el('avgWind').innerText = windAvg.toFixed(1)+' m/s';
  el('totalRain').innerText = rainTotal.toFixed(1)+' mm';
  el('avgUV').innerText = uvAvg.toFixed(1);
}

// ---------------------------
// Fetch waves (marine API with Swell + Wind Waves)
async function fetchWaves(){
  const dateStr = currentDate.toISOString().split('T')[0];
  const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${SURF_LAT}&longitude=${SURF_LON}&hourly=wave_height,swell_height&timezone=auto&start_date=${dateStr}&end_date=${dateStr}`;
  const res = await fetch(url);
  if(!res.ok){console.error('Wave fetch failed',res.status); return;}
  const data = await res.json();
  const hours = data.hourly.time.map(t=>new Date(t).getHours()+':00');

  waveChart.data.labels = hours;
  waveChart.data.datasets[0].data = data.hourly.swell_height;   // bottom layer
  waveChart.data.datasets[1].data = data.hourly.wave_height.map((v,i)=>v - data.hourly.swell_height[i]); // top layer
  waveChart.update();

  const totalWaveAvg = data.hourly.wave_height.reduce((a,b)=>a+b,0)/data.hourly.wave_height.length;
  el('avgWave').innerText = totalWaveAvg.toFixed(1)+' m';
}

// ---------------------------
// Previous / Next day
el('prevDayBtn').addEventListener('click',()=>{
  currentDate.setDate(currentDate.getDate()-1);
  loadDay();
});
el('nextDayBtn').addEventListener('click',()=>{
  currentDate.setDate(currentDate.getDate()+1);
  loadDay();
});

function loadDay(){
  updateDateDisplay();
  fetchWeather();
  fetchWaves();
}

// ---------------------------
// Initialize
loadDay();
setInterval(()=>{fetchWeather(); fetchWaves();},30*60*1000);
