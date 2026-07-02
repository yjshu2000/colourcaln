const RATINGS = [
  {id:'cyan', label:'yippee',   emoji:'🤩', color:'var(--c-cyan)'},
  {id:'green',  label:'decent',   emoji:'🙂', color:'var(--c-green)'},
  {id:'yellow',  label:'eehh',     emoji:'😐', color:'var(--c-yellow)'},
  {id:'orange', label:'aur naur', emoji:'🙁', color:'var(--c-orange)'},
  {id:'red',   label:'bruh',     emoji:'💀', color:'var(--c-red)'},
];
const RMAP = Object.fromEntries(RATINGS.map(r=>[r.id,r]));
const WIN_SHORT = 30;
const WIN_LONG  = 360;

let data = {};        // { "YYYY-MM-DD": ratingId }
let storageOK = true;

// ---- date helpers (local time) ----
function today(){ const n=new Date(); return new Date(n.getFullYear(),n.getMonth(),n.getDate()); }
function toKey(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function fromKey(k){ const [y,m,d]=k.split('-').map(Number); return new Date(y,m-1,d); }
function addDays(d,n){ const x=new Date(d); x.setDate(x.getDate()+n); return x; }
function startOfWeekSun(d){ const x=new Date(d); x.setDate(x.getDate()-x.getDay()); return x; }
function fmtLong(d){ return d.toLocaleDateString(undefined,{weekday:'long',month:'short',day:'numeric'}); }
function fmtShort(d){ return d.toLocaleDateString(undefined,{month:'short',day:'numeric'}); }

// ---- storage ----
async function load(){
  if(!window.storage){ storageOK=false; return; }
  try{
    const r = await window.storage.get('ratings', false);
    if(r && r.value) data = JSON.parse(r.value) || {};
  }catch(e){ /* key missing => empty */ }
}
async function persist(){
  if(!window.storage){ storageOK=false; setStatus(); return; }
  try{ await window.storage.set('ratings', JSON.stringify(data), false); storageOK=true; }
  catch(e){ storageOK=false; }
  setStatus();
}
function setStatus(){
  const s=document.getElementById('status');
  s.textContent = storageOK ? 'saved to your Claude account · export for a copy you own'
                            : 'saving in this session only · use export to keep it';
}

function setRating(key, id){
  if(id===null){ delete data[key]; } else { data[key]=id; }
  persist(); renderAll();
}

// ---- rating option buttons (shared markup) ----
function optButtons(currentId, onPick){
  const wrap=document.createElement('div');
  wrap.style.display='contents';
  RATINGS.forEach(r=>{
    const b=document.createElement('button');
    b.className='opt'+(currentId===r.id?' sel':'');
    b.dataset.r=r.id;
    b.innerHTML='<span class="oe">'+r.emoji+'</span><span class="ol">'+r.label+'</span>';
    b.addEventListener('click',()=>onPick(r.id));
    wrap.appendChild(b);
  });
  const er=document.createElement('button');
  er.className='opt erase';
  er.innerHTML='<span class="oe">⌫</span><span class="ol">clear</span>';
  er.addEventListener('click',()=>onPick(null));
  wrap.appendChild(er);
  return wrap;
}

// ---- render: stats windows ----
function windowStats(days){
  const T=today(); const start=addDays(T,-(days-1));
  const counts={cyan:0,green:0,yellow:0,orange:0,red:0}; let total=0;
  for(const [k,v] of Object.entries(data)){
    const dt=fromKey(k);
    if(dt>=start && dt<=T && counts[v]!==undefined){ counts[v]++; total++; }
  }
  return {counts,total};
}
function renderWindow(days, distId, legId, logId){
  const {counts,total}=windowStats(days);
  const dist=document.getElementById(distId);
  dist.innerHTML='';
  dist.className='dist'+(total===0?' empty':'');
  if(total>0){
    RATINGS.forEach(r=>{
      const c=counts[r.id]; if(c<=0) return;
      const seg=document.createElement('div');
      seg.className='seg '+r.id;
      seg.style.width=(c/total*100)+'%';
      dist.appendChild(seg);
    });
  }
  const leg=document.getElementById(legId); leg.innerHTML='';
  RATINGS.forEach(r=>{
    const item=document.createElement('div'); item.className='item';
    item.innerHTML='<span class="swatch" style="background:'+r.color+'"></span>'
      +'<span class="emo">'+r.emoji+'</span>'
      +'<span class="cnt num">'+counts[r.id]+'</span>';
    leg.appendChild(item);
  });
  document.getElementById(logId).textContent = total+' logged';
}

// ---- render: ribbon 360 ----
function renderRibbon(){
  const T=today();
  const rStart=addDays(T,-(WIN_LONG-1));
  const gridStart=startOfWeekSun(rStart);
  const gridEnd=addDays(startOfWeekSun(T),6);
  const rib=document.getElementById('ribbon'); rib.innerHTML='';
  for(let d=new Date(gridStart); d<=gridEnd; d=addDays(d,1)){
    const cell=document.createElement('div');
    const inRange = d>=rStart && d<=T;
    if(!inRange){ cell.className='rc pad'; }
    else{
      const id=data[toKey(d)];
      if(id){ cell.className='rc'; cell.style.background=RMAP[id].color; cell.style.boxShadow='0 0 7px -3px '+RMAP[id].color; }
      else{ cell.className='rc'; }
      cell.title=fmtShort(d)+(id?' · '+RMAP[id].label:'');
    }
    rib.appendChild(cell);
  }
  document.getElementById('ribStart').textContent=fmtShort(rStart);
}

// ---- render: 30-day calendar ----
function renderCal(){
  const T=today();
  const winStart=addDays(T,-(WIN_SHORT-1));
  const gridStart=startOfWeekSun(winStart);
  const gridEnd=addDays(startOfWeekSun(T),6);
  const cal=document.getElementById('cal'); cal.innerHTML='';
  for(let d=new Date(gridStart); d<=gridEnd; d=addDays(d,1)){
    const key=toKey(d);
    const inWin = d>=winStart && d<=T;
    const isFuture = d>T;
    const id=data[key];
    const cell=document.createElement('div');
    let cls='cell';
    if(id) cls+=' rated '+id;
    if(!inWin) cls+=' locked';
    if(isFuture) cls+=' future';
    if(key===toKey(T)) cls+=' today';
    cell.className=cls;
    cell.innerHTML='<span class="d">'+d.getDate()+'</span>'+(id?'<span class="e">'+RMAP[id].emoji+'</span>':'');
    if(inWin){
      cell.setAttribute('tabindex','0');
      cell.setAttribute('role','button');
      cell.title=fmtLong(d)+(id?' · '+RMAP[id].label:'');
      const open=()=>openEditor(key,d);
      cell.addEventListener('click',open);
      cell.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();open();} });
    }
    cal.appendChild(cell);
  }
}

