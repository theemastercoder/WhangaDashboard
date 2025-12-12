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
function pad(n){return n<10?'0'+n:n;}

// Cameras
CAMS.forEach((url,i)=>{
  const btn=el('camBtn'+(i+2));
  if(btn) btn.addEventListener('click',()=>setCam(i));
});
function setCam(i){
  currentCam=i;
  CAMS.forEach((_,j)=>{
    const btn=el('camBtn'+(j+2));
    if(btn) btn.classList.toggle('active',i===j);
  });
  el('camFrame').src=CAMS[i];
}
setCam(0);
setInterval(()=>{el('camFrame').src=el('camFrame').src.split('?')[0]+'?t='+Date.now();},60000);

// Charts
const chartOptions = {
  type:'line',
  data:{labels:[], datasets:[{label:'', data:[], fill:true, backgroundColor:'rgba(59,130,246,0.2)', borderColor:'#3b82f6'}]},
  options:{
    responsive:true,
    plugins:{legend:{display:false}},
    scales:{x:{display:true},y:{beginAtZero:true}},
  }
};
const windChart = new Chart(el('windChart').getContext('2d'), JSON.parse(JSON.stringify(chartOptions)));
windChart.data.datasets[0].label='Wind Speed (m/s)';
const rainChart = new Chart(el('rainChart').getContext('2d'), JSON.parse(JSON.stringify(chartOptions)));
rainChart.data.datasets[0].label='Precipitation (mm)'; rainChart.data.datasets[0].backgroundColor='rgba(16,185,129,0.2)'; rainChart.data.datasets[0].borderColor='#10b981';
const uvChart = new Chart(el('uvChart').getContext('2d'), JSON.parse(JSON.stringify(chartOptions)));
uvChart.data.datasets[0].label='UV Index'; uvChart.data.datasets[0].backgroundColor='rgba(245,158,11,0.2)'; uvChart.data.datasets[0].borderColor='#f59e0b';
const waveChart = new Chart(el('waveChart').getContext('2d'), JSON.parse(JSON.stringify(chartOptions)));
waveChart.data.datasets[0].label='Wave Height (m)'; waveChart.data.datasets[0].backgroundColor='rgba(239,68,68,0.2)'; waveChart.data.datasets[0].borderColor='#ef4444';

// Date display
function updateDateTime(){el('dateTime').innerText=new Date().toLocaleString();}
setInterval(updateDateTime,1000);
updateDateTime();

// Fetch weather
async function fetchWeather(){
  const dateStr = currentDate.toISOString().split('T')[0];
  const url=`https://api.open-meteo.com/v1/forecast?latitude=${WEATHER_LAT}&longitude=${WEATHER_LON}&hourly=wind_speed_10m,wind_direction_10m,precipitation,uv_index&timezone=auto&start_date=${dateStr}&end_date=${dateStr}`;
  const res = await fetch(url); const data = await res.json();
  const times=data.hourly.time.map(t=>new Date(t).getHours()+':00');
  windChart.data.labels=times; windChart.data.datasets[0].data=data.hourly.wind_speed_10m; addCurrentLine(windChart);
  rainChart.data.labels=times; rainChart.data.datasets[0].data=data.hourly.precipitation; addCurrentLine(rainChart);
  uvChart.data.labels=times; uvChart.data.datasets[0].data=data.hourly.uv_index; addCurrentLine(uvChart);
  windChart.update(); rainChart.update(); uvChart.update();

  // Summary
  const windAvg=data.hourly.wind_speed_10m.reduce((a,b)=>a+b,0)/data.hourly.wind_speed_10m.length;
  const rainTotal=data.hourly.precipitation.reduce((a,b)=>a+b,0);
  const uvAvg=data.hourly.uv_index.reduce((a,b)=>a+b,0)/data.hourly.uv_index.length;
  el('avgWind').innerText=windAvg.toFixed(1)+' m/s';
  el('totalRain').innerText=rainTotal.toFixed(1)+' mm';
  el('avgUV').innerText=uvAvg.toFixed(1);
}

// Fetch waves
async function fetchWaves(){
  const dateStr = currentDate.toISOString().split('T')[0];
  const url=`https://api.open-meteo.com/v1/forecast?latitude=${SURF_LAT}&longitude=${SURF_LON}&hourly=wave_height&timezone=auto&start_date=${dateStr}&end_date=${dateStr}`;
  const res = await fetch(url); const data = await res.json();
  const times=data.hourly.time.map(t=>new Date(t).getHours()+':00');
  waveChart.data.labels=times; waveChart.data.datasets[0].data=data.hourly.wave_height; addCurrentLine(waveChart);
  waveChart.update();
  const avgWave=data.hourly.wave_height.reduce((a,b)=>a+b,0)/data.hourly.wave_height.length;
  el('avgWave').innerText=avgWave.toFixed(1)+' m';
}

// Add vertical line for current time
function addCurrentLine(chart){
  const nowHour=new Date().getHours();
  chart.options.plugins.annotation={annotations:{line:{type:'line',xMin:nowHour,xMax:nowHour,borderColor:'red',borderWidth:2}}};
}

// Next day button
el('nextDayBtn').addEventListener('click',()=>{
  currentDate.setDate(currentDate.getDate()+1);
  fetchWeather(); fetchWaves();
});

// Init
fetchWeather(); fetchWaves();
setInterval(()=>{fetchWeather(); fetchWaves();},30*60*1000);
