// ============ WINDOW BODIES ============

const MetricBar = ({label, value, max}) => (
  <div style={{display:'flex', alignItems:'center', gap:8, margin:'3px 0'}}>
    <div style={{width:50, fontSize:12}}>{label}</div>
    <div style={{flex:1, height:12, border:'1px solid #000', background:'#fff', position:'relative'}}>
      <div style={{position:'absolute', left:0, top:0, bottom:0, width:(value/max*100)+'%',
        background:'repeating-linear-gradient(45deg, #000 0 2px, #fff 2px 4px)'}}/>
    </div>
    <div style={{width:40, fontSize:12, textAlign:'right'}}>{value}</div>
  </div>
);

function AboutMe(){
  return (
    <div>
      <div className="hero-title">
        <div className="inner">
          <h1>Ke Wang  ·  王 可</h1>
          <div className="sub">Applied Research Lead · Pika Labs</div>
        </div>
      </div>

      <div className="mq">
        <div className="mq-track">
          <span>★ CVPR '23</span><span>★ NeurIPS '23</span><span>★ PNAS '22</span>
          <span>★ MRM '22</span><span>★ MICCAI '21</span><span>★ Adobe Project Indigo</span>
          <span>★ Pika Labs</span><span>★ UC Berkeley BAIR</span><span>★ Tsinghua '18</span>
          <span>★ 425 citations</span><span>★ h-index 10</span><span>★ Hello!</span>
          <span>★ CVPR '23</span><span>★ NeurIPS '23</span><span>★ PNAS '22</span>
          <span>★ MRM '22</span><span>★ MICCAI '21</span><span>★ Adobe Project Indigo</span>
          <span>★ Pika Labs</span><span>★ UC Berkeley BAIR</span><span>★ Tsinghua '18</span>
          <span>★ 425 citations</span><span>★ h-index 10</span><span>★ Hello!</span>
        </div>
      </div>

      <div className="aboutkw">
        <div className="ph">
          <img src="assets/kw_ws.jpg" alt="Ke Wang"/>
          <div className="dither-overlay"/>
        </div>
        <div>
          <h2 className="sec">README.txt</h2>
          <p>I build systems that let machines <b>see, reason about, and create</b> images
          and video. Today I lead applied research at <b>Pika Labs</b>, working on the
          next generation of generative video models. Before Pika I shipped
          computational-photography features with <b>Marc Levoy</b>'s team at Adobe
          (<a href="https://research.adobe.com/articles/indigo/indigo.html" target="_blank">Project Indigo</a>),
          and before that I was a senior research engineer at Samsung's MPI Lab.</p>

          <p>PhD in EECS from <b>UC Berkeley</b> (2023) with Miki Lustig and Stella Yu,
          where I published across <b>CVPR, NeurIPS, PNAS, MRM, MICCAI</b> on inverse
          problems in medical and natural imaging. Member of BAIR. Undergrad in
          Biomedical Engineering at <b>Tsinghua</b> (清华, honors).</p>
        </div>
      </div>

      <div className="statcards">
        <div className="sc"><b>425</b><span>CITATIONS</span></div>
        <div className="sc"><b>10</b><span>H-INDEX</span></div>
        <div className="sc"><b>16</b><span>PAPERS</span></div>
      </div>

      <h2 className="sec">What I work on</h2>
      <p>
        <span className="pill">computational imaging</span>&nbsp;
        <span className="pill">generative video</span>&nbsp;
        <span className="pill">deep learning</span>&nbsp;
        <span className="pill">inverse problems</span>&nbsp;
        <span className="pill">computational photography</span>&nbsp;
        <span className="pill">MRI reconstruction</span>
      </p>

      <div className="dashed"/>
      <p style={{fontSize:12}}>
        <b>Scholar:</b> <a href="https://scholar.google.com/citations?user=Iz3m3v4AAAAJ" target="_blank">scholar.google.com/…/Iz3m3v4AAAAJ</a><br/>
        <b>Site:</b> <a href="https://kewang0622.github.io/" target="_blank">kewang0622.github.io</a><br/>
        <b>Email:</b> <a href="mailto:kewang0622@gmail.com">kewang0622@gmail.com</a>
      </p>
    </div>
  );
}

