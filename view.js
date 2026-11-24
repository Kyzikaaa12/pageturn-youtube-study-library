'use strict';
function PageTurnView(env){
  const host=document.createElement('div');host.hidden=true;document.documentElement.append(host);
  const ui=host.attachShadow({mode:'closed'});
  ui.innerHTML=`<style>${pageTurnCSS}</style><div id="shell"><header><strong id="brand">PageTurn</strong><nav aria-label="Study library"></nav><button id="theme" type="button" aria-label="Switch to dark theme" title="Switch to dark theme"></button><button id="hide">Back to video</button></header>
  <main><div id="controls"><span id="status" role="status"></span><div class="tools"><button id="current">Live chapter</button><button id="play">Play</button><button id="follow">Following speaker</button><button id="export">Save text</button></div></div>
  <div id="spread" aria-label="Open book"><section class="leaf"><div class="flow"></div><div class="pagenum"></div></section><section class="leaf"><div class="flow"></div><div class="pagenum"></div></section></div>
  <section id="desk" hidden><h1></h1><p id="intro"></p><input id="query" type="search" aria-label="Search saved chapters" placeholder="Search titles and captured text"><button id="exportAll">Save library as text</button><select id="sort" aria-label="Timeline order"><option value="events">Dates mentioned</option><option value="watch">Watch history</option></select><div id="list"></div><button id="more" hidden>Show more</button></section></main>
  <footer><button id="prev">Previous pages</button><span id="position"></span><button id="next">Next pages</button></footer></div>`;
  const $=s=>ui.querySelector(s),all=s=>Array.from(ui.querySelectorAll(s));
  const labels={read:'Book',library:'Library',notes:'Notes',connections:'Connections',timeline:'Timeline'};
  const docs=new Map(),images=new Map();
  let tab='read',chosen='',spread=0,follow=true,limit=40,archiveDirty=true,indexCache,editing=false,refreshTimer;
  let liveCache=null,oldView='',activeCue=null,syncedId='',generation=0;
  const element=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
  const btn=(label,fn)=>{const b=element('button',label);b.onclick=fn;return b;};
  const getDoc=id=>docs.get(id)||{id,title:'YouTube chapter',entries:[]};
  const sorted=()=>[...docs.values()].sort((a,b)=>(b.updated||0)-(a.updated||0));
  function updateData(key,value){
    if(key.startsWith('frames/')){images.set(key.slice(7),value||[]);oldView='';return;}
    if(!key.startsWith('captions/'))return;
    const id=key.slice(9);
    if(value)docs.set(id,{...value,id,title:value.title||'YouTube · '+id});else docs.delete(id);
    archiveDirty=true;
  }
  browser.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local')return;
    if('prefs/theme' in changes){themePref=changes['prefs/theme'].newValue||null;paintTheme(themePref);}
    if(host.hidden)return;
    for(const [key,d] of Object.entries(changes))updateData(key,d.newValue);
    if(tab==='read')renderBook();else if(!editing){clearTimeout(refreshTimer);refreshTimer=setTimeout(renderDesk,300);}
  });
  for(const [key,label] of Object.entries(labels))$('nav').append(btn(label,()=>switchTo(key)));
  $('#hide').hidden=!!env.standalone;
  $('#hide').onclick=close;
  let themePref=null;
  const systemDark=()=>matchMedia('(prefers-color-scheme: dark)').matches;
  function themeIcon(dark){
    const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('width','16');svg.setAttribute('height','16');svg.setAttribute('aria-hidden','true');
    const add=(tag,attrs)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);svg.append(n);};
    if(dark){
      add('circle',{cx:'12',cy:'12',r:'4'});
      for(const [x1,y1,x2,y2] of [[12,2,12,4],[12,20,12,22],[4,12,2,12],[22,12,20,12],[5.64,5.64,7.05,7.05],[16.95,16.95,18.36,18.36],[5.64,18.36,7.05,16.95],[16.95,7.05,18.36,5.64]])add('line',{x1,y1,x2,y2,'stroke':'currentColor','stroke-width':'1.8','stroke-linecap':'round'});
    }else{
      add('path',{d:'M17.8 14.2A7.2 7.2 0 0 1 9.8 6.2 7.4 7.4 0 1 0 17.8 14.2z'});
    }
    return svg;
  }
  function paintTheme(saved){
    const dark=saved==='dark'||(saved!=='light'&&systemDark());
    host.dataset.theme=dark?'dark':'light';
    const b=$('#theme'),label=dark?'Switch to light theme':'Switch to dark theme';
    b.setAttribute('aria-label',label);b.title=label;b.replaceChildren(themeIcon(dark));
    if(env.standalone){document.documentElement.style.colorScheme=dark?'dark':'light';document.body.style.background=dark?'#151714':'#e5e4db';}
  }
  paintTheme(null);
  browser.storage.local.get('prefs/theme').then(v=>{themePref=v['prefs/theme']||null;paintTheme(themePref);});
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(themePref!=='light'&&themePref!=='dark')paintTheme(themePref);});
  $('#theme').onclick=()=>{themePref=host.dataset.theme==='dark'?'light':'dark';paintTheme(themePref);browser.storage.local.set({'prefs/theme':themePref});};
  function close(){generation++;host.hidden=true;env.closed?.();}
  function focusPage(){requestAnimationFrame(()=>$('.flow')?.focus({preventScroll:true}));}
  function switchTo(next){
    if(next==='read' && !chosen){chosen=env.live()?.id||sorted()[0]?.id||'';if(!chosen)next='library';}
    tab=next;limit=40;const reading=tab==='read';
    all('nav button').forEach((b,i)=>b.setAttribute('aria-current',String(Object.keys(labels)[i]===tab)));
    for(const sel of ['#spread','#controls','footer'])$(sel).hidden=!reading;
    $('#desk').hidden=reading;
    if(reading){oldView='';renderBook();}else renderDesk();
  }
  async function open(next='read'){
    const request=++generation;host.hidden=false;
    const values=await browser.storage.local.get(null);
    if(request!==generation || host.hidden)return;
    docs.clear();images.clear();for(const [key,v] of Object.entries(values))updateData(key,v);
    const live=env.live();chosen=live?.id||chosen||sorted()[0]?.id||'';spread=0;follow=true;liveCache=null;oldView='';archiveDirty=true;
    switchTo(next);if(tab==='read')focusPage();
  }
  function go(id,t){
    chosen=id;follow=false;const c=chapter();const pages=pageData(c);
    const page=pages.findLastIndex(rows=>rows.length && rows[0].t<=t);spread=Math.max(0,page>>1);
    switchTo('read');
    const cues=all('.cue');const cue=cues.findLast(e=>Number(e.dataset.t)<=t);
    if(cue){activeCue?.classList.remove('active');cue.classList.add('active');activeCue=cue;cue.scrollIntoView({block:'nearest'});}
  }
  function chapter(){
    const l=env.live();if(l?.id===chosen && l.entries.length>=getDoc(chosen).entries.length)return {...getDoc(chosen),...l};return getDoc(chosen);
  }
  function pageData(c){
    const e=c.entries, key=[c.id,e.length,e[0]?.t,e.at(-1)?.t].join('/');
    if(liveCache?.key!==key)liveCache={key,pages:PT.pages(PT.passages(e))};
    return liveCache.pages;
  }
  function picture(src,caption){
    const f=element('figure'),img=element('img');img.alt=caption;img.src=src;img.referrerPolicy='no-referrer';img.onerror=()=>f.remove();f.append(img,element('figcaption',caption));return f;
  }
  function paintLeaf(flow,rows,c,n,frames){
    flow.replaceChildren();flow.scrollTop=0;flow.tabIndex=0;
    if(n===0){
      flow.append(element('small',c.channel||'YouTube'),element('h1',c.title||'YouTube chapter'));
      flow.append(picture('https://i.ytimg.com/vi/'+encodeURIComponent(c.id)+'/mqdefault.jpg','Video cover'));
    }
    if(!rows?.length){
      if(n===0)flow.append(element('p','Press play to begin this chapter.'));
      else if(n%2===1){
        const picks=(pageData(c)[n-1]||[]).filter(r=>PT.score(r.text)>=2);
        flow.append(element('h2','Margin notes'));
        if(!picks.length)flow.append(element('small','Dated passages and explanations from the facing page will appear here.'));
        for(const r of picks){flow.append(element('p',r.text),btn('Hear passage · '+PT.clock(r.t),()=>env.play(c.id,r.t)));}
      }
      return;
    }
    const start=rows[0].t, end=rows.at(-1).entries.at(-1).t;
    const frame=frames.find(f=>f.t>=start && f.t<=end);
    for(const row of rows){
      if(frame && frame.t>=row.t && frame.t<=row.entries.at(-1).t)flow.append(picture(frame.src,'Video still · '+PT.clock(frame.t)));
      const p=element('p');
      for(const e of row.entries){
        const text=e.text.replace(/>>\s*/g,'').trim();if(!text)continue;
        const span=element('span',text,'cue');span.dataset.t=e.t;span.setAttribute('role','link');span.tabIndex=0;span.title='Replay at '+PT.clock(e.t);p.append(span,' ');
      }flow.append(p);
    }
  }
  function renderBook(){
    if(host.hidden || tab!=='read' || !chosen)return;
    const l=env.live(),c=chapter(),isLive=l?.id===chosen,pages=pageData(c);
    const lastIndex=pages.length-1;
    if(isLive && follow){const p=pages.findLastIndex(rows=>rows[0]?.t<=l.time);spread=Math.max(0,p>>1);}
    spread=Math.min(spread,lastIndex>>1);
    const frames=images.get(chosen)||[];
    const shown=pages.slice(spread*2,spread*2+2);
    const signature=[chosen,c.title,c.channel,spread,...shown.map(rows=>rows.map(r=>r.entries.length+'@'+r.t).join(',')),frames.length].join('|');
    if(signature!==oldView){
      const sameSpread=syncedId===chosen+'/'+spread;const flows=all('.flow'),positions=flows.map(f=>f.scrollTop);
      for(let i=0;i<2;i++){
        const n=spread*2+i;paintLeaf(flows[i],pages[n],c,n,frames);
        if(sameSpread)flows[i].scrollTop=positions[i];
        all('.pagenum')[i].textContent=String(n+1);
      }
      activeCue=null;oldView=signature;syncedId=chosen+'/'+spread;
      if(isLive && follow)all('.cue').at(-1)?.classList.add('fresh');
    }
    if(isLive && follow){
      let newest=all('.cue').findLast(b=>Number(b.dataset.t)<=l.time);
      if(activeCue!==newest){activeCue?.classList.remove('active');newest?.classList.add('active');activeCue=newest;if(newest)newest.scrollIntoView({block:'nearest'});}
    }
    $('#position').textContent='Pages '+(spread*2+1)+'–'+(spread*2+2);
    $('#prev').disabled=spread===0;$('#next').disabled=spread*2+2>lastIndex;
    $('#follow').hidden=!isLive;$('#follow').textContent=follow?'Following speaker':'Back to speaker';
    $('#current').hidden=!l || isLive;$('#play').hidden=!isLive;$('#play').textContent=l?.paused?'Play':'Pause';
    $('#export').disabled=!c.entries.length;
    $('#status').textContent=isLive?l.status:'Saved chapter · Select a passage to hear the source.';
  }
  $('#spread').addEventListener('click',e=>{const cue=e.target.closest('.cue');if(cue)env.play(chosen,Number(cue.dataset.t));});
  $('#spread').addEventListener('keydown',e=>{if(e.key==='Enter' && e.target.matches('.cue'))e.target.click();});
  for(const name of ['wheel','touchmove'])$('#spread').addEventListener(name,()=>{follow=false;renderBook();},{passive:true});
  $('#prev').onclick=()=>{follow=false;spread--;renderBook();};$('#next').onclick=()=>{follow=false;spread++;renderBook();};
  $('#follow').onclick=()=>{follow=!follow;renderBook();};$('#play').onclick=()=>env.toggle?.();
  $('#current').onclick=()=>{const l=env.live();if(l){chosen=l.id;follow=true;switchTo('read');}};
  function download(chapters,name){
    const content=chapters.map(c=>[c.title,'https://www.youtube.com/watch?v='+c.id,'',...PT.passages(c.entries).map(r=>PT.clock(r.t)+'  '+r.text)].join('\n\n')).join('\n\n────────────\n\n');
    const a=element('a');a.href=URL.createObjectURL(new Blob([content],{type:'text/plain;charset=utf-8'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000);
  }
  $('#export').onclick=()=>download([chapter()],'PageTurn-'+chosen+'.txt');
  $('#exportAll').onclick=()=>download(sorted(),'PageTurn-library.txt');
  const sourceLink=(id,t)=>{const a=element('a','Play at '+PT.clock(t));a.href='https://www.youtube.com/watch?v='+encodeURIComponent(id)+'&t='+Math.floor(t)+'s';a.target='_blank';a.rel='noopener';return a;};
  function source(parent,item){
    parent.append(element('p',item.text),btn(item.title+' · '+PT.clock(item.t),()=>go(item.id,item.t)),sourceLink(item.id,item.t));
  }
  function renderDesk(){
    if(host.hidden||tab==='read')return;
    const list=$('#list');list.replaceChildren();$('#desk h1').textContent=labels[tab];
    $('#intro').textContent={library:'Your saved YouTube chapters.',notes:'Passages picked automatically for dates, findings and explanations.',connections:'Phrases used in two or more videos. Open either passage to compare what the speakers said.',timeline:'Explore dates speakers mentioned, or the order you watched your chapters.'}[tab];
    $('#exportAll').hidden=tab!=='library';$('#exportAll').disabled=!docs.size;$('#query').hidden=tab!=='library';$('#sort').hidden=tab!=='timeline';
    if(archiveDirty && (tab==='notes'||tab==='connections'||tab==='timeline')){indexCache=PT.index(sorted());archiveDirty=false;}
    const card=()=>{const c=element('article',undefined,'card');list.append(c);return c;};
    let total=0;
    function show(rows,fn){total=rows.length;rows.slice(0,limit).forEach(fn);}
    if(tab==='library'){
      const q=$('#query').value.trim().toLowerCase();
      const rows=sorted().filter(c=>!q||c.title.toLowerCase().includes(q)||c.entries.map(e=>e.text.toLowerCase()).join(' ').includes(q));
      show(rows,c=>{const box=card();box.append(element('small',c.channel||'YouTube'),element('h2',c.title),btn('Open chapter',()=>go(c.id,0)));});
    }else if(tab==='notes')show(indexCache.notes,item=>source(card(),item));
    else if(tab==='connections')show(indexCache.links,([phrase,sources])=>{const box=card();box.append(element('h2',phrase));for(const item of sources.values())source(box,item);});
    else if($('#sort').value==='events')show(indexCache.events,item=>{const box=card();box.append(element('h2',item.label));source(box,item);});
    else show(sorted().sort((a,b)=>(a.created||Infinity)-(b.created||Infinity)),c=>{const box=card();box.append(element('small',c.created?new Date(c.created).toLocaleString():'Capture date unavailable'),element('h2',c.title),btn('Open chapter',()=>go(c.id,0)));});
    if(!total)list.append(element('p',{library:$('#query').value?'No matching chapters.':'Play a YouTube video with captions to start your first chapter.',notes:'Notes will appear when a captured passage contains a date, finding or explanation.',connections:'A connection appears when two saved videos use the same distinctive phrase.',timeline:$('#sort').value==='events'?'No calendar years found in the captured passages yet.':'No saved chapters yet.'}[tab],'empty'));
    $('#more').hidden=total<=limit;
  }
  $('#query').oninput=()=>{limit=40;renderDesk();};$('#query').onfocus=()=>{editing=true;};$('#query').onblur=()=>{editing=false;};
  $('#sort').onchange=()=>{limit=40;renderDesk();};$('#more').onclick=()=>{limit+=40;renderDesk();};
  ui.addEventListener('keydown',e=>{if(e.key==='Escape' && !env.standalone){e.stopPropagation();close();}});
  return {open,close,update:renderBook,visible:()=>!host.hidden};
}
