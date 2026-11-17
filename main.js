'use strict';

const { Plugin, ItemView, Notice } = require('obsidian');

const VIEW_TYPE = 'knowledge-tree-view';
const TREE_DIRECTORY = 'KnowledgeTree';
const HTML_PATH = TREE_DIRECTORY + '/index.html';
const TOPICS_DIRECTORY = TREE_DIRECTORY + '/topics';
const TOPICS_PREFIX = TOPICS_DIRECTORY + '/';
const STATUSES = new Set(['todo', 'studying', 'known']);
const METADATA_FIELDS = ['id', 'parent', 'title', 'status', 'order'];
const DECIMAL_NUMBER = /^[+-]?(?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?$/;
// Development reads the local viewer. The release builder replaces this value.
const BUNDLED_HTML = "<!doctype html>\n<html lang=\"ru\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1,viewport-fit=cover\"><meta name=\"theme-color\" content=\"#f7f7f2\"><title>Мои знания</title><style>\n:root{color-scheme:light dark;--bg:light-dark(#f7f7f2,#161d19);--paper:light-dark(#fff,#202a23);--ink:light-dark(#29362e,#e2ebe4);--muted:light-dark(#717a70,#9ead9e);--line:light-dark(#d4dbd0,#3d4c40);--green:light-dark(#387c5b,#8ecba7);--green-bg:light-dark(#e7f1e5,#283f30);--amber:light-dark(#b78639,#dfb469);--amber-bg:light-dark(#f9f0df,#403626);--todo:light-dark(#a2aaa0,#89958a);font:14px/1.4 -apple-system,BlinkMacSystemFont,\"Segoe UI\",sans-serif;color:var(--ink);background:var(--bg)}*{box-sizing:border-box}body{margin:0}button{font:inherit;color:inherit;cursor:pointer;touch-action:manipulation}button:focus-visible{outline:2px solid var(--green);outline-offset:4px}[hidden]{display:none!important}.app{height:100vh;height:100dvh;min-height:370px;display:flex;flex-direction:column;padding-top:env(safe-area-inset-top)}header{padding:16px 24px;display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;border-bottom:1px solid var(--line)}.eyebrow{font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:3px}h1{font-size:20px;line-height:1.2;font-weight:500;letter-spacing:-.4px;margin:0}.next{display:flex;gap:10px;align-items:center;padding:8px 12px;min-height:44px;border:1px solid var(--line);border-radius:9px;background:var(--paper);font-size:12px}.next span:first-child{color:var(--muted)}.next .arrow{color:var(--green)}.board{flex:1;min-height:0;position:relative;overflow:hidden;touch-action:none;user-select:none}.world{position:absolute;left:0;top:0;transform-origin:0 0;will-change:transform}svg{position:absolute;left:0;top:0;overflow:visible;pointer-events:none}.edge{fill:none;stroke:var(--line);stroke-width:1.5;vector-effect:non-scaling-stroke}.edge.active{stroke:var(--green)}.node{position:absolute;width:148px;height:82px;background:var(--paper);border:1px solid var(--line);border-radius:9px;text-align:left;padding:9px 10px;display:flex;align-items:center;gap:8px;font-size:14px;line-height:1.22}.node .label{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;overflow-wrap:anywhere;flex:1}.node.branch .label{-webkit-line-clamp:2}.node .symbol{width:13px;min-width:13px;text-align:center;color:var(--muted)}.node.root{background:var(--ink);color:var(--bg);border-color:transparent;font-weight:500}.node.root .symbol{color:inherit}.node.leaf{background:transparent;border-color:transparent;border-radius:8px;padding-left:8px}.node.leaf[data-status=known] .symbol{color:var(--green)}.node.leaf[data-status=studying] .symbol{color:var(--amber)}.node.leaf[data-status=todo] .symbol{color:var(--todo)}.node.leaf .symbol{font-size:17px;width:17px;min-width:17px}.node:hover{border-color:var(--green)}.node.selected{background:var(--amber-bg);border-color:transparent}.crumb{position:absolute;top:10px;left:15px;max-width:calc(100% - 30px);background:var(--bg);color:var(--muted);border:0;border-radius:5px;padding:5px 7px;min-height:38px;font-size:11px;text-align:left}.controls{position:absolute;bottom:14px;right:17px;display:flex;gap:1px;padding:3px;background:var(--paper);border:1px solid var(--line);border-radius:10px}.controls button{height:44px;min-width:44px;border:0;border-radius:6px;background:transparent;font-size:20px}.controls button:last-child{font-size:12px;padding:0 12px}.controls button:hover{background:var(--green-bg)}.hint{position:absolute;bottom:28px;left:22px;font-size:11px;color:var(--muted);pointer-events:none}footer{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:11px 23px calc(11px + env(safe-area-inset-bottom));border-top:1px solid var(--line);font-size:11px;color:var(--muted)}.legend{display:flex;gap:15px}.legend span{display:flex;align-items:center;gap:5px}.dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--todo)}.dot.study{background:var(--amber)}.dot.known{background:var(--green)}.count{font-variant-numeric:tabular-nums}.selection{position:absolute;bottom:72px;right:17px;font-size:11px;background:var(--paper);color:var(--muted);padding:7px 10px;border-radius:6px;max-width:calc(100% - 34px);pointer-events:none}.selection:empty{display:none}@media(max-width:600px){header{padding:13px 16px;align-items:flex-start}.eyebrow{font-size:10px}h1{font-size:18px}.next{font-size:11px;padding:7px 9px;gap:6px}.next span:first-child{display:none}.hint{top:12px;bottom:auto;left:17px}.crumb{top:34px}.controls{right:12px;bottom:12px}footer{padding-left:16px;padding-right:16px;gap:8px}.legend{gap:11px}.count{font-size:10px}}\n\n.node.branch{display:grid;grid-template-columns:13px minmax(0,1fr);grid-template-rows:auto auto 4px;align-content:center;gap:3px 8px;padding:8px 10px}\n.node.branch .symbol{grid-column:1;grid-row:1}\n.node.branch .label{grid-column:2;grid-row:1;min-width:0}\n.branch-counts{grid-column:1 / -1;display:flex;align-items:center;justify-content:space-between;gap:5px;font-size:13px;line-height:1.2;font-weight:400;color:var(--muted);font-variant-numeric:tabular-nums}\n.branch-counts .metric{display:inline-flex;align-items:center;gap:3px;white-space:nowrap}\n.branch-counts .metric-mark{font-size:13px}\n.metric[data-status=known] .metric-mark{color:var(--green)}\n.metric[data-status=studying] .metric-mark{color:var(--amber)}\n.metric[data-status=todo] .metric-mark{color:var(--todo)}\n.branch-progress{grid-column:1 / -1;display:flex;gap:1px;height:4px;overflow:hidden;border-radius:3px}\n.branch-progress .segment{height:4px;min-width:0}\n.branch-progress [data-status=known]{background:var(--green)}\n.branch-progress [data-status=studying]{background:var(--amber)}\n.branch-progress [data-status=todo]{background:var(--todo)}\n.node.root{--green:light-dark(#9ccbac,#286745);--amber:light-dark(#e2ba78,#93631e);--todo:light-dark(#96a397,#7d8a79)}\n.node.root .branch-counts{color:inherit}\n.legend-mark{font-weight:400;font-size:13px;line-height:1}\n.legend-mark.known{color:var(--green)}.legend-mark.study{color:var(--amber)}.legend-mark.todo{color:var(--todo)}\n\nheader{align-items:center}.title-group{min-width:0}.source{font-size:11px;color:var(--muted);margin-top:5px;max-width:460px}.source.error{color:var(--amber)}.actions{display:flex;gap:6px}.action{min-height:42px;border:1px solid var(--line);border-radius:8px;background:var(--paper);padding:7px 12px;font-size:12px}.action.primary{background:var(--green-bg);border-color:transparent}.empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;text-align:center;background:var(--bg);padding:24px;z-index:3}.empty h2{font-size:22px;font-weight:500;margin:0}.empty p{color:var(--muted);max-width:340px;margin:0;font-size:13px}.text-button{border:0;background:transparent;font-size:12px;color:var(--muted);min-height:44px;text-decoration:underline}.error-panel{position:absolute;top:8px;left:12px;right:12px;z-index:4;background:var(--paper);border:1px solid var(--amber);border-radius:8px;padding:10px 12px;font-size:12px;max-height:40%;overflow:auto}.error-panel summary{cursor:pointer}.error-panel pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;color:var(--muted);margin-bottom:0}.node{width:180px;height:94px}.node .label{-webkit-line-clamp:4}.node.branch .label{-webkit-line-clamp:2}.selection{max-height:78px;overflow:hidden}.node.leaf[data-status=known]{background:var(--green-bg)}.node.leaf[data-status=studying]{background:var(--amber-bg)}.hint{top:auto;bottom:28px}.crumb{top:10px}@media(max-width:600px){header{padding:11px 14px;gap:8px}.source{font-size:10px;max-width:245px}.actions{gap:5px}.action{padding:7px 9px;font-size:11px}.hint{top:auto;bottom:70px;left:16px;max-width:170px}.crumb{top:9px}.legend{gap:9px}.selection{bottom:65px;left:14px;right:14px;max-width:none}.count{width:100%}footer{gap:5px}.empty h2{font-size:20px}}\n.node.deferred{opacity:.6}\n.node.deferred:hover,.node.deferred:focus,.node.deferred.selected{opacity:1}\n</style></head><body><main class=\"app\">\n<header><div class=\"title-group\"><h1>Мои знания</h1><div class=\"source\" id=\"source\" role=\"status\" aria-live=\"polite\">Источник — Markdown-заметки Obsidian</div></div><div class=\"actions\"><button class=\"action\" id=\"folder\" type=\"button\">Папка</button><button class=\"action\" id=\"refresh\" type=\"button\" aria-label=\"Перечитать заметки\">↻ Обновить</button></div></header>\n<section class=\"board\" id=\"board\" aria-label=\"Дерево знаний\"><div class=\"world\" id=\"world\"><svg id=\"edges\" width=\"1\" height=\"1\" aria-hidden=\"true\"></svg><div id=\"nodes\"></div></div><span class=\"hint\" id=\"hint\">Нажмите на ветку · двигайте дерево</span><button class=\"crumb\" id=\"back\" type=\"button\" hidden></button><div class=\"selection\" id=\"selection\" role=\"status\" aria-live=\"polite\"></div><div class=\"controls\" aria-label=\"Вид дерева\"><button id=\"less\" type=\"button\" aria-label=\"Уменьшить\">−</button><button id=\"more\" type=\"button\" aria-label=\"Увеличить\">+</button><button id=\"overview\" type=\"button\">К корню</button></div>\n<div class=\"empty\" id=\"empty\"><h2>Дерево знаний</h2><p id=\"welcome-text\">Откройте папку KnowledgeTree. Дерево прочитает названия, связи и статусы тем из заметок.</p><button class=\"action primary\" id=\"choose\" type=\"button\">Открыть папку</button><button class=\"text-button\" id=\"choose-files\" type=\"button\">Выбрать файлы .md</button></div>\n<details class=\"error-panel\" id=\"error\" hidden><summary>Источник недоступен или в свойствах есть ошибка</summary><pre id=\"error-text\"></pre></details></section>\n<footer><div class=\"legend\"><span><b class=\"legend-mark known\">✓</b>Изучено</span><span><b class=\"legend-mark study\">◐</b>В процессе</span><span><b class=\"legend-mark todo\">○</b>Не изучено</span></div><span class=\"count\" id=\"count\"></span></footer>\n</main><input id=\"folder-input\" type=\"file\" webkitdirectory directory multiple accept=\".md\" hidden><input id=\"files-input\" type=\"file\" multiple accept=\".md,text/markdown\" hidden>\n<script>\n/* Metadata only: note bodies never enter the tree model. */\nconst KnowledgeTreeData = (() => {\n  const ROOT='knowledge-root', fields=new Set(['id','parent','title','status','order','type']);\n  const fail=(path,message)=>{throw new Error(path+': '+message);};\n  const numeric=/^[+-]?(?:[0-9]+(?:\\.[0-9]*)?|\\.[0-9]+)(?:[eE][+-]?[0-9]+)?$/;\n  function compareText(a,b){const aa=Array.from(a),bb=Array.from(b);for(let i=0;i<Math.min(aa.length,bb.length);i++){const d=aa[i].codePointAt(0)-bb[i].codePointAt(0);if(d)return d;}return aa.length-bb.length;}\n  function scalar(raw,path){\n    let s=raw.trim();if(!s||s.startsWith('#')||/^(null|~)$/i.test(s))return '';\n    if(s[0]==='\"'){\n      const match=s.match(/^\"(?:[^\"\\\\]|\\\\.)*\"/);if(!match)fail(path,'не закрыта строка в кавычках');\n      const rest=s.slice(match[0].length).trim();if(rest&&!rest.startsWith('#'))fail(path,'лишний текст после кавычек');\n      try{return JSON.parse(match[0]);}catch{fail(path,'некорректная строка в кавычках');}\n    }\n    if(s[0]===\"'\"){\n      let out='';for(let i=1;i<s.length;i++){if(s[i]!==\"'\"){out+=s[i];continue;}if(s[i+1]===\"'\"){out+=\"'\";i++;continue;}const rest=s.slice(i+1).trim();if(rest&&!rest.startsWith('#'))fail(path,'лишний текст после кавычек');return out;}fail(path,'не закрыта строка в кавычках');\n    }\n    s=s.replace(/\\s+#.*$/,'').trim();if(/^(null|~)$/i.test(s))return '';\n    if(/^[\\[\\]{|>&*!]/.test(s))fail(path,'свойства дерева должны быть простыми значениями');return s;\n  }\n  function parseHeader(text,path){\n    const lines=text.replace(/^\\uFEFF/,'').split(/\\r?\\n/);if(lines[0]?.trim()!=='---')fail(path,'не найден блок свойств ---');\n    const result={path};let closed=false,last='';\n    for(let i=1;i<lines.length;i++){\n      const line=lines[i],t=line.trim();if(t==='---'||t==='...'){closed=true;break;}if(!t||t.startsWith('#'))continue;\n      if(/^\\s/.test(line)){if(fields.has(last))fail(path,'свойство дерева должно быть в одну строку');continue;}\n      const m=line.match(/^([A-Za-z_][\\w-]*)\\s*:\\s*(.*?)\\s*$/);if(!m)fail(path,'ожидается имя: значение');last=m[1];if(!fields.has(last))continue;\n      if(Object.hasOwn(result,last))fail(path,'повтор свойства '+last);result[last]=scalar(m[2],path);\n    }\n    if(!closed)fail(path,'не найден конец свойств --- (лимит 64 КБ)');return result;\n  }\n  function buildTree(records){\n    const nodes=new Map([[ROOT,{id:ROOT,title:'Мои знания',status:'todo'}]]), errors=[],clean=[];\n    for(const raw of records){try{\n      const path=String(raw.path||'заметка');\n      for(const key of ['id','parent','title','status','order'])if(raw[key]!=null&&!['string','number'].includes(typeof raw[key]))fail(path,'свойство '+key+' должно быть простым значением');\n      const id=String(raw.id||'').trim();if(!id||id.length>256||/\\s/.test(id))fail(path,'нужен уникальный id без пробелов');if(nodes.has(id))fail(path,'повторяющийся или зарезервированный id '+id);\n      const parent=String(raw.parent||ROOT).trim()||ROOT,status=String(raw.status||'todo').trim(),title=String(raw.title||path.split('/').pop().replace(/\\.md$/i,'')).trim(),orderText=String(raw.order??'').trim();\n      if(orderText&&!numeric.test(orderText))fail(path,'order должен быть десятичным числом');const order=Number(orderText||0);\n      if(!['todo','studying','known'].includes(status))fail(path,'status: todo, studying или known');if(!title)fail(path,'пустое название');if(!Number.isFinite(order))fail(path,'order должен быть числом');\n      const n={id,title,status,path};nodes.set(id,n);clean.push({n,parent,order,path});\n    }catch(e){errors.push(e.message);}}\n    for(const item of clean)if(!nodes.has(item.parent))errors.push(item.path+': не найден parent '+item.parent);\n    const parents=new Map(clean.map(x=>[x.n.id,x.parent])),done=new Set();\n    for(const item of clean){let id=item.n.id;const chain=new Set();while(id!==ROOT&&parents.has(id)&&!done.has(id)){if(chain.has(id)){errors.push(item.path+': цикл родительских связей');break;}chain.add(id);id=parents.get(id);}chain.forEach(x=>done.add(x));}\n    if(errors.length)throw new Error(errors.join('\\n'));\n    const groups=new Map();for(const item of clean){if(!groups.has(item.parent))groups.set(item.parent,[]);groups.get(item.parent).push(item);}\n    for(const [id,list]of groups){list.sort((a,b)=>a.order-b.order||compareText(a.n.title.toLowerCase(),b.n.title.toLowerCase())||compareText(a.n.id,b.n.id));nodes.get(id).children=list.map(x=>x.n);}\n    return nodes.get(ROOT);\n  }\n  function aggregate(n){const r={known:0,studying:0,todo:0,total:0};if(!n.children?.length){if(n.id!==ROOT){r[n.status||'todo']=1;r.total=1;}return r;}for(const child of n.children){const c=aggregate(child);for(const key of ['known','studying','todo','total'])r[key]+=c[key];}return r;}\n  return {parseHeader,buildTree,aggregate};\n})();\n\n(()=>{'use strict';const $=id=>document.getElementById(id),board=$('board'),world=$('world');let tree=null;const W=180,H=94,X=218,Y=110;const byId=new Map();function index(n,path=[]){byId.set(n.id,{n,path});(n.children||[]).forEach(c=>index(c,path.concat(n.id)));}const labels={todo:'Не изучено',studying:'В процессе',known:'Изучено'},symbols={todo:'○',studying:'◐',known:'✓'},aggregate=KnowledgeTreeData.aggregate;let opened=new Set(['knowledge-root']),positions=new Map(),visible=[],edges=[],camera={x:0,y:0,z:1},selected=null,focus='knowledge-root',size=null;let pointers=new Map(),drag=null,pinch=null,moved=false,lastPointer=0;const mobile=()=>board.clientWidth<620;\nfunction layout(){positions=new Map();visible=[];edges=[];function visit(n,depth,dir,counter){const kids=opened.has(n.id)?n.children||[]:[];let y;if(kids.length){const yy=kids.map(c=>visit(c,depth+1,dir,counter));y=(yy[0]+yy[yy.length-1])/2;}else{y=counter.y;counter.y+=Y;}positions.set(n.id,{x:depth*X*dir,y});visible.push(n);kids.forEach(c=>edges.push({p:n.id,c:c.id}));return y;}if(mobile()){visit(tree,0,1,{y:0});return;}const children=opened.has(tree.id)?tree.children||[]:[],sides=[[],[]],weights=[0,0];for(const n of children){const side=weights[0]<=weights[1]?0:1;sides[side].push(n);weights[side]+=aggregate(n).total||1;}for(const[list,dir]of [[sides[0],1],[sides[1],-1]]){const cursor={y:0},start=visible.length;list.forEach(n=>{visit(n,1,dir,cursor);edges.push({p:tree.id,c:n.id});});const shift=(cursor.y-Y)/2;visible.slice(start).forEach(n=>positions.get(n.id).y-=shift);}positions.set(tree.id,{x:0,y:0});visible.push(tree);}\nfunction transform(){world.style.transform='translate('+camera.x+'px,'+camera.y+'px) scale('+camera.z+')';}function zoomAt(x,y,k){const z=Math.max(.06,Math.min(2.5,camera.z*k)),wx=(x-camera.x)/camera.z,wy=(y-camera.y)/camera.z;camera={x:x-wx*z,y:y-wy*z,z};transform();}function frame(ids,minZoom=0){const pp=ids.map(id=>positions.get(id)).filter(Boolean);if(!pp.length)return;const x1=Math.min(...pp.map(p=>p.x)),x2=Math.max(...pp.map(p=>p.x+W)),y1=Math.min(...pp.map(p=>p.y-H/2)),y2=Math.max(...pp.map(p=>p.y+H/2)),bw=board.clientWidth,bh=board.clientHeight;camera.z=Math.max(minZoom,.06,Math.min(1.05,(bw-28)/(x2-x1),(bh-140)/(y2-y1)));camera.x=(bw-(x1+x2)*camera.z)/2;camera.y=54+((bh-140)-(y1+y2)*camera.z)/2;transform();}function updateBack(){if(!tree)return;const info=byId.get(focus)||byId.get(tree.id),p=info.path[info.path.length-1];$('back').hidden=!p;$('back').textContent=p?'← '+byId.get(p).n.title:'';$('back').dataset.parent=p||'';$('hint').hidden=!!p;}\nfunction render(){if(!tree)return;layout();$('nodes').replaceChildren();$('edges').replaceChildren();let ancestors=new Set(selected?byId.get(selected).path.concat(selected):[]);for(const e of edges){const p=positions.get(e.p),c=positions.get(e.c),left=c.x<p.x,a=left?p.x:p.x+W,b=left?c.x+W:c.x,m=(a+b)/2,path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('class','edge'+(ancestors.has(e.p)&&ancestors.has(e.c)?' active':''));path.setAttribute('d','M '+a+' '+p.y+' C '+m+' '+p.y+' '+m+' '+c.y+' '+b+' '+c.y);$('edges').append(path);}for(const n of visible){const p=positions.get(n.id),branch=!!n.children?.length,deferred=/^\\(und\\)/i.test(n.title.trimStart()),b=document.createElement('button');b.type='button';b.title=n.title;b.className='node '+(branch?'branch':'leaf')+(n.id===tree.id?' root':'')+(selected===n.id?' selected':'')+(deferred?' deferred':'');b.dataset.id=n.id;b.dataset.status=n.status||'';b.dataset.deferred=String(deferred);b.style.left=p.x+'px';b.style.top=(p.y-H/2)+'px';const mark=document.createElement('span');mark.className='symbol';mark.textContent=branch?(opened.has(n.id)?'−':'+'):symbols[n.status]||'○';mark.setAttribute('aria-hidden','true');const name=document.createElement('span');name.className='label';name.textContent=n.title;b.append(mark,name);if(branch){const counts=aggregate(n);b.dataset.known=String(counts.known);b.dataset.studying=String(counts.studying);b.dataset.todo=String(counts.todo);b.dataset.total=String(counts.total);const summary=document.createElement('span');summary.className='branch-counts';summary.setAttribute('aria-hidden','true');const bar=document.createElement('span');bar.className='branch-progress';bar.setAttribute('aria-hidden','true');for(const key of ['known','studying','todo']){const metric=document.createElement('span');metric.className='metric';metric.dataset.status=key;const icon=document.createElement('span');icon.className='metric-mark';icon.textContent=symbols[key];const number=document.createElement('span');number.textContent=String(counts[key]);metric.append(icon,number);summary.append(metric);if(counts[key]){const segment=document.createElement('span');segment.className='segment';segment.dataset.status=key;segment.style.flex=String(counts[key]);bar.append(segment);}}b.append(summary,bar);b.setAttribute('aria-expanded',String(opened.has(n.id)));b.setAttribute('aria-label',n.title+'. Изучено: '+counts.known+'; в процессе: '+counts.studying+'; не изучено: '+counts.todo+'. Всего тем: '+counts.total);}else{b.setAttribute('aria-pressed',String(selected===n.id));b.setAttribute('aria-label',n.title+': '+labels[n.status]);}$('nodes').append(b);}updateBack();transform();}\nfunction focusBranch(id){const n=byId.get(id)?.n;if(!n)return;focus=id;frame([id,...(opened.has(id)?n.children||[]:[]).map(n=>n.id)],mobile()?.78:.86);updateBack();}function activate(id){const n=byId.get(id)?.n;if(!n)return;if(n.children?.length){const old=positions.get(id),point=old?{x:camera.x+old.x*camera.z,y:camera.y+old.y*camera.z}:null,expand=!opened.has(id);expand?opened.add(id):opened.delete(id);render();if(expand)focusBranch(id);else if(point){const p=positions.get(id);camera.x=point.x-p.x*camera.z;camera.y=point.y-p.y*camera.z;transform();}$('selection').textContent=n.title;}else{selected=selected===id?null:id;render();$('selection').textContent=selected?labels[n.status]+' · '+n.title:'';}}\nfunction startView(){if(!tree)return;focusBranch(tree.id);}$('back').addEventListener('click',()=>focusBranch($('back').dataset.parent));$('overview').addEventListener('click',()=>{if(!tree)return;opened=new Set([tree.id]);focus=tree.id;selected=null;$('selection').textContent='';render();focusBranch(tree.id);});$('more').addEventListener('click',()=>zoomAt(board.clientWidth/2,board.clientHeight/2,1.22));$('less').addEventListener('click',()=>zoomAt(board.clientWidth/2,board.clientHeight/2,1/1.22));$('nodes').addEventListener('click',e=>{const b=e.target.closest('[data-id]');if(b&&(e.detail===0||Date.now()-lastPointer>450))activate(b.dataset.id);});function point(e){const r=board.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}function startPinch(){const[a,b]=[...pointers.values()],m={x:(a.x+b.x)/2,y:(a.y+b.y)/2};pinch={distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),z:camera.z,wx:(m.x-camera.x)/camera.z,wy:(m.y-camera.y)/camera.z};moved=true;if(drag)drag.id=null;}\nboard.addEventListener('pointerdown',e=>{if(e.target.closest('.controls')||e.target.closest('.crumb')||e.button>0)return;const p=point(e);pointers.set(e.pointerId,p);board.setPointerCapture(e.pointerId);if(pointers.size===1){drag={p,camera:{...camera},id:e.target.closest('[data-id]')?.dataset.id};moved=false;}else if(pointers.size===2)startPinch();});board.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const p=point(e);pointers.set(e.pointerId,p);if(pointers.size>=2&&pinch){const[a,b]=[...pointers.values()],m={x:(a.x+b.x)/2,y:(a.y+b.y)/2},z=Math.max(.06,Math.min(2.5,pinch.z*Math.hypot(a.x-b.x,a.y-b.y)/pinch.distance));camera={x:m.x-pinch.wx*z,y:m.y-pinch.wy*z,z};transform();}else if(drag){const dx=p.x-drag.p.x,dy=p.y-drag.p.y;if(Math.hypot(dx,dy)>7)moved=true;if(moved){camera.x=drag.camera.x+dx;camera.y=drag.camera.y+dy;transform();}}});function end(e,cancel){if(!pointers.has(e.pointerId))return;const single=pointers.size===1,id=drag?.id;pointers.delete(e.pointerId);lastPointer=Date.now();if(!pointers.size){drag=null;pinch=null;if(single&&!moved&&!cancel&&id)activate(id);}else if(pointers.size===1){drag={p:[...pointers.values()][0],camera:{...camera},id:null};pinch=null;moved=true;}else startPinch();}board.addEventListener('pointerup',e=>end(e,false));board.addEventListener('pointercancel',e=>end(e,true));board.addEventListener('wheel',e=>{if(e.target.closest('.controls'))return;e.preventDefault();const p=point(e);zoomAt(p.x,p.y,Math.exp(-e.deltaY*.0015));},{passive:false});new ResizeObserver(()=>{const w=board.clientWidth,h=board.clientHeight;if(!w||!h)return;if(!size){size={w,h};startView();}else if((size.w<620)!==(w<620)){size={w,h};render();startView();}else{const wx=(size.w/2-camera.x)/camera.z,wy=(size.h/2-camera.y)/camera.z;size={w,h};camera.x=w/2-wx*camera.z;camera.y=h/2-wy*camera.z;transform();}}).observe(board);\nlet sourceMode='none',directoryHandle=null,loading=false,apiRevision='',sourceLabel='',apiFailures=0,lastFilePicker='folder-input';\nconst inObsidian=window.parent!==window&&location.protocol==='about:';\nfunction sourceStatus(text,error=false){$('source').textContent=text;$('source').classList.toggle('error',error);}\nfunction showError(error){$('error').hidden=false;$('error-text').textContent=String(error?.message||error);sourceStatus(tree?'Не обновлено · показана предыдущая версия':'Не удалось прочитать темы',true);}\nfunction clearError(){$('error').hidden=true;$('error-text').textContent='';}\nfunction applyTree(next,label){\n  const first=!tree;tree=next;byId.clear();index(tree);for(const id of opened)if(!byId.has(id))opened.delete(id);opened.add(tree.id);\n  if(!byId.has(focus))focus=tree.id;if(selected&&!byId.has(selected))selected=null;\n  sourceLabel=label;const total=KnowledgeTreeData.aggregate(tree);$('count').textContent=total.known+' / '+total.total+' изучено';$('empty').hidden=true;\n  clearError();sourceStatus(label+' · '+(byId.size-1)+' заметок');render();if(first)startView();\n  $('selection').textContent=selected?labels[byId.get(selected).n.status]+' · '+byId.get(selected).n.title:'';\n}\nasync function recordsFromFiles(files){\n  const records=[],errors=[];for(let i=0;i<files.length;i+=24){await Promise.all(files.slice(i,i+24).map(async({file,path})=>{try{const header=await file.slice(0,65536).text();records.push(KnowledgeTreeData.parseHeader(header,path));}catch(e){errors.push(e.message);}}));}\n  if(errors.length)throw new Error(errors.join('\\n'));return records;\n}\nasync function walkHandle(handle,prefix=''){\n  const files=[];for await(const[name,entry]of handle.entries()){if(name.startsWith('.'))continue;const path=prefix+name;if(entry.kind==='directory')files.push(...await walkHandle(entry,path+'/'));else if(/\\.md$/i.test(name))files.push({file:await entry.getFile(),path});}return files;\n}\nasync function readDirectory(){\n  let topics;try{topics=await directoryHandle.getDirectoryHandle('topics');}catch(e){if(directoryHandle.name==='topics')topics=directoryHandle;else throw new Error('Выберите папку KnowledgeTree или её папку topics.');}\n  const files=await walkHandle(topics);if(!files.length)throw new Error('В папке topics не найдены Markdown-заметки.');return KnowledgeTreeData.buildTree(await recordsFromFiles(files));\n}\nasync function chooseFolder(){\n  if(loading)return;if(typeof window.showDirectoryPicker!=='function'){$('folder-input').click();return;}\n  try{const handle=await window.showDirectoryPicker({mode:'read'});directoryHandle=handle;loading=true;sourceStatus('Читаю свойства заметок…');const next=await readDirectory();sourceMode='directory';applyTree(next,'Папка · обновление вручную');}\n  catch(e){if(e.name==='AbortError')return;if(e.name==='SecurityError'||e.name==='NotSupportedError'){$('folder-input').click();return;}showError(e);}finally{loading=false;}\n}\nasync function pickedFiles(event,directory){\n  if(loading)return;const selectedFiles=[...event.target.files];if(!selectedFiles.length)return;loading=true;sourceStatus('Читаю свойства заметок…');\n  try{\n    const files=selectedFiles.filter(f=>/\\.md$/i.test(f.name)).map(file=>{const parts=(file.webkitRelativePath||file.name).split('/'),t=parts.indexOf('topics');return{file,path:directory?(t<0?'':parts.slice(t+1).join('/')):file.name};}).filter(x=>x.path&&!x.path.split('/').some(s=>s.startsWith('.')));\n    if(!files.length)throw new Error('Выберите KnowledgeTree или topics. Если браузер не умеет выбирать папки, используйте «Выбрать файлы .md».');\n    const next=KnowledgeTreeData.buildTree(await recordsFromFiles(files));sourceMode='files';directoryHandle=null;lastFilePicker=directory?'folder-input':'files-input';applyTree(next,'Выбранные файлы · для обновления выберите заново');\n  }catch(e){showError(e);}finally{loading=false;event.target.value='';}\n}\nasync function loadAPI(){\n  if(loading)return;loading=true;try{const response=await fetch('/api/tree',{cache:'no-store',signal:AbortSignal.timeout(10000)}),payload=await response.json();\n    if(!response.ok||!payload.tree)throw new Error((payload.errors||[]).map(e=>(e.path?e.path+': ':'')+e.message).join('\\n')||'Сервер не вернул дерево.');\n    if(sourceMode!=='api')return;apiFailures=0;if(payload.revision!==apiRevision){applyTree(payload.tree,'Заметки · автообновление');apiRevision=payload.revision;}else{clearError();sourceStatus('Заметки · автообновление · '+(byId.size-1)+' заметок');}\n  }catch(e){if(sourceMode==='api'){apiFailures++;showError(new Error(e.message+'\\nПроверьте, запущен ли tools/start-tree.sh.'));}}finally{loading=false;}\n}\nasync function refresh(){\n  if(loading)return;if(sourceMode==='obsidian'){window.parent.postMessage({type:'knowledge-tree-refresh'},'*');return;}if(sourceMode==='api'){await loadAPI();return;}\n  if(sourceMode==='directory'){loading=true;try{applyTree(await readDirectory(),'Папка · обновление вручную');}catch(e){showError(e);}finally{loading=false;}return;}\n  if(sourceMode==='files'){$(lastFilePicker).click();return;}await chooseFolder();\n}\n$('folder').addEventListener('click',chooseFolder);$('choose').addEventListener('click',chooseFolder);$('refresh').addEventListener('click',refresh);\n$('choose-files').addEventListener('click',()=>$('files-input').click());$('folder-input').addEventListener('change',e=>pickedFiles(e,true));$('files-input').addEventListener('change',e=>pickedFiles(e,false));\nif(inObsidian){\n  sourceMode='obsidian';sourceStatus('Подключаю Obsidian…');$('folder').hidden=true;$('choose').hidden=true;$('choose-files').hidden=true;$('welcome-text').textContent='Читаю свойства заметок из Obsidian…';\n  window.addEventListener('message',event=>{if(event.source!==window.parent)return;const data=event.data;if(data?.type==='knowledge-tree-data'){try{applyTree(KnowledgeTreeData.buildTree(data.payload.notes),'Obsidian · автообновление');}catch(e){showError(e);}}else if(data?.type==='knowledge-tree-error')showError(new Error(data.message));});\n  window.parent.postMessage({type:'knowledge-tree-ready'},'*');\n}else if(/^https?:$/.test(location.protocol)){\n  sourceMode='api';loadAPI();setInterval(()=>{if(sourceMode==='api'&&!document.hidden)loadAPI();},4000);\n}\ndocument.addEventListener('visibilitychange',()=>{if(!document.hidden&&sourceMode==='api')loadAPI();});\n\n})();\n\n</script></body></html>\n"; // @bundle-html

function relevantPath(path) {
  return typeof path === 'string' && (path === TREE_DIRECTORY || path === TOPICS_DIRECTORY || path.startsWith(TOPICS_PREFIX));
}

function textProperty(value, field, path, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value !== 'string') throw new Error(path + ': свойство ' + field + ' должно быть строкой.');
  return value.trim() || fallback;
}