function Publications(){
  const rows = window.KW_DATA.publications;
  const [sel, setSel] = useState(0);
  const [sort, setSort] = useState('cites');
  const sorted = useMemo(()=>{
    const a = [...rows];
    if(sort==='cites') a.sort((x,y)=>y.cites-x.cites);
    else if(sort==='year') a.sort((x,y)=>parseInt(y.year)-parseInt(x.year));
    else if(sort==='venue') a.sort((x,y)=>x.venue.localeCompare(y.venue));
    return a;
  },[rows,sort]);
  const cur = sorted[sel];
  return (
    <div>
      <div style={{marginBottom:6, fontSize:12, display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:6}}>
        <span>{rows.length} items · 425 citations total</span>
        <span>Sort by:
          <a onClick={()=>setSort('cites')} style={{cursor:'pointer', marginLeft:6, textDecoration: sort==='cites'?'underline':'none'}}>citations</a> ·
          <a onClick={()=>setSort('year')}  style={{cursor:'pointer', marginLeft:6, textDecoration: sort==='year'?'underline':'none'}}>year</a> ·
          <a onClick={()=>setSort('venue')} style={{cursor:'pointer', marginLeft:6, textDecoration: sort==='venue'?'underline':'none'}}>venue</a>
        </span>
      </div>
      <table className="files">
        <thead>
          <tr>
            <th style={{width:18}}></th>
            <th><span>Name</span></th>
            <th><span>Venue</span></th>
            <th><span>Year</span></th>
            <th><span>Cites</span></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((r,i) => (
            <tr key={r.title} className={sel===i?'sel':''}
              onClick={()=>setSel(i)}
              onDoubleClick={()=>window.open(r.url,'_blank')}
              style={{cursor:'pointer'}}>
              <td className="ic"><Icons.DocSm/></td>
              <td>{r.title}</td>
              <td>{r.venue}</td>
              <td>{r.year}</td>
              <td>{r.cites}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {cur && (
        <div style={{marginTop:12, padding:10, border:'1px solid #000', background:'#fff'}}>
          <div style={{fontSize:13, fontWeight:'bold', marginBottom:4}}>{cur.title}</div>
          <div style={{fontSize:11, marginBottom:4}}>{cur.authors}</div>
          <div style={{fontSize:11, marginBottom:6}}><em>{cur.venue} {cur.year}</em> · {cur.cites} citations · <b>{cur.role}</b></div>
          <div style={{fontSize:12, marginBottom:6}}>{cur.tldr}</div>
          <a href={cur.url} target="_blank" rel="noreferrer">Open paper →</a>
        </div>
      )}
    </div>
  );
}

function Metrics(){
  const m = window.KW_DATA.metrics;
  const max = Math.max(...m.byYear.map(x=>x[1]));
  return (
    <div>
      <h2 className="sec">Scholar Metrics</h2>
      <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8, marginBottom:12}}>
        <div style={{border:'1px solid #000', padding:8, textAlign:'center'}}>
          <div style={{fontSize:28}}>{m.citations}</div>
          <div style={{fontSize:11}}>total citations</div>
        </div>
        <div style={{border:'1px solid #000', padding:8, textAlign:'center'}}>
          <div style={{fontSize:28}}>{m.h_index}</div>
          <div style={{fontSize:11}}>h-index</div>
        </div>
        <div style={{border:'1px solid #000', padding:8, textAlign:'center'}}>
          <div style={{fontSize:28}}>{m.i10_index}</div>
          <div style={{fontSize:11}}>i10-index</div>
        </div>
      </div>

      <h2 className="sec">Citations by Year</h2>
      <div style={{border:'1px solid #000', padding:10, background:'#fff'}}>
        {m.byYear.map(([y,c])=> <MetricBar key={y} label={y} value={c} max={max}/>)}
      </div>

      <p style={{fontSize:11, marginTop:10}}>
        Source: <a href="https://scholar.google.com/citations?user=Iz3m3v4AAAAJ" target="_blank">Google Scholar</a>
      </p>
    </div>
  );
}

