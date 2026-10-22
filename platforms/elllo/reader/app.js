const LEVELS={
  a1:{name:'A1',badge:'ELLLO · A1',back:'/elllo/a1-video/',data:'data/a1.json',storageKey:'shiguang-a1-reader',empty:'A1 课程数据加载失败，请稍后重试。'},
  a2:{name:'A2',badge:'ELLLO · A2',back:'/elllo/',data:'data/a2.json',storageKey:'shiguang-a2-reader',empty:'A2 课程数据加载失败，请稍后重试。'}
};
const state={level:'a1',data:null,category:0,lesson:0,line:-1,loop:false,follow:true};
const $=selector=>document.querySelector(selector);
const audio=$('#audio'),lessonList=$('#lessonList'),transcript=$('#transcript');
const esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const fmt=value=>{if(!Number.isFinite(value))return'00:00';const m=Math.floor(value/60),s=Math.floor(value%60);return`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`};
const category=()=>state.data.categories[state.category];
const lesson=()=>category().lessons[state.lesson];
const levelInfo=()=>LEVELS[state.level];
const themeKey='shiguang-reader-theme';
const levelKey='shiguang-reader-level';

function setTheme(dark){
  document.body.classList.toggle('mobile-dark',dark);
  $('#themeToggle').textContent=dark?'☀':'☾';
  $('#themeToggle').setAttribute('aria-pressed',String(dark));
  $('#themeToggle').setAttribute('aria-label',dark?'切换日间模式':'切换夜间模式');
}

function updateOptionButtons(){
  $('#lineLoop').textContent=`单句循环：${state.loop?'开':'关'}`;$('#lineLoop').setAttribute('aria-pressed',String(state.loop));
  $('#followButton').textContent=`自动跟随：${state.follow?'开':'关'}`;$('#followButton').setAttribute('aria-pressed',String(state.follow));
  $('#mobileLoop').setAttribute('aria-pressed',String(state.loop));
  $('#mobileFollow').setAttribute('aria-pressed',String(state.follow));
}
function toggleLoop(){state.loop=!state.loop;updateOptionButtons()}
function toggleFollow(){state.follow=!state.follow;updateOptionButtons()}

function applyLevelChrome(){
  const info=levelInfo();
  document.title=`${info.name} 逐句点读 · 拾光英语`;
  $('#levelBadge').textContent=info.badge;
  $('#backLink').href=info.back;
  document.querySelectorAll('[data-level]').forEach(button=>button.classList.toggle('active',button.dataset.level===state.level));
}

function renderCategories(){
  $('#categories').innerHTML=state.data.categories.map((item,index)=>`<button type="button" class="${index===state.category?'active':''}" data-category="${index}">${item.name}</button>`).join('');
  $('#mobileCategory').innerHTML=state.data.categories.map((item,index)=>`<option value="${index}"${index===state.category?' selected':''}>${levelInfo().name} · ${esc(item.name)}</option>`).join('');
}
function renderLessons(query=''){
  const q=query.trim().toLowerCase();
  lessonList.innerHTML=category().lessons.map((item,index)=>({item,index})).filter(({item,index})=>!q||item.title.toLowerCase().includes(q)||String(index+1).includes(q)).map(({item,index})=>`<button class="lesson${index===state.lesson?' active':''}" type="button" data-lesson="${index}"><span class="lesson-num">${String(index+1).padStart(2,'0')}</span><span><strong>${esc(item.title)}</strong><small>${item.lines.length} 句 · ${esc(category().name)}</small></span></button>`).join('')||'<p class="empty">没有找到课程。</p>';
  $('#mobileLesson').innerHTML=category().lessons.map((item,index)=>`<option value="${index}"${index===state.lesson?' selected':''}>${String(index+1).padStart(2,'0')}. ${esc(item.title)}</option>`).join('');
}
function renderTranscript(){
  transcript.innerHTML=lesson().lines.map((line,index)=>`<button class="line${index===state.line?' active':''}" type="button" data-line="${index}"><time>${fmt(line.start)}</time><p>${line.speaker?`<span class="speaker">${esc(line.speaker)}</span>`:''}${esc(line.text)}</p></button>`).join('')||'<p class="empty">本课时间轴正在生成。</p>';
}
function loadLesson(index,autoplay=false){
  state.lesson=Math.max(0,Math.min(category().lessons.length-1,index));state.line=-1;
  const item=lesson();audio.src=location.hostname==='elllo.191929.xyz'&&item.bookPath&&item.filename?`${item.bookPath}/${item.filename}.mp3`:item.audio;audio.load();
  $('#lessonMeta').textContent=`${category().name} · ${String(state.lesson+1).padStart(2,'0')}`;$('#lessonTitle').textContent=item.title;
  $('#sourceLink').href=item.source;
  renderLessons($('#search').value);renderTranscript();localStorage.setItem(levelInfo().storageKey,JSON.stringify({category:state.category,lesson:state.lesson}));
  if(autoplay)audio.play().catch(()=>{});
}
function setCategory(index){state.category=index;state.lesson=0;renderCategories();loadLesson(0)}
function setActiveLine(index){
  if(index===state.line)return;state.line=index;
  transcript.querySelector('.line.active')?.classList.remove('active');const active=transcript.querySelector(`[data-line="${index}"]`);active?.classList.add('active');
  if(state.follow)active?.scrollIntoView({block:'center',behavior:'smooth'});
}
function lineAt(time){const lines=lesson().lines;for(let i=lines.length-1;i>=0;i--)if(time>=lines[i].start)return i;return-1}
function pauseFollow(){if(state.follow){state.follow=false;updateOptionButtons()}}

