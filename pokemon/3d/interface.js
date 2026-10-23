/* Accessible portfolio content is independent of the WebGL renderer. */
(() => {
  const data = window.KE_WORLD;
  if (!data?.places?.length) return;
  const places = data.places;
  const visited = new Set();
  const dialog = document.getElementById('place-dialog');
  const help = document.getElementById('help-dialog');
  const exhibitDialog = document.getElementById('exhibit-dialog');
  const journal = document.getElementById('journal-dialog');
  const backpack = document.getElementById('backpack-dialog');
  const list = document.getElementById('destination-list');
  const live = document.getElementById('live-status');
  let activePlace = null;
  let activeRoom = null;
  let exhibitPromise = null;
  const focusTargets = new WeakMap();
  const allModals = [dialog, help, exhibitDialog, journal, backpack];
  let exhibitSequence=[],exhibitIndex=0,activeExhibitId=null,journalFilter='all',discoveryTimer=null;
  function loadExhibits() {
    if (!exhibitPromise) exhibitPromise = import('./exhibits.js').then(m => m.EXHIBITS || {}).catch(() => ({}));
    return exhibitPromise;
  }
  function element(tag, className, text) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text) el.textContent = text;
    return el;
  }
  function announce(text) { live.textContent = text; }
  function showModal(modal) {
    const opening=!modal.open;
    if (!modal.open) { focusTargets.set(modal, document.activeElement); modal.showModal(); }
    document.dispatchEvent(new CustomEvent('world:pause'));
    if (opening&&!matchMedia('(prefers-reduced-motion: reduce)').matches) modal.animate([{opacity:0,transform:'translateY(10px) scale(.985)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:220,easing:'cubic-bezier(.23,1,.32,1)'});
  }
  function markVisited(id) {
    visited.add(id);
    updateJournal();
    document.getElementById('progress').textContent = `${visited.size} / ${places.length}`;
    for (const p of places) {
      const mark = document.querySelector(`[data-card="${p.id}"] .visited-mark`);
      if (mark) mark.textContent = visited.has(p.id) ? '✦ Visited' : '';
      document.querySelector(`[data-place="${p.id}"]`)?.classList.toggle('visited', visited.has(p.id));
    }
  }
  function addLink(container, href, label) {
    const a = element('a', '', label || 'Explore this work');
    a.href = href;
    if (/^https?:/.test(href)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    container.append(a);
  }
  function openExhibit(exhibit) {
    if (!exhibit) return;
    activeExhibitId=exhibit.id;
    updateExhibitNavigation(exhibit);
    const image = document.getElementById('exhibit-image');
    const credit = document.getElementById('exhibit-credit');
    image.hidden = !exhibit.image;
    image.onload = () => { image.hidden = false; };
    image.onerror = () => { image.hidden = true; credit.textContent = 'Image unavailable. The linked work is still available below.'; };
    image.alt = exhibit.alt || exhibit.title || 'A photograph or project from Ke’s portfolio';
    if (exhibit.image) image.src = exhibit.image; else image.removeAttribute('src');
    credit.textContent = exhibit.credit || '';
    document.getElementById('exhibit-title').textContent = exhibit.title || 'A closer look';
    document.getElementById('exhibit-kicker').textContent = exhibit.kind || (activeRoom ? places.find(p => p.id === activeRoom)?.title : 'From Ke’s field notes');
    document.getElementById('exhibit-description').textContent = exhibit.description || exhibit.body || '';
    const links = document.getElementById('exhibit-links');
    links.replaceChildren();
    document.getElementById('exhibit-return').textContent = dialog.open ? 'Back to this chapter ↗' : 'Back to exploring ↗';
    if (exhibit.href) addLink(links, exhibit.href, exhibit.label);
    else for (const link of exhibit.links || []) addLink(links, link.url || link.href, link.label);
    showModal(exhibitDialog);
    announce(`A closer look: ${exhibit.title}.`);
  }

  async function updateExhibitNavigation(exhibit) {
    const manifest=await loadExhibits();
    if(activeExhibitId!==exhibit.id)return;
    exhibitSequence=Object.values(manifest).find(items=>items.some(item=>item.id===exhibit.id))||[exhibit];
    exhibitIndex=Math.max(0,exhibitSequence.findIndex(item=>item.id===exhibit.id));
    document.getElementById('exhibit-position').textContent=`${String(exhibitIndex+1).padStart(2,'0')} / ${String(exhibitSequence.length).padStart(2,'0')} · In this room`;
    for(const id of ['exhibit-prev','exhibit-next'])document.getElementById(id).disabled=exhibitSequence.length<2;
    const strip=document.getElementById('exhibit-strip'),restoreThumbFocus=strip.contains(document.activeElement);strip.replaceChildren();strip.hidden=exhibitSequence.length<2;
    for(const item of exhibitSequence){
      const button=element('button','exhibit-thumb');button.type='button';button.setAttribute('aria-label',`View ${item.title}`);button.setAttribute('aria-current',String(item.id===exhibit.id));
      const img=document.createElement('img');img.src=item.image;img.alt='';img.width=68;img.height=46;button.append(img);
      button.addEventListener('click',()=>openExhibit(item));strip.append(button);
      if(restoreThumbFocus&&item.id===exhibit.id)button.focus({preventScroll:true});
    }
  }
  function stepExhibit(delta){if(exhibitSequence.length>1)openExhibit(exhibitSequence[(exhibitIndex+delta+exhibitSequence.length)%exhibitSequence.length]);}
  function updateJournal(){
    document.getElementById('journal-count').textContent=`${visited.size} / ${places.length}`;
    document.getElementById('passport-fill').style.width=`${visited.size/places.length*100}%`;
    let shown=0;
    for(const card of document.querySelectorAll('[data-journal-place]')){
      const seen=visited.has(card.dataset.journalPlace);
      card.classList.toggle('discovered',seen);
      card.querySelector('.journal-stamp').textContent=seen?'✓ Discovered':'Ready to explore';
      card.hidden=journalFilter==='new'?seen:journalFilter==='visited'?!seen:false;
      if(!card.hidden)shown++;
    }
    document.getElementById('journal-empty').hidden=shown>0;
    document.getElementById('journal-empty').textContent=journalFilter==='visited'?'Your discoveries will appear here. Choose a room to begin.':'You’ve explored every place. Revisit a favorite, or open the full portfolio.';
  }
  function buildJournal(){
    const container=document.getElementById('journal-places');
    for(const place of places){
      const card=element('article','journal-place');card.dataset.journalPlace=place.id;card.style.setProperty('--place-color',place.color);
      const preview=element('button','journal-preview');preview.type='button';preview.setAttribute('aria-label',`Explore inside ${place.title}`);
      const img=document.createElement('img');img.src=`./assets/rooms/${place.id}.webp`;img.alt=`Inside ${place.title}`;img.width=640;img.height=444;img.loading='lazy';
      preview.append(img,element('span','journal-preview-cta','Step inside ↗'));
      const enter=()=>{journal.close();walkTo(place.id);};preview.addEventListener('click',enter);
      const copy=element('div','journal-place-copy');copy.append(element('span','journal-stamp','Ready to explore'),element('h3','',place.title),element('p','',place.summary));
      const actions=element('div','journal-actions');const walk=element('button','journal-walk','Walk inside →');walk.addEventListener('click',enter);
      const read=element('button','','Read story');read.addEventListener('click',()=>visit(place.id));actions.append(walk,read);copy.append(actions);card.append(preview,copy);container.append(card);
    }
    updateJournal();
  }

  const companions=window.KE_COMPANIONS||[];
  const portraits=new Map(),picker=document.getElementById('companion-picker');
  let selectedBuddy='mri',preview=null,previewPromise=null;
  function partyState(){return window.KE_WORLD_SCENE?.getCompanions?.()||{mri:true};}
  function portraitNode(buddy){
    const src=portraits.get(buddy.id);
    if(src){const img=document.createElement('img');img.src=src;img.alt='';img.width=120;img.height=120;return img;}
    const symbol=element('span','buddy-symbol',buddy.symbol);symbol.setAttribute('aria-hidden','true');return symbol;
  }
  function updateSelectedBuddy(){
    const buddy=companions.find(item=>item.id===selectedBuddy)||companions[0];if(!buddy)return;
    const enabled=!!partyState()[buddy.id];
    document.getElementById('buddy-name').textContent=buddy.name;
    document.getElementById('buddy-kind').textContent=buddy.kind;
    document.getElementById('buddy-description').textContent=buddy.description;
    document.getElementById('buddy-toggle-text').textContent=enabled?'Put in backpack':'Take along';
    document.getElementById('buddy-toggle-icon').textContent=enabled?'−':'+';
    const toggle=document.getElementById('buddy-toggle');toggle.setAttribute('aria-pressed',String(enabled));toggle.disabled=!window.KE_WORLD_SCENE?.setCompanion;
    document.getElementById('buddy-preview').setAttribute('aria-label',`${buddy.name}, 3D view. Drag or use left and right arrows to turn.`);
    document.getElementById('buddy-preview-fallback').textContent=buddy.symbol;
    for(const button of picker.children){const active=button.dataset.buddy===buddy.id;button.classList.toggle('chosen',active);button.setAttribute('aria-pressed',String(active));}
  }
  function selectBuddy(id){selectedBuddy=id;updateSelectedBuddy();preview?.select(id);}
  function buildBag(){
    for(const buddy of companions){
      const button=element('button','bag-slot');button.type='button';button.dataset.buddy=buddy.id;button.style.setProperty('--buddy-color',buddy.color);button.setAttribute('aria-controls','buddy-name');
      const art=element('span','slot-art');art.append(portraitNode(buddy));
      button.append(art,element('span','slot-name',buddy.name),element('span','slot-state','In bag'));button.addEventListener('click',()=>selectBuddy(buddy.id));picker.append(button);
    }
  }
  function refreshParty(){
    const state=partyState(),active=companions.filter(b=>state[b.id]),count=active.length,ready=!!window.KE_WORLD_SCENE?.setCompanion;
    document.getElementById('party-count').textContent=count;
    document.getElementById('party-status-text').textContent=`${count} of ${companions.length}`;
    for(const button of picker.children){
      const following=!!state[button.dataset.buddy],buddy=companions.find(b=>b.id===button.dataset.buddy);
      button.classList.toggle('following',following);button.querySelector('.slot-state').textContent=following?'✓ Following':'In bag';button.setAttribute('aria-label',`${buddy.name}, ${following?'following you':'in backpack'}`);
    }
    const line=document.getElementById('party-line'),focusedId=document.activeElement?.dataset?.partyBuddy;line.replaceChildren();
    for(let i=0;i<companions.length;i++){
      const buddy=active[i],slot=element('button','party-friend');slot.type='button';
      if(buddy){slot.dataset.partyBuddy=buddy.id;slot.setAttribute('aria-label',`Put ${buddy.name} in backpack`);slot.append(portraitNode(buddy),element('span','party-name',buddy.name),element('span','party-remove','×'));slot.addEventListener('click',()=>{selectedBuddy=buddy.id;window.KE_WORLD_SCENE?.setCompanion?.(buddy.id,false);refreshParty();preview?.select(buddy.id);});}
      else{slot.disabled=true;slot.classList.add('empty');slot.setAttribute('aria-label','Empty companion place');slot.append(element('span','','·'));}
      line.append(slot);
    }
    document.getElementById('party-all').disabled=!ready||count===companions.length;
    document.getElementById('party-recall').disabled=!ready||count===0;
    document.getElementById('backpack-message').textContent=count?'Select a companion in this row to put it away.':'No companions out. Choose a friend above.';
    updateSelectedBuddy();
    if(focusedId)(line.querySelector(`[data-party-buddy="${focusedId}"]`)||document.getElementById('buddy-toggle')).focus({preventScroll:true});
  }
  async function prepareCompanionPreview(){
    if(preview){preview.resume();preview.select(selectedBuddy);return;}
    if(!previewPromise)previewPromise=import('./companion-preview.js').then(m=>m.createCompanionPreview(document.getElementById('buddy-preview'),images=>{
      for(const [id,src] of Object.entries(images))portraits.set(id,src);
      for(const button of picker.children){const buddy=companions.find(b=>b.id===button.dataset.buddy);button.querySelector('.slot-art').replaceChildren(portraitNode(buddy));}
      refreshParty();
    })).then(viewer=>{preview=viewer;document.getElementById('buddy-preview-fallback').hidden=true;backpack.classList.add('preview-ready');preview.select(selectedBuddy);if(!backpack.open)preview.pause();}).catch(()=>{
      previewPromise=null;document.getElementById('buddy-preview-fallback').textContent='Preview unavailable';
    });
    await previewPromise;
  }
  function openBackpack(){refreshParty();showModal(backpack);prepareCompanionPreview();}
  buildBag();refreshParty();
  document.getElementById('bag-toggle').addEventListener('click',openBackpack);
  document.getElementById('buddy-toggle').addEventListener('click',()=>{window.KE_WORLD_SCENE?.setCompanion?.(selectedBuddy,!partyState()[selectedBuddy]);refreshParty();});
  document.getElementById('party-all').addEventListener('click',()=>{for(const buddy of companions)window.KE_WORLD_SCENE?.setCompanion?.(buddy.id,true);refreshParty();});
  document.getElementById('party-recall').addEventListener('click',()=>{for(const buddy of companions)window.KE_WORLD_SCENE?.setCompanion?.(buddy.id,false);refreshParty();});
  document.getElementById('backpack-done').addEventListener('click',()=>{focusTargets.set(backpack,document.getElementById('world'));backpack.close();});
  document.getElementById('buddy-turn-left').addEventListener('click',()=>preview?.turn(-Math.PI/4));
  document.getElementById('buddy-turn-right').addEventListener('click',()=>preview?.turn(Math.PI/4));
  backpack.addEventListener('close',()=>preview?.pause());
  document.addEventListener('world:companions-changed',refreshParty);
  document.addEventListener('world:ready',refreshParty);
  function openJournal(){updateJournal();showModal(journal);}
  buildJournal();
  for(const filter of document.querySelectorAll('[data-journal-filter]'))filter.addEventListener('click',()=>{
    journalFilter=filter.dataset.journalFilter;
    for(const button of document.querySelectorAll('[data-journal-filter]'))button.setAttribute('aria-pressed',String(button===filter));
    updateJournal();
  });
  document.getElementById('exhibit-prev').addEventListener('click',()=>stepExhibit(-1));
  document.getElementById('exhibit-next').addEventListener('click',()=>stepExhibit(1));
  document.addEventListener('keydown',event=>{
    if(exhibitDialog.open&&['ArrowLeft','ArrowRight'].includes(event.key)){event.preventDefault();stepExhibit(event.key==='ArrowRight'?1:-1);}
    else if(event.key.toLowerCase()==='b'&&!allModals.some(m=>m.open)&&event.target===document.getElementById('world')){event.preventDefault();openBackpack();}
    else if(event.key.toLowerCase()==='j'&&!allModals.some(m=>m.open)&&event.target===document.getElementById('world')){event.preventDefault();openJournal();}
  });
  async function renderGallery(id) {
    const gallery = document.getElementById('place-gallery');
    gallery.replaceChildren(); gallery.hidden = true;
    const manifest = await loadExhibits();
    if (activePlace?.id !== id) return;
    for (const exhibit of manifest[id] || []) {
      if (!exhibit.image) continue;
      const button = element('button', 'gallery-piece');
      button.type = 'button'; button.setAttribute('aria-label', `Look closer: ${exhibit.title}`);
      const img = document.createElement('img');
      img.src = exhibit.image; img.alt = exhibit.alt || exhibit.title; img.loading = 'lazy'; img.decoding = 'async';
      button.append(img, element('span', '', exhibit.title));
      button.addEventListener('click', () => openExhibit(exhibit));
      gallery.append(button);
    }
    gallery.hidden = !gallery.children.length;
  }
  function setRoom(id) {
    const place = places.find(p => p.id === id);
    activeRoom = place?.id || null;
    document.body.classList.toggle('is-indoors', !!place);
    document.getElementById('room-toolbar').hidden = !place;
    if (place) {
      document.getElementById('room-name').textContent = place.title;
      document.getElementById('room-subtitle').textContent = 'Walk around. Select a picture to explore.';
      const firstVisit=!visited.has(id);markVisited(id);
      if(firstVisit){
        const toast=document.getElementById('discovery-toast');document.getElementById('discovery-name').textContent=place.title;
        toast.hidden=false;clearTimeout(discoveryTimer);discoveryTimer=setTimeout(()=>{toast.hidden=true;},3000);
      }
      announce(`Inside ${place.title}. Explore the pictures, or use Village to step outside.`);
    } else announce('Back in the village. Your MRI companion is with you.');
  }
  function setRoomLoading(title) {
    document.getElementById('room-loading').hidden = !title;
    if (title) document.getElementById('room-loading-text').textContent = `Opening ${title}…`;
  }
  function visit(id) {
    const place = places.find(p => p.id === id);
    if (!place) return;
    activePlace = place;
    markVisited(id);
    dialog.style.setProperty('--place-color', place.color || '#739a7e');
    document.getElementById('note-number').textContent = String(places.indexOf(place) + 1).padStart(2, '0');
    document.getElementById('place-kicker').textContent = place.kicker;
    document.getElementById('place-title').textContent = place.title;
    document.getElementById('place-summary').textContent = place.summary;
    document.getElementById('place-body').textContent = place.body;
    document.getElementById('place-badge').textContent = place.badge || 'A new chapter';
    const links = document.getElementById('place-links');
    links.replaceChildren();
    for (const link of place.links) {
      const a = element('a', '', link.label);
      a.href = link.url;
      if (/^https?:/.test(link.url)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
      links.append(a);
    }
    renderGallery(id);
    showModal(dialog);
    announce(`Field note: ${place.title}. ${visited.size} of ${places.length} places visited.`);
  }
  function walkTo(id) {
    if (window.KE_WORLD_SCENE?.ready) {
      window.scrollTo({top:0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
      document.getElementById('world').focus({preventScroll:true});
      window.KE_WORLD_SCENE.walkTo(id);
    } else visit(id);
  }
  places.forEach((place, index) => {
    const card = element('article', 'destination-card');
    card.dataset.card = place.id;
    card.style.setProperty('--place-color', place.color);
    card.append(element('span', 'card-number', String(index + 1).padStart(2, '0')), element('span', 'visited-mark'), element('h3', '', place.title), element('p', '', place.summary));
    const actions = element('div', 'card-actions');
    const read = element('button', 'read-note', 'Open field note ↗');
    read.addEventListener('click', () => visit(place.id));
    const walk = element('button', 'walk-there', 'Explore inside');
    walk.addEventListener('click', () => walkTo(place.id));
    actions.append(read, walk); card.append(actions); list.append(card);
  });
  document.getElementById('guide-toggle').addEventListener('click', openJournal);
  document.getElementById('help-button').addEventListener('click', () => showModal(help));
  document.getElementById('start-exploring').addEventListener('click', () => help.close());
  document.getElementById('leave-room').addEventListener('click', () => {
    window.KE_WORLD_SCENE?.exitInterior?.();
    document.getElementById('world').focus({preventScroll:true});
  });
  document.getElementById('room-story').addEventListener('click', () => { if (activeRoom) visit(activeRoom); });
  document.getElementById('exhibit-return').addEventListener('click', () => exhibitDialog.close());
  document.addEventListener('world:exhibit', event => openExhibit(event.detail));
  document.getElementById('next-place').addEventListener('click', () => {
    const next = places[(places.indexOf(activePlace) + 1) % places.length];
    dialog.close(); if(journal.open)journal.close(); walkTo(next.id);
  });
  allModals.forEach(modal => {
    modal.querySelector('.dialog-close').addEventListener('click', () => modal.close());
    modal.addEventListener('click', event => {
      if (event.target !== modal) return;
      const r = modal.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) modal.close();
    });
    modal.addEventListener('close', () => {
      const previous = focusTargets.get(modal);
      if (previous?.isConnected && previous.getClientRects().length && !previous.closest('[hidden]')) previous.focus({preventScroll:true});
      else {
        const remaining=[...allModals].reverse().find(item=>item.open);
        const fallback=remaining?.querySelector('[data-journal-filter][aria-pressed="true"]')||remaining?.querySelector('.dialog-close')||document.getElementById('world');
        fallback.focus({preventScroll:true});
      }
      if (!allModals.some(m => m.open)) document.dispatchEvent(new CustomEvent('world:resume'));
    });
  });
  window.KE_WORLD_UI = { visit, walkTo, announce, places, visited, setRoom, setRoomLoading, openExhibit };
  // The guide still works if a GPU is unavailable or the renderer fails to load.
  setTimeout(() => {
    if (!window.KE_WORLD_SCENE?.ready) {
      document.getElementById('loading').classList.add('loaded');
      document.getElementById('render-fallback').hidden = false;
    }
  }, 12000);
})();
