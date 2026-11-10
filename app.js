const U=window.UNITS,$=s=>document.querySelector(s),main=$('#main'),nav=$('#nav');
const store={get:(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}},set:(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const speak=t=>{if('speechSynthesis' in window){const u=new SpeechSynthesisUtterance(t.replace(/\s*\/\s*/g,', '));u.lang='en-US';speechSynthesis.cancel();speechSynthesis.speak(u)}};
$('#menuBtn').onclick=()=>nav.classList.toggle('open');
function route(){
  const [,,n,tab]=location.hash.split('/');const u=U.find(x=>x.n==n);
  nav.innerHTML='<a href="#/" class="'+(u?'':'on')+'">Trang chủ</a>'+U.map(x=>`<a href="#/unit/${x.n}/vocab" class="${u&&u.n==x.n?'on':''}">Unit ${x.n}<small>${esc(x.t)}</small></a>`).join('');
  nav.classList.remove('open');main.focus({preventScroll:true});window.scrollTo(0,0);
  if(!u){home();return}
  const t=['vocab','grammar','writing'].includes(tab)?tab:'vocab';
  main.innerHTML=`<h1>Unit ${u.n}: ${esc(u.t)}</h1><p class="sub">${esc(u.vi)}</p><div class="tabs">${[['vocab','Từ vựng'],['grammar','Ngữ pháp'],['writing','Viết']].map(([k,l])=>`<a href="#/unit/${u.n}/${k}" class="${k==t?'on':''}">${l}</a>`).join('')}</div><div id="pane"></div>`;
  ({vocab,grammar,writing})[t](u,$('#pane'));
}
function home(){
  main.innerHTML=`<h1>Top Notch 2: tự học</h1><p class="sub">Chọn một unit. Mỗi unit có từ vựng (thẻ ghi nhớ), ngữ pháp (tóm tắt và bài tập) và phần viết (đề, mẹo, khung soạn bài).</p><div class="grid">${U.map(u=>{const d=store.get('done'+u.n,0);return `<a class="tile" href="#/unit/${u.n}/vocab"><b>Unit ${u.n}</b>${esc(u.t)}<br><small>${u.v.length} từ · ${d?'đã đạt '+d+'/'+u.g.q.length+' câu ngữ pháp':'chưa làm bài tập'}</small></a>`}).join('')}</div>`;
}
function vocab(u,el){
  let order=[...u.v.keys()],i=0,mode='card';
  const known=()=>store.get('known'+u.n,[]);
  function draw(){
    if(mode=='list'){el.innerHTML=modeBar()+`<table class="vlist">${u.v.map(w=>`<tr><td>${esc(w[0])}</td><td>${esc(w[1])}</td></tr>`).join('')}</table>`;bind();return}
    const w=u.v[order[i]],k=known();
    if(mode=='card'){
      el.innerHTML=modeBar()+`<p class="sub">Thẻ ${i+1}/${order.length}. Đã nhớ: ${k.length}/${u.v.length}</p><div class="flash" id="fc"><div><div class="face">${esc(w[0])}</div><div class="face back">${esc(w[1])}</div></div></div><div class="row"><button id="flip">Lật thẻ</button><button id="say">Nghe phát âm</button><button id="no">Chưa nhớ</button><button class="primary" id="yes">Đã nhớ</button><button id="shuf">Xáo thẻ</button></div>`;
      $('#fc').onclick=$('#flip').onclick=()=>$('#fc').classList.toggle('flip');
      $('#say').onclick=()=>speak(w[0]);
      const next=()=>{i=(i+1)%order.length;draw()};
      $('#yes').onclick=()=>{const s=new Set(known());s.add(order[i]);store.set('known'+u.n,[...s]);next()};
      $('#no').onclick=()=>{store.set('known'+u.n,known().filter(x=>x!=order[i]));next()};
      $('#shuf').onclick=()=>{order.sort(()=>Math.random()-.5);i=0;draw()};
    }else{
      el.innerHTML=modeBar()+`<p>Gõ từ tiếng Anh cho nghĩa này:</p><h2>${esc(w[1])}</h2><input type="text" id="ans" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Câu trả lời"><div class="row"><button class="primary" id="chk">Kiểm tra</button><button id="skip">Câu khác</button></div><p class="msg" id="fb" role="status"></p>`;
      const check=()=>{const ok=$('#ans').value.trim().toLowerCase()==w[0].split(' / ')[0].toLowerCase()||$('#ans').value.trim().toLowerCase()==w[0].toLowerCase();$('#fb').className='msg '+(ok?'ok':'no');$('#fb').textContent=ok?'Đúng rồi!':'Chưa đúng. Đáp án: '+w[0];};
      $('#chk').onclick=check;$('#ans').onkeydown=e=>{if(e.key=='Enter')check()};
      $('#skip').onclick=()=>{i=Math.floor(Math.random()*u.v.length);order=[...u.v.keys()];i=i;draw()};
      order=[...u.v.keys()];
    }
    bind();
  }
  function modeBar(){return `<div class="row">${[['card','Thẻ ghi nhớ'],['type','Gõ từ'],['list','Danh sách']].map(([k,l])=>`<button data-m="${k}" class="${mode==k?'primary':''}">${l}</button>`).join('')}</div>`}
  function bind(){el.querySelectorAll('[data-m]').forEach(b=>b.onclick=()=>{mode=b.dataset.m;i=0;order=[...u.v.keys()];draw()})}
  draw();
}
function grammar(u,el){
  const g=u.g;
  el.innerHTML=`<h2>${esc(g.t)}</h2><div class="box rule">${esc(g.note)}</div><h2>Ví dụ</h2><ul>${g.eg.map(e=>`<li>${esc(e)}</li>`).join('')}</ul><h2>Bài tập</h2><div id="qs"></div><p class="msg" id="score" role="status"></p>`;
  let right=0,answered=0;
  g.q.forEach((q,qi)=>{const opts=q[1].split('|'),d=document.createElement('div');d.className='q';
    d.innerHTML=`<div>${qi+1}. ${esc(q[0])}</div>`+opts.map((o,oi)=>`<label><input type="radio" name="q${qi}" value="${oi}"> ${esc(o)}</label>`).join('');
    d.querySelectorAll('input').forEach(inp=>inp.onchange=()=>{if(d.dataset.done)return;d.dataset.done=1;answered++;const labs=d.querySelectorAll('label');labs[q[2]].classList.add('ok');if(+inp.value==q[2])right++;else inp.parentNode.classList.add('no');
      d.querySelectorAll('input').forEach(x=>x.disabled=true);
      if(answered==g.q.length){$('#score').textContent=`Kết quả: ${right}/${g.q.length}`;store.set('done'+u.n,Math.max(right,store.get('done'+u.n,0)))}});
    $('#qs').appendChild(d)});
}
function writing(u,el){
  const w=u.w,key='draft'+u.n;
  el.innerHTML=`<div class="box rule"><b>Đề bài:</b> ${esc(w.task)}</div><h2>Kỹ năng: ${esc(w.skill)}</h2><ul>${w.tips.map(t=>`<li>${esc(t)}</li>`).join('')}</ul><h2>Bài viết của bạn</h2><textarea id="ta" aria-label="Bài viết" placeholder="${esc(w.start)}"></textarea><div class="row"><span id="wc">0 từ</span><button id="st">Chèn câu mở đầu gợi ý</button><button id="cl">Xóa bài</button></div><p class="sub">Bài được lưu tự động trong trình duyệt của bạn.</p><h2>Tự kiểm tra</h2><ul><li>Mỗi đoạn có một ý chính rõ ràng?</li><li>Đã áp dụng kỹ năng của unit này?</li><li>Đã dùng ít nhất 5 từ vựng của unit?</li><li>Đã đọc lại để sửa lỗi chính tả và dấu câu?</li></ul>`;
  const ta=$('#ta'),upd=()=>{$('#wc').textContent=(ta.value.trim()?ta.value.trim().split(/\s+/).length:0)+' từ';store.set(key,ta.value)};
  ta.value=store.get(key,'');upd();ta.oninput=upd;
  $('#st').onclick=()=>{if(!ta.value)ta.value=w.start;upd();ta.focus()};
  $('#cl').onclick=()=>{if(confirm('Xóa toàn bộ bài viết của unit này?')){ta.value='';upd()}};
}
addEventListener('hashchange',route);route();
