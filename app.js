const WEATHER_LAT = -37.216906;
const WEATHER_LON = 175.87488;
const SURF_LAT    = -37.208123;
const SURF_LON    = 175.882323;

const CAMS = [
  'https://corolive.nz/whangamata',
  'https://embed.cdn-surfline.com/cams/62ba531abf8f1d75931c9d4f/822692fdfc5bd06fb24529c6e5dc203282e425c4'
];
let currentCam = 0;
let currentDate = new Date(); // selected day

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
function createChart(ctx,label,bgColor,borderColor){
  return new Chart(ctx,{
    type:'line',
    data:{labels:[], datasets:[{label:label,data:[],fill:true,backgroundColor:bgColor,borderColor:borderColor,pointRadius:0}]},
    options:{
      responsive:true,
      plugins:{
        legend:{display:false},
        annotation:{annotations:{}}
      },
      scales:{x:{display:true},y:{beginAtZero:true}}
    },
    plugins:[ChartAnnotation]
  });
}

// Load Chart.js annotation plugin
const ChartAnnotation = {
  id: 'annotation',
  afterDraw(chart){
    if(!chart.options.plugins.annotation || !chart.options.plugins.annotation.annotations) return;
    Object.values(chart.options.plugins.annotation.annotations).forEach(a=>{
      if(a.type==='line' && a.x!==undefined){
        const ctx = chart.ctx;
        const xScale = chart.scales.x;
        const yScale = chart.scales.y;
        const xPos = xScale.getPixelForValue(a.x);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(xPos,yScale.top);
        ctx.lineTo(xPos,yScale.bottom);
        ctx.lineWidth = a.borderWidth||2;
        ctx.strokeStyle = a.borderColor||'red';
        ctx.stroke();
        ctx.restore();
      }
    });
  }
};

const windChart = createChart(el('windChart').getContext('2d'),'Wind Speed (m/s)','rgba(59,130,246,0.2)','#3b82f6');
const rainChart = createChart(el('rainChart').getContext('2d'),'Precipitation (mm)','rgba(16,185,129,0.2)','#10b981');
const uvChart   = createChart(el('uvChart').getContext('2d'),'UV Index','rgba(245,158,11,0.2)','#f59e0b');
const waveChart = createChart(el('waveChart').getContext('2d'),'Wave Height (m)','rgba(239,68,68,0.2)','#ef4444');

// ---------------------------
// Date display
function updateDateTime(){
  const today = new Date();
  const dateStr = currentDate.toLocaleDateString(undefined,{weekday:'long',year:'numeric',month:'short',day:'numeric'});
  const timeStr = today.toLocaleTimeString();
  el('dateTime').innerText = `Selected Day: ${dateStr} | Current Time: ${timeStr}`;
}
setInterval(updateDateTime,1000);
updateDateTime();

// ---------------------------
// Add vertical line for current hour
function updateCurrentLine(chart){
  const now = new Date();
  const isToday = currentDate.toDateString()===now.toDateString();
  if(!isToday){chart.options.plugins.annotation.annotations={}; return;}
  const hour = now.getHours();
  chart.options.plugins.annotation.annotations.currentHour = {type:'line', x:hour, borderColor:'red', borderWidth:2};
}

// ---------------------------
// Fetch weather
async function fetchWeather(){
  const dateStr = currentDate.toISOString().split('T')[0];
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${WEATHER_LAT}&longitude=${WEATHER_LON}&hourly=wind_speed_10m,precipitation,uv_index&timezone=auto&start_date=${dateStr}&end_date=${dateStr}`;
  const res = await fetch(url);
  if(!res.ok){console.error('Weather fetch failed',res.status); return;}
  const data = await res.json();
  const times = data.hourly.time.map(t=>new Date(t).getHours());

  windChart.data.labels = times;
  windChart.data.datasets[0].data = data.hourly.wind_speed_10m;
  updateCurrentLine(windChart); windChart.update();

  rainChart.data.labels = times;
  rainChart.data.datasets[0].data = data.hourly.precipitation;
  updateCurrentLine(rainChart); rainChart.update();

  uvChart.data.labels = times;
  uvChart.data.datasets[0].data = data.hourly.uv_index;
  updateCurrentLine(uvChart); uvChart.update();

  // Summary
  const windAvg = data.hourly.wind_speed_10m.reduce((a,b)=>a+b,0)/data.hourly.wind_speed_10m.length;
  const rainTotal = data.hourly.precipitation.reduce((a,b)=>a+b,0);
  const uvAvg = data.hourly.uv_index.reduce((a,b)=>a+b,0)/data.hourly.uv_index.length;
  el('avgWind').innerText = windAvg.toFixed(1)+' m/s';
  el('totalRain').innerText = rainTotal.toFixed(1)+' mm';
  el('avgUV').innerText = uvAvg.toFixed(1);
}

// ---------------------------
// Fetch waves (marine API)
async function fetchWaves(){
  const dateStr = currentDate.toISOString().split('T')[0];
  const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${SURF_LAT}&longitude=${SURF_LON}&hourly=wave_height&timezone=auto&start_date=${dateStr}&end_date=${dateStr}`;
  const res = await fetch(url);
  if(!res.ok){console.error('Wave fetch failed',res.status); return;}
  const data = await res.json();
  const times = data.hourly.time.map(t=>new Date(t).getHours());

  waveChart.data.labels = times;
  waveChart.data.datasets[0].data = data.hourly.wave_height;
  updateCurrentLine(waveChart); waveChart.update();

  const avgWave = data.hourly.wave_height.reduce((a,b)=>a+b,0)/data.hourly.wave_height.length;
  el('avgWave').innerText = avgWave.toFixed(1)+' m';
}

// ---------------------------
// Previous / Next Day Buttons
const nextBtn = el('nextDayBtn');
const prevBtn = document.createElement('button');
prevBtn.innerText='Previous Day';
prevBtn.style.marginRight='10px';
nextBtn.parentNode.insertBefore(prevBtn,nextBtn);

function loadDay(){
  fetchWeather();
  fetchWaves();
  updateDateTime();
}

prevBtn.addEventListener('click',()=>{
  currentDate.setDate(currentDate.getDate()-1);
  loadDay();
});
nextBtn.addEventListener('click',()=>{
  currentDate.setDate(currentDate.getDate()+1);
  loadDay();
});

// ---------------------------
// Init
loadDay();
setInterval(()=>{fetchWeather(); fetchWaves();},30*60*1000);
