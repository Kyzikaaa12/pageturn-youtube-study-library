'use strict';
const PT = (() => {
  const wordCount = text => (text.match(/\S+/g)||[]).length;
  const clock = t => Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0');
  const stop=new Set(('a an the is be are was were this what that these those they their there were have has about from doing said says first video video interview watch news full today really yeah okay also because actually just like know think something time thing would could should people going right them with then been some only very much more than every when where which such into here does thats youre sometimes years year during after before since will your myself himself while these other started started being still never always wanted want well several really important example remember important result question point part things different called however between both until many most another found gonna got getting working take look looking told come came tell talked talking interesting again sounds seem seems').split(/\s+/));
  const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  function overlap(prev,next) {
    if(!prev)return next;
    const a=prev.split(/\s+/),b=next.split(/\s+/);
    for(let n=Math.min(a.length,b.length);n>0;n--)if(a.slice(-n).join(' ')===b.slice(0,n).join(' '))return b.slice(n).join(' ');
    return next;
  }
  function mergeRanges(ranges) {
    const out=[];
    for(const r of ranges.slice().sort((a,b)=>a[0]-b[0])){
      const tail=out.at(-1);
      if(tail && r[0]<=tail[1]+.09)tail[1]=Math.max(tail[1],r[1]);else out.push(r.slice());
    }
    return out;
  }
  const covered=(ranges,t)=>ranges.some(([a,b])=>a-.035<=t && t<=b+.035);
  function merge(old,packet) {
    const prior=old||{}, ranges=prior.ranges||[], entries=(prior.entries||[]).slice();
    for(const cue of packet.entries)if(!covered(ranges,cue.t) && !entries.some(e=>Math.abs(e.t-cue.t)<1 && e.text===cue.text))entries.push(cue);
    entries.sort((a,b)=>a.t-b.t);
    return {...prior,title:packet.title||prior.title, channel:packet.channel||prior.channel,created:prior.created||packet.at,updated:Math.max(prior.updated||0,packet.at),entries,ranges:mergeRanges([...ranges,...packet.ranges])};
  }
  function passages(entries) {
    const rows=[];let run=[],count=0;
    function close(){if(run.length)rows.push({t:run[0].t,text:run.map(e=>e.text).join(' ').replace(/\s*>>\s*/g,' ').trim(),entries:run});run=[];count=0;}
    for(const e of entries){
      if(run.length && (e.t-run.at(-1).t>6 || /^>>/.test(e.text) || count>=85 || (count>=32 && /[.!?]["’”']?$/.test(run.at(-1).text))))close();
      run.push(e);count+=wordCount(e.text);
    }
    close();return rows;
  }
  function pages(rows,budget=115) {
    const out=[[]];let n=0;
    for(const row of rows){const w=wordCount(row.text);
      if(n && n+w>budget){out.push([]);n=0;}out.at(-1).push(row);n+=w;
    }return out;
  }
  function dates(text) {
    const pattern=new RegExp('(?:\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+)?\\b('+months.join('|')+')\\s+(?:(\\d{1,2})(?:st|nd|rd|th)?[,]?\\s+)?((?:1[0-9]{3}|20[0-9]{2}))\\b|\\b((?:1[0-9]{3}|20[0-9]{2}))\\b','gi');
    const found=[];
    for(const m of text.matchAll(pattern)){
      if(m[5] && /^\s*(?:%|dollars|feet|metres|meters|miles|kilometres|kilometers|people|times|pounds|kg|years\s+(?:old|ago))\b/i.test(text.slice(m.index+m[0].length)))continue;
      const y=Number(m[4]||m[5]);const month=m[2]?months.findIndex(s=>s.toLowerCase()===m[2].toLowerCase())+1:0;const day=Number(m[1]||m[3]||0);
      if(day>31)continue;
      if(!found.some(d=>d.label===m[0]))found.push({label:m[0],order:y*10000+month*100+day});
    }return found;
  }
  function phrases(s) {
    const tokens=(s.toLowerCase().replace(/[’']/g,'').match(/[\p{L}][\p{L}-]*/gu)||[]);
    const terms=new Set();
    for(let i=0;i+1<tokens.length;i++){
      const a=tokens[i],b=tokens[i+1];
      if(a.length>=3 && b.length>=3 && !stop.has(a) && !stop.has(b))terms.add(a+' '+b);
    }return terms;
  }
  function score(text){
    if(wordCount(text)<5)return 0;
    return (dates(text).length?4:0)+ (/\b(?:found|discovered|measured|observed|evidence|because|result|concluded|confirmed|important|means|defined|caused|according to|central|key point|remember)\b/i.test(text)?3:0)+(/\b\d+(?:\.\d+)?\s*(?:%|percent|years|hours|minutes|feet|metres|kilometers|miles)\b/i.test(text)?2:0);
  }
  function index(chapters) {
    const notes=[],events=[],terms=new Map();
    for(const c of chapters) {
      for(const row of passages(c.entries)){
        const item={id:c.id,title:c.title,t:row.t,text:row.text};
        if(score(row.text)>=2)notes.push(item);
        for(const date of dates(row.text))events.push({...item,...date});
        for(const term of phrases(row.text)){
          if(!terms.has(term))terms.set(term,new Map());
          const sources=terms.get(term);if(!sources.has(c.id))sources.set(c.id,item);
        }
      }
    }
    const links=[...terms].filter(([,sources])=>sources.size>=2).sort((a,b)=>b[1].size-a[1].size||a[0].localeCompare(b[0]));
    return {notes,events:events.sort((a,b)=>a.order-b.order||a.t-b.t),links};
  }
  return {clock,overlap,mergeRanges,covered,merge,passages,pages,dates,index,score};
})();
