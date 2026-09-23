// ============ WINDOW MANAGER ============
const { useState, useEffect, useRef, useCallback, useMemo } = React;

const WinCtx = React.createContext(null);

function useWindows(){
  const [wins, setWins] = useState([]);
  const [zTop, setZTop] = useState(10);
  const [active, setActive] = useState(null);

  const open = useCallback((def) => {
    setWins(prev => {
      const existing = prev.find(w => w.id === def.id);
      if(existing){
        setZTop(z => z+1);
        setActive(def.id);
        return prev.map(w => w.id===def.id ? {...w, ...(def.query!==undefined?{query:def.query}:{}), z: zTop+1, minimized:false} : w);
      }
      const newZ = zTop+1;
      setZTop(newZ);
      setActive(def.id);
      return [...prev, { ...def, z:newZ, minimized:false }];
    });
  },[zTop]);

  const close = useCallback((id) => {
    setWins(prev => {const next=prev.filter(w=>w.id!==id);setActive(a=>a===id?(next.slice().sort((a,b)=>b.z-a.z)[0]?.id||null):a);return next;});
  },[]);

  const focus = useCallback((id) => {
    setZTop(z => {
      const nz = z+1;
      setWins(prev => prev.map(w => w.id===id ? {...w, z: nz, minimized:false} : w));
      return nz;
    });
    setActive(id);
  },[]);

  const update = useCallback((id, patch) => {
    setWins(prev => prev.map(w => w.id===id ? {...w, ...patch} : w));
  },[]);

  return { wins, open, close, focus, update, active };
}

// ============ DRAGGABLE/RESIZABLE WINDOW ============
function Window({ win, children, onFocus, onClose, onMove, onResize, active, mobileActive }){
  const ref = useRef(null);
  const drag = useRef(null);
  const rez = useRef(null);
  const savedSize=useRef(null);
  const toggleZoom=()=>{if(savedSize.current){onMove(savedSize.current.x,savedSize.current.y);onResize(savedSize.current.w,savedSize.current.h);savedSize.current=null;}else{savedSize.current={x:win.x,y:win.y,w:win.w,h:win.h};onMove(16,36);onResize(window.innerWidth-32,window.innerHeight-104);}};

  const startDrag = (e) => {
    if(e.target.closest('.close, .zoom, .resize')) return;
    onFocus();
    drag.current = { x:e.clientX - win.x, y:e.clientY - win.y };
    document.body.style.cursor = 'grabbing';
  };
  const startResize = (e) => {
    e.stopPropagation();
    onFocus();
    rez.current = { w: win.w, h: win.h, x:e.clientX, y:e.clientY };
  };

  useEffect(() => {
    const move = (e) => {
      if(drag.current){
        const x = Math.max(0, Math.min(window.innerWidth-120,e.clientX - drag.current.x));
        const y = Math.max(30, Math.min(window.innerHeight-80,e.clientY - drag.current.y));
        onMove(x,y);
      }
      if(rez.current){
        const w = Math.max(260, rez.current.w + (e.clientX - rez.current.x));
        const h = Math.max(160, rez.current.h + (e.clientY - rez.current.y));
        onResize(w,h);
      }
    };
    const up = () => {
      drag.current = null; rez.current = null;
      document.body.style.cursor = '';
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
    };
  }, [onMove, onResize]);

  const [settled, setSettled] = useState(false);
  useEffect(()=>{ const t=setTimeout(()=>setSettled(true),400); return ()=>clearTimeout(t); },[]);

  if(win.minimized) return null;

  return (
    <div ref={ref}
      className={'win '+(active?'active ':'')+(mobileActive?'mobile-active ':'')+(settled?'settled':'')}
      style={{ left:win.x, top:win.y, width:win.w, height:win.h, zIndex: win.z }}
      onMouseDown={onFocus}>
      <div className="titlebar" onMouseDown={startDrag} onDoubleClick={toggleZoom}>
        <div className="stripes"/>
        <button aria-label={"Close "+win.title} className="close" onClick={(e)=>{e.stopPropagation(); onClose();}}/>
        <div className="title">{win.title}</div>
        <button className="zoom" aria-label={"Zoom "+win.title} onClick={e=>{e.stopPropagation();toggleZoom();}}/>
      </div>
      <div className={'body '+(win.nopad?'nopad':'')}>
        {children}
      </div>
      {win.statusbar && <div className="statusbar">{win.statusbar}</div>}
      <div className="resize" onMouseDown={startResize}/>
    </div>
  );
}

// ============ DESKTOP ICON ============
function DeskIcon({ x, y, icon, label, onOpen, selected, onSelect }){
  return (
    <div role="button" tabIndex={0} aria-label={'Open '+label} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onOpen();}}} className={'deskicon '+(selected?'sel':'')}
      style={{ left:x, top:y }}
      onClick={(e)=>{e.stopPropagation(); onSelect();if(window.matchMedia("(pointer: coarse)").matches)onOpen();}}
      onDoubleClick={onOpen}>
      {icon}
      <div className="lbl">{label}</div>
    </div>
  );
}

