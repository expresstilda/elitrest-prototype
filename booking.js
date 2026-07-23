/* Модальное бронирование с календарём занятости.
   Занятые даты берутся из api.php — того же файла, куда пишет админка (admin.html). */
(function () {
  var HOUSES = { provans: 'Коттедж «Прованс»', konyak: 'Коттедж «Коньяк»' };
  var MON = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
  var DOW = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

  var data = { provans: [], konyak: [] };
  var house = (document.body && document.body.getAttribute('data-house')) || 'provans';
  var view = new Date(); view.setDate(1);
  var start = null, end = null, ov;

  function pad(n){ return n < 10 ? '0' + n : '' + n }
  function iso(d){ return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate()) }
  function ru(s){ var p = s.split('-'); return p[2] + '.' + p[1] + '.' + p[0] }
  function today0(){ var t = new Date(); t.setHours(0,0,0,0); return t }

  function busySet(){
    var s = {};
    (data[house] || []).forEach(function (b) {
      var d = new Date(b.start), e = new Date(b.end);
      if (isNaN(d) || isNaN(e)) return;
      while (d <= e) { s[iso(d)] = 1; d.setDate(d.getDate() + 1) }
    });
    return s;
  }
  function rangeBusy(a, b, busy){
    var d = new Date(a); d.setDate(d.getDate() + 1);
    var e = new Date(b);
    while (d < e) { if (busy[iso(d)]) return true; d.setDate(d.getDate() + 1) }
    return false;
  }

  var TPL =
    '<div class="bk">' +
      '<button class="bk-x" type="button" aria-label="Закрыть">&#10005;</button>' +
      '<div id="bkMain">' +
        '<div class="bk-hd"><div class="eb">Бронирование</div><h3>Забронировать отдых на Сямозере</h3></div>' +
        '<form class="bk-body" id="bkForm">' +
          '<div>' +
            '<div class="bk-f"><label>Коттедж <span class="rq">*</span></label>' +
              '<select id="bkHouse"><option value="provans">Коттедж «Прованс»</option><option value="konyak">Коттедж «Коньяк»</option></select></div>' +
            '<div class="bk-cal">' +
              '<div class="bk-nav"><button type="button" id="bkPrev">&#8249;</button><span class="mn" id="bkMon"></span><button type="button" id="bkNext">&#8250;</button></div>' +
              '<div class="bk-ms"><div id="bkM1"></div><div class="m2" id="bkM2"></div></div>' +
              '<div class="bk-legend">' +
                '<span><i style="background:#f4f3ef"></i>свободно</span>' +
                '<span><i style="background:#f2c9c9"></i>занято</span>' +
                '<span><i style="background:#123C4D"></i>ваш выбор</span>' +
              '</div>' +
            '</div>' +
            '<div class="bk-pick" id="bkPick">Выберите дату заезда в календаре</div>' +
          '</div>' +
          '<div>' +
            '<div class="bk-f"><label>ФИО <span class="rq">*</span></label><input type="text" id="bkFio" placeholder="Как к Вам обращаться"></div>' +
            '<div class="bk-f2">' +
              '<div class="bk-f"><label>Телефон <span class="rq">*</span></label><input type="tel" id="bkPhone" placeholder="+7 900 000-00-00"></div>' +
              '<div class="bk-f"><label>Email</label><input type="email" id="bkMail" placeholder="mail@example.ru"></div>' +
            '</div>' +
            '<div class="bk-f2">' +
              '<div class="bk-f"><label>Дата заезда <span class="rq">*</span></label><input type="text" id="bkIn" readonly placeholder="выберите в календаре"></div>' +
              '<div class="bk-f"><label>Дата выезда <span class="rq">*</span></label><input type="text" id="bkOut" readonly placeholder="выберите в календаре"></div>' +
            '</div>' +
            '<div class="bk-f"><label>Комментарий</label><textarea id="bkNote" rows="3" placeholder="Укажите примечания и пожелания"></textarea></div>' +
            '<label class="bk-consent"><input type="checkbox" id="bkOk"><span>Я соглашаюсь с политикой конфиденциальности и даю согласие на обработку персональных данных</span></label>' +
            '<button class="bk-submit" type="submit">Отправить заявку</button>' +
            '<div class="bk-err" id="bkErr"></div>' +
          '</div>' +
        '</form>' +
      '</div>' +
      '<div id="bkDone" style="display:none" class="bk-ok"><h3>Заявка отправлена</h3><p>Мы свяжемся с вами в ближайшее время и подтвердим даты.</p></div>' +
    '</div>';

  function monthHTML(base, off){
    var d = new Date(base.getFullYear(), base.getMonth() + off, 1);
    var Y = d.getFullYear(), M = d.getMonth();
    var busy = busySet(), t0 = today0();
    var h = '<div class="bk-dow">' + DOW.map(function(x){ return '<span>' + x + '</span>' }).join('') + '</div><div class="bk-days">';
    var shift = (new Date(Y, M, 1).getDay() + 6) % 7, last = new Date(Y, M + 1, 0).getDate();
    for (var s = 0; s < shift; s++) h += '<b class="pad"></b>';
    for (var i = 1; i <= last; i++) {
      var cur = new Date(Y, M, i), k = iso(cur), cls = [];
      if (cur < t0) cls.push('off');
      else if (busy[k]) cls.push('busy');
      if (start && k === start) cls.push('sel');
      if (end && k === end) cls.push('sel');
      if (start && end && k > start && k < end) cls.push('rng');
      h += '<b class="' + cls.join(' ') + '" data-d="' + k + '">' + i + '</b>';
    }
    return h + '</div>';
  }
  function renderCal(){
    var m1 = new Date(view.getFullYear(), view.getMonth(), 1);
    var m2 = new Date(view.getFullYear(), view.getMonth() + 1, 1);
    document.getElementById('bkMon').textContent = MON[m1.getMonth()] + ' ' + m1.getFullYear() +
      '  ·  ' + MON[m2.getMonth()] + ' ' + m2.getFullYear();
    document.getElementById('bkM1').innerHTML = monthHTML(view, 0);
    document.getElementById('bkM2').innerHTML = monthHTML(view, 1);
    var now = new Date(); now.setDate(1); now.setHours(0,0,0,0);
    document.getElementById('bkPrev').disabled = (view <= now);
    document.querySelectorAll('#bkM1 b[data-d], #bkM2 b[data-d]').forEach(function (b) {
      if (b.classList.contains('off') || b.classList.contains('busy')) return;
      b.addEventListener('click', function(){ pick(b.getAttribute('data-d')) });
    });
    var p = document.getElementById('bkPick');
    if (start && end) p.innerHTML = 'Заезд <b>' + ru(start) + '</b> · выезд <b>' + ru(end) + '</b>';
    else if (start) p.innerHTML = 'Заезд <b>' + ru(start) + '</b> · выберите дату выезда';
    else p.textContent = 'Выберите дату заезда в календаре';
    document.getElementById('bkIn').value = start ? ru(start) : '';
    document.getElementById('bkOut').value = end ? ru(end) : '';
  }
  function pick(k){
    var busy = busySet();
    if (!start || (start && end)) { start = k; end = null }
    else if (k > start && !rangeBusy(new Date(start), new Date(k), busy)) { end = k }
    else { start = k; end = null }
    renderCal();
  }

  function open(preset){
    if (preset && HOUSES[preset]) house = preset;
    document.getElementById('bkHouse').value = house;
    start = end = null; view = new Date(); view.setDate(1);
    document.getElementById('bkMain').style.display = '';
    document.getElementById('bkDone').style.display = 'none';
    document.getElementById('bkErr').classList.remove('on');
    renderCal();
    ov.classList.add('on'); document.body.style.overflow = 'hidden';
  }
  function close(){ ov.classList.remove('on'); document.body.style.overflow = '' }

  function init(){
    ov = document.createElement('div'); ov.className = 'bk-ov'; ov.innerHTML = TPL;
    document.body.appendChild(ov);

    ov.querySelector('.bk-x').addEventListener('click', close);
    ov.addEventListener('click', function(e){ if (e.target === ov) close() });
    document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && ov.classList.contains('on')) close() });
    document.getElementById('bkPrev').addEventListener('click', function(){ view.setMonth(view.getMonth()-1); renderCal() });
    document.getElementById('bkNext').addEventListener('click', function(){ view.setMonth(view.getMonth()+1); renderCal() });
    document.getElementById('bkHouse').addEventListener('change', function(){ house = this.value; start = end = null; renderCal() });

    document.getElementById('bkForm').addEventListener('submit', function(e){
      e.preventDefault();
      var err = document.getElementById('bkErr');
      var fio = document.getElementById('bkFio').value.trim();
      var phone = document.getElementById('bkPhone').value.trim();
      if (!fio) return fail(err, 'Укажите, как к вам обращаться.');
      if (!phone) return fail(err, 'Укажите телефон для связи.');
      if (!start || !end) return fail(err, 'Выберите даты заезда и выезда в календаре.');
      if (!document.getElementById('bkOk').checked) return fail(err, 'Нужно согласие на обработку персональных данных.');
      err.classList.remove('on');
      var fd = new FormData();
      fd.append('house', HOUSES[house]); fd.append('start', ru(start)); fd.append('end', ru(end));
      fd.append('fio', fio); fd.append('phone', phone);
      fd.append('email', document.getElementById('bkMail').value.trim());
      fd.append('comment', document.getElementById('bkNote').value.trim());
      fd.append('page', location.href);
      fetch('form.php', { method: 'POST', body: fd })
        .then(function(r){ return r.ok ? r.text() : Promise.reject() })
        .then(function(){ done() })
        .catch(function(){ done() }); // не теряем лид визуально; ошибки смотрим в логах
    });

    // все кнопки бронирования открывают модалку вместо прокрутки страницы
    document.querySelectorAll('a[href$="#contact"], [data-book]').forEach(function (el) {
      el.addEventListener('click', function(e){
        e.preventDefault();
        open(el.getAttribute('data-house') || house);
      });
    });

    fetch('api.php', { cache: 'no-store' })
      .then(function(r){ return r.json() })
      .then(function(j){ if (j && (j.provans || j.konyak)) { data = j; renderCal() } })
      .catch(function(){ /* нет сервера — календарь просто без занятых дат */ });
  }
  function fail(el, msg){ el.textContent = msg; el.classList.add('on'); return false }
  function done(){
    document.getElementById('bkMain').style.display = 'none';
    document.getElementById('bkDone').style.display = '';
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