// ---- render: bottom today bar ----
function renderTodayBar(){
  const T=today(); const key=toKey(T);
  document.getElementById('todayDate').textContent=fmtLong(T);
  const opts=document.getElementById('todayOpts'); opts.innerHTML='';
  opts.appendChild(optButtons(data[key], id=>setRating(key,id)));
}

// ---- editor sheet ----
let editorKey=null;
function openEditor(key,d){
  editorKey=key;
  document.getElementById('sheetDate').textContent=fmtLong(d);
  const opts=document.getElementById('sheetOpts'); opts.innerHTML='';
  opts.appendChild(optButtons(data[key], id=>{ setRating(key,id); closeEditor(); }));
  document.getElementById('overlay').classList.add('show');
}
function closeEditor(){ document.getElementById('overlay').classList.remove('show'); editorKey=null; }
document.getElementById('sheetClose').addEventListener('click',closeEditor);
document.getElementById('overlay').addEventListener('click',e=>{ if(e.target.id==='overlay') closeEditor(); });
document.addEventListener('keydown',e=>{ if(e.key==='Escape') closeEditor(); });

// ---- export / import ----
document.getElementById('exportBtn').addEventListener('click',()=>{
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download='day-colours-'+toKey(today())+'.json';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
});
document.getElementById('importBtn').addEventListener('click',()=>document.getElementById('importFile').click());
document.getElementById('importFile').addEventListener('change',ev=>{
  const f=ev.target.files[0]; if(!f) return;
  const rd=new FileReader();
  rd.onload=()=>{
    try{
      const obj=JSON.parse(rd.result);
      let added=0;
      for(const [k,v] of Object.entries(obj)){
        if(/^\d{4}-\d{2}-\d{2}$/.test(k) && RMAP[v]){ data[k]=v; added++; }
      }
      persist(); renderAll();
      document.getElementById('dataHint').textContent='merged '+added+' day(s) from file.';
    }catch(e){
      document.getElementById('dataHint').textContent='that file would not parse as day-colours JSON.';
    }
  };
  rd.readAsText(f);
  ev.target.value='';
});

function renderAll(){
  renderWindow(WIN_SHORT,'dist30','leg30','log30');
  renderWindow(WIN_LONG,'dist360','leg360','log360');
  renderRibbon();
  renderCal();
  renderTodayBar();
}

document.getElementById('dataHint').textContent='export gives you a JSON file that is yours. import merges a file back in (same-day entries overwrite).';

(async function init(){
  await load();
  setStatus();
  renderAll();
})();