// ============ ICONS (pixel SVGs) ============
const Icons = {
  MacFace: (s=40) => (
    <svg className="pic" width={s} height={s} viewBox="0 0 16 16" shapeRendering="crispEdges">
      {/* mac classic */}
      <rect x="2" y="1" width="12" height="11" fill="#000"/>
      <rect x="3" y="2" width="10" height="8" fill="#fff"/>
      <rect x="5" y="4" width="1" height="1" fill="#000"/>
      <rect x="10" y="4" width="1" height="1" fill="#000"/>
      <rect x="5" y="7" width="6" height="1" fill="#000"/>
      <rect x="3" y="12" width="10" height="1" fill="#000"/>
      <rect x="4" y="13" width="8" height="2" fill="#000"/>
    </svg>
  ),
  Folder: (s=40) => (
    <svg className="pic" width={s} height={s} viewBox="0 0 16 16" shapeRendering="crispEdges">
      <rect x="1" y="4" width="14" height="10" fill="#fff" stroke="#000"/>
      <rect x="2" y="3" width="6" height="2" fill="#fff" stroke="#000"/>
      <rect x="1" y="5" width="14" height="1" fill="#000"/>
    </svg>
  ),
  FolderSm: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" shapeRendering="crispEdges">
      <rect x="1" y="4" width="14" height="10" fill="#fff" stroke="#000"/>
      <rect x="2" y="3" width="5" height="2" fill="#fff" stroke="#000"/>
      <rect x="1" y="5" width="14" height="1" fill="#000"/>
    </svg>
  ),
  Doc: (s=40) => (
    <svg className="pic" width={s} height={s} viewBox="0 0 16 16" shapeRendering="crispEdges">
      <path d="M2 1 L10 1 L14 5 L14 15 L2 15 Z" fill="#fff" stroke="#000"/>
      <path d="M10 1 L10 5 L14 5" fill="none" stroke="#000"/>
      <rect x="4" y="7" width="8" height="1" fill="#000"/>
      <rect x="4" y="9" width="8" height="1" fill="#000"/>
      <rect x="4" y="11" width="6" height="1" fill="#000"/>
    </svg>
  ),
  DocSm: () => (
    <svg width="14" height="14" viewBox="0 0 16 16" shapeRendering="crispEdges">
      <path d="M2 1 L10 1 L14 5 L14 15 L2 15 Z" fill="#fff" stroke="#000"/>
      <path d="M10 1 L10 5 L14 5" fill="none" stroke="#000"/>
    </svg>
  ),
  Disk: () => (
    <svg viewBox="0 0 16 16" width="44" height="44" shapeRendering="crispEdges">
      <rect x="1" y="1" width="14" height="14" fill="#fff" stroke="#000"/>
      <rect x="4" y="1" width="8" height="6" fill="#000"/>
      <rect x="5" y="2" width="1" height="4" fill="#fff"/>
      <rect x="3" y="9" width="10" height="5" fill="#fff" stroke="#000"/>
      <rect x="5" y="11" width="6" height="1" fill="#000"/>
    </svg>
  ),
  Trash: () => (
    <svg viewBox="0 0 16 16" shapeRendering="crispEdges">
      <rect x="3" y="4" width="10" height="11" fill="#fff" stroke="#000"/>
      <rect x="2" y="2" width="12" height="2" fill="#fff" stroke="#000"/>
      <rect x="5" y="1" width="6" height="1" fill="#000"/>
      <rect x="5" y="6" width="1" height="8" fill="#000"/>
      <rect x="8" y="6" width="1" height="8" fill="#000"/>
      <rect x="11" y="6" width="1" height="8" fill="#000"/>
    </svg>
  ),
  Paint: (s=40) => (
    <svg className="pic" width={s} height={s} viewBox="0 0 16 16" shapeRendering="crispEdges">
      <rect x="1" y="1" width="14" height="14" fill="#fff" stroke="#000"/>
      <rect x="3" y="3" width="3" height="3" fill="#000"/>
      <rect x="8" y="4" width="5" height="1" fill="#000"/>
      <rect x="8" y="6" width="5" height="1" fill="#000"/>
      <rect x="3" y="9" width="10" height="4" fill="none" stroke="#000"/>
      <rect x="5" y="10" width="2" height="2" fill="#000"/>
      <rect x="9" y="10" width="2" height="2" fill="#000"/>
    </svg>
  ),
  Calc: (s=40) => (
    <svg className="pic" width={s} height={s} viewBox="0 0 16 16" shapeRendering="crispEdges">
      <rect x="2" y="1" width="12" height="14" fill="#fff" stroke="#000"/>
      <rect x="3" y="2" width="10" height="3" fill="#000"/>
      <rect x="3" y="6" width="2" height="2" fill="#000"/>
      <rect x="6" y="6" width="2" height="2" fill="#000"/>
      <rect x="9" y="6" width="2" height="2" fill="#000"/>
      <rect x="12" y="6" width="1" height="2" fill="#000"/>
      <rect x="3" y="9" width="2" height="2" fill="#000"/>
      <rect x="6" y="9" width="2" height="2" fill="#000"/>
      <rect x="9" y="9" width="2" height="2" fill="#000"/>
      <rect x="12" y="9" width="1" height="2" fill="#000"/>
      <rect x="3" y="12" width="5" height="2" fill="#000"/>
      <rect x="9" y="12" width="2" height="2" fill="#000"/>
      <rect x="12" y="12" width="1" height="2" fill="#000"/>
    </svg>
  ),
  Notepad: (s=40) => (
    <svg className="pic" width={s} height={s} viewBox="0 0 16 16" shapeRendering="crispEdges">
      <rect x="2" y="2" width="12" height="13" fill="#fff" stroke="#000"/>
      <rect x="3" y="5" width="10" height="1" fill="#000"/>
      <rect x="3" y="7" width="10" height="1" fill="#000"/>
      <rect x="3" y="9" width="10" height="1" fill="#000"/>
      <rect x="3" y="11" width="7" height="1" fill="#000"/>
      <rect x="2" y="2" width="12" height="2" fill="#000"/>
    </svg>
  ),
  Scrapbook: (s=40) => (
    <svg className="pic" width={s} height={s} viewBox="0 0 16 16" shapeRendering="crispEdges">
      <rect x="2" y="2" width="11" height="12" fill="#fff" stroke="#000"/>
      <rect x="4" y="4" width="11" height="12" fill="#fff" stroke="#000"/>
      <rect x="6" y="6" width="7" height="1" fill="#000"/>
      <rect x="6" y="8" width="7" height="1" fill="#000"/>
      <rect x="6" y="10" width="5" height="1" fill="#000"/>
    </svg>
  ),
  Control: (s=40) => (
    <svg className="pic" width={s} height={s} viewBox="0 0 16 16" shapeRendering="crispEdges">
      <rect x="1" y="1" width="14" height="14" fill="#fff" stroke="#000"/>
      <circle cx="8" cy="8" r="5" fill="none" stroke="#000"/>
      <rect x="7" y="3" width="2" height="3" fill="#000"/>
      <rect x="7" y="10" width="2" height="3" fill="#000"/>
      <rect x="3" y="7" width="3" height="2" fill="#000"/>
      <rect x="10" y="7" width="3" height="2" fill="#000"/>
      <rect x="7" y="7" width="2" height="2" fill="#000"/>
    </svg>
  ),
  Chooser: (s=40) => (
    <svg className="pic" width={s} height={s} viewBox="0 0 16 16" shapeRendering="crispEdges">
      <rect x="1" y="3" width="14" height="10" fill="#fff" stroke="#000"/>
      <rect x="2" y="5" width="6" height="7" fill="none" stroke="#000"/>
      <rect x="9" y="5" width="5" height="1" fill="#000"/>
      <rect x="9" y="7" width="5" height="1" fill="#000"/>
      <rect x="9" y="9" width="5" height="1" fill="#000"/>
      <rect x="9" y="11" width="3" height="1" fill="#000"/>
    </svg>
  ),
  Terminal: (s=40) => (
    <svg className="pic" width={s} height={s} viewBox="0 0 16 16" shapeRendering="crispEdges">
      <rect x="1" y="2" width="14" height="12" fill="#000" stroke="#000"/>
      <rect x="3" y="5" width="1" height="1" fill="#fff"/>
      <rect x="4" y="5" width="1" height="1" fill="#fff"/>
      <rect x="5" y="5" width="1" height="1" fill="#fff"/>
      <rect x="6" y="5" width="1" height="1" fill="#fff"/>
      <rect x="7" y="5" width="1" height="1" fill="#fff"/>
      <rect x="3" y="8" width="1" height="1" fill="#fff"/>
      <rect x="4" y="9" width="1" height="1" fill="#fff"/>
      <rect x="5" y="10" width="1" height="1" fill="#fff"/>
      <rect x="4" y="11" width="1" height="1" fill="#fff"/>
      <rect x="3" y="12" width="1" height="1" fill="#fff"/>
    </svg>
  ),
  Clock: (s=40) => (
    <svg className="pic" width={s} height={s} viewBox="0 0 16 16" shapeRendering="crispEdges">
      <circle cx="8" cy="8" r="6" fill="#fff" stroke="#000"/>
      <rect x="7.5" y="3" width="1" height="1" fill="#000"/>
      <rect x="12" y="7.5" width="1" height="1" fill="#000"/>
      <rect x="7.5" y="12" width="1" height="1" fill="#000"/>
      <rect x="3" y="7.5" width="1" height="1" fill="#000"/>
      <line x1="8" y1="8" x2="8" y2="5" stroke="#000"/>
      <line x1="8" y1="8" x2="11" y2="8" stroke="#000"/>
    </svg>
  ),
  Mail: (s=40) => (
    <svg className="pic" width={s} height={s} viewBox="0 0 16 16" shapeRendering="crispEdges">
      <rect x="1" y="3" width="14" height="10" fill="#fff" stroke="#000"/>
      <path d="M1 3 L8 9 L15 3" fill="none" stroke="#000"/>
    </svg>
  ),
};

Object.assign(window, { useWindows, Window, DeskIcon, Icons, WinCtx });
