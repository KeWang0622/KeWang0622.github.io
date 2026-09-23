// ============ MAIN APP ============
const { useState: uS, useEffect: uE, useRef: uR, useMemo: uM } = React;

const APPS = [
  {id:'finder',title:'Ke’s HD',icon:Icons.Disk(40),kind:'finder',x:100,y:66,w:800,h:590,nopad:true},
  {id:'help',title:'Macintosh Guide',icon:Icons.Doc(40),kind:'help',x:220,y:100,w:480,h:390},
  {id:'research',title:'MRI Research',icon:Icons.Doc(40),kind:'research',x:150,y:100,w:530,h:470},
  { id:'about',    title:"About Ke",           icon: Icons.MacFace(40),   kind:'about',    x:410, y:65,  w:560, h:540 },
  { id:'pubs',     title:"Publications",       icon: Icons.Folder(40),    kind:'pubs',     x:360, y:65,  w:620, h:570 },
  { id:'metrics',  title:"Citation Metrics",   icon: Icons.Chooser(40),   kind:'metrics',  x:220, y:140, w:420, h:460 },
  { id:'collabs',  title:"Collaborators",      icon: Icons.Folder(40),    kind:'collabs',  x:360, y:80,  w:440, h:480 },
  { id:'cv',       title:"CV — Résumé",        icon: Icons.Doc(40),       kind:'cv',       x:200, y:90,  w:520, h:500 },
  { id:'career',   title:"Career & News",      icon: Icons.Doc(40),       kind:'career',   x:260, y:160, w:500, h:440 },
  { id:'press',    title:"Press",              icon: Icons.Scrapbook(40), kind:'press',    x:320, y:140, w:500, h:380 },
  { id:'services', title:"Academic Service",   icon: Icons.Doc(40),       kind:'services', x:360, y:200, w:420, h:340 },
  { id:'hobbies',  title:"Hobbies",            icon: Icons.Paint(40),     kind:'hobbies',  x:540, y:300, w:440, h:360 },
  { id:'paint',    title:"MacPaint — KW.pict", icon: Icons.Paint(40),     kind:'paint',    x:320, y:90,  w:400, h:380, nopad:true },
  { id:'calc',     title:"Calculator",         icon: Icons.Calc(40),      kind:'calc',     x:780, y:560, w:200, h:260, nopad:true },
  { id:'notepad',  title:"Note Pad",           icon: Icons.Notepad(40),   kind:'notepad',  x:860, y:420, w:330, h:260, nopad:true },
  { id:'about_mac',title:"About This Macintosh", icon: Icons.MacFace(40), kind:'about_mac',x:440, y:240, w:360, h:320, nopad:true },
  { id:'chooser',  title:"Chooser",            icon: Icons.Chooser(40),   kind:'chooser',  x:340, y:160, w:420, h:380 },
  { id:'terminal', title:"Terminal",           icon: Icons.Terminal(40),  kind:'terminal', x:620, y:260, w:460, h:300, nopad:true },
  { id:'alarm',    title:"Alarm Clock",        icon: Icons.Clock(40),     kind:'alarm',    x:80,  y:560, w:220, h:240, nopad:true },
];

const DESKTOP_ICONS = [
 {id:'disk',icon:Icons.Disk(40),label:'Ke’s HD',opens:'finder'},
 {id:'pubs_ic',icon:Icons.Folder(40),label:'Publications',opens:'pubs'},
 {id:'research_ic',icon:Icons.Doc(40),label:'MRI Notebook',opens:'research'},
 {id:'tools_ic',icon:Icons.Control(40),label:'Control Panel',opens:'tweaks'},
];

