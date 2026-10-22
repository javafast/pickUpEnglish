const sites=[
 {name:'Randall’s ESL-Lab',desc:'按日常生活主题整理的初级英语听力练习，适合循序渐进地训练听辨能力。',url:'https://www.esl-lab.com/easy/',cat:'听力训练',icon:'R'},
 {name:'ELLLO 学习导航',desc:'已按 A1–C1 整理听力、视频和语法入口，并附一套 20 分钟学习流程。',url:'/elllo/',cat:'听力训练',icon:'E'},
 {name:'VOA Learning English',desc:'用较慢语速的新闻、短视频和播客学习美式英语，内容按难度分级。',url:'https://learningenglish.voanews.com/',cat:'听力训练',icon:'V'},
 {name:'BBC Learning English',desc:'通过短视频、新闻和系列课程学习英式表达、词汇与真实语境。',url:'https://www.bbc.co.uk/learningenglish/',cat:'听力训练',icon:'B'},
 {name:'TalkEnglish',desc:'从日常、商务、旅行到面试，按情景练习常用表达与英语会话。',url:'https://www.talkenglish.com/',cat:'口语表达',icon:'T'},
 {name:'YouGlish',desc:'搜索单词或短语，观看真实视频中的用法，模仿语音、语调与连读。',url:'https://youglish.com/',cat:'口语表达',icon:'Y'},
 {name:'Rachel’s English',desc:'系统学习美式英语口型、重音和连读，配有大量免费讲解视频。',url:'https://rachelsenglish.com/',cat:'发音纠正',icon:'R'},
 {name:'Forvo',desc:'查询单词与短语的真人母语发音，对比不同说话者和地区口音。',url:'https://forvo.com/',cat:'发音纠正',icon:'F'},
 {name:'新概念英语点读',desc:'新概念英语在线点读与课文学习，适合跟读、精听和复习经典教材。',url:'https://nce.ichochy.com',cat:'课本精读',icon:'N'},
 {name:'少儿英语起步',desc:'为零基础小学生整理自然拼读、基础词汇和 8 周学习路线。',url:'/kids/',cat:'学习路线',icon:'K'}
];
const categories=['全部','听力训练','口语表达','发音纠正','课本精读','学习路线','我的收藏'];
let active='全部';
const favorites=new Set(JSON.parse(localStorage.getItem('shiguang-favorites')||'[]'));
const grid=document.querySelector('#siteGrid'),tabs=document.querySelector('#tabs'),filter=document.querySelector('#siteSearch'),empty=document.querySelector('#empty');

function renderTabs(){tabs.innerHTML=categories.map(c=>`<button class="tab ${c===active?'active':''}" data-cat="${c}" role="tab" aria-selected="${c===active}">${c}</button>`).join('')}
function render(){const q=filter.value.trim().toLowerCase();const filtered=sites.filter(s=>(active==='全部'||s.cat===active||(active==='我的收藏'&&favorites.has(s.name)))&&(!q||`${s.name}${s.desc}${s.cat}`.toLowerCase().includes(q)));grid.innerHTML=filtered.map(s=>`<article class="card"><div class="card-top"><span class="icon">${s.icon}</span><button class="favorite ${favorites.has(s.name)?'on':''}" data-fav="${s.name}" aria-label="${favorites.has(s.name)?'取消收藏':'收藏'} ${s.name}">★</button></div><h3>${s.name}</h3><p>${s.desc}</p><a class="go" href="${s.url}" ${s.url.startsWith('/')?'':'target="_blank" rel="noopener"'}>${s.url.startsWith('/')?'开始学习 →':'访问网站 ↗'}</a></article>`).join('');empty.style.display=filtered.length?'none':'block'}
tabs.addEventListener('click',e=>{if(!e.target.dataset.cat)return;active=e.target.dataset.cat;renderTabs();render()});
grid.addEventListener('click',e=>{const name=e.target.dataset.fav;if(!name)return;if(favorites.has(name))favorites.delete(name);else favorites.add(name);localStorage.setItem('shiguang-favorites',JSON.stringify([...favorites]));render()});
filter.addEventListener('input',render);
document.querySelector('#webSearch').addEventListener('submit',e=>{e.preventDefault();const q=document.querySelector('#searchInput').value.trim();if(q)window.open(document.querySelector('#searchEngine').value+encodeURIComponent(q),'_blank','noopener')});
const toggle=document.querySelector('#themeToggle');if(localStorage.getItem('shiguang-theme')==='light')document.body.classList.add('light');toggle.addEventListener('click',()=>{document.body.classList.toggle('light');localStorage.setItem('shiguang-theme',document.body.classList.contains('light')?'light':'dark')});
renderTabs();render();
