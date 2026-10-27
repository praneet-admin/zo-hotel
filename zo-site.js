/* ZO Hotel booking and cancellation behaviour. Ported from the published
   artifact c353ff0e. No backend: nothing leaves the browser. */
(function(){
  "use strict";
  /* Verified project data from zo-content.js — nothing here is invented. */
  var PROPERTIES={
    mumbai:{name:"ZO Hotel Mumbai",area:"near Marine Lines, South Mumbai",code:"MUM",from:6999},
    goa:{name:"ZO Hotel Goa",area:"near Baga Beach, North Goa",code:"GOA",from:9499}
  };
  var ROOMS={
    city:{name:"City Comfort Room",price:6999,maxGuests:2},
    business:{name:"Business Room",price:8499,maxGuests:2},
    family:{name:"Family Room",price:9999,maxGuests:4},
    resort:{name:"Resort View Room",price:12499,maxGuests:3}
  };
  var $=function(i){return document.getElementById(i)};
  var fProp=$("fProp"),fIn=$("fIn"),fOut=$("fOut"),fGuests=$("fGuests");
  var state={room:"business",nights:0,booked:false,ref:"",prev:null};

  function money(n){return "₹"+Math.round(n).toLocaleString("en-IN")}
  function iso(d){return d.toISOString().slice(0,10)}
  /* AP style, month first: Aug. 21, 2026 (guide §11) */
  var MON=["Jan.","Feb.","March","April","May","June","July","Aug.","Sept.","Oct.","Nov.","Dec."];
  function pretty(s){if(!s)return "—";var d=new Date(s+"T00:00:00");return MON[d.getMonth()]+" "+d.getDate()+", "+d.getFullYear()}
  /* Under ten spelled out, ten and above numerals (guide §11) */
  var WORDS=["zero","one","two","three","four","five","six","seven","eight","nine"];
  function num(n){return n<10?WORDS[n]:String(n)}

  var today=new Date(),s0=new Date(today.getTime()+14*864e5),e0=new Date(s0.getTime()+3*864e5);
  fIn.value=iso(s0);fOut.value=iso(e0);fIn.min=iso(today);fOut.min=iso(new Date(today.getTime()+864e5));

  function nights(){var a=new Date(fIn.value),b=new Date(fOut.value),n=Math.round((b-a)/864e5);return (isFinite(n)&&n>0)?n:0}

  function recalc(){
    state.nights=nights();
    var r=ROOMS[state.room], total=r.price*state.nights, g=parseInt(fGuests.value,10);
    $("quoteTitle").textContent=r.name+" · "+PROPERTIES[fProp.value].name;
    $("quoteTotal").textContent=money(total);
    if(state.nights>0){
      var w=state.nights===1?"night":"nights";
      $("quoteDates").textContent=pretty(fIn.value)+" – "+pretty(fOut.value);
      $("quoteBreak").textContent="Total for your stay · "+num(state.nights)+" "+w+" at "+money(r.price)+" per night";
      $("stayNote").innerHTML="<span><b>"+PROPERTIES[fProp.value].name+"</b>, "+PROPERTIES[fProp.value].area+"</span>"+
        "<span>"+num(state.nights)+" "+w+" from <b>"+money(PROPERTIES[fProp.value].from*state.nights)+"</b></span>"+
        "<span>Taxes and fees are not included in this demo.</span>";
    } else {
      $("quoteDates").textContent="";
      $("quoteBreak").textContent="Total for your stay";
      $("stayNote").innerHTML='<span class="err">Choose a check-out date after your check-in date.</span>';
    }
    var overCap=g>r.maxGuests;
    if(overCap && state.nights>0){
      $("stayNote").innerHTML='<span class="err">This room sleeps up to '+num(r.maxGuests)+' guests. Choose a larger room or reduce the guest count.</span>';
    }
    $("reserveBtn").disabled=(state.nights===0||overCap);
    [].forEach.call(document.querySelectorAll(".room"),function(el){
      var on=el.getAttribute("data-room")===state.room;
      el.classList.toggle("is-picked",on);
      var pb=el.querySelector("[data-pick]");
      if(!pb.getAttribute("data-label"))pb.setAttribute("data-label",pb.textContent);
      pb.textContent=on?"Selected":pb.getAttribute("data-label");
    });
  }
  [fProp,fOut,fGuests].forEach(function(el){el.addEventListener("change",recalc)});
  fIn.addEventListener("change",function(){
    if(new Date(fOut.value)<=new Date(fIn.value))fOut.value=iso(new Date(new Date(fIn.value).getTime()+864e5));
    recalc();
  });
  $("bookForm").addEventListener("submit",function(e){e.preventDefault();recalc();$("rooms").scrollIntoView({behavior:"smooth",block:"start"})});
  [].forEach.call(document.querySelectorAll("[data-pick]"),function(b){
    b.addEventListener("click",function(){state.room=b.getAttribute("data-pick");recalc();$("quote").scrollIntoView({behavior:"smooth",block:"center"})});
  });
  [].forEach.call(document.querySelectorAll("[data-jump]"),function(a){
    a.addEventListener("click",function(){state.room=a.getAttribute("data-jump");recalc()});
  });
  [].forEach.call(document.querySelectorAll("[data-dest]"),function(b){
    b.addEventListener("click",function(){
      fProp.value=b.getAttribute("data-dest");
      state.room=(fProp.value==="goa")?"resort":"business";
      recalc();$("rooms").scrollIntoView({behavior:"smooth",block:"start"});
    });
  });

  /* Toast: fades on its own, carries one Undo (guide §12b) */
  var tt,undoFn=null;
  function toast(msg,undo){
    $("toastMsg").textContent=msg;
    undoFn=undo||null;
    $("toastUndo").hidden=!undo;
    $("toast").hidden=false;
    clearTimeout(tt);tt=setTimeout(function(){$("toast").hidden=true;undoFn=null},12000);
  }
  $("toastUndo").addEventListener("click",function(){if(undoFn){undoFn();$("toast").hidden=true;undoFn=null}});

  $("reserveBtn").addEventListener("click",function(){
    var r=ROOMS[state.room];
    state.ref="ZO-"+PROPERTIES[fProp.value].code+"-"+(Math.floor(Math.random()*9000)+1000);
    $("confRef").textContent=state.ref;
    $("confDates").textContent=pretty(fIn.value)+" – "+pretty(fOut.value);
    $("confTotal").textContent=money(r.price*state.nights);
    $("quoteBody").hidden=true;$("confirmation").hidden=false;state.booked=true;
    $("quoteDates").textContent=PROPERTIES[fProp.value].name;
    toast("Your stay is confirmed. We created booking "+state.ref+".");
    $("confirmation").scrollIntoView({behavior:"smooth",block:"center"});
  });
  function backToQuote(){$("quoteBody").hidden=false;$("confirmation").hidden=true;state.booked=false;recalc()}

  $("changeBtn").addEventListener("click",function(){
    state.prev={inD:fIn.value,outD:fOut.value};
    backToQuote();$("book").scrollIntoView({behavior:"smooth",block:"center"});fIn.focus();
    toast("Pick your new dates. Your booking stays open.");
  });
  $("compareBtn").addEventListener("click",function(){$("destinations").scrollIntoView({behavior:"smooth",block:"start"})});

  /* ---- reconsideration prompt ---- */
  var scrim=$("scrim"),lastFocus=null,exitShown=false,mode="dates";
  var PROMPTS={
    dates:{eyebrow:"Your journey can still happen",heading:"Change your dates instead",
      message:"Change your dates and keep the stay. Pick dates that fit your new plans, or switch between Mumbai and Goa.",
      opts:[["Compare Destinations","destinations"],["Compare Rooms","rooms"]],cta:"Change My Dates",act:"dates"},
    visit:{eyebrow:"Two ways to ZO",heading:"Compare Mumbai and Goa before you go",
      message:"Compare the two destinations and see which rhythm suits your trip. Mumbai keeps you connected to the city; Goa sets a slower coastal pace.",
      opts:[["Explore Mumbai","destinations"],["Explore Goa","destinations"]],cta:"Compare Mumbai and Goa",act:"destinations"}
  };
  function openModal(kind){
    mode=kind;lastFocus=document.activeElement;
    var p=PROMPTS[kind];
    $("mEyebrow").textContent=p.eyebrow;
    $("mTitle").textContent=p.heading;
    $("mMsg").textContent=p.message;
    $("mPrimary").textContent=p.cta;
    var box=$("mOpts");box.innerHTML="";
    p.opts.forEach(function(o){
      var b=document.createElement("button");
      b.type="button";b.className="btn btn--ghost";b.textContent=o[0];
      b.addEventListener("click",function(){closeModal();$(o[1]).scrollIntoView({behavior:"smooth",block:"start"})});
      box.appendChild(b);
    });
    $("mContinue").hidden=(kind!=="dates");
    $("mBack").textContent=(kind==="dates")?"Return to Booking":"Keep Looking";
    scrim.hidden=false;$("mPrimary").focus();document.addEventListener("keydown",onKey);
  }
  function closeModal(){scrim.hidden=true;document.removeEventListener("keydown",onKey);if(lastFocus&&lastFocus.focus)lastFocus.focus()}
  function onKey(e){
    if(e.key==="Escape"){closeModal();return}
    if(e.key!=="Tab")return;
    var f=[].filter.call(scrim.querySelectorAll("button"),function(x){return !x.hidden&&x.offsetParent!==null});
    if(!f.length)return;
    var first=f[0],last=f[f.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  }
  $("cancelBtn").addEventListener("click",function(){openModal("dates")});
  scrim.addEventListener("click",function(e){if(e.target===scrim)closeModal()});
  $("mBack").addEventListener("click",closeModal);
  $("mPrimary").addEventListener("click",function(){
    closeModal();
    if(mode==="dates"){
      backToQuote();$("book").scrollIntoView({behavior:"smooth",block:"center"});fIn.focus();
      toast("Your booking is open. Pick the dates that fit your new plans.");
    } else {
      $("destinations").scrollIntoView({behavior:"smooth",block:"start"});
    }
  });
  /* Continue cancellation stays visible and enabled at all times (guide §13) */
  $("mContinue").addEventListener("click",function(){
    closeModal();
    var ref=state.ref;
    backToQuote();
    toast("Booking "+ref+" is canceled in this demo. Any real refund would follow the policy attached to it.");
  });
  document.addEventListener("mouseout",function(e){
    if(exitShown||!scrim.hidden||state.booked)return;
    if(e.relatedTarget||e.clientY>6)return;
    exitShown=true;openModal("visit");
  });

  [].forEach.call(document.querySelectorAll(".faq__q"),function(q){
    q.addEventListener("click",function(){
      var i=q.parentNode,open=i.classList.toggle("is-open");
      q.setAttribute("aria-expanded",open?"true":"false");
      q.nextElementSibling.hidden=!open;
    });
  });

  var links=$("navLinks"),toggle=$("navToggle");
  function sizeNav(){
    if(window.innerWidth>960){links.hidden=false;toggle.setAttribute("aria-expanded","false")}
    else if(toggle.getAttribute("aria-expanded")!=="true"){links.hidden=true}
  }
  toggle.addEventListener("click",function(){
    var open=toggle.getAttribute("aria-expanded")==="true";
    toggle.setAttribute("aria-expanded",open?"false":"true");links.hidden=open;
  });
  [].forEach.call(links.querySelectorAll("a"),function(a){
    a.addEventListener("click",function(){if(window.innerWidth<=960){links.hidden=true;toggle.setAttribute("aria-expanded","false")}});
  });
  window.addEventListener("resize",sizeNav);sizeNav();

  var spy=[].map.call(links.querySelectorAll("a"),function(a){return{a:a,el:document.querySelector(a.getAttribute("href"))}}).filter(function(x){return x.el});
  if("IntersectionObserver" in window){
    var io=new IntersectionObserver(function(en){
      en.forEach(function(x){if(!x.isIntersecting)return;
        spy.forEach(function(s){s.a.classList.toggle("is-active",s.el===x.target)});
      });
    },{rootMargin:"-45% 0px -50% 0px"});
    spy.forEach(function(s){io.observe(s.el)});
  }
  recalc();
})();

/* ==========================================================================
   Hero slider. Separate IIFE so it cannot touch the booking state above.
   Advances on its own, pauses on hover or focus, and stops entirely for
   anyone who prefers reduced motion — the first frame still shows.
   ========================================================================== */
(function () {
  'use strict';
  var wrap = document.getElementById('heroSlides');
  var dots = document.getElementById('heroDots');
  if (!wrap || !dots) return;

  var slides = [].slice.call(wrap.querySelectorAll('.hero__slide'));
  var buttons = [].slice.call(dots.querySelectorAll('button'));
  if (slides.length < 2 || slides.length !== buttons.length) return;

  var at = 0, timer = null;
  var still = window.matchMedia('(prefers-reduced-motion: reduce)');

  function show(n) {
    at = (n + slides.length) % slides.length;
    slides.forEach(function (s, i) { s.classList.toggle('is-on', i === at); });
    buttons.forEach(function (b, i) {
      b.classList.toggle('is-on', i === at);
      b.setAttribute('aria-current', i === at ? 'true' : 'false');
    });
  }
  function play() {
    if (still.matches) return;
    stop();
    timer = setInterval(function () { show(at + 1); }, 6500);
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }

  buttons.forEach(function (b, i) {
    b.addEventListener('click', function () { show(i); if (!paused) play(); });
  });

  /* WCAG 2.2.2: anything that moves on its own for more than five seconds
     needs a way to stop it, and the choice has to stick. */
  var paused = false, pauseBtn = document.getElementById('heroPause');
  if (pauseBtn) {
    var label = pauseBtn.querySelector('.hero__pause-t');
    pauseBtn.addEventListener('click', function () {
      paused = !paused;
      pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
      if (label) label.textContent = paused ? 'Play' : 'Pause';
      if (paused) stop(); else play();
    });
  }

  var hero = wrap.closest('.hero') || wrap;
  hero.addEventListener('mouseenter', stop);
  hero.addEventListener('mouseleave', function () { if (!paused) play(); });
  hero.addEventListener('focusin', stop);
  hero.addEventListener('focusout', function () { if (!paused) play(); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else if (!paused) play();
  });
  if (still.addEventListener) still.addEventListener('change', function () {
    if (still.matches) stop(); else if (!paused) play();
  });

  show(0);
  play();
})();

/* ==========================================================================
   The ZO Circle. Separate IIFE; nothing here touches the booking state.
   Client-side only: the address is validated, echoed back, and discarded.
   ========================================================================== */
(function () {
  'use strict';
  var form = document.getElementById('circleForm');
  if (!form) return;
  var field = document.getElementById('cEmail');
  var note = document.getElementById('circleNote');

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var value = field.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      /* Guide §9: say what happened and how to fix it. */
      note.innerHTML = '<span class="err">Add an email address, like you@example.com.</span>';
      field.focus();
      return;
    }
    note.textContent = "You're on the list. ZO Return Guest updates will go to "
      + value + ". Nothing is stored beyond this browser.";
    form.reset();
  });
})();