function AppBody({ kind, onOpen, query }){
  switch(kind){
    case 'finder': return <Finder onOpen={onOpen}/>;
    case 'help': return <Shortcuts/>;
    case 'research': return <ResearchLab/>;
    case 'about':     return <AboutMe/>;
    case 'pubs':      return <Publications initialQuery={query||''}/>;
    case 'metrics':   return <Metrics/>;
    case 'collabs':   return <Collaborators/>;
    case 'cv':        return <CV/>;
    case 'press':     return <Press/>;
    case 'services':  return <Services/>;
    case 'career':    return <Career/>;
    case 'hobbies':   return <Hobbies/>;
    case 'paint':     return <MacPaint/>;
    case 'calc':      return <Calculator/>;
    case 'notepad':   return <Notepad/>;
    case 'about_mac': return <AboutThisMac/>;
    case 'chooser':   return <Chooser/>;
    case 'terminal':  return <Terminal/>;
    case 'alarm':     return <Alarm/>;
    default: return null;
  }
}

function MenuBar({ onCmd, openIds }){
  const [open, setOpen] = uS(null);
  const [now, setNow] = uS(new Date());
  uE(()=>{ const t=setInterval(()=>setNow(new Date()),10000); return ()=>clearInterval(t); },[]);
  uE(()=>{
    const h = ()=> setOpen(null);
    window.addEventListener('click',h);
    return ()=>window.removeEventListener('click',h);
  },[]);
  const time = now.toLocaleTimeString([],{hour:'numeric',minute:'2-digit'});

  const menus = {
    apple: [
      ['About This Macintosh…','about_mac'],
      ['---'],
      ['Alarm Clock','alarm'],
      ['Calculator','calc'],
      ['Chooser','chooser'],
      ['Citation Metrics','metrics'],
      ['Collaborators','collabs'],
      ['Control Panels…','tweaks'],
      ['CV — Résumé','cv'],
      ['Note Pad','notepad'],
      ['Press','press'],
      ['Publications','pubs'],
      ['MRI Research','research'],
      ['Terminal','terminal'],
    ],
    File: [
      ['Open Ke’s HD','finder'],['Find…','launcher'],['New Note','new-window'],
      ['Open…','chooser'],
      ['---'],
      ['Close','close-active'],
      ['Close All','close-all'],
      ['---'],
      ['Print Résumé…','print'],
    ],
    View: [
      ['Large Icons','view-icon'],['Small Icons','view-smicon'],['---'],
      ['Arrange Windows','cleanup'],['Control Panel…','tweaks'],
    ],
    Special: [['Macintosh Guide','help'],['---'],['Restart','boot']],
    Windows: openIds.length ? openIds.map(([id,title])=>[title,'focus:'+id]) : [['No windows open',null,true]],
  };

  return (
    <div className="menubar">
      <div role="button" tabIndex={0} aria-label="Apple menu" onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setOpen(open==='apple'?null:'apple');}}} className={'apple keep '+(open==='apple'?'open':'')}
        onClick={(e)=>{e.stopPropagation(); setOpen(open==='apple'?null:'apple');}}
        style={{display:'flex',alignItems:'center',justifyContent:'center'}}>
        <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges">
          {/* Pixel-art cat logo */}
          {/* ears */}
          <rect x="2" y="2" width="2" height="2" fill="currentColor"/>
          <rect x="1" y="3" width="1" height="2" fill="currentColor"/>
          <rect x="4" y="3" width="1" height="1" fill="currentColor"/>
          <rect x="11" y="3" width="1" height="1" fill="currentColor"/>
          <rect x="12" y="2" width="2" height="2" fill="currentColor"/>
          <rect x="14" y="3" width="1" height="2" fill="currentColor"/>
          {/* head */}
          <rect x="2" y="4" width="12" height="8" fill="currentColor"/>
          {/* eyes (negative space) */}
          <rect x="5" y="7" width="2" height="2" fill="#fff"/>
          <rect x="9" y="7" width="2" height="2" fill="#fff"/>
          {/* pupils */}
          <rect x="6" y="7" width="1" height="2" fill="currentColor"/>
          <rect x="10" y="7" width="1" height="2" fill="currentColor"/>
          {/* nose */}
          <rect x="7" y="10" width="2" height="1" fill="#fff"/>
          {/* whiskers */}
          <rect x="0" y="10" width="2" height="1" fill="currentColor"/>
          <rect x="14" y="10" width="2" height="1" fill="currentColor"/>
          {/* chin */}
          <rect x="3" y="12" width="10" height="1" fill="currentColor"/>
        </svg>
      </div>
      {open==='apple' && (
        <div className="menu-drop" style={{left:0}}>
          {menus.apple.map((r,i)=> r[0]==='---' ?
            <div key={i} className="sep"/> :
            <div key={i} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter'){setOpen(null);onCmd(r[1]);}}} className="row" onClick={()=>{setOpen(null); onCmd(r[1]);}}>
              <span>{r[0]}</span></div>
          )}
        </div>
      )}
      {Object.keys(menus).filter(k=>k!=='apple').map(k=>(
        <div key={k} role="button" tabIndex={0} aria-expanded={open===k} onKeyDown={e=>{if(e.target===e.currentTarget&&(e.key==='Enter'||e.key===' ')){e.preventDefault();setOpen(open===k?null:k);}}} className={'item '+((['File','Windows'].includes(k))?'keep ':'')+(open===k?'open':'')}
          onClick={(e)=>{e.stopPropagation(); setOpen(open===k?null:k);}}>
          {k}
          {open===k && (
            <div className="menu-drop">
              {menus[k].map((r,i)=> r[0]==='---' ?
                <div key={i} className="sep"/> :
                <div key={i} role="button" tabIndex={r[2]?-1:0} onKeyDown={e=>{if(e.key==='Enter'&&!r[2]){setOpen(null);onCmd(r[1]);}}} className={'row '+(r[2]?'dis':'')}
                  onClick={()=>{ if(r[2])return; setOpen(null); onCmd(r[1]); }}>
                  <span>{r[0]}</span>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      <div className="spacer"/>
      <div className="item keep" onClick={(e)=>{e.stopPropagation(); onCmd('help');}}>?</div>
      <div className="clock keep">{time}</div>
    </div>
  );
}

function Tweaks({ onClose, onCmd, tweaks, setTweaks }){
  return (
    <div style={{padding:12}}>
      <div style={{fontSize:14,marginBottom:8}}>Control Panel — personalize your Macintosh.</div>
      <div className="tweaks-win">
        <label>Desktop pattern</label>
        <div className="seg">
          {['studio','dots','checker','solid'].map(p=>(
            <button key={p} className={tweaks.pattern===p?'sel':''}
              onClick={()=>setTweaks(t=>({...t,pattern:p}))}>{p}</button>
          ))}
        </div>
        <label>Color mode</label>
        <div className="seg">
          {['B&W','Sepia','Invert'].map(p=>(
            <button key={p} className={tweaks.mode===p?'sel':''}
              onClick={()=>setTweaks(t=>({...t,mode:p}))}>{p}</button>
          ))}
        </div>
        <label>Text size</label>
        <div className="seg">
          {['S','M','L'].map(p=>(
            <button key={p} className={tweaks.zoom===p?'sel':''}
              onClick={()=>setTweaks(t=>({...t,zoom:p}))}>{p}</button>
          ))}
        </div>
        <label>CRT flicker</label>
        <div className="seg">
          {[['off',false],['on',true]].map(([l,v])=>(
            <button key={l} className={tweaks.crt===v?'sel':''}
              onClick={()=>setTweaks(t=>({...t,crt:v}))}>{l}</button>
          ))}
        </div>
        <div style={{marginTop:14, fontSize:11}}>
          Tip: press ⌘K for the launcher.
        </div>
      </div>
    </div>
  );
}

function Launcher({ onClose, onOpen }){
 const [q,setQ]=uS('');
 const terms=q.trim().toLowerCase().split(/\s+/).filter(Boolean);
 const apps=APPS.filter(a=>terms.every(t=>a.title.toLowerCase().includes(t))).map(a=>({id:a.id,label:a.title,type:'Application'}));
 const papers=terms.length?window.KW_DATA.publications.filter(p=>terms.every(t=>(p.title+' '+p.authors+' '+p.venue).toLowerCase().includes(t))).map(p=>({id:'pubs',query:p.title,label:p.title,type:p.venue+' · '+p.year})):[];
 const results=[...apps,...papers];
 const open=r=>{onOpen(r.id,r.query);onClose();};
 return <div className="search-shade" onClick={onClose}><section role="dialog" aria-modal="true" aria-label="Find on Macintosh" className="mac-search" onClick={e=>e.stopPropagation()}><div className="search-title">Find on Macintosh <button onClick={onClose}>Esc</button></div><input autoFocus aria-label="Find applications and papers" placeholder="Try “MRI”, “PhotoFramer”, or “calculator”…" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&results.length)open(results[0]);}}/><div className="search-results">{results.map(r=><button key={r.id+r.label} onClick={()=>open(r)}>{r.query?<Icons.FolderSm/>:Icons.MacFace(20)}<span>{r.label}<small>{r.type}</small></span><span>↵</span></button>)}{!results.length&&<p>No matches. Try a title, author, venue or app name.</p>}</div><footer>{results.length} results <span>Enter opens the first result · Esc closes</span></footer></section></div>;
}

function Boot({ onDone }){
  const [stage, setStage] = uS(0);
  uE(()=>{
    const t1 = setTimeout(()=>setStage(1), 250);
    const t2 = setTimeout(()=>setStage(2), 600);
    const t3 = setTimeout(onDone, 950);
    return ()=>{ clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  },[]);
  return (
    <div className="boot">
      <div className="sm">
        <div className="face">{stage<2 ? '☺' : '☻'}</div>
      </div>
      <div className="caption">
        {stage===0 && 'Starting Ke\'s Macintosh…'}
        {stage===1 && 'Welcome to Macintosh'}
        {stage===2 && 'Ready.'}
      </div>
    </div>
  );
}

function App(){
  const wm = useWindows();
  const [booted, setBooted] = uS(()=>{try{return sessionStorage.getItem('kw-booted')==='1';}catch{return false;}});
  const [selDesk, setSelDesk] = uS(null);
  const [launcher, setLauncher] = uS(false);
  const [tweaks, setTweaks] = uS(()=>{try{return {...{pattern:'studio',mode:'B&W',zoom:'M',crt:false},...JSON.parse(localStorage.getItem('kw-display')||'{}')};}catch{return {pattern:'studio',mode:'B&W',zoom:'M',crt:false};}});
  uE(()=>{try{localStorage.setItem('kw-display',JSON.stringify(tweaks));}catch{}},[tweaks]);
  const [iconSize,setIconSize]=uS('large');
  const [tweaksOn, setTweaksOn] = uS(false);
  const [trashFull, setTrashFull] = uS(false);
  const [vw, setVw] = uS(typeof window!=='undefined'?window.innerWidth:1200);

  uE(()=>{
    const h = ()=>setVw(window.innerWidth);
    window.addEventListener('resize',h);
    return ()=>window.removeEventListener('resize',h);
  },[]);

  // keyboard shortcuts
  uE(()=>{
    const h = (e) => {
      if((e.metaKey||e.ctrlKey) && e.key==='k'){ e.preventDefault(); setLauncher(true); }
      if(e.key==='Escape'){ setLauncher(false); }
      if((e.metaKey||e.ctrlKey) && e.key==='w'){ e.preventDefault(); if(wm.active) wm.close(wm.active); }
    };
    window.addEventListener('keydown',h);
    return ()=>window.removeEventListener('keydown',h);
  },[wm]);

  // edit mode wiring
  uE(()=>{
    const h = (e)=>{
      if(!e.data||typeof e.data!=='object') return;
      if(e.data.type==='__activate_edit_mode'){ setTweaksOn(true); openApp('tweaks'); }
      if(e.data.type==='__deactivate_edit_mode') setTweaksOn(false);
    };
    window.addEventListener('message',h);
    window.parent.postMessage({type:'__edit_mode_available'},'*');
    return ()=>window.removeEventListener('message',h);
  },[]);

  // open default windows after boot
  uE(()=>{
    if(!booted) return;
    const isMobile = window.innerWidth < 820;
    if(isMobile) return; // mobile shows clean desktop
    openApp('finder');
  },[booted]);

  const openApp = (id, query) => {
    if(!id) return;
    if(id.startsWith && id.startsWith('focus:')){ wm.focus(id.slice(6)); return; }
    if(id==='new-window'){
      const nid = 'note_'+Date.now();
      wm.open({ id:nid, title:'Untitled — Note Pad', kind:'notepad', x:200+Math.random()*200, y:100+Math.random()*100, w:320, h:260, nopad:true });
      return;
    }
    if(id==='print'){ window.print(); return; }
    if(id==='edit-undo'){ document.execCommand('undo'); return; }
    if(id==='edit-cut'){ document.execCommand('cut'); return; }
    if(id==='edit-copy'){ document.execCommand('copy'); return; }
    if(id==='edit-paste'){ document.execCommand('paste'); return; }
    if(id==='edit-selectall'){ document.execCommand('selectAll'); return; }
    if(id==='cleanup'){ wm.wins.forEach((w,i)=>wm.update(w.id,{x:40+i*28,y:50+i*28})); return; }
    if(id==='erase'){ alert('Nice try. This disk is bolted down.'); return; }
    if(id==='view-icon' || id==='view-smicon'){setIconSize(id==='view-icon'?'large':'small');return;}
    if(id==='tweaks'){
      const existing = wm.wins.find(w=>w.id==='tweaks');
      if(existing){ wm.focus('tweaks'); return; }
      wm.open({ id:'tweaks', title:'Control Panel', kind:'tweaks', x:360, y:120, w:380, h:320 });
      return;
    }
    if(id==='launcher'){ setLauncher(true); return; }
    if(id==='close-active'){ if(wm.active) wm.close(wm.active); return; }
    if(id==='close-all'){ wm.wins.forEach(w=>wm.close(w.id)); return; }
    if(id==='shutdown'){ if(confirm('Shut down Ke\'s Macintosh?')) document.body.style.background='#000'; return; }
    if(id==='boot'){wm.wins.forEach(w=>wm.close(w.id));setBooted(false);return;}
    if(id==='trash'){ setTrashFull(false); alert('Trash emptied. ✓'); return; }
    if(id==='balloon'){ alert('Ke\'s Macintosh · September 2026\nHead of Applied Research, Pika Labs.\nPress ⌘K to launch things. Drag windows by their title bars.'); return; }
    const def = APPS.find(a=>a.id===id);
    if(!def) return;
    wm.open({...def,query,w:Math.min(def.w,window.innerWidth-36),h:Math.min(def.h,window.innerHeight-100),x:Math.max(18,Math.min(def.x,window.innerWidth-def.w-24)),y:Math.max(36,Math.min(def.y,window.innerHeight-def.h-60))});
  };

  // resolve right-N positions
  const resolveX = (x) => {
    if(typeof x==='string' && x.startsWith('right-')) return vw - parseInt(x.slice(6),10) - 72;
    return x;
  };

  const deskBg = {
    studio: '#aebdbb',
    dots: 'repeating-conic-gradient(#b8b8b0 0% 25%, #d8d8d0 0% 50%)',
    checker: 'repeating-conic-gradient(#000 0% 25%, #fff 0% 50%)',
    lines: 'repeating-linear-gradient(45deg, #000 0 1px, #fff 1px 4px)',
    solid: '#a5a5a5',
  }[tweaks.pattern];
  const deskSize = tweaks.pattern==='dots'?'2px 2px': tweaks.pattern==='checker'?'8px 8px':'auto';

  const modeFilter = 'none';
  uE(()=>{
    document.documentElement.setAttribute('data-mode', tweaks.mode||'B&W');
  },[tweaks.mode]);
  const zoomScale = tweaks.zoom==='S'?0.85:tweaks.zoom==='L'?1.15:1;

  const isMobile = vw < 820;

  return (
    <div style={{filter:modeFilter}} className={tweaks.crt?'crt':''}>
      {!booted && <Boot onDone={()=>{setBooted(true);try{sessionStorage.setItem("kw-booted","1");}catch{}}}/>}

      <MenuBar onCmd={openApp} openIds={wm.wins.map(w=>[w.id, w.title])}/>

      <div className="desktop"
        style={{
          background: deskBg, backgroundSize: deskSize,
          '--reading-size': tweaks.zoom==='L'?'15px':tweaks.zoom==='S'?'12px':'13px',
          paddingTop:22,
        }}
        onClick={()=>setSelDesk(null)}>

        <div className="desktop-signature" aria-hidden="true"><span>KW / PERSONAL COMPUTER</span><b>Ideas live here.</b><small>IMAGING · INTELLIGENCE · DISCOVERY</small></div>
        {/* Desktop icons */}
        <div className={"desk-grid "+(iconSize==='small'?'small-icons':'')}>
          {DESKTOP_ICONS.map(ic=>(
            <DeskIcon key={ic.id}
              x={0} y={0}
              icon={ic.icon}
              label={ic.label}
              selected={selDesk===ic.id}
              onSelect={()=>setSelDesk(ic.id)}
              onOpen={()=>openApp(ic.opens)}/>
          ))}
        </div>

        {/* Trash */}
        <div className="trash"
          style={{ right:24, bottom:24 }}
          onDoubleClick={()=>openApp('trash')}>
          {Icons.Trash()}
          <div className="lbl">Trash</div>
        </div>

        {/* Windows */}
        {wm.wins.map(w=>(
          <Window key={w.id} win={w}
            active={wm.active===w.id}
            mobileActive={wm.active===w.id}
            onFocus={()=>wm.focus(w.id)}
            onClose={()=>wm.close(w.id)}
            onMove={(x,y)=>wm.update(w.id,{x,y})}
            onResize={(ww,hh)=>wm.update(w.id,{w:ww, h:hh})}>
            {w.id==='tweaks'
              ? <Tweaks tweaks={tweaks} setTweaks={setTweaks} onClose={()=>wm.close('tweaks')} onCmd={openApp}/>
              : <AppBody kind={w.kind} onOpen={openApp} query={w.query}/>}
          </Window>
        ))}

        {launcher && <Launcher onClose={()=>setLauncher(false)} onOpen={openApp}/>}
      </div>

      {/* Mobile dock: shows only on narrow screens via CSS */}
      <div className="mobile-dock">
        {wm.wins.length===0 && (
          <div style={{padding:'8px 12px', fontSize:11, color:'#666'}}>
            Tap ☰ to open an app →
          </div>
        )}
        {wm.wins.map(w=>{
          const def = APPS.find(a=>a.id===w.id) || {};
          const isActive = wm.active===w.id;
          return (
            <div key={w.id} className={'dtab '+(isActive?'active':'')}
              onClick={()=>wm.focus(w.id)}>
              {def.icon ? <div style={{width:24,height:24,display:'flex',alignItems:'center',justifyContent:'center'}}>
                {React.cloneElement(def.icon,{width:24,height:24})}
              </div> : <Icons.FolderSm/>}
              <div className="lbl">{w.title.split('—')[0].trim()}</div>
              <div className="x" onClick={(e)=>{e.stopPropagation(); wm.close(w.id);}}>×</div>
            </div>
          );
        })}
      </div>
      <div className="mobile-launcher" onClick={()=>setLauncher(true)}>☰</div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
