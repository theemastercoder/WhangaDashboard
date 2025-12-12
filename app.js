document.addEventListener('DOMContentLoaded', () => {

  const SURF_LAT = -37.208123;
  const SURF_LON = 175.882323;

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
  });

  function setCam(i){
    currentCam = i;
    CAMS.forEach((_,j)=>{
      const btn = el('camBtn'+j);
      if(btn) btn.classList.toggle('active', i===j);
    });
    el('camFrame').src = CAMS[i] + '?t=' + Date.now();
  }

  setCam(0);
  setInterval(()=>{ el('camFrame').src = CAMS[currentCam] + '?t=' + Date.now(); }, 60000);

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

  // ---------------------------
  // Date display
  function updateDateDisplay(){
    const options={weekday:'long', year:'numeric', month:'short', day:'numeric'};
    el('dateDisplay').innerText = currentDate.toLocaleDateString(undefined,options);
  }

  // ---------------------------
  // Fetch Waves
  async function fetchWaves(){
    try {
      const today = new Date();
      if(currentDate > today){
        el('avgWave').innerText = '--';
        waveChart.data.labels = [];
        waveChart.data.datasets.forEach(ds => ds.data = []);
        waveChart.update();
        return;
      }

      const dateStr = currentDate.toISOString().split('T')[0];
      const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${SURF_LAT}&longitude=${SURF_LON}&hourly=wave_height,swell_height&timezone=auto&start_date=${dateStr}&end_date=${dateStr}`;
      const res = await fetch(url);
      if(!res.ok) throw new Error(res.status);
      const data = await res.json();
      if(!data.hourly || !data.hourly.time) return;

      const hours = data.hourly.time.map(t => new Date(t).getHours()+':00');
      const swell = data.hourly.swell_height.map(v => v ?? 0).slice(0,hours.length);
      const windWaves = data.hourly.wave_height.map((v,i)=>Math.max(0,(v??0)-swell[i])).slice(0,hours.length);

      waveChart.data.labels = hours;
      waveChart.data.datasets[0].data = swell;
      waveChart.data.datasets[1].data = windWaves;
      waveChart.update();

      const totalWaveAvg = data.hourly.wave_height.reduce((a,b)=>a+(b??0),0)/data.hourly.wave_height.length;
      el('avgWave').innerText = totalWaveAvg.toFixed(1)+' m';

    } catch(err){
      console.error('Wave fetch failed', err);
      el('avgWave').innerText = '--';
      waveChart.data.labels = [];
      waveChart.data.datasets.forEach(ds => ds.data = []);
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
    fetchWaves();
  }

  // ---------------------------
  // Initialize
  loadDay();
  setInterval(fetchWaves,30*60*1000);

});
