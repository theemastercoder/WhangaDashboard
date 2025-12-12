document.addEventListener('DOMContentLoaded', () => {

  const SURF_LAT = -37.208123;
  const SURF_LON = 175.882323;
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

  function el(id){ return document.getElementById(id); }

  // ---------------------------
  // Cameras
  CAMS.forEach((url,i)=>{
    const btn = el('camBtn'+i);
    if(btn) btn.addEventListener('click',()=>setCam(i));
  CAMS.forEach((url, i) => {
    const btn = el('camBtn' + i);
    if (btn) btn.addEventListener('click', () => setCam(i));
  });

  function setCam(i){
    currentCam = i;
    CAMS.forEach((_,j)=>{
      const btn = el('camBtn'+j);
      if(btn) btn.classList.toggle('active', i===j);
    CAMS.forEach((_, j) => {
      const btn = el('camBtn' + j);
      if(btn) btn.classList.toggle('active', i === j);
    });
    el('camFrame').src = CAMS[i] + '?t=' + Date.now();
  }

  setCam(0);
  setInterval(()=>{ el('camFrame').src = CAMS[currentCam] + '?t=' + Date.now(); }, 60000);
  setInterval(() => { el('camFrame').src = CAMS[currentCam] + '?t=' + Date.now(); }, 60000);

  // ---------------------------
  // Wave Chart
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
  // Charts
  function createChart(ctx, label, bgColor, borderColor){
    return new Chart(ctx, {
      type:'line',
      data: { labels: [], datasets:[{ label, data: [], fill:true, backgroundColor: bgColor, borderColor: borderColor, pointRadius:0 }]},
      options: {
        responsive:true,
        plugins:{legend:{display:true}},
        scales:{x:{display:true}, y:{beginAtZero:true}}
      }
    });
  }

  const windChart = createChart(el('windChart').getContext('2d'),'Wind Speed','rgba(59,130,246,0.2)','#3b82f6');
  const rainChart = createChart(el('rainChart').getContext('2d'),'Precipitation','rgba(16,185,129,0.2)','#10b981');
  const uvChart   = createChart(el('uvChart').getContext('2d'),'UV Index','rgba(245,158,11,0.2)','#f59e0b');

  const waveChart = createChart(el('waveChart').getContext('2d'),'Total Wave Height','rgba(239,68,68,0.5)','#ef4444');

  // ---------------------------
  // Date display
  // Update date
  function updateDateDisplay(){
    const options={weekday:'long', year:'numeric', month:'short', day:'numeric'};
    el('dateDisplay').innerText = currentDate.toLocaleDateString(undefined,options);
  }

  // ---------------------------
  // Fetch Waves
  // Fetch weather
  async function fetchWeather(){
    try {
      const dateStr = currentDate.toISOString().split('T')[0];
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${WEATHER_LAT}&longitude=${WEATHER_LON}&hourly=wind_speed_10m,precipitation,uv_index&timezone=auto&start_date=${dateStr}&end_date=${dateStr}`;
      const res = await fetch(url);
      if(!res.ok) throw new Error(res.status);
      const data = await res.json();
      if(!data.hourly || !data.hourly.time) return;

      const hours = data.hourly.time.map(t => new Date(t).getHours() + ':00');
      const windData = data.hourly.wind_speed_10m.slice(0,hours.length);
      const rainData = data.hourly.precipitation.slice(0,hours.length);
      const uvData = data.hourly.uv_index.slice(0,hours.length);

      windChart.data.labels = hours;
      windChart.data.datasets[0].data = windData;
      windChart.update();

      rainChart.data.labels = hours;
      rainChart.data.datasets[0].data = rainData;
      rainChart.update();

      uvChart.data.labels = hours;
      uvChart.data.datasets[0].data = uvData;
      uvChart.update();

      el('avgWind').innerText = (windData.reduce((a,b)=>a+b,0)/windData.length).toFixed(1)+' m/s';
      el('totalRain').innerText = (rainData.reduce((a,b)=>a+b,0)).toFixed(1)+' mm';
      el('avgUV').innerText = (uvData.reduce((a,b)=>a+b,0)/uvData.length).toFixed(1);

    } catch(err){
      console.error('Weather fetch failed', err);
    }
  }

  // ---------------------------
  // Fetch waves (total only)
  async function fetchWaves(){
    try {
      const today = new Date();
      if(currentDate > today){
        el('avgWave').innerText = '--';
        waveChart.data.labels = [];
        waveChart.data.datasets.forEach(ds => ds.data = []);
        waveChart.data.datasets[0].data = [];
        waveChart.update();
        return;
      }

      const dateStr = currentDate.toISOString().split('T')[0];
      const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${SURF_LAT}&longitude=${SURF_LON}&hourly=wave_height,swell_height&timezone=auto&start_date=${dateStr}&end_date=${dateStr}`;
      const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${SURF_LAT}&longitude=${SURF_LON}&hourly=wave_height&timezone=auto&start_date=${dateStr}&end_date=${dateStr}`;
      const res = await fetch(url);
      if(!res.ok) throw new Error(res.status);
      const data = await res.json();
      if(!data.hourly || !data.hourly.time) return;

      const hours = data.hourly.time.map(t => new Date(t).getHours()+':00');
      const swell = data.hourly.swell_height.map(v => v ?? 0).slice(0,hours.length);
      const windWaves = data.hourly.wave_height.map((v,i)=>Math.max(0,(v??0)-swell[i])).slice(0,hours.length);
      const hours = data.hourly.time.map(t=>new Date(t).getHours()+':00');
      const waveData = data.hourly.wave_height.map(v => v ?? 0).slice(0,hours.length);

      waveChart.data.labels = hours;
      waveChart.data.datasets[0].data = swell;
      waveChart.data.datasets[1].data = windWaves;
      waveChart.data.datasets[0].data = waveData;
      waveChart.update();

      const totalWaveAvg = data.hourly.wave_height.reduce((a,b)=>a+(b??0),0)/data.hourly.wave_height.length;
      el('avgWave').innerText = totalWaveAvg.toFixed(1)+' m';
      el('avgWave').innerText = (waveData.reduce((a,b)=>a+b,0)/waveData.length).toFixed(1)+' m';

    } catch(err){
      console.error('Wave fetch failed', err);
      el('avgWave').innerText = '--';
      waveChart.data.labels = [];
      waveChart.data.datasets.forEach(ds => ds.data = []);
      waveChart.data.datasets[0].data = [];
      waveChart.update();
    }
  }

  // ---------------------------
  // Day navigation
  el('prevDayBtn').addEventListener('click',()=>{
    currentDate.setDate(currentDate.getDate()-1);
    loadDay();
  });
  el('nextDayBtn').addEventListener('click',()=>{
    currentDate.setDate(currentDate.getDate()+1);
    loadDay();
  });

  function updateNavButtons(){
    const today = new Date();
    el('nextDayBtn').disabled = currentDate.toDateString() === today.toDateString();
  }

  function loadDay(){
    updateDateDisplay();
    updateNavButtons();
    fetchWeather();
    fetchWaves();
  }

  // ---------------------------
  // Initialize
  loadDay();
  setInterval(fetchWaves,30*60*1000);
  setInterval(()=>{ fetchWeather(); fetchWaves(); },30*60*1000);

});
