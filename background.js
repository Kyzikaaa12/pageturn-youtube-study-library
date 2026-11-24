'use strict';
const queues=new Map();
const store=browser.storage.local;
browser.runtime.onMessage.addListener((p,sender)=>{
  if(p?.action!=='append' || !/^https:\/\/www\.youtube\.com\//.test(sender.tab?.url||sender.url||'') || !/^[\w-]{11}$/.test(p.id))return;
  const key='captions/'+p.id;
  const task=(queues.get(key)||Promise.resolve()).catch(()=>{}).then(async()=>{
    const old=(await store.get(key))[key];
    const doc=PT.merge(old,p);
    await store.set({[key]:doc});
    if(p.frame){
      const fk='frames/'+p.id, frames=(await store.get(fk))[fk]||[];
      if(frames.length<10 && !frames.some(f=>Math.abs(f.t-p.frame.t)<75))await store.set({[fk]:[...frames,p.frame].sort((a,b)=>a.t-b.t)});
    }
    return true;
  });
  queues.set(key,task);task.finally(()=>{if(queues.get(key)===task)queues.delete(key);}).catch(()=>{});
  return task;
});
browser.browserAction.onClicked.addListener(async tab=>{
  try{if(await browser.tabs.sendMessage(tab.id,{action:'open-book'}))return;}catch{}
  const url=browser.runtime.getURL('library.html');
  await browser.tabs.create({url});
});
