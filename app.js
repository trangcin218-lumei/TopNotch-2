const U=window.UNITS,SP=window.SPEAK,$=s=>document.querySelector(s),app=$('#app');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ls={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const ymd=d=>d.toLocaleDateString('en-CA');
let user=ls.get('tn_session',null);
const load=()=>ls.get('tn_data_'+user,{});
function save(d,active=true){if(active){d.days=d.days||[];const t=ymd(new Date());if(!d.days.includes(t))d.days.push(t)}ls.set('tn_data_'+user,d)}
const speak=t=>{if('speechSynthesis' in window){const u=new SpeechSynthesisUtterance(t.replace(/\s*\/\s*/g,', '));u.lang='en-US';speechSynthesis.cancel();speechSynthesis.speak(u)}};
async function hash(p,salt){const s=salt+p;if(window.crypto&&crypto.subtle){const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')}let h=5381;for(const c of s)h=((h*33)^c.charCodeAt(0))>>>0;return 'x'+h}
const ICON={vocab:'<path d="M4 5h7a3 3 0 0 1 3 3v11a2 2 0 0 0-2-2H4zM20 5h-7a3 3 0 0 0-3 3v11a2 2 0 0 1 2-2h8z"/>',grammar:'<path d="M3 9l9-5 9 5M5 10v8M10 10v8M14 10v8M19 10v8M3 20h18"/>',speaking:'<path d="M4 5h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM20 9v6a2 2 0 0 1-2 2"/>',writing:'<path d="M4 20l1-4L17 4l3 3L8 19zM14 7l3 3"/>',practice:'<path d="M6 3h12v18H6zM9 8h6M9 12h6M9 16h4"/>'};
const SK=[['vocab','Vocabulary','Learn useful words and expressions.'],['grammar','Grammar','Understand key grammar points.'],['speaking','Speaking','Practice real-life conversations.'],['writing','Writing','Improve your writing skills.'],['practice','Practice','Test your knowledge with fun exercises.']];
// ---- tiến độ
const frac=(d,u)=>({vocab:(d.known?.[u.n]?.length||0)/u.v.length,grammar:(d.gram?.[u.n]||0)/u.g.q.length,speaking:(d.speak?.[u.n]?.length||0)/SP[u.n].length,writing:d.write?.[u.n]?.done?1:0});
const unitPct=(d,u)=>{const f=frac(d,u);return (f.vocab+f.grammar+f.speaking+f.writing)/4};
const overall=d=>Math.round(U.reduce((a,u)=>a+unitPct(d,u),0)/U.length*100);
function streak(days=[]){let s=0,x=new Date();if(!days.includes(ymd(x)))x.setDate(x.getDate()-1);while(days.includes(ymd(x))){s++;x.setDate(x.getDate()-1)}return s}
const bar=p=>`<div class="bar" role="progressbar" aria-valuenow="${Math.round(p*100)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${Math.round(p*100)}%"></i></div>`;
// ---- khung trang
function chrome(){
  const h=location.hash.split('/')[1]||'';
  $('#nav').innerHTML=user?[['','Home'],...SK.map(s=>[s[0],s[1]]),['progress','My Progress']].map(([k,l])=>`<a href="#/${k}" class="${h==k?'on':''}">${l}</a>`).join(''):'';
  $('#userbox').innerHTML=user?`<span>Hi, <b>${esc(user)}</b></span><button id="out">Log out</button>`:'';
  if(user)$('#out').onclick=()=>{user=null;ls.set('tn_session',null);location.hash='#/';route()};
}
function route(){
  const [,k,n]=location.hash.split('/');chrome();window.scrollTo(0,0);app.focus({preventScroll:true});
  if(!user)return authView();
  const u=U.find(x=>x.n==n);
  if(!k)return home();
  if(k=='progress')return progress();
  if(k=='practice')return practice();
  if(!SK.some(s=>s[0]==k))return home();
  if(!u)return unitList(k);
  ({vocab,grammar,speaking,writing})[k](u);
}
// ---- đăng nhập / đăng ký
function authView(reg=false){
  app.innerHTML=`<div class="auth"><h1>${reg?'Create account':'Log in'}</h1><p class="sub">${reg?'Choose a username and password to save your progress.':'Welcome back! Log in to continue learning.'}</p>
  <form id="f"><label class="f" for="un">Username</label><input type="text" id="un" autocomplete="username" required minlength="3" maxlength="24">
  <label class="f" for="pw">Password</label><input type="password" id="pw" autocomplete="${reg?'new-password':'current-password'}" required minlength="6">
  ${reg?'<label class="f" for="pw2">Confirm password</label><input type="password" id="pw2" autocomplete="new-password" required>':''}
  <p class="msg no" id="err" role="alert"></p><div class="row"><button class="primary" type="submit">${reg?'Create account':'Log in'}</button><button type="button" id="sw">${reg?'I already have an account':'Create a new account'}</button></div></form>
  <p class="sub">Accounts are stored in this browser only.</p></div>`;
  $('#sw').onclick=()=>authView(!reg);
  $('#f').onsubmit=async e=>{e.preventDefault();const name=$('#un').value.trim().toLowerCase(),pw=$('#pw').value,users=ls.get('tn_users',{}),err=m=>$('#err').textContent=m;
    if(!/^[a-z0-9_.-]{3,24}$/.test(name))return err('Username: 3–24 characters (a–z, 0–9, _ . -).');
    if(reg){if(pw.length<6)return err('Password must have at least 6 characters.');if(pw!==$('#pw2').value)return err('Passwords do not match.');if(users[name])return err('This username is already taken.');
      const salt=Math.random().toString(36).slice(2)+Date.now();users[name]={salt,hash:await hash(pw,salt)};ls.set('tn_users',users)}
    else{const r=users[name];if(!r||r.hash!==await hash(pw,r.salt))return err('Wrong username or password.')}
    user=name;ls.set('tn_session',name);location.hash='#/';route()};
}
// ---- trang chủ
function home(){
  const d=load(),p=overall(d),s=streak(d.days);
  app.innerHTML=`<section class="hero"><div><h1>Your English Learning Journey<em>Starts Here!</em></h1><p>Build vocabulary. Master grammar. Gain confidence in English!</p><a class="btn primary" href="#/vocab">Start Learning</a></div><div class="books" aria-hidden="true"><div>LEARN</div><div>PRACTICE</div><div>ACHIEVE</div></div></section>
  <div class="cards">${SK.map(([k,l,t])=>`<div class="card"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg><h3>${l}</h3><p>${t}</p><a class="btn" href="#/${k}">Explore</a></div>`).join('')}</div>
  <div class="keep"><div><b>Keep Going!</b><p>${s?`${s}-day streak. `:''}Small steps make a big difference. You have completed ${p}% of Top Notch 2.</p></div><a class="btn primary" href="#/progress">My Progress</a></div>`;
}
function unitList(k){
  const d=load(),name=SK.find(s=>s[0]==k)[1];
  app.innerHTML=`<h1>${name}</h1><p class="sub">Choose a unit.</p><div class="units">${U.map(u=>`<a class="unit" href="#/${k}/${u.n}"><b>Unit ${u.n}</b><small>${esc(u.t)}</small>${bar(frac(d,u)[k])}</a>`).join('')}</div>`;
}
const head=(u,k)=>`<p><a href="#/${k}">&larr; All units</a></p><h1>Unit ${u.n}: ${esc(u.t)}</h1><p class="sub">${esc(u.vi)}</p>`;
// ---- từ vựng
function vocab(u){
  let order=[...u.v.keys()],i=0,mode='card';const el=app;
  const known=()=>load().known?.[u.n]||[],setK=a=>{const d=load();(d.known=d.known||{})[u.n]=a;save(d)};
  const bar2=()=>`<div class="row">${[['card','Flashcards'],['type','Type the word'],['list','Word list']].map(([k,l])=>`<button data-m="${k}" class="${mode==k?'primary':''}">${l}</button>`).join('')}</div>`;
  function draw(){
    let body;const w=u.v[order[i]];
    if(mode=='list')body=`<table>${u.v.map(w=>`<tr><td>${esc(w[0])}</td><td>${esc(w[1])}</td></tr>`).join('')}</table>`;
    else if(mode=='card')body=`<p class="sub">Card ${i+1}/${order.length}. Learned: ${known().length}/${u.v.length}</p>${bar(known().length/u.v.length)}<div class="flash" id="fc"><div><div class="face">${esc(w[0])}</div><div class="face back">${esc(w[1])}</div></div></div><div class="row"><button id="flip">Flip</button><button id="say">Listen</button><button id="no">Still learning</button><button class="primary" id="yes">I know it</button><button id="shuf">Shuffle</button></div>`;
    else body=`<p>Type the English word for:</p><h2>${esc(w[1])}</h2><input type="text" id="ans" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Answer"><div class="row"><button class="primary" id="chk">Check</button><button id="skip">Another word</button></div><p class="msg" id="fb" role="status"></p>`;
    el.innerHTML=head(u,'vocab')+bar2()+body;
    el.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{mode=b.dataset.m;i=0;order=[...u.v.keys()];draw()});
    if(mode=='card'){const next=()=>{i=(i+1)%order.length;draw()};
      $('#fc').onclick=$('#flip').onclick=()=>$('#fc').classList.toggle('flip');$('#say').onclick=()=>speak(w[0]);
      $('#yes').onclick=()=>{setK([...new Set([...known(),order[i]])]);next()};$('#no').onclick=()=>{setK(known().filter(x=>x!=order[i]));next()};$('#shuf').onclick=()=>{order.sort(()=>Math.random()-.5);i=0;draw()}}
    if(mode=='type'){const check=()=>{const a=$('#ans').value.trim().toLowerCase(),ok=a==w[0].toLowerCase()||a==w[0].split(' / ')[0].toLowerCase();$('#fb').className='msg '+(ok?'ok':'no');$('#fb').textContent=ok?'Correct!':'Not quite. Answer: '+w[0];if(ok){const d=load();save(d)}};
      $('#chk').onclick=check;$('#ans').onkeydown=e=>{if(e.key=='Enter')check()};$('#skip').onclick=()=>{i=Math.floor(Math.random()*order.length);draw()}}
  }
  draw();
}
// ---- ngữ pháp
function grammar(u){
  const g=u.g;let right=0,done=0;
  app.innerHTML=head(u,'grammar')+`<h2>${esc(g.t)}</h2><div class="box rule">${esc(g.note)}</div><h2>Examples</h2><ul>${g.eg.map(e=>`<li>${esc(e)}</li>`).join('')}</ul><h2>Exercises</h2><div id="qs"></div><p class="msg" id="score" role="status"></p>`;
  g.q.forEach((q,qi)=>{const d=document.createElement('div');d.className='q';d.innerHTML=`<div>${qi+1}. ${esc(q[0])}</div>`+q[1].split('|').map((o,oi)=>`<label><input type="radio" name="q${qi}" value="${oi}"> ${esc(o)}</label>`).join('');
    d.querySelectorAll('input').forEach(inp=>inp.onchange=()=>{if(d.dataset.done)return;d.dataset.done=1;done++;d.querySelectorAll('label')[q[2]].classList.add('ok');if(+inp.value==q[2])right++;else inp.parentNode.classList.add('no');d.querySelectorAll('input').forEach(x=>x.disabled=true);
      if(done==g.q.length){$('#score').textContent=`Score: ${right}/${g.q.length}`;const dd=load();(dd.gram=dd.gram||{})[u.n]=Math.max(right,dd.gram[u.n]||0);save(dd)}});$('#qs').appendChild(d)});
}
// ---- nói
function speaking(u){
  const d=load(),done=d.speak?.[u.n]||[];
  app.innerHTML=head(u,'speaking')+`<p>Say each expression aloud, then tick it when you can use it naturally.</p>`+SP[u.n].map((p,i)=>`<div class="phrase"><input type="checkbox" data-i="${i}" ${done.includes(i)?'checked':''} aria-label="Practiced: ${esc(p[0])}"><div><b>${esc(p[0])}</b><br><span class="sub">${esc(p[1])}</span><br><i>${esc(p[2])}</i> <button data-s="${i}">Listen</button></div></div>`).join('');
  app.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>speak(SP[u.n][b.dataset.s][2]));
  app.querySelectorAll('[data-i]').forEach(c=>c.onchange=()=>{const dd=load(),s=new Set(dd.speak?.[u.n]||[]);c.checked?s.add(+c.dataset.i):s.delete(+c.dataset.i);(dd.speak=dd.speak||{})[u.n]=[...s];save(dd)});
}
// ---- viết
function writing(u){
  const w=u.w,cur=load().write?.[u.n]||{text:'',done:false};
  app.innerHTML=head(u,'writing')+`<div class="box rule"><b>Task:</b> ${esc(w.task)}</div><h2>Skill: ${esc(w.skill)}</h2><ul>${w.tips.map(t=>`<li>${esc(t)}</li>`).join('')}</ul><h2>Your writing</h2><textarea id="ta" aria-label="Your writing" placeholder="${esc(w.start)}"></textarea><div class="row"><span id="wc">0 words</span><button id="st">Insert starter</button><label><input type="checkbox" id="dn"> Mark as completed</label></div><p class="sub">Your draft is saved automatically.</p>`;
  const ta=$('#ta');ta.value=cur.text;$('#dn').checked=cur.done;
  const upd=()=>{$('#wc').textContent=(ta.value.trim()?ta.value.trim().split(/\s+/).length:0)+' words';const d=load();(d.write=d.write||{})[u.n]={text:ta.value,done:$('#dn').checked};save(d,!!ta.value)};
  ta.oninput=upd;$('#dn').onchange=upd;$('#st').onclick=()=>{if(!ta.value)ta.value=w.start;upd();ta.focus()};
  $('#wc').textContent=(ta.value.trim()?ta.value.trim().split(/\s+/).length:0)+' words';
}
// ---- luyện tập tổng hợp
function practice(){
  const pool=[];U.forEach(u=>{u.g.q.forEach(q=>{const o=q[1].split('|');pool.push({q:q[0],o,a:q[2]})});
    u.v.forEach((w,i)=>{const others=u.v.filter((_,j)=>j!=i).sort(()=>Math.random()-.5).slice(0,2).map(x=>x[1]),o=[w[1],...others].sort(()=>Math.random()-.5);pool.push({q:`What does "${w[0]}" mean?`,o,a:o.indexOf(w[1])})})});
  const qs=pool.sort(()=>Math.random()-.5).slice(0,10);
  app.innerHTML=`<h1>Practice</h1><p class="sub">10 mixed questions from all units.</p><div id="qs"></div><div class="row"><button class="primary" id="sub">Check answers</button></div><p class="msg" id="score" role="status"></p>`;
  qs.forEach((q,qi)=>{$('#qs').insertAdjacentHTML('beforeend',`<div class="q" id="q${qi}"><div>${qi+1}. ${esc(q.q)}</div>${q.o.map((o,oi)=>`<label><input type="radio" name="p${qi}" value="${oi}"> ${esc(o)}</label>`).join('')}</div>`)});
  $('#sub').onclick=()=>{let r=0;qs.forEach((q,qi)=>{const labs=$('#q'+qi).querySelectorAll('label'),sel=$(`input[name=p${qi}]:checked`);labs[q.a].classList.add('ok');if(sel&&+sel.value==q.a)r++;else if(sel)sel.parentNode.classList.add('no');$('#q'+qi).querySelectorAll('input').forEach(x=>x.disabled=true)});
    $('#score').textContent=`Score: ${r}/${qs.length}`;$('#sub').disabled=true;const d=load();(d.practice=d.practice||[]).push({date:ymd(new Date()),score:r,total:qs.length});save(d)};
}
// ---- theo dõi tiến độ
function progress(){
  const d=load(),pr=d.practice||[],avg=pr.length?Math.round(pr.reduce((a,x)=>a+x.score/x.total,0)/pr.length*100):0;
  app.innerHTML=`<h1>My Progress</h1><p class="sub">Your learning record, ${esc(user)}.</p>
  <div class="stats"><div class="stat"><b>${overall(d)}%</b>Course completed</div><div class="stat"><b>${streak(d.days)}</b>Day streak</div><div class="stat"><b>${(d.days||[]).length}</b>Days studied</div><div class="stat"><b>${pr.length?avg+'%':'–'}</b>Practice average</div></div>
  ${bar(overall(d)/100)}<h2>By unit</h2><div style="overflow-x:auto"><table><tr><th>Unit</th><th>Vocabulary</th><th>Grammar</th><th>Speaking</th><th>Writing</th></tr>${U.map(u=>{const f=frac(d,u);return `<tr><td><a href="#/vocab/${u.n}">${u.n}. ${esc(u.t)}</a></td>${['vocab','grammar','speaking','writing'].map(k=>`<td style="min-width:90px"><a href="#/${k}/${u.n}" style="text-decoration:none;color:inherit">${Math.round(f[k]*100)}%${bar(f[k])}</a></td>`).join('')}</tr>`}).join('')}</table></div>
  <h2>Recent practice</h2>${pr.length?`<table><tr><th>Date</th><th>Score</th></tr>${pr.slice(-8).reverse().map(x=>`<tr><td>${x.date}</td><td>${x.score}/${x.total}</td></tr>`).join('')}</table>`:'<p class="sub">No practice yet. Try the Practice section.</p>'}
  <p class="sub">Vocabulary = words marked "I know it". Grammar = best exercise score. Speaking = phrases ticked. Writing = marked completed.</p>`;
}
addEventListener('hashchange',route);route();
