'use strict';
(() => {
  const store=browser.storage.local;
  let session=null,view=null,player=null,media=null,observer=null,captionBox=null;
  let autoCC=false,writerError=false,busy=false,tabActive=false;
  const sendQueues=new Map(),backlog=new Set();
  const launcher=document.createElement('button');launcher.textContent='Open study book';
  launcher.style.cssText='position:fixed;bottom:18px;right:18px;z-index:2147483000;border:1px solid #789181;border-radius:30px;padding:9px 17px;color:#fff9e8;background:#1b4036;font:600 15px system-ui;box-shadow:0 4px 18px #0004;cursor:pointer';
  launcher.hidden=true;document.documentElement.append(launcher);
  const videoId=()=>location.pathname==='/watch'?new URL(location.href).searchParams.get('v'):null;
  const isAd=()=>!!player?.matches('.ad-showing,.ad-interrupting');
  function flush(s){
    if(!s?.pending.length && !s?.spans.length)return;
    backlog.add(s);
    if(sendQueues.has(s))return;
    const entries=s.pending.splice(0),ranges=PT.mergeRanges(s.spans.splice(0)),frame=s.frame;s.frame=null;
    const packet={action:'append',id:s.id,title:s.title,channel:s.channel,entries,ranges,frame,at:Date.now()};
    const work=browser.runtime.sendMessage(packet).then(ok=>{if(!ok)throw Error('Write failed');writerError=false;}).catch(()=>{
      s.pending.unshift(...entries);s.spans.unshift(...ranges);if(frame && !s.frame)s.frame=frame;writerError=true;
    }).finally(()=>{sendQueues.delete(s);if(!s.pending.length && !s.spans.length)backlog.delete(s);});
    sendQueues.set(s,work);s.lastWrite=Date.now();
  }
  function clearCue(){if(session){session.previous='';session.time=-1;}}
  function grabStill(s,t){
    if(!media?.videoWidth || s.frameCount>=10 || t-s.lastFrame<75 || s.frame)return;
    const text=s.entries.slice(-18).map(e=>e.text).join(' ').split(/(?<=[.!?])\s+/).slice(-2).join(' ');
    if(PT.score(text)<2)return;
    s.lastFrame=t;
    try{
      const canvas=document.createElement('canvas');canvas.width=320;canvas.height=Math.max(1,Math.round(320*media.videoHeight/media.videoWidth));
      canvas.getContext('2d').drawImage(media,0,0,canvas.width,canvas.height);
      const src=canvas.toDataURL('image/jpeg',.66);
      if(src.startsWith('data:image/jpeg;')){s.frame={t,src};s.frameCount++;}
    }catch{/* The video cover remains available if Firefox restricts this frame. */}
  }
  function live(){
    const s=session;if(!s)return null;
    let status='Capturing captions';
    if(writerError)status='Save pending · PageTurn will retry.';
    else if(isAd())status='Waiting for the video';
    else if(!s.ready)status='Opening chapter…';
    else if(!s.entries.length)status='Play the video with CC on to begin.';
    else if(player?.querySelector('.ytp-subtitles-button')?.getAttribute('aria-pressed')==='false')status='Turn on CC to continue capturing.';
    else if(media?.paused)status='Paused';
    return {id:s.id,title:s.title,channel:s.channel,entries:s.entries,time:media?.currentTime||0,paused:media?.paused??true,status};
  }
  function getView(){
    if(!view)view=PageTurnView({live,toggle:()=>{if(media?.paused)media.play().catch(()=>{});else media?.pause();},
      play:(id,t)=>{if(id===session?.id && media){media.currentTime=t;media.play().catch(()=>{});}else window.open('https://www.youtube.com/watch?v='+encodeURIComponent(id)+'&t='+Math.floor(t)+'s','_blank','noopener');},
      closed:()=>{launcher.hidden=!session;tabActive=false;}});
    return view;
  }
  function enableCC(){
    const s=session, cc=player?.querySelector('.ytp-subtitles-button');
    if(!s || s.ccTried || !autoCC || !cc || isAd() || !cc.getClientRects().length || cc.disabled || cc.getAttribute('aria-disabled')==='true')return;
    s.ccTried=true;if(cc.getAttribute('aria-pressed')==='false')cc.click();
  }
  function open(){
    autoCC=true;store.set({'prefs/autoCC':true}).catch(()=>{});enableCC();
    launcher.hidden=true;tabActive=true;
    getView().open(session?'read':'library').catch(()=>{launcher.hidden=!session;tabActive=false;view.close();});
  }
  launcher.onclick=open;
  browser.runtime.onMessage.addListener(p=>{if(p?.action==='open-book'){open();return Promise.resolve(true);}});
  browser.storage.onChanged.addListener((changes,area)=>{if(area==='local' && changes['prefs/autoCC']){autoCC=!!changes['prefs/autoCC'].newValue;enableCC();}});
  store.get('prefs/autoCC').then(v=>{autoCC=!!v['prefs/autoCC'];enableCC();}).catch(()=>{});
  async function route(id){
    const old=session;if(old)flush(old);clearCue();session=null;
    if(!id || !/^[\w-]{11}$/.test(id)){launcher.hidden=true;if(tabActive)view?.open('library');return;}
    const s={id,ready:false,entries:[],ranges:[],previous:'',time:-1,pending:[],spans:[],title:'',channel:'',lastFrame:-100,frameCount:0,frame:null,lastWrite:0,ccTried:false};
    session=s;launcher.hidden=tabActive;
    try{
      if(old?.id===id)await sendQueues.get(old);
      const ck='captions/'+id,fk='frames/'+id,data=await store.get([ck,fk]);
      if(session!==s)return;
      const doc=data[ck];s.title=doc?.title||'';s.channel=doc?.channel||'';s.entries=doc?.entries||[];s.ranges=doc?.ranges||[];
      s.frameCount=data[fk]?.length||0;s.lastFrame=data[fk]?.at(-1)?.t??-100;
    }finally{if(session===s){s.ready=true;if(tabActive)getView().open('read');}}
  }
  function capture(){
    const s=session;
    if(!s?.ready || !media || media.seeking || !player || isAd() || videoId()!==s.id || player.querySelector('.ytp-subtitles-button')?.getAttribute('aria-pressed')==='false'){clearCue();return;}
    const owner=document.querySelector('ytd-watch-flexy[video-id]')?.getAttribute('video-id');
    if(owner && owner!==s.id){clearCue();return;}
    const t=media.currentTime;
    if(!Number.isFinite(t))return;
    if(t<s.time || t-s.time>2)clearCue();
    const caption=Array.from(player.querySelectorAll('.ytp-caption-window-container .ytp-caption-segment'),n=>n.textContent.trim()).filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
    if(caption){
      if(caption!==s.previous && !PT.covered(s.ranges,t)){
        const text=PT.overlap(s.previous,caption);
        if(text){
          const cue={t,text},tail=s.entries.at(-1);
          if(!tail || tail.t<=t)s.entries.push(cue);else s.entries.splice(s.entries.findIndex(e=>e.t>t),0,cue);
          s.pending.push(cue);grabStill(s,t);
        }
      }
      if(!PT.covered(s.ranges,t) || (s.previous && s.time>=0 && t>s.time && !media.paused)){
        const r=[s.previous && s.time>=0?s.time:t,t];
        s.ranges=PT.mergeRanges([...s.ranges,r]);const last=s.spans.at(-1);
        if(last && r[0]>=last[0] && r[0]<=last[1]+.09)last[1]=Math.max(r[1],last[1]);else s.spans.push(r);
      }
    }
    s.time=t;s.previous=caption;
    if(s.pending.length && Date.now()-s.lastWrite>1300)flush(s);
    if(tabActive)view?.update();
  }
  function tick(){
    const id=videoId();if(id!== (session?.id||null))route(id).catch(()=>{writerError=true;});
    for(const s of backlog)if(Date.now()-s.lastWrite>2000)flush(s);
    if(!session)return;
    player=document.querySelector('#movie_player');const next=player?.querySelector('video');
    if(next!==media){
      media?.removeEventListener('timeupdate',capture);media?.removeEventListener('seeking',clearCue);
      media=next;media?.addEventListener('timeupdate',capture);media?.addEventListener('seeking',clearCue);clearCue();
    }
    const box=player?.querySelector('.ytp-caption-window-container');
    if(box!==captionBox){observer?.disconnect();captionBox=box;if(box){observer=new MutationObserver(()=>{if(!busy){busy=true;queueMicrotask(()=>{busy=false;capture();});}});observer.observe(box,{childList:true,subtree:true,characterData:true});}}
    if(session.ready){
      const h=document.querySelector('ytd-watch-metadata h1')?.textContent.trim()||document.title.replace(/ - YouTube$/,'').trim();
      if(h && h!=='YouTube')session.title=h;
      session.channel=document.querySelector('ytd-watch-metadata #owner #channel-name')?.textContent.trim()||session.channel;
      enableCC();capture();if(Date.now()-session.lastWrite>4000)flush(session);
    }
  }
  window.addEventListener('pagehide',()=>flush(session));document.addEventListener('visibilitychange',()=>{if(document.hidden)flush(session);});
  document.addEventListener('yt-navigate-finish',tick);setInterval(tick,450);tick();
})();
