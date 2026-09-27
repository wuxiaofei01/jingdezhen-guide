(function(){
  var T = window.TRIP;
  var esc = function(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); };
  var store = {
    get: function(k){ try { return localStorage.getItem(k); } catch(e){ return null; } },
    set: function(k,v){ try { localStorage.setItem(k,v); } catch(e){} }
  };
  var pad = function(n){ return (n<10?'0':'')+n; };
  var now = new Date();
  var todayIso = now.getFullYear()+'-'+pad(now.getMonth()+1)+'-'+pad(now.getDate());
  var nowMin = now.getHours()*60 + now.getMinutes();

  // tag prefix: "+" 高赞推荐, "!" 注意, "?" 可选
  function tag(t){
    var cls = t[0]==='+' ? 'hot' : t[0]==='!' ? 'warn' : t[0]==='?' ? 'opt' : 'opt';
    var txt = /^[+!?]/.test(t) ? t.slice(1) : t;
    return '<span class="tag '+cls+'">'+esc(txt)+'</span>';
  }
  function toMin(hm){ var m = /^(\d{1,2}):(\d{2})/.exec(hm); return m ? (+m[1])*60 + (+m[2]) : null; }

  function dayPanel(d){
    var isToday = d.iso === todayIso;
    var nowIdx = -1;
    if (isToday) d.items.forEach(function(it,i){ var m = toMin(it[0]); if (m !== null && m <= nowMin) nowIdx = i; });
    var h = '<div class="inner"><div class="dhead">'
      + '<div class="dline"><span class="date">'+esc(d.date)+'</span><span class="wk">'+esc(d.wk)+'</span>'
      + (isToday ? '<span class="today-flag">今天</span>' : '') + '</div>'
      + '<h2>'+esc(d.title)+'</h2>'
      + '<div class="meta">' + d.wx.map(function(w){ return '<span class="pill '+(w[1]||'')+'">'+esc(w[0])+'</span>'; }).join('') + '</div>'
      + (d.stay ? '<p class="stay"><b>住：</b>'+esc(d.stay)+'</p>' : '')
      + '</div><ol class="hours">';
    d.items.forEach(function(it,i){
      var more = (T.details || {})[d.iso+' '+it[0]];
      var head = '<h3>'+esc(it[1])+'</h3>'
        + (it[2] ? '<p>'+esc(it[2])+'</p>' : '')
        + (it[3] && it[3].length ? '<div class="tags">'+it[3].map(tag).join('')+'</div>' : '');
      var cls = (i===nowIdx ? 'now ' : '') + (more ? 'has-more' : '');
      h += '<li'+(cls ? ' class="'+cls.trim()+'"' : '')+'><span class="hr">'+esc(it[0])+'</span><div>';
      if (more) {
        // detail sections: [heading, text] or [heading, [list items]]
        h += '<details><summary>'+head+'<span class="more-hint" aria-hidden="true"></span></summary><div class="more-body">'
          + more.map(function(sec){
              return '<h4>'+esc(sec[0])+'</h4>' + (Array.isArray(sec[1])
                ? '<ul>'+sec[1].map(function(x){ return '<li>'+esc(x)+'</li>'; }).join('')+'</ul>'
                : '<p>'+esc(sec[1])+'</p>');
            }).join('')
          + '</div></details>';
      } else {
        h += head;
      }
      h += '</div></li>';
    });
    h += '</ol>';
    (d.tips||[]).forEach(function(t){ h += '<p class="tip'+(t[2]?' '+t[2]:'')+'"><b>'+esc(t[0])+'：</b>'+esc(t[1])+'</p>'; });
    return h + '</div>';
  }

  var pages = T.days.map(function(d){ return { tab:d.date, sub:d.short, id:'d'+d.iso.slice(5).replace('-',''), iso:d.iso, html:dayPanel(d) }; });
  (T.extras||[]).forEach(function(x){ pages.push({ tab:x.tab, sub:x.sub||'', id:x.id, html:'<div class="inner extra">'+x.html+'</div>' }); });

  document.title = T.title;
  var app = document.getElementById('app');
  app.innerHTML =
    '<header class="top"><div class="titlerow"><h1>'+esc(T.title)+'</h1><span class="sub">'+esc(T.sub)+'</span></div>'
    + '<nav class="switch" aria-label="切换行程版本">'
    + T.versions.map(function(v){ return '<a href="'+v[1]+'"'+(v[1]===T.self?' aria-current="page"':'')+'>'+esc(v[0])+'</a>'; }).join('')
    + '</nav></header>'
    + '<div class="tabs" role="tablist" aria-label="选择日期">'
    + pages.map(function(p,i){ return '<button type="button" role="tab" id="tab-'+p.id+'" aria-controls="'+p.id+'" data-i="'+i+'"'+(p.iso===todayIso?' class="is-today"':'')+'>'+esc(p.tab)+(p.sub?'<small>'+esc(p.sub)+'</small>':'')+'</button>'; }).join('')
    + '</div>'
    + '<main class="pager" id="pager">'
    + pages.map(function(p){ return '<section class="panel" role="tabpanel" id="'+p.id+'" aria-labelledby="tab-'+p.id+'">'+p.html+'</section>'; }).join('')
    + '</main>'
    + '<div class="bar"><button type="button" id="prev">‹ 前一天</button><span class="pos" id="pos"></span><button type="button" id="next">后一天 ›</button></div>';

  var pager = document.getElementById('pager');
  var tabs = [].slice.call(document.querySelectorAll('.tabs button'));
  var tabBar = document.querySelector('.tabs');
  var prev = document.getElementById('prev'), next = document.getElementById('next'), pos = document.getElementById('pos');
  var KEY = 'trip-idx-'+T.self;
  var cur = -1;

  function mark(i){
    if (i === cur) return;
    cur = i;
    tabs.forEach(function(b,j){ b.setAttribute('aria-selected', j===i ? 'true' : 'false'); b.tabIndex = j===i ? 0 : -1; });
    var b = tabs[i];
    tabBar.scrollTo({ left: b.offsetLeft - (tabBar.clientWidth - b.offsetWidth)/2, behavior:'smooth' });
    prev.disabled = i === 0; next.disabled = i === pages.length-1;
    pos.textContent = i < T.days.length ? '第 '+(i+1)+' / '+T.days.length+' 天' : pages[i].tab;
    store.set(KEY, String(i));
    if (history.replaceState) history.replaceState(null, '', '#'+pages[i].id);
  }
  function go(i, smooth){
    i = Math.max(0, Math.min(pages.length-1, i));
    pager.scrollTo({ left: i * pager.clientWidth, behavior: smooth ? 'smooth' : 'auto' });
    mark(i);
  }
  var raf = 0;
  pager.addEventListener('scroll', function(){
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function(){ mark(Math.round(pager.scrollLeft / pager.clientWidth)); });
  }, { passive:true });
  tabs.forEach(function(b){ b.addEventListener('click', function(){ go(+b.dataset.i, true); }); });
  prev.addEventListener('click', function(){ go(cur-1, true); });
  next.addEventListener('click', function(){ go(cur+1, true); });
  document.addEventListener('keydown', function(e){
    if (e.target.closest && e.target.closest('input')) return;
    if (e.key === 'ArrowRight') { go(cur+1, true); } else if (e.key === 'ArrowLeft') { go(cur-1, true); }
  });
  window.addEventListener('resize', function(){ pager.scrollLeft = cur * pager.clientWidth; });

  // start: #hash, then today, then last viewed, else day 1
  var start = -1, hash = location.hash.slice(1);
  if (hash) pages.forEach(function(p,i){ if (p.id === hash) start = i; });
  if (start < 0) pages.forEach(function(p,i){ if (p.iso === todayIso) start = i; });
  if (start < 0) { var s = parseInt(store.get(KEY), 10); if (s >= 0 && s < pages.length) start = s; }
  if (start < 0) start = 0;
  go(start, false);
  // bring the current hour into view without scrollIntoView, which would also nudge the pager sideways
  var panel = document.getElementById(pages[start].id), nowLi = panel.querySelector('li.now');
  if (nowLi) panel.scrollTop = Math.max(0, nowLi.offsetTop - panel.clientHeight/2);

  // tapping the time column opens the same detail as tapping the text
  pager.addEventListener('click', function(e){
    var hr = e.target.closest && e.target.closest('li.has-more > .hr');
    if (hr) { var dt = hr.parentNode.querySelector('details'); dt.open = !dt.open; }
  });

  // checklist state per device
  var CK = 'trip-check-'+T.self, saved = {};
  try { saved = JSON.parse(store.get(CK) || '{}'); } catch(e){}
  [].forEach.call(document.querySelectorAll('.check input'), function(c){
    if (saved[c.id]) c.checked = true;
    c.addEventListener('change', function(){ saved[c.id] = c.checked; store.set(CK, JSON.stringify(saved)); });
  });
})();
