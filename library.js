const library=PageTurnView({live:()=>null,play:(id,t)=>browser.tabs.create({url:'https://www.youtube.com/watch?v='+encodeURIComponent(id)+'&t='+Math.floor(t)+'s'}),standalone:true});
library.open('library');
