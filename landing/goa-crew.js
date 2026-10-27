/* ==========================================================================
   Zo Hotel Goa — group landing page behavior
   1. the hero video over its photo fallback
   2. the hold flow: dates → group → corridor → shares → hold → manage
   3. the thread's typing indicator
   4. Part A, the exit prompt, driven by the real hold
   No framework, no build step. The hold lives in this browser only.
   ========================================================================== */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ----------------------------------------------------------------------
     Shared helpers
     -------------------------------------------------------------------- */
  var WORDS = ['zero','one','two','three','four','five','six','seven','eight','nine'];
  function word (n) { return n < 10 ? WORDS[n] : String(n); }          // style guide §11
  function money (n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }

  // AP style: Jan. Feb. Aug. Sept. Oct. Nov. Dec. abbreviated; March–July spelled.
  var AP = ['Jan.','Feb.','March','April','May','June','July','Aug.','Sept.','Oct.','Nov.','Dec.'];
  function apDate (d, withYear) {
    return AP[d.getMonth()] + ' ' + d.getDate() + (withYear === false ? '' : ', ' + d.getFullYear());
  }
  function apRange (a, b) {
    if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) {
      return AP[a.getMonth()] + ' ' + a.getDate() + '–' + b.getDate() + ', ' + a.getFullYear();
    }
    if (a.getFullYear() === b.getFullYear()) return apDate(a, false) + '–' + apDate(b);
    return apDate(a) + '–' + apDate(b);
  }
  function apTime (d) {
    var h = d.getHours(), m = d.getMinutes(), ap = h >= 12 ? 'p.m.' : 'a.m.';
    h = h % 12 || 12;
    return h + (m ? ':' + (m < 10 ? '0' : '') + m : '') + ' ' + ap;
  }
  function dayKey (d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
  function addDays (d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function nightsBetween (a, b) { return Math.round((b - a) / 86400000); }

  /* ----------------------------------------------------------------------
     1. The hero: Magnific clip over the photo loop.
     -------------------------------------------------------------------- */
  (function cinema () {
    var stage = document.getElementById('cineStage');
    var pauseBtn = document.getElementById('cinePause');
    if (!stage || !pauseBtn) return;

    var frames = Array.prototype.slice.call(stage.querySelectorAll('.cine__f'));
    var FRAME_MS = 7000, i = 0, timer = null, paused = false;

    function show (n) {
      frames.forEach(function (f, k) {
        f.classList.remove('is-on');
        if (k === n) { void f.offsetWidth; f.classList.add('is-on'); }
      });
    }
    function tick () { i = (i + 1) % frames.length; show(i); }
    function run () {
      stop();
      if (paused || document.hidden || reduce.matches) return;
      timer = setInterval(tick, FRAME_MS);
    }
    function stop () { if (timer) { clearInterval(timer); timer = null; } }

    var video = document.getElementById('cineVideo');
    function videoRun () {
      if (!video) return;
      if (paused || document.hidden || reduce.matches) { video.pause(); return; }
      var p = video.play();
      if (p && p.catch) p.catch(function () { video.classList.remove('is-playing'); });
    }
    if (video) {
      video.addEventListener('playing', function () { video.classList.add('is-playing'); });
      video.addEventListener('pause', function () { video.classList.remove('is-playing'); });
      video.addEventListener('error', function () { video.classList.remove('is-playing'); });
      if (!reduce.matches) video.preload = 'auto';
    }

    pauseBtn.addEventListener('click', function () {
      paused = !paused;
      pauseBtn.setAttribute('aria-pressed', String(paused));
      document.getElementById('cinePauseT').textContent = paused ? 'Play video' : 'Pause video';
      run(); videoRun();
    });
    document.addEventListener('visibilitychange', function () { run(); videoRun(); });
    reduce.addEventListener('change', function () { run(); videoRun(); });

    frames.slice(1).forEach(function (f) {
      var url = /url\(['"]?(.+?)['"]?\)/.exec(getComputedStyle(f).backgroundImage);
      if (url) { var im = new Image(); im.src = url[1]; }
    });
    show(0); run(); videoRun();
  }());

  /* ----------------------------------------------------------------------
     2. The hold flow.
     -------------------------------------------------------------------- */
  // Rates are the site's published rate card (zohotel12.netlify.app).
  // Capacities are demonstration values for this project and are labeled
  // as such wherever they appear on the page.
  // Two hotels, one page. Goa rates are the site's published rate card;
  // Mumbai's lead rate (₹6,500) is the site's, the other two Mumbai rates
  // and every capacity are demonstration values, labeled on the page.
  var PROPS = {
    goa: {
      name: 'Zo Hotel Goa', place: 'North Goa', ref: 'ZO-GOA-', firstRoom: 201,
      corridor: 'side by side in the garden wing', solo: false, who: 'families and groups', defaultPeople: 6,
      lede: 'Whether you are two or twelve, there is a room or villa in Goa that fits.',
      fine: '',
      rooms: {
        garden: { name: 'Deluxe Garden Room', rate: 7500,  cap: 2, meta: '38 m\u00b2 \u00b7 Garden view \u00b7 King bed \u00b7 sleeps two', img: 'room-goa-garden.jpg', alt: 'A Deluxe Garden Room opening onto its patio, with a hammock between two palms', tag: 'Best value', perks: ['Private garden patio', 'Hammock', 'Outdoor shower', 'Near the pool'] },
        resort: { name: 'Sea View Room',      rate: 13500, cap: 3, meta: '44 m\u00b2 \u00b7 Ocean view \u00b7 King bed \u00b7 sleeps three', img: 'room-resortview-700.jpg', alt: 'A Sea View Room with the ocean beyond the balcony doors', tag: 'Best for families', plus: 'Garden Room, plus', perks: ['Ocean view', 'Child sofa bed', 'Sunset terrace', 'Beach cinema'] },
        suite:  { name: 'Beach Pool Villa',   rate: 18500, cap: 4, meta: '96 m\u00b2 \u00b7 Own private pool \u00b7 King bed \u00b7 sleeps four', img: 'room-goa-villa.jpg', alt: 'A Beach Pool Villa with its own pool and a path to the beach', tag: 'Most space', plus: 'Sea View, plus', perks: ['Private pool', 'Beach access', 'Butler', 'Game room'] }
      }
    },
    mumbai: {
      name: 'Zo Hotel Mumbai', place: 'Nariman Point, Mumbai', ref: 'ZO-MUM-', firstRoom: 2201,
      corridor: 'high floor, quiet side', solo: true, who: 'the business traveler passing through', defaultPeople: 1,
      lede: 'Sea views over Marine Drive, the city lights at night, and a quiet room above it all.',
      fine: '',
      rooms: {
        garden: { name: 'Deluxe Room',     rate: 6500,  cap: 2, meta: '32 m\u00b2 \u00b7 City view \u00b7 King bed \u00b7 sleeps two', img: 'room-city-800.jpg', alt: 'A Deluxe Room with a work desk and the city skyline in the window', tag: 'Best value', perks: ['Work desk', 'Skyline view', 'Rain shower', 'Smart TV'] },
        resort: { name: 'Bay View Room',   rate: 9500,  cap: 3, meta: '40 m\u00b2 \u00b7 Bay view \u00b7 King bed \u00b7 sleeps three', img: 'room-mum-bay.jpg', alt: 'A Bay View Room looking down on Marine Drive at dusk', tag: 'Best view', plus: 'Deluxe Room, plus', perks: ['Bay view', 'Quiet floor', 'Free dinner', 'Express checkout'] },
        suite:  { name: 'Executive Suite', rate: 14500, cap: 4, meta: '68 m\u00b2 \u00b7 Bay view \u00b7 King bed \u00b7 sleeps four', img: 'mumbai-lounge-640.jpg', alt: 'The sitting area of an Executive Suite, with city views', tag: 'Most space', plus: 'Bay View, plus', perks: ['Top floor', 'Sitting area', 'Club lounge', 'Meeting room'] }
      }
    }
  };
  var PROP = 'goa';
  var ROOMS = PROPS.goa.rooms;
  var CORRIDOR_ROOMS = 12;              // twelve rooms on one corridor or floor
  var STORE_KEY = 'zo-goa-hold';

  // Availability is a model, not a feed: Friday and Saturday nights in
  // December and January are full, and so is Dec. 24 – Jan. 2. Everything
  // else is open. Q3 on the page says exactly this, so calendar and copy agree.
  function nightFull (d) {
    var m = d.getMonth(), day = d.getDay(), dt = d.getDate();
    if ((m === 11 && dt >= 24) || (m === 0 && dt <= 2)) return true;
    return (m === 11 || m === 0) && (day === 5 || day === 6);
  }

  // Peak dates: moving a booking into them carries a 20% charge on those
  // nights. Demo calendar; month is 0-based.
  var PEAK_RATE = 0.2;
  var PEAKS = [
    { name: 'Diwali',                       from: new Date(2026, 10, 6),  to: new Date(2026, 10, 10) },
    { name: 'Christmas and New Year',       from: new Date(2026, 11, 20), to: new Date(2027, 0, 5) },
    { name: 'the Republic Day weekend',     from: new Date(2027, 0, 23),  to: new Date(2027, 0, 26) },
    { name: 'Goa Carnival',                 from: new Date(2027, 1, 6),   to: new Date(2027, 1, 9), only: 'goa' },
    { name: 'Eid-ul-Fitr',                  from: new Date(2027, 2, 8),   to: new Date(2027, 2, 10) },
    { name: 'Holi and Shigmo',              from: new Date(2027, 2, 20),  to: new Date(2027, 2, 22) },
    { name: 'the Easter weekend',           from: new Date(2027, 2, 26),  to: new Date(2027, 2, 28) },
    { name: 'the summer school holidays',   from: new Date(2027, 4, 1),   to: new Date(2027, 5, 6), only: 'goa' },
    { name: 'the Independence Day weekend', from: new Date(2027, 7, 13),  to: new Date(2027, 7, 15) },
    { name: 'Ganesh Chaturthi',             from: new Date(2027, 8, 4),   to: new Date(2027, 8, 14), only: 'mumbai' },
    { name: 'Dussehra',                     from: new Date(2027, 9, 2),   to: new Date(2027, 9, 10) },
    { name: 'Diwali',                       from: new Date(2027, 9, 27),  to: new Date(2027, 10, 1) },
    { name: 'Christmas and New Year',       from: new Date(2027, 11, 20), to: new Date(2028, 0, 5) }
  ];
  function peakNights (a, b, prop) {
    var out = { nights: 0, names: [] };
    for (var x = new Date(a); x < b; x = addDays(x, 1)) {
      PEAKS.forEach(function (p) {
        if (p.only && p.only !== prop) return;
        if (x >= p.from && x <= p.to) { out.nights++; if (out.names.indexOf(p.name) < 0) out.names.push(p.name); }
      });
    }
    return out;
  }

  function renderPeaks () {
    var ul = document.getElementById('peakList'); if (!ul) return;
    var today = new Date(); today.setHours(0, 0, 0, 0);
    ul.innerHTML = PEAKS.filter(function (p) { return p.to >= today; }).map(function (p) {
      var name = p.name.replace(/^the /, ''); name = name.charAt(0).toUpperCase() + name.slice(1);
      return '<li><span>' + name + (p.only ? ' (' + (p.only === 'goa' ? 'Goa' : 'Mumbai') + ')' : '') + '</span><b>' + apRange(p.from, p.to) + '</b></li>';
    }).join('');
  }

  function autoMix (people) {
    if (people <= 2) return { garden: 1, resort: 0, suite: 0 };
    if (people % 2 === 0) return { garden: people / 2, resort: 0, suite: 0 };
    return { garden: (people - 3) / 2, resort: 1, suite: 0 };          // odd: one mid-size room takes three
  }
  function roomsOf (mix) {
    var list = [];
    ['garden', 'resort', 'suite'].forEach(function (k) {
      for (var i = 0; i < mix[k]; i++) list.push(k);
    });
    return list;
  }
  function bedsOf (mix) { return roomsOf(mix).reduce(function (a, k) { return a + ROOMS[k].cap; }, 0); }
  function rateOf (mix) { return roomsOf(mix).reduce(function (a, k) { return a + ROOMS[k].rate; }, 0); }

  // Who sleeps where: fill rooms in order, largest first.
  function assign (mix, people) {
    var out = [], left = people, n = PROPS[PROP].firstRoom;
    roomsOf(mix).forEach(function (k) {
      var used = Math.min(ROOMS[k].cap, left); left -= used;
      out.push({ num: n++, type: k, cap: ROOMS[k].cap, used: used });
    });
    return out;
  }
  function corridorHTML (rooms) {
    return rooms.map(function (r, i) {
      var beds = '';
      for (var b = 0; b < r.cap; b++) beds += '<i' + (b < r.used ? '' : ' class="is-empty"') + '></i>';
      return '<div class="door" style="animation-delay:' + (i * 40) + 'ms" title="' + ROOMS[r.type].name + '">' +
             '<b>' + r.num + '</b><span class="door__beds">' + beds + '</span></div>';
    }).join('');
  }

  (function flow () {
    var form = document.getElementById('holdForm');
    if (!form) return;

    var state = { inDate: null, outDate: null, people: 6, mix: autoMix(6), names: [], mixTouched: false };

    /* --- which hotel: drives rooms, rates, numbering and copy --- */
    function renderMix () {
      var box = document.getElementById('mix'); if (!box) return;
      box.innerHTML = ['garden', 'resort', 'suite'].map(function (k) {
        var r = ROOMS[k], id = 'mix' + k.charAt(0).toUpperCase() + k.slice(1);
        return '<div class="mix__row"><div><b>' + r.name + '</b><span>' + money(r.rate) + ' \u00b7 sleeps ' + word(r.cap) + '</span></div>' +
          '<div class="stepper stepper--s"><button type="button" data-mix="' + k + '" data-d="-1" aria-label="One fewer ' + r.name + '">\u2212</button>' +
          '<output id="' + id + '">' + state.mix[k] + '</output>' +
          '<button type="button" data-mix="' + k + '" data-d="1" aria-label="One more ' + r.name + '">+</button></div></div>';
      }).join('');
    }
    function renderRooms (p) {
      p = p || PROP;
      var R = PROPS[p].rooms;
      var box = document.getElementById('roomCards'); if (!box) return;
      box.innerHTML = ['garden', 'resort', 'suite'].map(function (k) {
        var r = R[k];
        return '<article class="room"><div class="room__img"><img src="../zo-assets/' + r.img + '" alt="' + r.alt + '" loading="lazy" width="700" height="460">' + (r.tag ? '<span class="room__tag">' + r.tag + '</span>' : '') + '</div><div class="room__b">' +
          '<h3>' + r.name + '</h3><p class="room__meta">' + r.meta + '</p>' + (r.plus ? '<p class="room__plus">' + r.plus + '</p>' : '<p class="room__plus" aria-hidden="true">&nbsp;</p>') + '<ul class="feat">' + r.perks.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>' +
          '<div class="room__f"><div><span>From</span><strong>' + money(r.rate) + '</strong><span>per night</span></div>' +
          '<button class="cta cta--navy" type="button" data-room="' + k + '">Choose This Room</button></div></div></article>';
      }).join('');
      var lede = document.getElementById('roomsLede'), fine = document.getElementById('roomsFine');
      if (lede) lede.textContent = PROPS[p].lede;
      if (fine) fine.textContent = PROPS[p].fine;
      document.querySelectorAll('.seg__b').forEach(function (b) { b.classList.toggle('is-on', b.dataset.prop === p); });
      var va = document.getElementById('villaAnswer');
      if (va) {
        var six = autoMix(6), list = roomsOf(six), t3 = list.reduce(function (a, k) { return a + R[k].rate; }, 0) * 3;
        va.textContent = 'Maybe. ' + word(list.length).replace(/^./, function (c) { return c.toUpperCase(); }) + ' ' + R.garden.name + 's for six over three nights at ' + PROPS[p].name + ' is ' + money(t3) + ', or ' + money(t3 / 6) + ' each. If a rental beats that, book the rental; it won\u2019t give you a desk at 2\u00a0a.m. or one key per person.';
      }
    }
    function setProp (p, keepMix) {
      // While rooms are held, the hold's hotel is fixed; the switch only
      // browses the other hotel's rooms and says so.
      if (hold && hold.prop && hold.prop !== p) {
        renderRooms(p);
        var sel0 = document.getElementById('wDest'); if (sel0) sel0.value = hold.prop;
        toast('Your rooms are held at ' + PROPS[hold.prop].name + '. Release them first to book at ' + PROPS[p].name + '.');
        return;
      }
      PROP = p; ROOMS = PROPS[p].rooms;
      var sel = document.getElementById('wDest'); if (sel) sel.value = p;
      var P = PROPS[p], solo = P.solo;
      var T = function (id, t) { var e = document.getElementById(id); if (e) e.textContent = t; };
      T('blockEyebrow', solo ? 'Your Mumbai booking' : 'Your Goa booking');
      T('mixLab', solo ? 'Room' : 'Rooms');
      T('corridorLab', solo ? 'Your room' : 'Your rooms, side by side');
      T('perHeadLab', 'Total for the stay');
      T('blockFine', solo ? 'Held free for 48 hours. Nothing is charged. Taxes and fees are not included in this demo.'
                          : 'Held free for 48 hours. Nothing is charged. Rates are per room per night. Taxes and fees are not included in this demo.');
      var sh = document.getElementById('shareSplit'); if (sh) sh.hidden = true;
      if (!keepMix) { state.people = P.defaultPeople; var wp = document.getElementById('wPeople'); if (wp) wp.value = state.people; }
      var bp = document.getElementById('blockProp'); if (bp) bp.textContent = PROPS[p].name + ' \u00b7 ' + PROPS[p].place;
      var mh = document.getElementById('mgHotel'); if (mh) mh.textContent = PROPS[p].name;
      if (!keepMix && !state.mixTouched) state.mix = autoMix(state.people);
      renderMix(); renderRooms(p);
      render();
    }
    var hold = load();

    var el = {
      calTitle: document.getElementById('calTitle'), calGrid: document.getElementById('calGrid'),
      calPrev: document.getElementById('calPrev'), calNext: document.getElementById('calNext'),
      datesOut: document.getElementById('datesOut'), datesHint: document.getElementById('datesHint'),
      people: document.getElementById('people'), groupOut: document.getElementById('groupOut'),
      corridor: document.getElementById('corridor'), corridorOut: document.getElementById('corridorOut'),
      peopleList: document.getElementById('peopleList'), totalOut: document.getElementById('totalOut'),
      perHead: document.getElementById('perHead'), holdErr: document.getElementById('holdErr'),
      shareStatus: document.getElementById('shareStatus'), shareWa: document.getElementById('shareWa'),
      manage: document.getElementById('manage'), mgRef: document.getElementById('mgRef'),
      mgLine: document.getElementById('mgLine'), mgCorridor: document.getElementById('mgCorridor'),
      mgRooms: document.getElementById('mgRooms'), mgShares: document.getElementById('mgShares'),
      mgOut: document.getElementById('mgOut')
    };
    var steps = {
      group: document.getElementById('stepGroup'), corridor: document.getElementById('stepCorridor'),
      people: document.getElementById('stepPeople'), hold: document.getElementById('stepHold')
    };

    /* --- calendar --- */
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var view = new Date(today.getFullYear(), today.getMonth(), 1);
    var LAST = new Date(today.getFullYear(), today.getMonth() + 6, 1);

    function drawCal () {
      if (!el.calGrid) return;
      el.calTitle.textContent = ['January','February','March','April','May','June','July','August',
        'September','October','November','December'][view.getMonth()] + ' ' + view.getFullYear();
      el.calPrev.disabled = view <= new Date(today.getFullYear(), today.getMonth(), 1);
      el.calNext.disabled = view >= LAST;
      var pad = (view.getDay() + 6) % 7, html = '';
      for (var p = 0; p < pad; p++) html += '<span class="day is-pad"></span>';
      var d = new Date(view);
      while (d.getMonth() === view.getMonth()) {
        var cls = 'day', dis = '';
        if (d < today) { cls += ' is-past'; dis = ' disabled'; }
        else if (nightFull(d)) { cls += ' is-full'; }
        if (state.inDate && state.outDate) {
          if (+d === +state.inDate) cls += ' is-in';
          else if (+d === +state.outDate) cls += ' is-end';
          else if (d > state.inDate && d < state.outDate) cls += ' is-mid';
        } else if (state.inDate && +d === +state.inDate) cls += ' is-in';
        var label = apDate(d) + (nightFull(d) ? ', fully booked' : '');
        html += '<button type="button" class="' + cls + '" data-day="' + dayKey(d) + '" aria-label="' + label + '"' + dis + '>' + d.getDate() + '</button>';
        d = addDays(d, 1);
      }
      el.calGrid.innerHTML = html;
    }
    if (el.calPrev) el.calPrev.addEventListener('click', function () { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); drawCal(); });
    if (el.calNext) el.calNext.addEventListener('click', function () { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); drawCal(); });
    if (el.calGrid) el.calGrid.addEventListener('click', function (e) {
      var b = e.target.closest('.day[data-day]'); if (!b || b.disabled) return;
      var parts = b.dataset.day.split('-');
      pickDay(new Date(+parts[0], +parts[1] - 1, +parts[2]));
    });

    function pickDay (d) {
      if (!state.inDate || state.outDate) {
        if (nightFull(d)) { say(el.datesOut, apDate(d) + ' is fully booked. Choose another night.'); return; }
        state.inDate = d; state.outDate = null;
        if (el.datesHint) el.datesHint.textContent = 'Now choose check-out.';
        say(el.datesOut, 'Check-in ' + apDate(d) + '. Choose check-out.');
      } else {
        if (d <= state.inDate) { state.inDate = d; say(el.datesOut, 'Check-in ' + apDate(d) + '. Choose check-out.'); drawCal(); render(); return; }
        var n = nightsBetween(state.inDate, d);
        if (n > 14) { say(el.datesOut, 'Holds run up to 14 nights. Pick an earlier check-out.'); return; }
        var fullNight = null;
        for (var x = new Date(state.inDate); x < d; x = addDays(x, 1)) if (nightFull(x)) { fullNight = x; break; }
        if (fullNight) {
          say(el.datesOut, apDate(fullNight) + ' is fully booked. Try nearby dates.');
          return;
        }
        state.outDate = d;
        if (el.datesHint) el.datesHint.textContent = 'Dates set.';
        say(el.datesOut, apRange(state.inDate, d) + ' · ' + word(n) + (n === 1 ? ' night' : ' nights') + '. Rooms are available on every night.');
      }
      drawCal(); render();
    }

    /* --- group and rooms --- */
    document.querySelectorAll('[data-step="people"]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.people = Math.min(12, Math.max(1, state.people + Number(b.dataset.d)));
        if (!state.mixTouched) state.mix = autoMix(state.people);
        render();
      });
    });
    document.getElementById('mix').addEventListener('click', function (e) {
      var b = e.target.closest('[data-mix]'); if (!b) return;
      var k = b.dataset.mix;
      state.mix[k] = Math.max(0, state.mix[k] + Number(b.dataset.d)); state.mixTouched = true; render();
    });
    document.querySelectorAll('[data-prop]').forEach(function (b) {
      b.addEventListener('click', function () {
        setProp(b.dataset.prop);
        if (b.hasAttribute('data-go')) {
          document.getElementById('widget').scrollIntoView({ block: 'center', behavior: reduce.matches ? 'auto' : 'smooth' });
          var wi = document.getElementById('wIn'); if (wi) setTimeout(function () { wi.focus(); }, 400);
        }
      });
    });
    var sel0 = document.getElementById('wDest');
    if (sel0) sel0.addEventListener('change', function () { setProp(sel0.value); });
    document.getElementById('mixAuto').addEventListener('click', function () {
      state.mix = autoMix(state.people); state.mixTouched = false; render();
    });

    /* --- names and pay requests --- */
    function nameOf (i) { return state.names[i] || ''; }
    el.peopleList.addEventListener('input', function (e) {
      var inp = e.target.closest('input[data-i]'); if (!inp) return;
      state.names[+inp.dataset.i] = inp.value;
      renderShares(false);
    });
    el.peopleList.addEventListener('click', function (e) {
      var b = e.target.closest('[data-pay]'); if (!b) return;
      var i = +b.dataset.pay, c = compute();
      var who = nameOf(i) || ('Friend ' + (i + 1));
      var room = c.rooms[c.roomOf[i]];
      var t = who + ', your share for Zo Hotel Goa, ' + (c.range || 'the dates we pick') + ', is ' + money(c.each) +
              ' (' + word(c.nights) + (c.nights === 1 ? ' night' : ' nights') + (room ? ', room ' + room.num : '') + '). ' +
              'Taxes and fees are not included in this demo.';
      copyText(t, function (ok) { say(el.shareStatus, ok ? 'Pay request for ' + who + ' copied.' : 'Select the figures and copy them.'); });
    });

    /* --- compute --- */
    function compute () {
      var rooms = assign(state.mix, state.people), beds = bedsOf(state.mix);
      var nights = (state.inDate && state.outDate) ? nightsBetween(state.inDate, state.outDate) : 0;
      var total = rateOf(state.mix) * nights + ((hold && hold.fee) || 0), each = state.people ? total / state.people : 0;
      var roomOf = [], idx = 0;
      rooms.forEach(function (r, ri) { for (var u = 0; u < r.used; u++) roomOf[idx++] = ri; });
      return { rooms: rooms, beds: beds, nights: nights, total: total, each: each, roomOf: roomOf,
               range: (state.inDate && state.outDate) ? apRange(state.inDate, state.outDate) : '' };
    }

    function render () {
      var c = compute();
      el.people.textContent = state.people;
      ['garden', 'resort', 'suite'].forEach(function (k) {
        var o = document.getElementById('mix' + k.charAt(0).toUpperCase() + k.slice(1)); if (o) o.textContent = state.mix[k];
      });

      var datesOk = !!(state.inDate && state.outDate);
      if (steps.group) steps.group.classList.toggle('is-off', !datesOk);
      var title = document.getElementById('blockTitle');
      if (title) title.textContent = datesOk
        ? c.range + ' \u00b7 ' + word(c.nights) + (c.nights === 1 ? ' night' : ' nights') + ' \u00b7 ' + word(state.people) + (state.people === 1 ? ' guest' : ' guests')
        : (PROPS[PROP].solo ? 'Your room appears here once you add dates' : 'Your rooms appear here once you add dates');
      var bl = document.getElementById('billLine');
      if (bl) bl.textContent = datesOk ? word(c.rooms.length).replace(/^./, function (ch) { return ch.toUpperCase(); }) + (c.rooms.length === 1 ? ' room' : ' rooms') + ' \u00d7 ' + word(c.nights) + (c.nights === 1 ? ' night' : ' nights') + '' : 'Your total appears once dates are set.';
      var hb = document.getElementById('holdBtn'); if (hb) hb.disabled = !datesOk;

      var fits = c.beds >= state.people && c.rooms.length > 0;
      var spare = c.beds - state.people;
      if (state.people === 1 && c.rooms.length === 1) say(el.groupOut, '');
      else if (!c.rooms.length) say(el.groupOut, 'Add at least one room.');
      else if (!fits) say(el.groupOut, 'These rooms sleep ' + word(c.beds) + ' and you are ' + word(state.people) + '. Add a room or choose a larger one.');
      else if (spare > 0) say(el.groupOut, word(spare).replace(/^./, function (ch) { return ch.toUpperCase(); }) + (spare === 1 ? ' bed' : ' beds') + ' will be empty. A smaller room may suit you better.');
      else say(el.groupOut, state.people === 1 ? '' : word(c.rooms.length).replace(/^./, function (ch) { return ch.toUpperCase(); }) + (c.rooms.length === 1 ? ' room sleeps ' : ' rooms sleep ') + word(state.people) + ' guests.');

      var ok = datesOk && fits && c.rooms.length <= CORRIDOR_ROOMS;
      if (steps.corridor) steps.corridor.classList.toggle('is-off', !(datesOk && fits));
      if (steps.people) steps.people.classList.toggle('is-off', !ok);
      if (steps.hold) steps.hold.classList.toggle('is-off', !ok);

      if (c.rooms.length > CORRIDOR_ROOMS) {
        el.corridor.innerHTML = '';
        say(el.corridorOut, 'We can book up to ' + CORRIDOR_ROOMS + ' rooms side by side. For a larger group, call the hotel and we will arrange it.');
      } else {
        el.corridor.innerHTML = corridorHTML(c.rooms);
        say(el.corridorOut, c.rooms.length ? (c.rooms.length > 1 ? 'Rooms ' + c.rooms[0].num + '–' + c.rooms[c.rooms.length - 1].num : 'Room ' + c.rooms[0].num) + ', ' + PROPS[PROP].corridor + '.' : '');
      }
      renderShares(true);
      el.holdErr.textContent = '';
    }

    function renderShares (rebuild) {
      var c = compute();
      el.totalOut.textContent = c.nights ? money(c.total) : '—';
      el.perHead.textContent = c.nights ? money(c.total) : '—';
      if (rebuild) {
        var html = '';
        for (var i = 0; i < state.people; i++) {
          var r = c.rooms[c.roomOf[i]];
          html += '<div class="person">' +
            '<input type="text" data-i="' + i + '" value="' + escapeHTML(nameOf(i)) + '" placeholder="Friend ' + (i + 1) + '" aria-label="Name of person ' + (i + 1) + '">' +
            '<span class="person__room">' + (r ? 'Room ' + r.num + ' · ' + ROOMS[r.type].name : 'No bed yet') + '</span>' +
            '<span class="person__amt">' + (c.nights ? money(c.each) : '—') + '</span>' +
            '<button type="button" class="link person__pay" data-pay="' + i + '">Copy Pay Request</button></div>';
        }
        el.peopleList.innerHTML = html;
      }
    }

    function splitText (c) {
      return ['Zo Hotel Goa — our split', c.range || 'Dates to be picked',
        word(state.people).replace(/^./, function (ch) { return ch.toUpperCase(); }) + ' of us · rooms ' + c.rooms.map(function (r) { return r.num; }).join(', ') + ' on one corridor',
        'Total room cost ' + (c.nights ? money(c.total) : '—'),
        'Each person ' + (c.nights ? money(c.each) : '—'),
        'Taxes and fees are not included in this demo.'].join('\n');
    }
    var shareBtn = document.getElementById('shareSplit');
    if (shareBtn) shareBtn.addEventListener('click', function () {
      var t = splitText(compute());
      var after = function (ok) { say(el.shareStatus, ok ? 'Copied — paste it into the group chat.' : 'Select the figures and copy them.'); };
      copyText(t, after);
    });

    /* --- the hold --- */
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var c = compute();
      if (!c.nights) { say(el.holdErr, 'Choose check-in and check-out in the form above first.'); return; }
      if (c.beds < state.people) { say(el.holdErr, 'Add a room so everyone has a bed.'); return; }
      if (c.rooms.length > CORRIDOR_ROOMS) { say(el.holdErr, 'That is more rooms than we can book side by side. Choose fewer rooms, or call the hotel.'); return; }
      var now = new Date();
      hold = {
        ref: PROPS[PROP].ref + String(1000 + Math.floor(Math.random() * 9000)), prop: PROP,
        createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + 48 * 3600000).toISOString(),
        inDate: state.inDate.toISOString(), outDate: state.outDate.toISOString(),
        people: state.people, mix: state.mix, names: state.names.slice(0, state.people), status: 'held'
      };
      save();
      var heldMsg = (c.rooms.length > 1 ? 'Rooms ' + c.rooms[0].num + '\u2013' + c.rooms[c.rooms.length - 1].num + ' are' : 'Room ' + c.rooms[0].num + ' is') + ' held for you until ' + whenExpires();
      showManage(heldMsg + ' Nothing is charged.');
      toast('Held \u00b7 ' + hold.ref + '. ' + heldMsg, function () { clear(); showForm('Hold undone. Nothing was charged.'); });
    });

    function whenExpires () { var d = new Date(hold.expiresAt); return apDate(d) + ', ' + apTime(d); }

    function showManage (msg) {
      if (hold.prop && hold.prop !== PROP) { PROP = hold.prop; ROOMS = PROPS[PROP].rooms; renderMix(); renderRooms(); }
      var mh = document.getElementById('mgHotel'); if (mh) mh.textContent = PROPS[PROP].name;
      state.inDate = new Date(hold.inDate); state.outDate = new Date(hold.outDate);
      state.people = hold.people; state.mix = hold.mix; state.names = hold.names || [];
      var c = compute();
      form.hidden = true; el.manage.hidden = false;
      el.mgRef.textContent = hold.ref;
      el.mgLine.textContent = (hold.status === 'confirmed' ? 'Confirmed' : 'Held free until ' + whenExpires()) +
        ' · ' + c.range + ' · ' + word(c.nights) + (c.nights === 1 ? ' night' : ' nights') + ' · ' + word(state.people) + (state.people === 1 ? ' guest.' : ' guests.');
      el.mgCorridor.innerHTML = corridorHTML(c.rooms);
      el.mgRooms.textContent = c.rooms.map(function (r) { return r.num + ' ' + ROOMS[r.type].name; }).join(' · ') + (PROPS[PROP].solo ? '.' : ', side by side in the garden wing.');
      el.mgShares.innerHTML = (hold.fee ? '<li><span>Peak-date charge \u00b7 ' + hold.feeWhy + '</span><b>' + money(hold.fee) + '</b></li>' : '') + '<li><span>Total \u00b7 ' + word(c.rooms.length) + (c.rooms.length === 1 ? ' room' : ' rooms') + ', ' + word(c.nights) + (c.nights === 1 ? ' night' : ' nights') + '</span><b>' + money(c.total) + '</b></li>';
      say(el.mgOut, msg || '');
      var rl = document.getElementById('mgRoomsLab'); if (rl) rl.textContent = PROPS[PROP].solo ? 'Your room' : 'Your rooms';
      var addBtn = document.querySelector('[data-mg="add"]'); if (addBtn) addBtn.textContent = PROPS[PROP].solo ? 'Add a Colleague' : 'Add a Friend';
      var relBtn = document.querySelector('[data-mg="release"]'); if (relBtn) relBtn.hidden = true;
      renderRequests();
      var booked = document.getElementById('bookedNote'), payBtn = document.querySelector('[data-mg="pay"]'), allBtn = document.getElementById('releaseAllBtn'), st = document.getElementById('mgStatus');
      var isBooked = hold.status === 'confirmed';
      if (booked) {
        booked.hidden = !isBooked;
        var ul = booked.querySelector('.tick');
        if (ul) ul.innerHTML = (PROPS[PROP].solo
          ? ['Room ' + c.rooms[0].num + ', high floor, quiet side', (hold.gst ? 'The GST invoice goes to your company before checkout' : 'Express checkout on the morning you leave'), 'Taxes and fees are not included in this demo']
          : ['Rooms ' + c.rooms.map(function (r) { return r.num; }).join(', ') + ', side by side in the garden wing', 'A key for every guest at check-in', 'Taxes and fees are not included in this demo']
        ).map(function (t) { return '<li>' + t + '</li>'; }).join('');
      }
      if (isBooked) document.getElementById('bookedLine').textContent = (PROPS[PROP].solo ? 'Your stay is confirmed.' : 'Your stay is confirmed.') + ' Booking ' + hold.ref + ', ' + c.range + '. Nothing was charged in this demo.';
      if (payBtn) payBtn.hidden = isBooked;
      if (allBtn) allBtn.textContent = isBooked ? 'Cancel This Booking' : 'Release All Rooms';
      if (st) st.textContent = isBooked ? 'Confirmed' : 'Held';
      var eb = document.getElementById('mgEyebrow'); if (eb) eb.textContent = 'Your booking';
      el.manage.scrollIntoView({ block: 'start', behavior: reduce.matches ? 'auto' : 'smooth' });
    }
    function showForm (msg) {
      el.manage.hidden = true; form.hidden = false;
      drawCal(); render();
      if (msg) say(el.holdErr, msg);
    }

    document.querySelectorAll('[data-mg]').forEach(function (b) {
      b.addEventListener('click', function () {
        var act = b.dataset.mg, c = compute();
        if (act === 'pay') {
          openReview();
        } else if (act === 'dates') {
          openDates();
        } else if (act === 'room') {
          openRoom();
        } else if (act === 'request') {
          openRequest();
        } else if (act === 'add') {
          if (state.people >= 12) { say(el.mgOut, 'Group bookings take up to 12 guests. For more, call the hotel.'); return; }
          var nextMix = autoMix(state.people + 1);
          if (roomsOf(nextMix).length > CORRIDOR_ROOMS) { say(el.mgOut, 'There is no room left side by side for one more guest. Call the hotel and we will arrange it.'); return; }
          var beforeAdd = JSON.parse(JSON.stringify(hold));
          hold.people = state.people + 1; hold.mix = nextMix; save();
          showManage('');
          toast('Guest added. Your new total is ' + money(compute().total) + '.', function () { hold = beforeAdd; save(); showManage('Undone.'); });
        } else if (act === 'release') {
          if (state.people <= 2) { say(el.mgOut, 'A group booking needs at least two guests.'); return; }
          var before = c.rooms.length, beforeRel = JSON.parse(JSON.stringify(hold));
          hold.people = state.people - 1; hold.mix = autoMix(hold.people); hold.names = state.names.slice(0, hold.people); save();
          var after = roomsOf(hold.mix).length;
          showManage('');
          toast('Booking updated for ' + word(hold.people) + ' guests. Your new total is ' + money(compute().total) + '.', function () { hold = beforeRel; save(); showManage('Undone.'); });
        } else if (act === 'releaseAll') {
          openExit('drop');
        }
      });
    });

    function save () { try { localStorage.setItem(STORE_KEY, JSON.stringify(hold)); } catch (e) {} syncNav(); }
    // The nav and the phone bar point at the booking once one exists.
    function syncNav () {
      var cta = document.getElementById('navCta'), mine = document.getElementById('navMine');
      var label = hold ? (hold.status === 'confirmed' ? 'View Booking' : 'View Hold') : 'Hold Rooms';
      if (cta) { cta.textContent = label; cta.setAttribute('href', hold ? '#block' : '#widget'); }
      if (mine) mine.classList.toggle('has-dot', !!hold);
    }
    function load () { try { return JSON.parse(localStorage.getItem(STORE_KEY) || 'null'); } catch (e) { return null; } }
    function clear () { hold = null; try { localStorage.removeItem(STORE_KEY); } catch (e) {} syncNav(); }

    /* ------------------------------------------------------------------
       3b. Booking sheets: review and pay, change dates, change room,
       add a request. Each shows the money before anything changes.
       -------------------------------------------------------------------- */
    var sheetOpener = null;
    function openSheet (id) {
      sheetOpener = document.activeElement;
      var sh = document.getElementById(id); sh.hidden = false; document.body.style.overflow = 'hidden';
      var f = sh.querySelector('button.cta--gold, input, button'); if (f) f.focus();
    }
    function closeSheet (id) {
      var sh = document.getElementById(id); if (!sh) return;
      sh.hidden = true; document.body.style.overflow = '';
      if (sheetOpener && sheetOpener.focus) sheetOpener.focus();
    }
    ['reviewSheet', 'datesSheet', 'roomSheet', 'reqSheet'].forEach(function (id) {
      var sh = document.getElementById(id); if (!sh) return;
      sh.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', function () { closeSheet(id); }); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      ['reviewSheet', 'datesSheet', 'roomSheet', 'reqSheet'].forEach(function (id) { var sh = document.getElementById(id); if (sh && !sh.hidden) closeSheet(id); });
    });
    function rows (list) {
      return list.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd' + (r[2] ? ' class="' + r[2] + '"' : '') + '>' + r[1] + '</dd></div>'; }).join('');
    }
    function totalFor (mix, a, b) { return rateOf(mix) * nightsBetween(a, b); }
    var CHANGE_FEE = 0;                 // no change fee: the guest pays the new dates' rate
    function diffRows (oldT, newT, people, fee, feeLabel) {
      fee = fee || 0; newT = newT + fee;
      var d = newT - oldT;
      return [['Current total', money(oldT)]].concat(fee ? [['Rate for the new nights', money(newT - fee)], [feeLabel || 'Change fee', money(fee)]] : []).concat([['New total', money(newT)],
              ['Difference', (d > 0 ? '+' : d < 0 ? '\u2212' : '') + money(Math.abs(d)), d > 0 ? 'up' : d < 0 ? 'down' : ''],
              ]);
    }

    // --- review and pay ---
    function openReview () {
      var c = compute(), P = PROPS[PROP];
      document.getElementById('rvList').innerHTML = rows([
        ['Hotel', P.name], ['Dates', c.range + ' \u00b7 ' + word(c.nights) + (c.nights === 1 ? ' night' : ' nights')],
        ['Rooms', c.rooms.map(function (r) { return r.num + ' ' + ROOMS[r.type].name; }).join(', ')],
        ['Guests', word(state.people).replace(/^./, function (ch) { return ch.toUpperCase(); })], ['Total', money(c.total)]]);
      document.getElementById('rvPolicy').textContent = 'Flexible rate: change the dates up to 72 hours before check-in and pay the new dates\u2019 rate. Moving into peak dates adds 20% to those nights. Taxes and fees are not included in this demo.';
      document.getElementById('gstWrap').hidden = !P.solo;
      openSheet('reviewSheet');
    }
    document.getElementById('rvPay').addEventListener('click', function () {
      var c = compute();
      hold.status = 'confirmed'; hold.gst = !!document.getElementById('rvGst').checked;
      hold.paid = document.querySelector('input[name="pay"]:checked').value; save();
      closeSheet('reviewSheet'); showManage('');
      toast('You\u2019re booked \u00b7 ' + hold.ref + '. ' + 'Your total is ' + money(c.total) + '. Demo payment \u2014 nothing was charged.' + (hold.gst ? ' The GST invoice goes to your company before checkout.' : ''));
    });

    // --- change the dates, with the difference shown first ---
    function openDates () {
      var inI = document.getElementById('cdIn'), outI = document.getElementById('cdOut');
      var iso = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
      inI.value = iso(state.inDate); outI.value = iso(state.outDate); inI.min = iso(today);
      previewDates(); openSheet('datesSheet');
    }
    function previewDates () {
      var inI = document.getElementById('cdIn'), outI = document.getElementById('cdOut'), note = document.getElementById('cdNote'), ok = document.getElementById('cdConfirm');
      var a = inI.value ? new Date(inI.value + 'T00:00:00') : null, b = outI.value ? new Date(outI.value + 'T00:00:00') : null;
      ok.disabled = true; document.getElementById('cdDiff').innerHTML = '';
      if (!a || !b) { say(note, 'Choose both dates.'); return; }
      if (b <= a) { say(note, 'Choose a check-out date after your check-in date.'); return; }
      if (nightsBetween(a, b) > 14) { say(note, 'Stays run up to 14 nights.'); return; }
      for (var x = new Date(a); x < b; x = addDays(x, 1)) if (nightFull(x)) {
        say(note, apDate(x) + ' is full at ' + PROPS[PROP].name + '. If you still need those dates, your payment becomes Zo credit for 12 months.'); return;
      }
      var oldT = compute().total, newT = totalFor(state.mix, a, b);
      var pk = peakNights(a, b, PROP), fee = Math.round(rateOf(state.mix) * pk.nights * PEAK_RATE);
      var names = pk.names.join(' and ');
      document.getElementById('cdDiff').innerHTML = rows(diffRows(oldT, newT, state.people, fee, 'Peak-date charge (' + names + ')'));
      say(note, fee
        ? apRange(a, b) + ' has rooms. ' + word(pk.nights).replace(/^./, function (ch) { return ch.toUpperCase(); }) + (pk.nights === 1 ? ' night falls' : ' nights fall') + ' during ' + names + ', our peak season, when demand is highest and rooms are limited. Moving a booking into peak dates adds 20% to the rate for those nights. Nothing changes until you confirm.'
        : apRange(a, b) + ' has rooms. You pay the rate for these nights. Nothing changes until you confirm.');
      ok.disabled = false; ok.dataset.a = inI.value; ok.dataset.b = outI.value; ok.dataset.fee = fee; ok.dataset.why = names;
    }
    document.getElementById('cdIn').addEventListener('change', previewDates);
    document.getElementById('cdOut').addEventListener('change', previewDates);
    document.getElementById('cdConfirm').addEventListener('click', function () {
      var b = this, before = JSON.parse(JSON.stringify(hold));
      var fee = +b.dataset.fee || 0;
      hold.inDate = new Date(b.dataset.a + 'T00:00:00').toISOString(); hold.outDate = new Date(b.dataset.b + 'T00:00:00').toISOString();
      hold.fee = fee; hold.feeWhy = fee ? b.dataset.why : ''; save();
      closeSheet('datesSheet'); showManage('');
      toast('Dates changed to ' + compute().range + '. ' + (fee ? 'Your new total includes a ' + money(fee) + ' peak-date charge for ' + b.dataset.why + '.' : 'You pay the rate for the new nights.'), function () { hold = before; save(); showManage('Undone.'); });
    });

    // --- change the room ---
    function openRoom () {
      var cur = roomsOf(state.mix)[0] || 'garden', oldT = totalFor(state.mix, state.inDate, state.outDate);
      document.getElementById('crList').innerHTML = ['garden', 'resort', 'suite'].map(function (k) {
        var r = ROOMS[k], mix = { garden: 0, resort: 0, suite: 0 }; mix[k] = Math.ceil(state.people / r.cap);
        var t = totalFor(mix, state.inDate, state.outDate);
        return '<label><input type="radio" name="cr" value="' + k + '"' + (k === cur ? ' checked' : '') + '><div><b>' + r.name + '</b><span>' + word(mix[k]) + (mix[k] === 1 ? ' room' : ' rooms') + ' \u00b7 sleeps ' + word(r.cap) + ' each \u00b7 ' + money(r.rate) + ' a night</span></div><strong>' + money(t) + '</strong></label>';
      }).join('');
      previewRoom(); openSheet('roomSheet');
    }
    function previewRoom () {
      var k = (document.querySelector('input[name="cr"]:checked') || {}).value; if (!k) return;
      var mix = { garden: 0, resort: 0, suite: 0 }; mix[k] = Math.ceil(state.people / ROOMS[k].cap);
      var oldT = totalFor(state.mix, state.inDate, state.outDate), newT = totalFor(mix, state.inDate, state.outDate);
      document.getElementById('crDiff').innerHTML = rows(diffRows(oldT, newT, state.people));
      var same = JSON.stringify(mix) === JSON.stringify(state.mix);
      document.getElementById('crConfirm').disabled = same;
    }
    document.getElementById('crList').addEventListener('change', previewRoom);
    document.getElementById('crConfirm').addEventListener('click', function () {
      var k = document.querySelector('input[name="cr"]:checked').value, before = JSON.parse(JSON.stringify(hold));
      var mix = { garden: 0, resort: 0, suite: 0 }; mix[k] = Math.ceil(state.people / ROOMS[k].cap);
      hold.mix = mix; save(); closeSheet('roomSheet'); showManage('');
      toast('Room changed to ' + ROOMS[k].name + '. Your total is now ' + money(compute().total) + '.', function () { hold = before; save(); showManage('Undone.'); });
    });

    // --- requests ---
    var CHIPS = {
      goa: ['Connecting rooms', 'Cot for a child', 'High chair at breakfast', 'Late breakfast for the group', 'Rooms away from the pool bar'],
      mumbai: ['Early check-in after a night flight', 'Invoice to my company', 'Quiet high floor', 'Iron and board in the room', 'Breakfast packed for 6 a.m.']
    };
    var picked = [];
    function openRequest () {
      picked = [];
      document.getElementById('rqChips').innerHTML = CHIPS[PROP].map(function (t) { return '<button type="button" class="chip">' + t + '</button>'; }).join('');
      document.getElementById('rqText').value = '';
      openSheet('reqSheet');
    }
    document.getElementById('rqChips').addEventListener('click', function (e) {
      var b = e.target.closest('.chip'); if (!b) return;
      b.classList.toggle('is-on'); var t = b.textContent;
      picked = b.classList.contains('is-on') ? picked.concat([t]) : picked.filter(function (x) { return x !== t; });
    });
    document.getElementById('rqAdd').addEventListener('click', function () {
      var extra = document.getElementById('rqText').value.trim(), list = picked.slice(); if (extra) list.push(extra);
      if (!list.length) { toast('Pick a request or type one.'); return; }
      hold.requests = (hold.requests || []).concat(list); save(); closeSheet('reqSheet'); showManage('');
      toast(word(list.length).replace(/^./, function (c) { return c.toUpperCase(); }) + (list.length === 1 ? ' request' : ' requests') + ' sent to the desk. We confirm what we can do before you arrive.');
    });
    function renderRequests () {
      var wrap = document.getElementById('mgRequestsWrap'), ul = document.getElementById('mgRequests');
      if (!wrap || !ul) return;
      var list = (hold && hold.requests) || [];
      wrap.hidden = !list.length;
      ul.innerHTML = list.map(function (t, i) { return '<li><span>' + escapeHTML(t) + '</span><button type="button" data-rq="' + i + '">Remove</button></li>'; }).join('');
    }
    document.getElementById('mgRequests').addEventListener('click', function (e) {
      var b = e.target.closest('[data-rq]'); if (!b) return;
      hold.requests.splice(+b.dataset.rq, 1); save(); renderRequests();
    });

    /* ------------------------------------------------------------------
       4. Part A — the exit prompt, computed from the real hold.
       Style guide §12a: one verb in heading, message and primary button.
       -------------------------------------------------------------------- */
    var sheet = document.getElementById('exitSheet');
    var opener = null;
    var SAMPLE = { people: 6, mix: { garden: 3, resort: 0, suite: 0 }, inDate: new Date(2026, 11, 12), outDate: new Date(2026, 11, 15) };

    function exitModel () {
      var m = hold ? { people: hold.people, mix: hold.mix, inDate: new Date(hold.inDate), outDate: new Date(hold.outDate) } : SAMPLE;
      var nights = nightsBetween(m.inDate, m.outDate);
      var rooms = roomsOf(m.mix);
      var afterPeople = Math.max(2, m.people - 1);
      var afterMix = autoMix(afterPeople), afterRooms = roomsOf(afterMix);
      var afterTotal = rateOf(afterMix) * nights;
      var nowTotal = rateOf(m.mix) * nights + ((hold && hold.fee) || 0);
      return { people: m.people, nights: nights, rooms: rooms, range: apRange(m.inDate, m.outDate), nowTotal: nowTotal,
               afterPeople: afterPeople, afterRooms: afterRooms, afterTotal: afterTotal, afterEach: afterTotal / afterPeople,
               afterType: afterRooms.length ? ROOMS[afterRooms[0]].name : '', afterRate: afterRooms.length ? ROOMS[afterRooms[0]].rate : 0 };
    }

    function fillExit (why) {
      var x = exitModel();
      var H = document.getElementById('exitH'), B = document.getElementById('exitB'), T = document.getElementById('exitTag');
      var P = document.getElementById('exitPrimary'), S = document.getElementById('exitSecondary');
      var nR = x.afterRooms.length;
      var demo = hold && hold.status === 'confirmed' ? ' Nothing was charged in this demo.' : ' Your hold is free, so nothing has been charged.';
      if (why === 'drop') {
        T.textContent = 'Fewer guests';
        H.textContent = 'Update your booking instead';
        B.innerHTML = '<p>Update your booking from ' + word(x.people) + ' to ' + word(x.afterPeople) + ' guests for ' + x.range + '. Your rooms change from ' + mixText(x.rooms) + ' to ' + mixText(x.afterRooms) + ', and your total drops from ' + money(x.nowTotal) + ' to <b>' + money(x.afterTotal) + '</b>.</p>' +
          '<p class="sheet__p2">Nothing changes until you confirm. Taxes and fees are not included in this demo.</p>';
        P.textContent = 'Update My Booking'; S.textContent = 'Keep the Booking';
      } else if (why === 'dates') {
        T.textContent = 'New dates';
        H.textContent = 'Change your dates instead';
        B.innerHTML = '<p>Change your dates up to 72 hours before check-in. You pay the rate for the new nights, and your rooms move with you. Moving into peak dates, such as Diwali or Christmas and New Year, adds 20% to those nights.</p>' +
          (hold && hold.status === 'confirmed' ? '<p class="sheet__p2">If the new dates are fully booked, your payment becomes Zo credit, valid for 12 months at Zo Hotel Goa or Mumbai.</p>' : '<p class="sheet__p2">Your rooms are held free, so nothing has been charged.</p>');
        P.textContent = 'Change My Dates'; S.textContent = 'Keep the Booking';
      } else {
        T.textContent = 'Change of plan';
        H.textContent = 'Keep your payment as credit';
        B.innerHTML = '<p>Keep ' + money(x.nowTotal) + ' as Zo credit, valid for 12 months at Zo Hotel Goa or Mumbai.' + demo + '</p>';
        P.textContent = 'Keep My Credit'; S.textContent = 'Keep the Booking';
      }
    }

    // Offer only what would really change something for this booking.
    function exitOptions () {
      var x = exitModel(), ok = [];
      if (!PROPS[hold && hold.prop ? hold.prop : PROP].solo && x.people > 2 && x.afterTotal < x.nowTotal) ok.push('drop');
      ok.push('dates');
      if (hold && hold.status === 'confirmed') ok.push('plan');
      return ok;
    }
    function mixText (keys) {
      var n = {}; keys.forEach(function (k) { n[k] = (n[k] || 0) + 1; });
      return Object.keys(n).map(function (k) { return word(n[k]) + ' ' + ROOMS[k].name + (n[k] === 1 ? '' : 's'); }).join(' and ');
    }

    function openExit (why) {
      opener = document.activeElement;
      var ok = exitOptions();
      sheet.querySelectorAll('input[name="why"]').forEach(function (i) { i.closest('label').hidden = ok.indexOf(i.value) < 0; });
      sheet.querySelector('.sheet__why').hidden = ok.length < 2;
      if (ok.indexOf(why) < 0) why = ok[0];
      var r = sheet.querySelector('input[name="why"][value="' + why + '"]'); if (r) r.checked = true;
      fillExit(why);
      sheet.hidden = false; document.body.style.overflow = 'hidden';
      document.getElementById('exitPrimary').focus();
    }
    function closeExit () {
      sheet.hidden = true; document.body.style.overflow = '';
      if (opener && opener.focus) opener.focus();
    }
    sheet.querySelectorAll('input[name="why"]').forEach(function (r) {
      r.addEventListener('change', function () { fillExit(r.value); });
    });
    var openBtn = document.getElementById('openExit'); if (openBtn) openBtn.addEventListener('click', function () { openExit('drop'); });
    sheet.querySelector('.sheet__scrim').addEventListener('click', closeExit);

    document.getElementById('exitPrimary').addEventListener('click', function () {
      var why = sheet.querySelector('input[name="why"]:checked').value;
      closeExit();
      if (!hold) return;
      if (why === 'drop') document.querySelector('[data-mg="release"]').click();
      else if (why === 'dates') document.querySelector('[data-mg="dates"]').click();
      else {
        var keptAs = JSON.parse(JSON.stringify(hold)); clear(); showForm('');
        toast((keptAs.status === 'confirmed' ? 'Booking ' + keptAs.ref + ' canceled.' : 'Hold ' + keptAs.ref + ' released.') + ' Nothing was charged.', function () { hold = keptAs; save(); showManage('Restored.'); });
      }
    });
    document.getElementById('exitSecondary').addEventListener('click', function () {
      var why = sheet.querySelector('input[name="why"]:checked').value;
      closeExit();
      if (!hold) return;
      showManage('Kept as it was.');
    });
    document.getElementById('exitGo').addEventListener('click', function () {
      closeExit();
      if (!hold) { say(el.holdErr, 'There is no booking to cancel yet.'); return; }
      var gone = JSON.parse(JSON.stringify(hold)), wasBooked = gone.status === 'confirmed';
      clear(); showForm('');
      toast((wasBooked ? 'Booking ' + gone.ref + ' canceled.' : 'Hold ' + gone.ref + ' released.') + ' Nothing was charged.', function () { hold = gone; save(); showManage('Restored.'); });
    });
    document.addEventListener('keydown', function (e) {
      if (sheet.hidden) return;
      if (e.key === 'Escape') { closeExit(); return; }
      if (e.key !== 'Tab') return;
      var f = Array.prototype.slice.call(sheet.querySelectorAll('button,input')).filter(function (x) { return x.offsetParent !== null; });
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    /* --- the hero widget and the room cards feed the flow --- */
    var widget = document.getElementById('widget');
    if (widget) {
      var wIn = document.getElementById('wIn'), wOut = document.getElementById('wOut');
      var iso = function (d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
      wIn.min = iso(today); wOut.min = iso(addDays(today, 1));
      var wNote = document.getElementById('wNote');
      // As dates are picked: keep check-out after check-in, count the
      // nights, and say upfront when the stay falls on peak dates.
      var liveDates = function () {
        var a = wIn.value ? new Date(wIn.value + 'T00:00:00') : null;
        if (a) {
          wOut.min = iso(addDays(a, 1));
          if (!wOut.value || new Date(wOut.value + 'T00:00:00') <= a) wOut.value = iso(addDays(a, 1));
        }
        var b = wOut.value ? new Date(wOut.value + 'T00:00:00') : null;
        if (!a || !b || b <= a) { say(wNote, ''); return; }
        var n = nightsBetween(a, b), pk = peakNights(a, b, document.getElementById('wDest').value);
        say(wNote, apRange(a, b) + ' \u00b7 ' + word(n) + (n === 1 ? ' night' : ' nights') +
          (pk.nights ? '. These dates fall during ' + pk.names.join(' and ') + ', a peak period, so rooms fill early.' : '.'));
      };
      wIn.addEventListener('change', liveDates); wOut.addEventListener('change', liveDates);
      document.getElementById('wDest').addEventListener('change', function () {
        var wp = document.getElementById('wPeople'); if (wp && !hold) wp.value = PROPS[this.value].defaultPeople; liveDates();
      });
      if (!hold) {
        try {
          var last = JSON.parse(localStorage.getItem('zo-last-search') || 'null');
          if (last && last.a && new Date(last.a + 'T00:00:00') >= today) {
            document.getElementById('wDest').value = last.dest; setProp(last.dest);
            wIn.value = last.a; wOut.value = last.b;
            document.getElementById('wPeople').value = last.n; if (last.name) document.getElementById('wName').value = last.name;
            liveDates();
          }
        } catch (e3) {}
      }
      widget.addEventListener('submit', function (e) {
        e.preventDefault();
        var note = document.getElementById('wNote');
        setProp(document.getElementById('wDest').value, true);
        var a = wIn.value ? new Date(wIn.value + 'T00:00:00') : null;
        var b = wOut.value ? new Date(wOut.value + 'T00:00:00') : null;
        if (!a || !b) { say(note, 'Choose check-in and check-out to see your rooms.'); return; }
        if (b <= a) { say(note, 'Choose a check-out date after your check-in date.'); return; }
        var n = Number(document.getElementById('wPeople').value) || 6;
        state.people = Math.min(12, Math.max(1, n)); state.mix = autoMix(state.people); state.mixTouched = false;
        var nm = document.getElementById('wName').value.trim(); if (nm) state.names[0] = nm;
        if (hold) {
          say(note, 'You already have booking ' + hold.ref + '. It is shown below.');
          document.getElementById('block').scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth' });
          return;
        }
        try { localStorage.setItem('zo-last-search', JSON.stringify({ dest: document.getElementById('wDest').value, a: wIn.value, b: wOut.value, n: state.people, name: nm })); } catch (e2) {}
        state.inDate = null; state.outDate = null;
        view = new Date(a.getFullYear(), a.getMonth(), 1); drawCal();
        pickDay(a); if (state.inDate) pickDay(b);
        say(note, state.outDate ? 'Rooms are available on those nights. Your booking is below.' : el.datesOut.textContent);
        document.getElementById('block').scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth' });
      });
    }
    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-room]'); if (!b) return;
      {
        if (hold) {
          toast('Your rooms are already held. Release them first to choose a different room.');
          document.getElementById('block').scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth' });
          return;
        }
        var k = b.dataset.room, cap = ROOMS[k].cap;
        var mix = { garden: 0, resort: 0, suite: 0 }; mix[k] = Math.ceil(state.people / cap);
        state.mix = mix; state.mixTouched = true;
        drawCal(); render();
        say(el.groupOut, word(mix[k]).replace(/^./, function (ch) { return ch.toUpperCase(); }) + ' ' + ROOMS[k].name + (mix[k] === 1 ? '' : 's') + ' for ' + word(state.people) + (state.people === 1 ? ' guest.' : ' guests.'));
        document.getElementById('block').scrollIntoView({ behavior: reduce.matches ? 'auto' : 'smooth' });
      }
    });

    // The "carried over" card mirrors whatever the hold currently is.
    function syncCarry () {
      var c = compute();
      var ref = document.getElementById('carryRef'), rm = document.getElementById('carryRooms'), pp = document.getElementById('carryPeople');
      if (ref) ref.textContent = hold ? hold.ref : 'ZO-GOA-\u2014';
      if (rm) rm.textContent = c.rooms.length ? c.rooms.map(function (r) { return r.num; }).join(', ') : 'Your mix';
      if (pp) pp.textContent = word(state.people) + ' guests';
      var st = document.getElementById('mgStatus'); if (st && hold) st.textContent = hold.status === 'confirmed' ? 'Confirmed' : 'Held';
    }
    var _render = render; render = function () { _render(); syncCarry(); };
    var _showManage = showManage; showManage = function (m) { _showManage(m); syncCarry(); };

    /* --- boot --- */
    // A free hold lasts 48 hours. If it has lapsed, say so and start clean;
    // a confirmed hold is kept.
    renderPeaks();
    syncNav();
    // Booked: save the stay to a calendar, or copy the reference.
    document.getElementById('addCal').addEventListener('click', function () {
      if (!hold) return;
      var d = function (x) { x = new Date(x); return x.getFullYear() + String(x.getMonth() + 1).padStart(2, '0') + String(x.getDate()).padStart(2, '0'); };
      var P = PROPS[hold.prop || PROP];
      var ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Zo Hotel//Booking//EN', 'BEGIN:VEVENT',
        'UID:' + hold.ref + '@zohotel', 'DTSTAMP:' + d(new Date()) + 'T000000Z',
        'DTSTART;VALUE=DATE:' + d(hold.inDate), 'DTEND;VALUE=DATE:' + d(hold.outDate),
        'SUMMARY:' + P.name + ' \u00b7 ' + hold.ref, 'LOCATION:' + P.name + ', ' + P.place,
        'DESCRIPTION:Booking ' + hold.ref + '. Manage it on the Zo Hotel site.', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
      a.download = hold.ref + '.ics'; document.body.appendChild(a); a.click(); a.remove();
      toast('Calendar file saved. Open it to add your stay to your calendar.');
    });
    document.getElementById('copyRef').addEventListener('click', function () {
      if (!hold) return;
      var ref = hold.ref;
      copyText(ref, function (ok) { toast(ok ? 'Booking reference ' + ref + ' copied.' : 'Your booking reference is ' + ref + '.'); });
    });
    setProp(hold && hold.prop ? hold.prop : 'goa');
    if (hold && hold.status !== 'confirmed' && new Date(hold.expiresAt) < new Date()) {
      var lapsed = hold.ref; clear();
      drawCal(); render();
      say(el.holdErr, 'Hold ' + lapsed + ' expired after 48 hours. Nothing was charged. Choose dates to hold again.');
    } else {
      drawCal(); render();
      if (hold) showManage('Welcome back. Your booking is below.');
    }
  }());

  /* ----------------------------------------------------------------------
     3. The thread: a typing bubble before the desk's answer.
     -------------------------------------------------------------------- */
  (function thread () {
    document.querySelectorAll('.qa details').forEach(function (d) {
      d.addEventListener('toggle', function () {
        if (!d.open || reduce.matches) return;
        d.classList.add('is-typing');
        setTimeout(function () { d.classList.remove('is-typing'); }, 650);
      });
    });
  }());

  /* --- toast: one line, fades on its own, carries one Undo (§12b) --- */
  var toastTimer = null, toastUndoFn = null;
  function toast (msg, undo) {
    var t = document.getElementById('toast'), m = document.getElementById('toastMsg'), u = document.getElementById('toastUndo');
    if (!t) return;
    m.textContent = msg; toastUndoFn = undo || null; u.hidden = !undo;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hideToast, undo ? 9000 : 6000);
  }
  function hideToast () { var t = document.getElementById('toast'); if (t) t.hidden = true; toastUndoFn = null; }
  (function () {
    var u = document.getElementById('toastUndo'), x = document.getElementById('toastClose');
    if (u) u.addEventListener('click', function () { var f = toastUndoFn; hideToast(); if (f) f(); });
    if (x) x.addEventListener('click', hideToast);
  }());

  /* --- small utilities --- */
  function say (node, msg) { if (node) node.textContent = msg; }
  function escapeHTML (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function copyText (t, done) {
    function legacy () {
      var ta = document.createElement('textarea'); ta.value = t; ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;left:-9999px;top:0'; document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand('copy'); } catch (e) {}
      document.body.removeChild(ta); return ok;
    }
    // The async clipboard can stall forever in a background tab, so give
    // it 800 ms and then fall back to the synchronous copy.
    var settled = false;
    function finish (ok) { if (!settled) { settled = true; done(ok); } }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(function () { finish(true); }).catch(function () { finish(legacy()); });
      setTimeout(function () { if (!settled) finish(legacy()); }, 800);
    } else finish(legacy());
  }
}());