const dataCache={};
function applyLevelData(level,data){
  state.data=data;
  const saved=JSON.parse(localStorage.getItem(LEVELS[level].storageKey)||'{}');
  state.category=Math.min(saved.category||0,data.categories.length-1);
  renderCategories();
  loadLesson(Math.min(saved.lesson||0,category().lessons.length-1));
}
function loadLevel(level){
  state.level=level;state.data=null;
  localStorage.setItem(levelKey,level);
  applyLevelChrome();
  audio.pause();
  if(dataCache[level]){applyLevelData(level,dataCache[level]);return}
  transcript.innerHTML='<p class="empty">正在加载课程数据…</p>';
  lessonList.innerHTML='';
  fetch(levelInfo().data).then(response=>response.json()).then(data=>{
    dataCache[level]=data;
    if(state.level!==level)return;
    applyLevelData(level,data);
  }).catch(()=>{if(state.level===level)transcript.innerHTML=`<p class="empty">${levelInfo().empty}</p>`});
}
function switchLevel(level){if(level!==state.level&&LEVELS[level])loadLevel(level)}

document.addEventListener('click',event=>{const button=event.target.closest('[data-level]');if(button)switchLevel(button.dataset.level)});
$('#mobileCategory').addEventListener('change',event=>setCategory(Number(event.target.value)));
$('#themeToggle').addEventListener('click',()=>{const dark=!document.body.classList.contains('mobile-dark');setTheme(dark);localStorage.setItem(themeKey,dark?'dark':'light')});
$('#mobileLesson').addEventListener('change',event=>loadLesson(Number(event.target.value)));
$('#mobilePrev').addEventListener('click',()=>loadLesson(state.lesson-1,true));
$('#mobileNext').addEventListener('click',()=>loadLesson(state.lesson+1,true));
$('#categories').addEventListener('click',event=>{const button=event.target.closest('[data-category]');if(button)setCategory(Number(button.dataset.category))});
lessonList.addEventListener('click',event=>{const button=event.target.closest('[data-lesson]');if(button)loadLesson(Number(button.dataset.lesson))});
transcript.addEventListener('click',event=>{const button=event.target.closest('[data-line]');if(!button)return;const index=Number(button.dataset.line);audio.currentTime=lesson().lines[index].start;audio.play().catch(()=>{});setActiveLine(index)});
transcript.addEventListener('wheel',pauseFollow,{passive:true});transcript.addEventListener('touchmove',pauseFollow,{passive:true});
$('#search').addEventListener('input',event=>renderLessons(event.target.value));
$('#prevLesson').addEventListener('click',()=>loadLesson(state.lesson-1,true));$('#nextLesson').addEventListener('click',()=>loadLesson(state.lesson+1,true));
$('#playButton').addEventListener('click',()=>audio.paused?audio.play().catch(()=>{}):audio.pause());
$('#rate').addEventListener('change',event=>audio.playbackRate=Number(event.target.value));
$('#lineLoop').addEventListener('click',toggleLoop);$('#mobileLoop').addEventListener('click',toggleLoop);
$('#followButton').addEventListener('click',toggleFollow);$('#mobileFollow').addEventListener('click',toggleFollow);
$('#progress').addEventListener('input',event=>{if(audio.duration)audio.currentTime=audio.duration*Number(event.target.value)/1000});
audio.addEventListener('play',()=>$('#playButton').textContent='Ⅱ');audio.addEventListener('pause',()=>$('#playButton').textContent='▶');
audio.addEventListener('loadedmetadata',()=>$('#duration').textContent=fmt(audio.duration));
audio.addEventListener('timeupdate',()=>{const time=audio.currentTime;$('#currentTime').textContent=fmt(time);$('#progress').value=audio.duration?Math.round(time/audio.duration*1000):0;const index=lineAt(time);setActiveLine(index);if(state.loop&&index>=0){const item=lesson().lines[index],end=item.end??lesson().lines[index+1]?.start;if(end&&time>=end-.04){audio.currentTime=item.start;audio.play().catch(()=>{})}}});
audio.addEventListener('ended',()=>{if(state.lesson<category().lessons.length-1)loadLesson(state.lesson+1,true)});

setTheme(localStorage.getItem(themeKey)==='dark');
const queryLevel=new URLSearchParams(location.search).get('level');
const savedLevel=localStorage.getItem(levelKey);
loadLevel(LEVELS[queryLevel]?queryLevel:(LEVELS[savedLevel]?savedLevel:'a1'));
if(queryLevel)history.replaceState(null,'',location.pathname);
