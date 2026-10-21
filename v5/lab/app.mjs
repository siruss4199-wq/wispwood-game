import {LAB_SAVE_KEY,FAMILIES,CHAPTER,newGame,unlocked,image,itemName,matching,objective,needIndices,ready,direction,act,load} from './engine.mjs';
const $=q=>document.querySelector(q);let state=load(localStorage.getItem(LAB_SAVE_KEY)),selected=null,press=null,dragged=false;
const save=()=>{try{localStorage.setItem(LAB_SAVE_KEY,JSON.stringify(state))}catch{$('#message').textContent='Storage unavailable: this run may not save.'}};
const img=x=>x?'<img class="art" src="'+image(x)+'" alt="" draggable="false">':'';
function render(){
 const g=objective(state),hint=direction(state);$('#worldArt').src='../assets/premium/'+g.art;$('#worldTag').textContent=g.tag;$('#worldName').textContent=g.title;
 $('#worldProgress').innerHTML=Array.from({length:6},(_,i)=>'<i class="'+(i<state.phase?'done':i===state.phase?'current':'')+'"></i>').join('');
 let html='<div class="missionTop"><span>'+g.tag+'</span><small>'+(state.phase<6?'DISCOVERY '+(state.phase+1)+'/6':'FIRST CLUE FOUND')+'</small></div><h1>'+g.title+'</h1><p>'+g.why+'</p>';
 if(g.needs){const used=needIndices(state);html+='<div class="ingredients">'+g.needs.map((n,i)=>{const x={type:'item',...n},ok=used[i]>=0;return '<div class="ingredient '+(ok?'available':'')+'">'+img(x)+'<span><b>'+itemName(x)+'</b><small>'+(ok?'READY ✓':'NEED 1')+'</small></span></div>'}).join('')+'</div><button class="primary '+(ready(state)?'active':'')+'" id="claim" '+(ready(state)?'':'disabled')+'>'+(ready(state)?g.button:'CRAFT MATERIALS TO CONTINUE')+'</button>'}
 else if(state.phase===4)html+='<div class="choices"><button data-route="reef"><b>☀ NORTHERN REEF</b><small>Follow the faded chart</small></button><button data-route="cavern"><b>◈ ECHO CAVERN</b><small>Follow the ancient echo</small></button></div>';
 else if(state.phase===0)html+='<div class="prompt">TAP THE TWO GLOWING COPPER PIECES ↘</div>';
 else html+='<div class="prompt">A real discovery, and a larger mystery. This prototype stops here — not the full chapter.</div>';
 $('#mission').innerHTML=html;$('#guidance').textContent=hint.label;$('#free').textContent=state.board.filter(x=>!x).length+' FREE CELLS';
 const marks=new Set(hint.indices);
 $('#board').innerHTML=state.board.map((x,i)=>{const locked=x?.type==='source'&&!unlocked(state,x.family);return '<button class="cell '+(x?.type||'empty')+(locked?' locked':'')+(marks.has(i)?' target':'')+(selected===i?' selected':'')+(selected!==null&&matching(state.board[selected],x)?' match':'')+'" data-index="'+i+'" aria-label="'+(x?itemName(x):'Empty cell')+'">'+img(x)+(x?.type==='source'?'<i>'+(locked?'LOCK':'TAP')+'</i>':x?.type==='item'?'<i>'+String(x.tier+1)+'</i>':'')+'</button>'}).join('');
 const item=state.board[selected];$('#selection').innerHTML=item?img(item)+'<span><b>'+itemName(item)+'</b><small>'+FAMILIES[item.family].role+'</small></span>'+(item.type==='item'?'<button id="recycle">RECYCLE</button>':''): '<span>Select an item to inspect it. Tap an unlocked producer to create materials.</span>';
 $('#journalEntries').innerHTML=state.history.map(h=>'<article><h3>'+h.title+'</h3><p>'+h.text+'</p></article>').join('');
}
function dispatch(a){const r=act(state,a);if(!r.ok){$('#message').textContent=r.message;return}state=r.state;selected=r.index??null;save();render();$('#message').textContent=r.message;if(r.event){$('#revealTitle').textContent=r.event.title;$('#revealText').textContent=r.event.text;$('#reveal').showModal()}}
function tap(i){const x=state.board[i];if(!x){selected=null;render();return}if(x.type==='source'){selected=i;if(unlocked(state,x.family))dispatch({type:'produce',family:x.family});else{$('#message').textContent='Restore the coast to unlock this producer.';render()}return}if(selected!==null&&selected!==i&&matching(state.board[selected],x)){dispatch({type:'merge',from:selected,to:i});return}selected=selected===i?null:i;render()}
$('#board').addEventListener('click',e=>{if(dragged){dragged=false;return}const c=e.target.closest('[data-index]');if(c)tap(Number(c.dataset.index))});
$('#board').addEventListener('pointerdown',e=>{const c=e.target.closest('[data-index]');press=c?{i:+c.dataset.index,x:e.clientX,y:e.clientY}:null});
$('#board').addEventListener('pointerup',e=>{if(!press)return;const p=press;press=null;if(Math.hypot(e.clientX-p.x,e.clientY-p.y)<16)return;const c=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-index]');if(c&&matching(state.board[p.i],state.board[+c.dataset.index])){dragged=true;dispatch({type:'merge',from:p.i,to:+c.dataset.index});setTimeout(()=>dragged=false,100)}});
$('#board').addEventListener('pointercancel',()=>press=null);
$('#mission').addEventListener('click',e=>{if(e.target.closest('#claim'))dispatch({type:'claim'});const c=e.target.closest('[data-route]');if(c)dispatch({type:'choose',route:c.dataset.route})});
$('#selection').addEventListener('click',e=>{if(e.target.closest('#recycle')&&selected!==null)dispatch({type:'recycle',index:selected})});
$('#revealNext').onclick=()=>$('#reveal').close();$('#journalButton').onclick=()=>$('#journal').showModal();$('#journalClose').onclick=()=>$('#journal').close();
$('#restart').onclick=()=>{if(!confirm('Restart only the separate Lab prototype? Your main V5 save stays untouched.'))return;state=newGame();selected=null;save();render()};render();