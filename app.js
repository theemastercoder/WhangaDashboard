const LAT=-37.209,LON=175.873,TIMEZONE='Pacific/Auckland';
const CAMS=[
  'https://corolive.nz/whangamata',
  'https://webcams.selectsolutions.co.nz/cddd3df5-ea07-47ac-9eec-39e3f01ca740.html',
  'https://embed.cdn-surfline.com/cams/62ba531abf8f1d75931c9d4f/822692fdfc5bd06fb24529c6e5dc203282e425c4'
];

let currentCam=0;
function el(id){return document.getElementById(id);}
CAMS.forEach((url,i)=>{el('camBtn'+(i+2)).addEventListener('click',()=>{setCam(i)})});
function setCam(i){
  currentCam=i;
  CAMS.forEach((_,j)=>el('camBtn'+(j+2)).classList.toggle('active',i===j));
  el('camFrame').src=CAMS[i];
}
setCam(0);

// Charts setup
const uvChart = new Chart(el('uvChart').getContext('2d'),{type:'line',data:{labels:[],datasets:[{label:'UV',data:[],fill:true}]},options:{plugins:{legend:{display:false}}}});
const windChart = new Chart(el('windChart').getContext('2d'),{type:'line',data:{labels:[],datasets:[{label:'Wind m/s',data:[],fill:true}]},options:{plugins:{legend:{display:false}}}});
const rainChart = new Chart(el('rainChart').getContext('2d'),{type:'line',data:{labels:[],datasets:[{label:'Rain mm',data:[],fill:true}]},options:{plugins:{legend:{display:false}}}});
const swellChart = new Chart(el('swellChart').getContext('2d'),{type:'line',data:{labels:[],datasets:[{label:'Swell m',data:[],fill:true}]},options:{plugins:{legend:{display:false}}}});
const tideChart = new Chart(el('tideChart').getContext('2d'),{type:'line',data:{labels:[],datasets:[{label:'Tide m',data:[],fill:true}]},options:{plugins:{legend:{display:false}}}});

async function fetchData(){
  try{
    const url=`https://api.open-meteo.com/v1/marine?latitude=${LAT}&longitude=${LON}&hourly=wave_height,wave_direction,wave_period,wind_speed,wind_direction,uv_index,precipitation&daily=sunrise,sunset&timezone=${encodeURIComponent(TIMEZONE)}`;
    const resp=await fetch(url);
    if(!resp.ok) throw new Error('Network response was not ok');
    const data=await resp.json();
    if(!data.hourly){console.error('No hourly data',data);return;}

    const t=data.hourly.time.map(s=>new Date(s).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}));

    uvChart.data.labels=t;
    uvChart.data.datasets[0].data=data.hourly.uv_index;
    uvChart.update();

    windChart.data.labels=t;
    windChart.data.datasets[0].data=data.hourly.wind_speed;
    windChart.update();

    rainChart.data.labels=t;
    rainChart.data.datasets[0].data=data.hourly.precipitation;
    rainChart.update();

    swellChart.data.labels=t;
    swellChart.data.datasets[0].data=data.hourly.wave_height;
    swellChart.update();

    tideChart.data.labels=t;
    tideChart.data.datasets[0].data=data.hourly.wave_height;
    tideChart.update();

    el('avgWind').innerText=(data.hourly.wind_speed.reduce((a,b)=>a+b,0)/data.hourly.wind_speed.length).toFixed(1)+' m/s';
    el('avgSwell').innerText=(data.hourly.wave_height.reduce((a,b)=>a+b,0)/data.hourly.wave_height.length).toFixed(1)+' m';
    el('sunset').innerText='Sunset: '+new Date(data.daily.sunset[0]).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    el('mapOverlay').innerText='Wind direction: avg '+Math.round(data.hourly.wind_direction.reduce((a,b)=>a+b,0)/data.hourly.wind_direction.length)+'°';

  }catch(e){console.error('fetch error',e);}
}

fetchData();
setInterval(fetchData,10*60*1000);