function collectNotes(app) {
  const files = app.vault.getMarkdownFiles().filter(file => {
    if (typeof file.path !== 'string' || !file.path.startsWith(TOPICS_PREFIX)) return false;
    const segments = file.path.slice(TOPICS_PREFIX.length).split('/');
    return segments.every(part => part && !part.startsWith('.') && part !== '..');
  }).sort((a, b) => a.path.localeCompare(b.path));

  return files.map(file => {
    const path = file.path.slice(TREE_DIRECTORY.length + 1);
    const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter;
    if (!frontmatter || typeof frontmatter !== 'object' || Array.isArray(frontmatter)) {
      throw new Error(path + ': свойства ещё не проиндексированы Obsidian или отсутствует YAML-блок.');
    }
    for (const field of METADATA_FIELDS) {
      const value = Object.prototype.hasOwnProperty.call(frontmatter, field) ? frontmatter[field] : undefined;
      if (value !== undefined && value !== null && !['string', 'number', 'boolean'].includes(typeof value)) {
        throw new Error(path + ': свойство ' + field + ' должно быть простым значением, без списков и объектов.');
      }
    }
    // Copy only the five named scalar fields. In particular, never send the
    // frontmatter object itself, its positions, other properties, or note text.
    const get = field => Object.prototype.hasOwnProperty.call(frontmatter, field) ? frontmatter[field] : undefined;
    const id = textProperty(get('id'), 'id', path, '');
    if (!id || /\s/.test(id) || id.length > 256) throw new Error(path + ': добавьте id без пробелов, длиной до 256 символов.');
    const parent = textProperty(get('parent'), 'parent', path, '');
    const basename = typeof file.basename === 'string' ? file.basename : file.path.split('/').pop().replace(/\.md$/i, '');
    const title = textProperty(get('title'), 'title', path, basename);
    const status = textProperty(get('status'), 'status', path, 'todo');
    if (!STATUSES.has(status)) throw new Error(path + ': допустимые статусы — todo, studying, known.');
    const rawOrder = get('order');
    if (typeof rawOrder === 'boolean') throw new Error(path + ': order должен быть конечным числом.');
    const normalizedOrder = typeof rawOrder === 'string' ? rawOrder.trim() : rawOrder;
    if (typeof normalizedOrder === 'string' && normalizedOrder !== '' && !DECIMAL_NUMBER.test(normalizedOrder)) {
      throw new Error(path + ': order должен быть конечным десятичным числом.');
    }
    const order = normalizedOrder === undefined || normalizedOrder === null || normalizedOrder === '' ? 0 : Number(normalizedOrder);
    if (!Number.isFinite(order)) throw new Error(path + ': order должен быть конечным числом.');
    return { path, id, parent, title, status, order };
  });
}

