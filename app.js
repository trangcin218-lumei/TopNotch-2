const U=window.UNITS,SP=window.SPEAK,WR=window.WR,PQ=window.PQ,PH=window.PH,GT=window.GT,$=s=>document.querySelector(s),app=$('#app');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const ls={get(k,d){try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const ymd=d=>d.toLocaleDateString('en-CA');
let user=ls.get('tn_session',null);const GUEST='__guest__',nm=()=>user===GUEST?'friend':user;
const E={'':'🏠',vocab:'📖',grammar:'🧩',speaking:'💬',writing:'✏️',practice:'⭐',progress:'🌱'};
const POS={n:'noun',v:'verb',adj:'adjective',vphr:'verb phrase',nphr:'noun phrase',exp:'expression',idiom:'idiom'};
const gq=u=>[...u.g.q.map(q=>{const o=q[1].split('|');return{q:q[0],o,a:o[q[2]]}}),...PQ[u.n].map(q=>{const o=q[1].split('|');return{q:q[0],o,a:o[0]}})];
const load=()=>ls.get('tn_data_'+user,{});
function save(d,active=true){if(active){d.days=d.days||[];const t=ymd(new Date());if(!d.days.includes(t))d.days.push(t)}ls.set('tn_data_'+user,d)}
const speak=t=>{if('speechSynthesis' in window){const u=new SpeechSynthesisUtterance(t.replace(/\s*\/\s*/g,', '));u.lang='en-US';speechSynthesis.cancel();speechSynthesis.speak(u)}};
async function hash(p,salt){const s=salt+p;if(window.crypto&&crypto.subtle){const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(h)].map(x=>x.toString(16).padStart(2,'0')).join('')}let h=5381;for(const c of s)h=((h*33)^c.charCodeAt(0))>>>0;return 'x'+h}
const ICON={vocab:'<path d="M4 5h7a3 3 0 0 1 3 3v11a2 2 0 0 0-2-2H4zM20 5h-7a3 3 0 0 0-3 3v11a2 2 0 0 1 2-2h8z"/>',grammar:'<path d="M3 9l9-5 9 5M5 10v8M10 10v8M14 10v8M19 10v8M3 20h18"/>',speaking:'<path d="M4 5h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zM20 9v6a2 2 0 0 1-2 2"/>',writing:'<path d="M4 20l1-4L17 4l3 3L8 19zM14 7l3 3"/>',practice:'<path d="M6 3h12v18H6zM9 8h6M9 12h6M9 16h4"/>'};
const SK=[['vocab','Vocabulary','Learn useful words and expressions.'],['grammar','Grammar','Understand key grammar points.'],['speaking','Speaking','Practice real-life conversations.'],['writing','Writing','Improve your writing skills.'],['practice','Practice','Test your knowledge with fun exercises.']];
// ---- tiến độ
const frac=(d,u)=>({vocab:(d.known?.[u.n]?.length||0)/u.v.length,grammar:(d.gram?.[u.n]||0)/10,speaking:(d.speak?.[u.n]?.length||0)/SP[u.n].q.length,writing:(d.wr?.[u.n]?.length||0)/WR[u.n].length,practice:(d.prac?.[u.n]||0)/20});
const unitPct=(d,u)=>Object.values(frac(d,u)).reduce((x,y)=>x+y,0)/5;
const overall=d=>Math.round(U.reduce((a,u)=>a+unitPct(d,u),0)/U.length*100);
function streak(days=[]){let s=0,x=new Date();if(!days.includes(ymd(x)))x.setDate(x.getDate()-1);while(days.includes(ymd(x))){s++;x.setDate(x.getDate()-1)}return s}
const bar=p=>`<div class="bar" role="progressbar" aria-valuenow="${Math.round(p*100)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${Math.round(p*100)}%"></i></div>`;
// ---- khung trang
function chrome(){
  const h=location.hash.split('/')[1]||'';
  $('#nav').innerHTML=user?[['','Home'],...SK.map(s=>[s[0],s[1]]),['progress','My Progress']].map(([k,l])=>`<a href="#/${k}" class="${h==k?'on':''}">${E[k]} ${l}</a>`).join(''):'';
  $('#userbox').innerHTML=user?`<span>${user===GUEST?'Guest mode':'Hi, <b>'+esc(user)+'</b>'}</span><button id="out">${user===GUEST?'Log in':'Log out'}</button>`:'';
  if(user)$('#out').onclick=()=>{user=null;ls.set('tn_session',null);location.hash='#/';route()};
}
function route(){
  const [,k,n]=location.hash.split('/');chrome();window.scrollTo(0,0);app.focus({preventScroll:true});
  if(!user)return authView();
  const u=U.find(x=>x.n==n);
  if(!k)return home();
  if(k=='progress')return progress();
  if(!SK.some(s=>s[0]==k))return home();
  if(!u)return unitList(k);
  ({vocab,grammar,speaking,writing,practice})[k](u);
}
// ---- đăng nhập / đăng ký
function authView(reg=false){
  app.innerHTML=`<div class="auth"><h1>${reg?'Create account':'Log in'}</h1><p class="sub">${reg?'Choose a username and password to keep your own progress.':'Welcome back! Log in to continue learning.'}</p>
  <form id="f"><label class="f" for="un">Username</label><input type="text" id="un" autocomplete="username" required minlength="3" maxlength="24">
  <label class="f" for="pw">Password</label><input type="password" id="pw" autocomplete="${reg?'new-password':'current-password'}" required minlength="6">
  ${reg?'<label class="f" for="pw2">Confirm password</label><input type="password" id="pw2" autocomplete="new-password" required>':''}
  <p class="msg no" id="err" role="alert"></p><div class="row"><button class="primary" type="submit">${reg?'Create account':'Log in'}</button><button type="button" id="sw">${reg?'I already have an account':'Create a new account'}</button></div></form>
  <div class="row"><button type="button" id="guest">Continue without logging in 🎒</button></div>
  <p class="sub">Accounts and progress are stored in this browser only. In guest mode your progress is saved in this browser too, but it is separate from any account.</p></div>`;
  $('#guest').onclick=()=>{user=GUEST;ls.set('tn_session',GUEST);location.hash='#/';route()};
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
  app.innerHTML=`<section class="hero"><div><h1>Your English Learning Journey<em>Starts Here!</em></h1><p>Build vocabulary. Master grammar. Gain confidence in English!</p><a class="btn primary" href="#/vocab">Start Learning</a></div><div class="hero-art"><div class="bubble">Hi ${esc(nm())}! Let's have fun learning today ✨</div><svg class="mascot" viewBox="0 0 120 120"><circle cx="60" cy="84" r="34" fill="#8cc4f7"/><polygon points="60,14 12,34 60,52 108,34" fill="#1d4f91"/><path d="M34 46v12c0 5 12 9 26 9s26-4 26-9V46L60 56z" fill="#2f7fd1"/><path d="M104 36v18" stroke="#f2b632" stroke-width="3"/><circle cx="104" cy="57" r="4" fill="#f2b632"/><circle cx="48" cy="82" r="5" fill="#12335b"/><circle cx="72" cy="82" r="5" fill="#12335b"/><circle cx="50" cy="80" r="1.8" fill="#fff"/><circle cx="74" cy="80" r="1.8" fill="#fff"/><ellipse cx="38" cy="94" rx="6" ry="4" fill="#ffb3c1"/><ellipse cx="82" cy="94" rx="6" ry="4" fill="#ffb3c1"/><path d="M52 94q8 8 16 0" fill="none" stroke="#12335b" stroke-width="3" stroke-linecap="round"/></svg><div class="books"><div>LEARN</div><div>PRACTICE</div><div>ACHIEVE</div></div></div></section>
  <div class="cards">${SK.map(([k,l,t])=>`<div class="card c-${k}"><svg viewBox="0 0 24 24" aria-hidden="true">${ICON[k]}</svg><h3>${l}</h3><p>${t}</p><a class="btn" href="#/${k}">Explore</a></div>`).join('')}</div>
  <div class="keep"><div><b>Keep Going!</b><p>${s?`${s}-day streak. `:''}Small steps make a big difference. You're doing great! You have completed ${p}% of Top Notch 2.</p></div><a class="btn primary" href="#/progress">My Progress</a></div>`;
}
function unitList(k){
  const d=load(),name=SK.find(s=>s[0]==k)[1];
  app.innerHTML=`<h1>${E[k]} ${name}</h1><p class="sub">Choose a unit.</p><div class="units">${U.map(u=>`<a class="unit" href="#/${k}/${u.n}"><b>Unit ${u.n}</b><small>${esc(u.t)}</small>${bar(frac(d,u)[k])}</a>`).join('')}</div>`;
}
const head=(u,k)=>`<p><a href="#/${k}">&larr; All units</a></p><h1>Unit ${u.n}: ${esc(u.t)}</h1><p class="sub">${esc(u.vi)}</p>`;
// ---- từ vựng
function vocab(u){
  let order=[...u.v.keys()],i=0,mode='card',az=false;const el=app;
  const known=()=>load().known?.[u.n]||[],setK=a=>{const d=load();(d.known=d.known||{})[u.n]=a;save(d)};
  const bar2=()=>`<div class="row">${[['card','Flashcards'],['type','Type the word'],['list','Word list']].map(([k,l])=>`<button data-m="${k}" class="${mode==k?'primary':''}">${l}</button>`).join('')}</div>`;
  function draw(){
    let body;const w=u.v[order[i]];
    if(mode=='list'){const rows=u.v.map((w,j)=>[w,j]);if(az)rows.sort((x,y)=>x[0][0].replace(/^(a|an) /,'').localeCompare(y[0][0].replace(/^(a|an) /,'')));
      body=`<div class="row"><button id="az">${az?'Book order':'Sort A–Z'}</button><span class="sub">${u.v.length} words and phrases</span></div><div style="overflow-x:auto"><table class="wl"><tr><th>#</th><th>Word / phrase</th><th>Phonetics</th><th>Part of speech</th><th>Vietnamese</th><th><span class="sr">Listen</span></th></tr>${rows.map(([w,j],n)=>{const p=(PH[w[0]]||'|').split('|');return `<tr><td>${n+1}</td><td><b>${esc(w[0])}</b></td><td class="ipa">${esc(p[0])}</td><td>${POS[p[1]]||''}</td><td>${esc(w[1])}</td><td><button data-sp="${j}" aria-label="Listen to ${esc(w[0])}">🔊</button></td></tr>`}).join('')}</table></div>`}
    else if(mode=='card')body=`<p class="sub">Card ${i+1}/${order.length}. Learned: ${known().length}/${u.v.length}</p>${bar(known().length/u.v.length)}<div class="flash" id="fc"><div><div class="face"><div>${esc(w[0])}<br><small class="ipa">${esc((PH[w[0]]||'').split('|')[0])}</small></div></div><div class="face back">${esc(w[1])}</div></div></div><div class="row"><button id="flip">Flip</button><button id="say">Listen</button><button id="no">Still learning</button><button class="primary" id="yes">I know it</button><button id="shuf">Shuffle</button></div>`;
    else body=`<p>Type the English word for:</p><h2>${esc(w[1])}</h2><input type="text" id="ans" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Answer"><div class="row"><button class="primary" id="chk">Check</button><button id="skip">Another word</button></div><p class="msg" id="fb" role="status"></p>`;
    el.innerHTML=head(u,'vocab')+bar2()+body;
    el.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{mode=b.dataset.m;i=0;order=[...u.v.keys()];draw()});
    if(mode=='list'){const az2=$('#az');if(az2)az2.onclick=()=>{az=!az;draw()};el.querySelectorAll('[data-sp]').forEach(b=>b.onclick=()=>speak(u.v[b.dataset.sp][0]))}
    if(mode=='card'){const next=()=>{i=(i+1)%order.length;draw()};
      $('#fc').onclick=$('#flip').onclick=()=>$('#fc').classList.toggle('flip');$('#say').onclick=()=>speak(w[0]);
      $('#yes').onclick=()=>{setK([...new Set([...known(),order[i]])]);next()};$('#no').onclick=()=>{setK(known().filter(x=>x!=order[i]));next()};$('#shuf').onclick=()=>{order.sort(()=>Math.random()-.5);i=0;draw()}}
    if(mode=='type'){const check=()=>{const a=$('#ans').value.trim().toLowerCase(),ok=a==w[0].toLowerCase()||a==w[0].split(' / ')[0].toLowerCase();$('#fb').className='msg '+(ok?'ok':'no');$('#fb').textContent=ok?'Correct!':'Not quite. Answer: '+w[0];if(ok){const d=load();save(d)}};
      $('#chk').onclick=check;$('#ans').onkeydown=e=>{if(e.key=='Enter')check()};$('#skip').onclick=()=>{i=Math.floor(Math.random()*order.length);draw()}}
  }
  draw();
}
// ---- ngữ pháp: bảng + 10 câu bài tập
function grammar(u){
  const qs=gq(u).map(q=>({...q,o:shuffle(q.o)}));let right=0,done=0;
  app.innerHTML=head(u,'grammar')+`<h2>${esc(u.g.t)}</h2><div style="overflow-x:auto"><table class="gt"><tr><th>Dùng khi</th><th>Cấu trúc</th><th>Ví dụ</th></tr>${GT[u.n].map(r=>`<tr><td>${esc(r[0])}</td><td><b>${esc(r[1])}</b></td><td><i>${esc(r[2])}</i></td></tr>`).join('')}</table></div><h2>Exercises (10 questions)</h2><div id="qs"></div><p class="msg" id="score" role="status"></p><div class="row"><a class="btn" href="#/grammar/${u.n}" id="again" hidden>Try again</a></div>`;
  qs.forEach((q,qi)=>{const d=document.createElement('div');d.className='q';d.innerHTML=`<div>${qi+1}. ${esc(q.q)}</div>`+q.o.map((o,oi)=>`<label><input type="radio" name="q${qi}" value="${oi}"> ${esc(o)}</label>`).join('');
    d.querySelectorAll('input').forEach(inp=>inp.onchange=()=>{if(d.dataset.done)return;d.dataset.done=1;done++;const labs=d.querySelectorAll('label');labs[q.o.indexOf(q.a)].classList.add('ok');if(q.o[+inp.value]==q.a)right++;else inp.parentNode.classList.add('no');d.querySelectorAll('input').forEach(x=>x.disabled=true);
      if(done==qs.length){$('#score').textContent=`Score: ${right}/${qs.length}${right>=8?' Great work! 🎉':' Keep going, you can do it!'}`;$('#again').hidden=false;const dd=load();(dd.gram=dd.gram||{})[u.n]=Math.max(right,dd.gram?.[u.n]||0);save(dd)}});$('#qs').appendChild(d)});
  $('#again').onclick=()=>setTimeout(route,0);
}
// ---- nói
function speaking(u){
  const D=SP[u.n],d=load(),done=d.speak?.[u.n]||[];
  app.innerHTML=head(u,'speaking')+`<h2>Useful structures</h2><div class="box rule"><ul>${D.s.map(s=>`<li>${esc(s)}</li>`).join('')}</ul></div><p>Answer each question aloud. Open the sample answer to compare, then tick the question.</p>`+D.q.map((q,i)=>`<div class="qa"><input type="checkbox" data-i="${i}" ${done.includes(i)?'checked':''} aria-label="Answered question ${i+1}"><div><b>${i+1}. ${esc(q[0])}</b><div class="chip">Try: ${esc(D.s[q[1]])}</div><details><summary>Sample answer</summary><p>${esc(q[2])} <button data-s="${i}">Listen</button></p></details></div></div>`).join('');
  app.querySelectorAll('[data-s]').forEach(b=>b.onclick=()=>speak(D.q[b.dataset.s][2]));
  app.querySelectorAll('[data-i]').forEach(c=>c.onchange=()=>{const dd=load(),s=new Set(dd.speak?.[u.n]||[]);c.checked?s.add(+c.dataset.i):s.delete(+c.dataset.i);(dd.speak=dd.speak||{})[u.n]=[...s];save(dd)});
}
// ---- viết: sắp xếp lại câu
const shuffle=a=>a.map(x=>[Math.random(),x]).sort((p,q)=>p[0]-q[0]).map(x=>x[1]);
function writing(u){
  const S=WR[u.n],solved=new Set(load().wr?.[u.n]||[]);
  app.innerHTML=head(u,'writing')+`<div class="box rule"><b>Writing skill:</b> ${esc(u.w.skill)}<ul>${u.w.tips.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></div><h2>Put the words in order</h2><p class="sub">Tap the words to build each sentence. Solved: <b id="cnt"></b></p><div id="ex"></div>`;
  const cnt=()=>$('#cnt').textContent=solved.size+'/'+S.length;cnt();
  S.forEach((s,i)=>{
    const w=s.split(' '),ord=shuffle(w.map((_,j)=>j));let pick=[],msg=solved.has(i)?'Solved!':'';
    const box=document.createElement('div');box.className='sent';$('#ex').appendChild(box);
    const draw=()=>{
      box.innerHTML=`<b>Sentence ${i+1}</b><div class="ans" aria-live="polite">${pick.length?pick.map(j=>`<button class="w" data-r="${j}">${esc(w[j])}</button>`).join(''):'<span class="sub">Tap the words below</span>'}</div><div class="pool">${ord.filter(j=>!pick.includes(j)).map(j=>`<button class="w" data-a="${j}">${esc(w[j])}</button>`).join('')}</div><div class="row"><button class="primary" data-c>Check</button><button data-x>Reset</button><span class="msg ${solved.has(i)?'ok':''}" role="status">${msg}</span></div>`;
      box.querySelectorAll('[data-a]').forEach(b=>b.onclick=()=>{pick.push(+b.dataset.a);msg='';draw()});
      box.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{pick=pick.filter(x=>x!=b.dataset.r);msg='';draw()});
      box.querySelector('[data-x]').onclick=()=>{pick=[];msg='';draw()};
      box.querySelector('[data-c]').onclick=()=>{const ok=pick.map(j=>w[j]).join(' ')==s;msg=ok?'Great job!':'Not yet. Try again!';
        if(ok){solved.add(i);const d=load();(d.wr=d.wr||{})[u.n]=[...solved];save(d);cnt()}draw();box.querySelector('.msg').className='msg '+(ok?'ok':'no')};
    };draw();
  });
}
// ---- luyện tập theo unit: 10 ngữ pháp + 10 từ vựng
function practice(u){
  const g=gq(u);
  const vs=shuffle(u.v).slice(0,10).map((w,i)=>{const ot=shuffle(u.v.filter(x=>x!==w)).slice(0,2),fw=i%2==0;
    return fw?{q:`What does "${w[0]}" mean?`,o:[w[1],...ot.map(x=>x[1])],a:w[1]}:{q:`Which word means "${w[1]}"?`,o:[w[0],...ot.map(x=>x[0])],a:w[0]}});
  const qs=shuffle([...g,...vs]).map(q=>({...q,o:shuffle(q.o)})),best=load().prac?.[u.n]||0;
  app.innerHTML=head(u,'practice')+`<p class="sub">20 questions: 10 grammar and 10 vocabulary. Your best score: <b>${best}/20</b></p><div id="qs"></div><div class="row"><button class="primary" id="sub">Check answers</button><a class="btn" href="#/practice/${u.n}" id="again" hidden>Try new questions</a></div><p class="msg" id="score" role="status"></p>`;
  qs.forEach((q,qi)=>$('#qs').insertAdjacentHTML('beforeend',`<div class="q" id="q${qi}"><div>${qi+1}. ${esc(q.q)}</div>${q.o.map((o,oi)=>`<label><input type="radio" name="p${qi}" value="${oi}"> ${esc(o)}</label>`).join('')}</div>`));
  $('#sub').onclick=()=>{let r=0;qs.forEach((q,qi)=>{const box=$('#q'+qi),labs=box.querySelectorAll('label'),sel=box.querySelector('input:checked');labs[q.o.indexOf(q.a)].classList.add('ok');if(sel&&q.o[+sel.value]==q.a)r++;else if(sel)sel.parentNode.classList.add('no');box.querySelectorAll('input').forEach(x=>x.disabled=true)});
    $('#score').textContent=`Score: ${r}/20${r>=16?' Wonderful!':r>=10?' Good job, keep going!':' Keep practicing, you can do it!'}`;$('#sub').disabled=true;$('#again').hidden=false;
    const d=load();(d.prac=d.prac||{})[u.n]=Math.max(r,d.prac?.[u.n]||0);(d.log=d.log||[]).push({date:ymd(new Date()),unit:u.n,score:r});d.log=d.log.slice(-30);save(d)};
  $('#again').onclick=()=>setTimeout(route,0);
}
// ---- theo dõi tiến độ
function progress(){
  const d=load(),lg=d.log||[],K=['vocab','grammar','speaking','writing','practice'];
  app.innerHTML=`<h1>My Progress</h1><p class="sub">Your learning record, ${esc(nm())}.</p>${user===GUEST?'<p class="sub">You are in guest mode. Your progress is saved in this browser only.</p>':''}
  <div class="stats"><div class="stat"><b>${overall(d)}%</b>Course completed</div><div class="stat"><b>${streak(d.days)}</b>Day streak</div><div class="stat"><b>${(d.days||[]).length}</b>Days studied</div><div class="stat"><b>${lg.length}</b>Practice tests taken</div></div>
  ${bar(overall(d)/100)}<h2>By unit</h2><div style="overflow-x:auto"><table><tr><th>Unit</th><th>Vocabulary</th><th>Grammar</th><th>Speaking</th><th>Writing</th><th>Practice</th></tr>${U.map(u=>{const f=frac(d,u);return `<tr><td>${u.n}. ${esc(u.t)}</td>${K.map(k=>`<td style="min-width:90px"><a href="#/${k}/${u.n}" style="text-decoration:none;color:inherit">${Math.round(f[k]*100)}%${bar(f[k])}</a></td>`).join('')}</tr>`}).join('')}</table></div>
  <h2>Recent practice</h2>${lg.length?`<table><tr><th>Date</th><th>Unit</th><th>Score</th></tr>${lg.slice(-8).reverse().map(x=>`<tr><td>${x.date}</td><td>Unit ${x.unit}</td><td>${x.score}/20</td></tr>`).join('')}</table>`:'<p class="sub">No practice yet. Try the Practice section.</p>'}
  <p class="sub">Vocabulary = words marked "I know it". Grammar = best exercise score. Speaking = questions ticked. Writing = sentences solved. Practice = best score out of 20.</p>`;
}
addEventListener('hashchange',route);route();