function Collaborators(){
  const list = window.KW_DATA.collaborators;
  return (
    <div>
      <h2 className="sec">Co-author network</h2>
      <p style={{fontSize:12}}>{list.length} frequent collaborators across Berkeley, Adobe, Stanford, Philips, Apple, NVIDIA, and beyond.</p>
      <div style={{border:'1px solid #000', background:'#fff'}}>
        {list.map((c,i)=>(
          <div key={i} className="folder-row"
            style={{padding:'6px 10px', borderBottom: i<list.length-1?'1px dotted #000':'none'}}
            onClick={()=>c.url && window.open(c.url,'_blank')}>
            <Icons.FolderSm/>
            <div style={{flex:1}}>
              <div style={{fontSize:13}}>{c.name}</div>
              <div style={{fontSize:11}}>{c.affil} · <em>{c.role}</em></div>
            </div>
            <span style={{fontSize:11, opacity:.7}}>↗</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CV(){
  const d = window.KW_DATA;
  return (
    <div>
      <div style={{textAlign:'center', marginBottom:12, paddingBottom:10, borderBottom:'2px solid #000'}}>
        <h1 style={{fontSize:22}}>KE WANG  ·  王 可</h1>
        <div style={{fontSize:12, marginTop:4}}>
          kewang0622@gmail.com · kewang0622.github.io · San Francisco, CA
        </div>
      </div>

      <h2 className="sec">Experience</h2>
      {d.timeline.filter(t=>!t[0].includes('BEng') && !t[0].includes('PhD')).map((t,i)=>(
        <div key={i} style={{marginBottom:10}}>
          <div style={{display:'flex', justifyContent:'space-between', fontSize:13}}>
            <b>{t[1]}</b><span>{t[0]}</span>
          </div>
          <div style={{fontSize:12, fontStyle:'italic', marginTop:2}}>{t[2]}</div>
          <div style={{fontSize:12, marginTop:3}}>{t[3]}</div>
        </div>
      ))}

      <h2 className="sec">Education</h2>
      {d.timeline.filter(t=>t[0].includes('BEng') || t[0].includes('PhD')).map((t,i)=>(
        <div key={i} style={{marginBottom:10}}>
          <div style={{display:'flex', justifyContent:'space-between', fontSize:13}}>
            <b>{t[1]}</b><span>{t[0]}</span>
          </div>
          <div style={{fontSize:12, fontStyle:'italic', marginTop:2}}>{t[2]}</div>
          <div style={{fontSize:12, marginTop:3}}>{t[3]}</div>
        </div>
      ))}

      <h2 className="sec">Skills</h2>
      <div>{d.skills.map((s,i)=> <span key={i} className="pill" style={{marginRight:5, marginBottom:5, display:'inline-block'}}>{s}</span>)}</div>

      <h2 className="sec">Selected Publications</h2>
      <ul style={{paddingLeft:16, fontSize:12}}>
        {d.publications.slice(0,6).map((p,i)=>(
          <li key={i} style={{marginBottom:6}}>
            <a href={p.url} target="_blank"><b>{p.title}</b></a>, <em>{p.venue} {p.year}</em> · {p.cites} cites
          </li>
        ))}
      </ul>

      <div style={{textAlign:'center', marginTop:10}}>
        <a href="https://kewang0622.github.io/cv/" target="_blank" style={{fontSize:12}}>Full CV on personal site →</a>
      </div>
    </div>
  );
}

function Career(){
  const items = window.KW_DATA.timeline;
  const news = window.KW_DATA.news;
  return (
    <div>
      <h2 className="sec">Career.log</h2>
      <ul className="tl">
        {items.map((x,i)=>(
          <li key={i}>
            <b style={{fontSize:11}}>{x[0]}</b>
            <div><b>{x[1]}</b>
              <div style={{fontSize:12, fontStyle:'italic', margin:'2px 0'}}>{x[2]}</div>
              <div style={{fontSize:12}}>{x[3]}</div>
            </div>
          </li>
        ))}
      </ul>
      <h2 className="sec">Recent News</h2>
      <ul className="tl">
        {news.map((n,i)=>(
          <li key={i}>
            <b>{n[0]}</b>
            <div>
              {n[2] ? <a href={n[2]} target="_blank">{n[1]}</a> : n[1]}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Press(){
  const p = window.KW_DATA.press;
  return (
    <div>
      <h2 className="sec">Press & Coverage</h2>
      <p style={{fontSize:12}}>Selected coverage of Project Indigo (Adobe, June 2025):</p>
      <div style={{border:'1px solid #000', background:'#fff'}}>
        {p.map((item,i)=>(
          <div key={i} className="folder-row"
            style={{padding:'8px 10px', borderBottom: i<p.length-1?'1px dotted #000':'none'}}
            onClick={()=>window.open(item[2],'_blank')}>
            <Icons.DocSm/>
            <div style={{flex:1}}>
              <div style={{fontSize:13, fontWeight:'bold'}}>{item[0]}</div>
              <div style={{fontSize:11}}>{item[1]}</div>
            </div>
            <span style={{fontSize:11}}>↗</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Services(){
  const s = window.KW_DATA.services;
  return (
    <div>
      <h2 className="sec">Academic Service</h2>
      <p style={{fontSize:12}}>Reviewer and presenter across top-tier ML, CV, and medical imaging venues.</p>
      {s.map((item,i)=>(
        <div key={i} style={{border:'1px solid #000', padding:10, marginBottom:8}}>
          <div style={{fontSize:13, fontWeight:'bold'}}>{item.role} · <span style={{fontWeight:'normal'}}>{item.year}</span></div>
          <div style={{fontSize:12, marginTop:4}}>
            {item.venues.map((v,j)=>(
              <span key={j} className="pill" style={{marginRight:4, marginBottom:3, display:'inline-block'}}>{v}</span>
            ))}
          </div>
        </div>
      ))}
      <p style={{fontSize:11, marginTop:8}}>
        Also presented orals at ISMRM (MRI's flagship conference) in 2022.
      </p>
    </div>
  );
}

function Hobbies(){
  return (
    <div>
      <div className="welcome-banner">Outside the lab — things that keep the research human</div>
      <div className="hobbies">
        <div className="h">
          <svg viewBox="0 0 32 32" shapeRendering="crispEdges">
            <path d="M10 22 V8 L24 5 V20" fill="none" stroke="#000" strokeWidth="2"/>
            <circle cx="10" cy="22" r="3" fill="#000"/><circle cx="24" cy="20" r="3" fill="#000"/>
          </svg>
          <div><h4>Music</h4><p>A devout listener. The cadence of good records sets the cadence of good code.</p></div>
        </div>
        <div className="h">
          <svg viewBox="0 0 32 32" shapeRendering="crispEdges">
            <path d="M4 26 C12 20, 14 16, 16 6 C18 16, 20 20, 28 26" fill="none" stroke="#000" strokeWidth="2"/>
          </svg>
          <div><h4>Ice skating</h4><p>Balance transfers. So does falling gracefully and spinning again.</p></div>
        </div>
        <div className="h">
          <svg viewBox="0 0 32 32" shapeRendering="crispEdges">
            <path d="M4 26 L12 14 L18 20 L28 6" fill="none" stroke="#000" strokeWidth="2"/>
            <circle cx="26" cy="8" r="2" fill="#000"/>
          </svg>
          <div><h4>Rock climbing</h4><p>Every good problem has one obvious move and three hidden ones. Same as research.</p></div>
        </div>
        <div className="h">
          <svg viewBox="0 0 32 32" shapeRendering="crispEdges">
            <circle cx="16" cy="16" r="11" fill="none" stroke="#000" strokeWidth="2"/>
            <rect x="14" y="8" width="4" height="16" fill="#000"/><rect x="8" y="14" width="16" height="4" fill="#000"/>
          </svg>
          <div><h4>Medicine</h4><p>The reason MRI research mattered in the first place. Shorter, better scans for real patients.</p></div>
        </div>
      </div>
    </div>
  );
}

function AboutThisMac(){
  return (
    <div className="dialog" style={{position:'relative', boxShadow:'none', border:'none'}}>
      <div className="db">
        <div style={{display:'flex',gap:16,alignItems:'center',marginBottom:14}}>
          {Icons.MacFace(64)}
          <div>
            <div style={{fontSize:22}}>Ke's Macintosh</div>
            <div style={{fontSize:12,marginTop:2}}>System Software 6.0.8</div>
          </div>
        </div>
        <div className="row"><span>Total Memory</span><span>8,192 K</span></div>
        <div className="row"><span>Largest Unused Block</span><span>6,144 K</span></div>
        <div className="row"><span>Applied Research</span><span>∞ K</span></div>
        <div className="row"><span>Citations</span><span>425</span></div>
        <div className="row"><span>h-index</span><span>10</span></div>
        <div className="row"><span>Coffee</span><span>2,048 K</span></div>
        <div style={{marginTop:14, fontSize:11, textAlign:'center'}}>
          © Ke Wang · 2018–2026 · Tsinghua → Berkeley → Samsung → Adobe → Pika
        </div>
      </div>
    </div>
  );
}

function Notepad(){
  const [txt, setTxt] = useState(
`Dear visitor,

if you are here you either:
  (a) found me through a paper citation,
  (b) arrived from my personal site, or
  (c) know me in real life — hi!

What I think about most weeks:
  - making cameras think
  - turning video generation into a real craft
  - 10x faster MRI scans
  - the right dinner to cook on Sunday

If any of these overlap with your interests, write me:
  kewang0622 [at] gmail [dot] com

— Ke`);
  return (
    <textarea className="notepad" value={txt} onChange={e=>setTxt(e.target.value)}
      style={{width:'100%', height:'100%', border:'none', resize:'none', outline:'none'}}/>
  );
}

function Calculator(){
  const [disp, setDisp] = useState('0');
  const [acc, setAcc] = useState(null);
  const [op, setOp] = useState(null);
  const [fresh, setFresh] = useState(true);

  const input = (d) => setDisp(prev => fresh ? (setFresh(false), d) : (prev==='0'?d:prev+d));
  const setOpFn = (o) => {
    if(op && !fresh){ equals(); }
    setAcc(parseFloat(disp)); setOp(o); setFresh(true);
  };
  const equals = () => {
    if(op==null || acc==null) return;
    const a=acc, b=parseFloat(disp);
    const v = op==='+'?a+b:op==='-'?a-b:op==='×'?a*b:op==='÷'?a/b:b;
    setDisp(String(v)); setAcc(null); setOp(null); setFresh(true);
  };
  const clr = () => { setDisp('0'); setAcc(null); setOp(null); setFresh(true); };

  const keys = [['C','±','%','÷'],['7','8','9','×'],['4','5','6','-'],['1','2','3','+'],['0','.','=']];
  return (
    <div className="calc">
      <div className="disp">{disp}</div>
      <div className="grid">
        {keys.flat().map((k,i)=>{
          const isOp = '÷×-+='.includes(k);
          const style = k==='0' ? {gridColumn:'span 2'} : {};
          return <button key={i} className={isOp?'op':''} style={style} onClick={()=>{
            if(k==='C') clr();
            else if(k==='=') equals();
            else if('÷×-+'.includes(k)) setOpFn(k);
            else if(k==='±') setDisp(d=> String(-parseFloat(d)));
            else if(k==='%') setDisp(d=> String(parseFloat(d)/100));
            else input(k);
          }}>{k}</button>;
        })}
      </div>
    </div>
  );
}

function MacPaint(){
  const ref = useRef(null);
  const [tool, setTool] = useState('pencil');
  useEffect(()=>{
    const c = ref.current;
    const ctx = c.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const tc = document.createElement('canvas');
      tc.width = c.width; tc.height = c.height;
      const tctx = tc.getContext('2d');
      const r = Math.min(c.width/img.width, c.height/img.height);
      const w = img.width*r, h = img.height*r;
      tctx.drawImage(img, (c.width-w)/2, (c.height-h)/2, w, h);
      const data = tctx.getImageData(0,0,c.width,c.height);
      const d = data.data;
      const gray = new Float32Array(c.width*c.height);
      for(let i=0;i<gray.length;i++){
        const j=i*4; gray[i] = 0.299*d[j]+0.587*d[j+1]+0.114*d[j+2];
      }
      for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){
        const i = y*c.width+x;
        const old = gray[i];
        const neu = old<128?0:255;
        gray[i] = neu;
        const err = (old-neu)/8;
        const spread = [[1,0],[2,0],[-1,1],[0,1],[1,1],[0,2]];
        for(const [dx,dy] of spread){
          const nx=x+dx, ny=y+dy;
          if(nx>=0&&nx<c.width&&ny>=0&&ny<c.height) gray[ny*c.width+nx]+=err;
        }
      }
      const out = ctx.createImageData(c.width,c.height);
      for(let i=0;i<gray.length;i++){
        const j=i*4, v=gray[i]<128?0:255;
        out.data[j]=v; out.data[j+1]=v; out.data[j+2]=v; out.data[j+3]=255;
      }
      ctx.putImageData(out,0,0);
    };
    img.src = 'assets/kw_ws.jpg';
  },[]);

  const drawing = useRef(false);
  const last = useRef(null);
  const pt = (e)=>{ const r = ref.current.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x:t.clientX-r.left, y:t.clientY-r.top }; };
  const onDown = (e) => { e.preventDefault(); drawing.current = true; last.current = pt(e); };
  const onMove = (e) => {
    if(!drawing.current) return;
    e.preventDefault();
    const ctx = ref.current.getContext('2d');
    const p = pt(e);
    ctx.strokeStyle = tool==='eraser'?'#fff':'#000';
    ctx.lineWidth = tool==='eraser'?8:tool==='brush'?3:1;
    ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(last.current.x,last.current.y);
    ctx.lineTo(p.x,p.y); ctx.stroke();
    last.current = p;
  };
  const up = () => drawing.current = false;

  return (
    <div style={{display:'flex',gap:6, height:'100%'}}>
      <div style={{display:'flex',flexDirection:'column',gap:4,padding:4,borderRight:'1px solid #000'}}>
        {[['pencil','✎'],['brush','⬤'],['eraser','◻']].map(([k,l])=>(
          <button key={k} onClick={()=>setTool(k)}
            style={{width:30,height:30,border:'1px solid #000',background:tool===k?'#000':'#fff',color:tool===k?'#fff':'#000',cursor:'pointer',fontFamily:'inherit'}}>{l}</button>
        ))}
      </div>
      <canvas ref={ref} width={280} height={320}
        onMouseDown={onDown} onMouseMove={onMove} onMouseUp={up} onMouseLeave={up}
        onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={up}
        style={{border:'1px solid #000',background:'#fff',cursor:'crosshair',imageRendering:'pixelated',maxWidth:'100%',touchAction:'none'}}/>
    </div>
  );
}

function Chooser(){
  const links = [
    ['Personal Site','https://kewang0622.github.io/'],
    ['Google Scholar','https://scholar.google.com/citations?user=Iz3m3v4AAAAJ'],
    ['Publications','https://kewang0622.github.io/publications/'],
    ['CV','https://kewang0622.github.io/cv/'],
    ['PhD Thesis','https://www2.eecs.berkeley.edu/Pubs/TechRpts/2023/EECS-2023-178.html'],
    ['Project Indigo','https://research.adobe.com/articles/indigo/indigo.html'],
    ['Pika Labs','https://pika.art/'],
    ['Email','mailto:kewang0622@gmail.com'],
  ];
  return (
    <div>
      <h2 className="sec">Connect to:</h2>
      <div style={{border:'1px solid #000', padding:8}}>
        {links.map(([l,u],i)=>(
          <div key={i} className="folder-row" onClick={()=>window.open(u,'_blank')}>
            <Icons.FolderSm/>
            <span style={{flex:1}}>{l}</span>
            <span style={{fontSize:11,opacity:.7}}>↗</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Terminal(){
  const [lines, setLines] = useState([
    'KW-Shell 1.0 — 2026',
    "type 'help' to begin.",
    '',
  ]);
  const [val, setVal] = useState('');
  const submit = (e) => {
    e.preventDefault();
    const cmd = val.trim().toLowerCase();
    let out = [];
    if(cmd==='help') out = ['commands: whoami, now, pubs, cites, advisors, stack, contact, fortune, clear'];
    else if(cmd==='whoami') out = ['ke wang — applied research lead @ pika labs'];
    else if(cmd==='now') out = ['making generative video feel like cinema.'];
    else if(cmd==='pubs') out = ['16 papers · CVPR, NeurIPS, PNAS, MRM, MICCAI, IEEE SPM'];
    else if(cmd==='cites') out = ['425 total · h-index 10 · i10-index 10 (Google Scholar, 2026)'];
    else if(cmd==='advisors') out = ['PhD: Miki Lustig (Berkeley EECS), Stella Yu (Michigan)', 'Adobe: Marc Levoy'];
    else if(cmd==='stack') out = ['PyTorch · JAX · CUDA · Metal · Swift · Python · C++'];
    else if(cmd==='contact') out = ['kewang0622@gmail.com'];
    else if(cmd==='fortune') {
      const f = [
        'the best camera is the one you have trained.',
        'write the loss function you wish existed.',
        'not every problem needs a new architecture.',
        'read the thesis before citing the paper.',
      ];
      out = [f[Math.floor(Math.random()*f.length)]];
    }
    else if(cmd==='clear') { setLines([]); setVal(''); return; }
    else if(cmd==='') out = [];
    else out = [`sh: command not found: ${cmd}`];
    setLines(l => [...l, '> '+cmd, ...out]);
    setVal('');
  };
  return (
    <div style={{background:'#000',color:'#fff',padding:10,fontFamily:'Geneva,monospace',fontSize:12,minHeight:'100%'}}>
      {lines.map((l,i)=><div key={i}>{l}</div>)}
      <form onSubmit={submit} style={{display:'flex'}}>
        <span>&gt;&nbsp;</span>
        <input autoFocus value={val} onChange={e=>setVal(e.target.value)}
          style={{background:'transparent',border:'none',color:'#fff',outline:'none',flex:1,fontFamily:'inherit',fontSize:12}}/>
      </form>
    </div>
  );
}

function Alarm(){
  const [time, setTime] = useState(new Date());
  useEffect(()=>{ const t=setInterval(()=>setTime(new Date()),1000); return ()=>clearInterval(t); },[]);
  const h = time.getHours()%12 || 12;
  const m = String(time.getMinutes()).padStart(2,'0');
  const s = String(time.getSeconds()).padStart(2,'0');
  const ampm = time.getHours()>=12?'PM':'AM';
  const hourAngle = ((time.getHours()%12)+time.getMinutes()/60)*30;
  const minAngle = time.getMinutes()*6;
  const secAngle = time.getSeconds()*6;
  return (
    <div style={{textAlign:'center', padding:10}}>
      <svg width="160" height="160" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="46" fill="#fff" stroke="#000" strokeWidth="2"/>
        {[0,1,2,3,4,5,6,7,8,9,10,11].map(i=>(
          <line key={i} x1="50" y1="8" x2="50" y2={i%3===0?14:12}
            stroke="#000" strokeWidth={i%3===0?2:1}
            transform={`rotate(${i*30} 50 50)`}/>
        ))}
        <line x1="50" y1="50" x2="50" y2="26" stroke="#000" strokeWidth="3" transform={`rotate(${hourAngle} 50 50)`}/>
        <line x1="50" y1="50" x2="50" y2="16" stroke="#000" strokeWidth="2" transform={`rotate(${minAngle} 50 50)`}/>
        <line x1="50" y1="50" x2="50" y2="12" stroke="#000" strokeWidth="1" transform={`rotate(${secAngle} 50 50)`}/>
        <circle cx="50" cy="50" r="2" fill="#000"/>
      </svg>
      <div style={{fontSize:20, marginTop:8}}>{h}:{m}:{s} {ampm}</div>
      <div style={{fontSize:12, marginTop:4}}>{time.toDateString()}</div>
    </div>
  );
}

Object.assign(window, { AboutMe, Publications, Career, Hobbies, AboutThisMac, Notepad, Calculator, MacPaint, Chooser, Terminal, Alarm, Metrics, Collaborators, CV, Press, Services });