class KnowledgeTreeView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.frame = null;
    this.frameReady = false;
    this.timer = null;
    this.forceRefresh = false;
    this.lastPayload = null;
    this.lastError = null;
    this.closed = true;
    this.eventRefs = [];
    this.hostWindow = null;
    this.messageListener = null;
    this.openGeneration = 0;
  }

  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return 'Дерево знаний'; }
  getIcon() { return 'git-fork'; }

  watch(owner, event, callback) {
    const reference = owner.on(event, callback);
    this.registerEvent(reference);
    this.eventRefs.push({ owner, reference });
  }

  async onOpen() {
    this.dispose();
    this.closed = false;
    const generation = ++this.openGeneration;
    this.contentEl.replaceChildren();
    Object.assign(this.contentEl.style, { padding: '0', overflow: 'hidden', height: '100%', minHeight: '0' });
    this.hostWindow = this.contentEl.ownerDocument.defaultView;
    this.messageListener = event => {
      if (this.closed || !this.frame || event.source !== this.frame.contentWindow) return;
      if (!event.data || typeof event.data !== 'object') return;
      if (event.data.type !== 'knowledge-tree-ready' && event.data.type !== 'knowledge-tree-refresh') return;
      this.frameReady = true;
      this.queueRefresh(true);
    };
    this.hostWindow.addEventListener('message', this.messageListener);

    this.watch(this.app.metadataCache, 'changed', file => {
      if (relevantPath(file?.path)) this.queueRefresh(false);
    });
    this.watch(this.app.metadataCache, 'resolved', () => this.queueRefresh(false));
    this.watch(this.app.vault, 'create', file => {
      if (relevantPath(file?.path)) this.queueRefresh(false);
    });
    this.watch(this.app.vault, 'delete', file => {
      if (relevantPath(file?.path)) this.queueRefresh(false);
    });
    this.watch(this.app.vault, 'rename', (file, oldPath) => {
      if (relevantPath(file?.path) || relevantPath(oldPath)) this.queueRefresh(false);
    });

    try {
      // Releases carry their own viewer. Only unbundled development builds read
      // index.html from the vault; notes always use metadataCache, never bodies.
      const html = typeof BUNDLED_HTML === 'string' && BUNDLED_HTML.trim()
        ? BUNDLED_HTML
        : await this.app.vault.adapter.read(HTML_PATH);
      if (this.closed || generation !== this.openGeneration) return;
      if (typeof html !== 'string' || !html.trim()) throw new Error('Empty HTML');
      const frame = this.contentEl.ownerDocument.createElement('iframe');
      frame.setAttribute('title', 'Дерево знаний');
      frame.setAttribute('sandbox', 'allow-scripts');
      frame.setAttribute('referrerpolicy', 'no-referrer');
      Object.assign(frame.style, { width: '100%', height: '100%', border: '0', display: 'block', background: 'transparent' });
      this.frame = frame;
      frame.srcdoc = html;
      this.contentEl.append(frame);
    } catch (_error) {
      if (this.closed || generation !== this.openGeneration) return;
      const message = 'Не удалось открыть ' + HTML_PATH + '. Проверьте, что файл есть в этом хранилище.';
      this.contentEl.textContent = message;
      new Notice(message);
    }
  }

  queueRefresh(force) {
    if (this.closed) return;
    this.forceRefresh = this.forceRefresh || force;
    if (this.timer !== null) this.hostWindow.clearTimeout(this.timer);
    this.timer = this.hostWindow.setTimeout(() => {
      this.timer = null;
      const shouldForce = this.forceRefresh;
      this.forceRefresh = false;
      this.sendNotes(shouldForce);
    }, 250);
  }

  sendNotes(force = false) {
    if (this.closed || !this.frameReady || !this.frame?.contentWindow) return;
    try {
      const payload = { source: 'obsidian', notes: collectNotes(this.app) };
      const signature = JSON.stringify(payload);
      if (force || signature !== this.lastPayload || this.lastError !== null) {
        // A sandbox without allow-same-origin has an opaque origin. The exact
        // destination window is retained and incoming event.source is checked.
        this.frame.contentWindow.postMessage({ type: 'knowledge-tree-data', payload }, '*');
        this.lastPayload = signature;
      }
      this.lastError = null;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось прочитать свойства тем.';
      if (force || message !== this.lastError) {
        this.frame.contentWindow.postMessage({ type: 'knowledge-tree-error', message }, '*');
        this.lastError = message;
      }
    }
  }

  dispose() {
    this.closed = true;
    ++this.openGeneration;
    if (this.timer !== null && this.hostWindow) this.hostWindow.clearTimeout(this.timer);
    this.timer = null;
    this.forceRefresh = false;
    if (this.hostWindow && this.messageListener) this.hostWindow.removeEventListener('message', this.messageListener);
    this.messageListener = null;
    for (const { owner, reference } of this.eventRefs) owner.offref(reference);
    this.eventRefs = [];
    if (this.frame) {
      this.frame.remove();
      this.frame = null;
    }
    this.frameReady = false;
    this.lastPayload = null;
    this.lastError = null;
    this.hostWindow = null;
  }

  async onClose() { this.dispose(); }
}

module.exports = class KnowledgeTreePlugin extends Plugin {
  async onload() {
    this.registerView(VIEW_TYPE, leaf => new KnowledgeTreeView(leaf, this));
    const open = () => { void this.openTree(); };
    this.addRibbonIcon('git-fork', 'Открыть дерево знаний', open);
    this.addCommand({ id: 'open-knowledge-tree', name: 'Открыть дерево знаний', callback: open });
  }

  async openTree() {
    try {
      let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
      if (!leaf) {
        leaf = this.app.workspace.getLeaf('tab');
        await leaf.setViewState({ type: VIEW_TYPE, active: true });
      }
      await this.app.workspace.revealLeaf(leaf);
    } catch (_error) {
      new Notice('Не удалось открыть дерево знаний. Попробуйте включить плагин заново.');
    }
  }

  onunload() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      if (leaf.view instanceof KnowledgeTreeView) leaf.view.dispose();
      leaf.detach();
    }
  }
};
