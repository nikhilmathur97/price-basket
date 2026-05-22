// @ts-nocheck
"use client";

import { useState, useCallback, useEffect } from "react";

/* ─── COLORS ─────────────────────────────────────────────────────────────── */
const OR="#FF6B00",OL="#FF8C38",OD="#CC5500",OS="#FFF3E8",OP="#FFF8F2",OM="#FFE0C4";
const GN="#16A34A",GNB="#DCFCE7";
const RE="#DC2626",REB="#FEE2E2";
const BL="#2563EB",BLB="#DBEAFE";
const PU="#7C3AED",PUB="#EDE9FE";
const WH="#FFFFFF",BK="#111827";
const G3="#374151",G4="#6B7280",G5="#9CA3AF",G6="#D1D5DB",G7="#E5E7EB",G8="#F3F4F6",G9="#F9FAFB";

/* ─── PLATFORMS ──────────────────────────────────────────────────────────── */
const PLAT = {
  blinkit:   { name:"Blinkit",       short:"Blinkit",  emoji:"⚡", color:"#E6A817", bg:"#FFFBEA", del:10  },
  zepto:     { name:"Zepto",         short:"Zepto",    emoji:"🟣", color:"#7C3AED", bg:"#F5F3FF", del:8   },
  instamart: { name:"Instamart",     short:"Swiggy",   emoji:"🛒", color:"#EA580C", bg:"#FFF7ED", del:15  },
  bigbasket: { name:"BigBasket",     short:"BigBasket",emoji:"🛍", color:"#16A34A", bg:"#F0FDF4", del:30  },
  jiomart:   { name:"JioMart",       short:"JioMart",  emoji:"🔵", color:"#1D4ED8", bg:"#EFF6FF", del:45  },
  amazon:    { name:"Amazon Fresh",  short:"Amazon",   emoji:"📦", color:"#D97706", bg:"#FFFBEB", del:60  },
};

/* ─── MOCK DATA ──────────────────────────────────────────────────────────── */
const PRODUCTS = [
  { id:1, name:"Amul Taaza Toned Milk", brand:"Amul", category:"Dairy", emoji:"🥛", unit:"500ml",
    prices:{
      blinkit:  {price:28,  mrp:30,  disc:7,  rating:4.5, avail:true,  del:10},
      zepto:    {price:27,  mrp:30,  disc:10, rating:4.3, avail:true,  del:8 },
      instamart:{price:29,  mrp:30,  disc:3,  rating:4.6, avail:true,  del:15},
      bigbasket:{price:26,  mrp:30,  disc:13, rating:4.7, avail:true,  del:30},
      jiomart:  {price:27.5,mrp:30,  disc:8,  rating:4.2, avail:false, del:45},
      amazon:   {price:28.5,mrp:30,  disc:5,  rating:4.4, avail:true,  del:60},
    }},
  { id:2, name:"Lay's Classic Salted Chips", brand:"PepsiCo", category:"Snacks", emoji:"🍟", unit:"52g",
    prices:{
      blinkit:  {price:20, mrp:22, disc:9,  rating:4.2, avail:true, del:10},
      zepto:    {price:18, mrp:22, disc:18, rating:4.1, avail:true, del:8 },
      instamart:{price:21, mrp:22, disc:5,  rating:4.3, avail:true, del:15},
      bigbasket:{price:19, mrp:22, disc:14, rating:4.5, avail:true, del:30},
      jiomart:  {price:20, mrp:22, disc:9,  rating:4.0, avail:true, del:45},
      amazon:   {price:22, mrp:22, disc:0,  rating:4.2, avail:true, del:60},
    }},
  { id:3, name:"Tata Salt Iodized", brand:"Tata", category:"Groceries", emoji:"🧂", unit:"1kg",
    prices:{
      blinkit:  {price:24,  mrp:26, disc:8,  rating:4.8, avail:true, del:10},
      zepto:    {price:23,  mrp:26, disc:12, rating:4.6, avail:true, del:8 },
      instamart:{price:25,  mrp:26, disc:4,  rating:4.7, avail:true, del:15},
      bigbasket:{price:22,  mrp:26, disc:15, rating:4.9, avail:true, del:30},
      jiomart:  {price:23.5,mrp:26, disc:10, rating:4.5, avail:true, del:45},
      amazon:   {price:24.5,mrp:26, disc:6,  rating:4.6, avail:true, del:60},
    }},
  { id:4, name:"Britannia Good Day Butter Cookies", brand:"Britannia", category:"Biscuits", emoji:"🍪", unit:"216g",
    prices:{
      blinkit:  {price:35, mrp:40, disc:12, rating:4.4, avail:true,  del:10},
      zepto:    {price:33, mrp:40, disc:17, rating:4.3, avail:true,  del:8 },
      instamart:{price:36, mrp:40, disc:10, rating:4.5, avail:false, del:15},
      bigbasket:{price:32, mrp:40, disc:20, rating:4.7, avail:true,  del:30},
      jiomart:  {price:34, mrp:40, disc:15, rating:4.2, avail:true,  del:45},
      amazon:   {price:37, mrp:40, disc:8,  rating:4.4, avail:true,  del:60},
    }},
  { id:5, name:"Red Bull Energy Drink", brand:"Red Bull", category:"Beverages", emoji:"🥤", unit:"250ml",
    prices:{
      blinkit:  {price:115, mrp:125, disc:8,  rating:4.6, avail:true,  del:10},
      zepto:    {price:110, mrp:125, disc:12, rating:4.5, avail:true,  del:8 },
      instamart:{price:118, mrp:125, disc:6,  rating:4.4, avail:true,  del:15},
      bigbasket:{price:109, mrp:125, disc:13, rating:4.7, avail:true,  del:30},
      jiomart:  {price:112, mrp:125, disc:10, rating:4.3, avail:false, del:45},
      amazon:   {price:120, mrp:125, disc:4,  rating:4.5, avail:true,  del:60},
    }},
  { id:6, name:"Fortune Sunflower Oil", brand:"Fortune", category:"Groceries", emoji:"🫙", unit:"1L",
    prices:{
      blinkit:  {price:138, mrp:155, disc:11, rating:4.5, avail:true, del:10},
      zepto:    {price:132, mrp:155, disc:15, rating:4.4, avail:true, del:8 },
      instamart:{price:140, mrp:155, disc:10, rating:4.6, avail:true, del:15},
      bigbasket:{price:129, mrp:155, disc:17, rating:4.8, avail:true, del:30},
      jiomart:  {price:134, mrp:155, disc:14, rating:4.3, avail:true, del:45},
      amazon:   {price:142, mrp:155, disc:8,  rating:4.5, avail:true, del:60},
    }},
  { id:7, name:"Surf Excel Easy Wash", brand:"Surf Excel", category:"Home Care", emoji:"🧺", unit:"1kg",
    prices:{
      blinkit:  {price:215, mrp:240, disc:10, rating:4.6, avail:true,  del:10},
      zepto:    {price:209, mrp:240, disc:13, rating:4.4, avail:true,  del:8 },
      instamart:{price:218, mrp:240, disc:9,  rating:4.5, avail:true,  del:15},
      bigbasket:{price:205, mrp:240, disc:15, rating:4.7, avail:true,  del:30},
      jiomart:  {price:212, mrp:240, disc:12, rating:4.3, avail:true,  del:45},
      amazon:   {price:220, mrp:240, disc:8,  rating:4.5, avail:false, del:60},
    }},
  { id:8, name:"Colgate MaxFresh Toothpaste", brand:"Colgate", category:"Personal Care", emoji:"🪥", unit:"150g",
    prices:{
      blinkit:  {price:99, mrp:115, disc:14, rating:4.5, avail:true, del:10},
      zepto:    {price:95, mrp:115, disc:17, rating:4.3, avail:true, del:8 },
      instamart:{price:102,mrp:115, disc:11, rating:4.4, avail:true, del:15},
      bigbasket:{price:92, mrp:115, disc:20, rating:4.6, avail:true, del:30},
      jiomart:  {price:98, mrp:115, disc:15, rating:4.2, avail:true, del:45},
      amazon:   {price:105,mrp:115, disc:9,  rating:4.5, avail:true, del:60},
    }},
  { id:9, name:"Maggi 2-Min Noodles Masala", brand:"Nestlé", category:"Snacks", emoji:"🍜", unit:"70g×4",
    prices:{
      blinkit:  {price:58, mrp:68, disc:15, rating:4.6, avail:true, del:10},
      zepto:    {price:55, mrp:68, disc:19, rating:4.5, avail:true, del:8 },
      instamart:{price:60, mrp:68, disc:12, rating:4.7, avail:true, del:15},
      bigbasket:{price:54, mrp:68, disc:21, rating:4.8, avail:true, del:30},
      jiomart:  {price:57, mrp:68, disc:16, rating:4.4, avail:true, del:45},
      amazon:   {price:62, mrp:68, disc:9,  rating:4.6, avail:true, del:60},
    }},
  { id:10, name:"Dettol Original Soap", brand:"Dettol", category:"Personal Care", emoji:"🧼", unit:"125g×4",
    prices:{
      blinkit:  {price:155, mrp:180, disc:14, rating:4.7, avail:true, del:10},
      zepto:    {price:148, mrp:180, disc:18, rating:4.5, avail:true, del:8 },
      instamart:{price:159, mrp:180, disc:12, rating:4.6, avail:true, del:15},
      bigbasket:{price:142, mrp:180, disc:21, rating:4.8, avail:true, del:30},
      jiomart:  {price:152, mrp:180, disc:16, rating:4.4, avail:true, del:45},
      amazon:   {price:162, mrp:180, disc:10, rating:4.6, avail:true, del:60},
    }},
  { id:11, name:"Amul Butter", brand:"Amul", category:"Dairy", emoji:"🧈", unit:"500g",
    prices:{
      blinkit:  {price:260, mrp:275, disc:5,  rating:4.8, avail:true, del:10},
      zepto:    {price:255, mrp:275, disc:7,  rating:4.6, avail:true, del:8 },
      instamart:{price:262, mrp:275, disc:5,  rating:4.7, avail:true, del:15},
      bigbasket:{price:250, mrp:275, disc:9,  rating:4.9, avail:true, del:30},
      jiomart:  {price:258, mrp:275, disc:6,  rating:4.5, avail:true, del:45},
      amazon:   {price:265, mrp:275, disc:4,  rating:4.7, avail:true, del:60},
    }},
  { id:12, name:"Parle-G Original Biscuits", brand:"Parle", category:"Biscuits", emoji:"🟡", unit:"799g",
    prices:{
      blinkit:  {price:80, mrp:90, disc:11, rating:4.7, avail:true, del:10},
      zepto:    {price:77, mrp:90, disc:14, rating:4.5, avail:true, del:8 },
      instamart:{price:82, mrp:90, disc:9,  rating:4.6, avail:true, del:15},
      bigbasket:{price:75, mrp:90, disc:17, rating:4.8, avail:true, del:30},
      jiomart:  {price:79, mrp:90, disc:12, rating:4.4, avail:true, del:45},
      amazon:   {price:85, mrp:90, disc:6,  rating:4.6, avail:true, del:60},
    }},
];

const CATS = ["All","Dairy","Snacks","Groceries","Beverages","Biscuits","Home Care","Personal Care"];
const TRENDING = ["Amul Butter","Maggi Noodles","Dettol Soap","Surf Excel","Fortune Oil","Red Bull","Parle-G"];

/* ─── UTILS ──────────────────────────────────────────────────────────────── */
const rp = n => `₹${Number(n).toFixed(0)}`;
const cheapest = p => Object.entries(p).filter(([,v])=>v.avail).sort(([,a],[,b])=>a.price-b.price)[0];
const fastest  = p => Object.entries(p).filter(([,v])=>v.avail).sort(([,a],[,b])=>a.del-b.del)[0];
const maxDisc  = p => Math.max(...Object.values(p).filter(v=>v.avail).map(v=>v.disc));
const savings  = (p,k) => p[k] ? p[k].mrp - p[k].price : 0;

function buildLink(platform, productName) {
  const q = encodeURIComponent(productName);
  const links = {
    blinkit:   `https://blinkit.com/prn/search/?q=${q}&utm_source=pricebasket&aff_id=PB001`,
    zepto:     `https://www.zepto.app/search?q=${q}&ref=pricebasket`,
    instamart: `https://www.swiggy.com/instamart/search?query=${q}&utm_source=pricebasket`,
    bigbasket: `https://www.bigbasket.com/ps/?q=${q}&utm_source=pricebasket`,
    jiomart:   `https://www.jiomart.com/search/${q}?cid=aff_pricebasket`,
    amazon:    `https://www.amazon.in/s?k=${q}&tag=pricebasket-21`,
  };
  return links[platform] || "#";
}

/* ─── GLOBAL CSS ─────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html { scroll-behavior: smooth; }
  body {
    font-family: 'Inter', system-ui, sans-serif;
    background: #FFF8F2;
    color: #111827;
    min-height: 100vh;
    -webkit-font-smoothing: antialiased;
  }
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: #FFF3E8; }
  ::-webkit-scrollbar-thumb { background: #FFD0A8; border-radius: 99px; }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
  @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

  .anim-fadeup { animation: fadeUp .35s ease both; }

  .skel {
    background: linear-gradient(90deg,#F0EBE3 25%,#FFF3E8 50%,#F0EBE3 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s infinite;
    border-radius: 8px;
  }

  .hover-card { transition: transform .2s, box-shadow .2s; }
  .hover-card:hover { transform: translateY(-3px); box-shadow: 0 12px 32px rgba(255,107,0,0.14); }

  .pb-root {
    width: 100%;
    overflow-x: clip;
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }

  @media (hover: none) {
    .hover-card:hover { transform: none; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
  }

  @media (max-width: 420px) {
    .pb-hero-title { letter-spacing: -0.7px !important; }
  }

  button { cursor: pointer; font-family: inherit; transition: all .15s; }
  button:active { transform: scale(.97); }

  .no-scroll::-webkit-scrollbar { display: none; }
  .no-scroll { scrollbar-width: none; }
`;

function Badge({ bg, color, children, style={} }) {
  return (
    <span style={{
      display:"inline-flex", alignItems:"center", gap:4,
      padding:"3px 10px", borderRadius:99,
      fontSize:11, fontWeight:700, lineHeight:1.4,
      background:bg, color,
      ...style,
    }}>{children}</span>
  );
}

function Stars({ r }) {
  const full = Math.floor(r||0), empty = 5-full;
  return (
    <span style={{fontSize:11,letterSpacing:-1}}>
      <span style={{color:"#F59E0B"}}>{"★".repeat(full)}{"☆".repeat(empty)}</span>
      <span style={{color:G4,marginLeft:3,fontSize:11}}>{r}</span>
    </span>
  );
}

function PlatformIcon({ k, size=28 }) {
  const p = PLAT[k];
  return (
    <div style={{
      width:size, height:size, borderRadius:size*0.28,
      background:p.bg, display:"flex", alignItems:"center",
      justifyContent:"center", fontSize:size*0.55, flexShrink:0,
      border:`1.5px solid ${p.color}33`,
    }}>{p.emoji}</div>
  );
}

function Spinner() {
  return <div style={{width:20,height:20,border:`3px solid ${OM}`,borderTopColor:OR,borderRadius:"50%",animation:"spin 1s linear infinite"}}/>;
}

function LiveDot() {
  return (
    <span style={{position:"relative",display:"inline-flex",alignItems:"center",gap:6}}>
      <span style={{
        width:8,height:8,borderRadius:"50%",background:GN,display:"block",
        boxShadow:`0 0 0 0 ${GN}66`,animation:"pulse 2s infinite",
      }}/>
      Live prices
    </span>
  );
}

function Toast({ msg, type="success" }) {
  const bg = type==="success" ? BK : RE;
  return (
    <div style={{
      position:"fixed", bottom:"calc(env(safe-area-inset-bottom, 0px) + 16px)", left:"50%", transform:"translateX(-50%)",
      zIndex:9999, pointerEvents:"none",
      background:bg, color:WH,
      padding:"10px 18px", borderRadius:99,
      fontSize:13, fontWeight:600,
      boxShadow:"0 8px 32px rgba(0,0,0,0.22)",
      display:"flex", alignItems:"center", gap:10,
      border:`2px solid rgba(255,107,0,0.3)`,
      animation:"fadeUp .25s ease both",
      whiteSpace:"nowrap", maxWidth:"92vw", overflow:"hidden", textOverflow:"ellipsis",
    }}>
      {type==="success" ? "✅" : "⚠️"} {msg}
    </div>
  );
}

function CompareModal({ product, cart, onClose, onAddToCart, onRemoveFromCart, isMobile=false }) {
  const [redir, setRedir] = useState(null);
  const cheapK = cheapest(product.prices)?.[0];
  const fastK  = fastest(product.prices)?.[0];
  const inCart = cart.some(i=>i.id===product.id);

  const handleBuy = (key) => {
    setRedir(key);
    setTimeout(() => {
      window.open(buildLink(key, product.name), "_blank");
      setRedir(null);
      onClose();
    }, 700);
  };

  const cols = "1fr 90px 80px 70px 70px 100px";

  return (
    <div
      onClick={onClose}
      style={{
        position:"fixed", inset:0, zIndex:500,
        background:"rgba(0,0,0,0.6)",
        backdropFilter:"blur(6px)",
        display:"flex", alignItems:"center", justifyContent:"center",
        padding:16,
      }}>
      <div
        onClick={e=>e.stopPropagation()}
        style={{
          background:WH, borderRadius:isMobile?16:20, width:"100%", maxWidth:isMobile?560:900,
          maxHeight:isMobile?"96vh":"92vh", overflow:"hidden", display:"flex", flexDirection:"column",
          boxShadow:"0 40px 100px rgba(0,0,0,0.28)",
          animation:"fadeUp .25s ease both",
        }}>

        <div style={{
          padding:isMobile?"14px 14px":"18px 24px",
          background:`linear-gradient(135deg,${OP},${WH})`,
          borderBottom:`1.5px solid ${OM}`,
          display:"flex", alignItems:"center", gap:14,
          flexShrink:0,
        }}>
          <div style={{
            width:isMobile?44:56,height:isMobile?44:56,borderRadius:isMobile?12:14,
            background:OS,border:`2px solid ${OM}`,
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:isMobile?24:30,
          }}>{product.emoji}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:isMobile?15:18,fontWeight:800,color:BK,lineHeight:1.2}}>{product.name}</div>
            <div style={{fontSize:isMobile?12:13,color:G4,marginTop:3}}>{product.brand} · {product.unit} · Compare across 6 platforms</div>
            <div style={{display:"flex",gap:6,marginTop:7,flexWrap:"wrap"}}>
              {cheapK&&<Badge bg={OS} color={OD}>💰 Cheapest: {PLAT[cheapK].name} @ {rp(product.prices[cheapK].price)}</Badge>}
              {fastK &&<Badge bg={GNB} color={GN}>⚡ Fastest: {PLAT[fastK].name} · {product.prices[fastK].del} min</Badge>}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width:36,height:36,borderRadius:10,border:`1.5px solid ${G7}`,
              background:WH,fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",
              color:G4, flexShrink:0,
            }}>×</button>
        </div>

        {!isMobile && <div style={{
          display:"grid", gridTemplateColumns:cols, gap:8,
          padding:"8px 24px",
          fontSize:11,fontWeight:700,color:G4,textTransform:"uppercase",letterSpacing:".5px",
          background:G9, borderBottom:`1px solid ${G7}`,
          flexShrink:0,
        }}>
          <span>Platform</span>
          <span style={{textAlign:"center"}}>Price</span>
          <span style={{textAlign:"center"}}>Discount</span>
          <span style={{textAlign:"center"}}>Delivery</span>
          <span style={{textAlign:"center"}}>Rating</span>
          <span style={{textAlign:"center"}}>Action</span>
        </div>}

        <div style={{overflowY:"auto",flex:1,padding:"12px 16px",display:"flex",flexDirection:"column",gap:8}}>
          {Object.entries(product.prices).map(([key,d]) => {
            const p = PLAT[key];
            const isCheap = key===cheapK, isFast = key===fastK && !isCheap;
            const isR = redir===key;
            return (
              <div key={key} style={{
                display:isMobile?"flex":"grid",
                flexDirection:isMobile?"column":undefined,
                gridTemplateColumns:isMobile?undefined:cols,
                gap:8,
                alignItems:isMobile?"stretch":"center",
                padding:isMobile?"11px 12px":"12px 14px", borderRadius:14,
                border:`2px solid ${isCheap?OR:isFast?GN:G7}`,
                background:isCheap?"#FFFAF4":isFast?"#F0FFF4":WH,
                opacity:d.avail?1:.4,
                transition:"border-color .15s",
              }}>
                <div style={{display:"flex",alignItems:"center",gap:9}}>
                  <PlatformIcon k={key} size={isMobile?28:32}/>
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:BK}}>{p.name}</div>
                    <div style={{display:"flex",gap:4,marginTop:3}}>
                      {isCheap&&<span style={{fontSize:9,fontWeight:800,padding:"1px 6px",borderRadius:99,background:OS,color:OR}}>CHEAPEST</span>}
                      {isFast &&<span style={{fontSize:9,fontWeight:800,padding:"1px 6px",borderRadius:99,background:GNB,color:GN}}>FASTEST</span>}
                    </div>
                  </div>
                </div>
                {isMobile ? (
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,alignItems:"center"}}>
                    <div>
                      <div style={{fontSize:18,fontWeight:900,color:isCheap?OR:BK}}>{d.avail?rp(d.price):"—"}</div>
                      {d.avail&&<div style={{fontSize:11,color:G4,textDecoration:"line-through"}}>{rp(d.mrp)}</div>}
                    </div>
                    <div style={{textAlign:"right"}}>
                      {d.avail ? <Badge bg={GNB} color={GN}>{d.disc}% OFF</Badge> : <span style={{color:G5}}>—</span>}
                    </div>
                    <div style={{fontSize:12,fontWeight:700,color:OD}}>{d.avail?`${d.del} min`:"N/A"}</div>
                    <div style={{textAlign:"right"}}>{d.avail?<Stars r={d.rating}/>:'—'}</div>
                  </div>
                ) : (
                  <>
                    <div style={{textAlign:"center"}}>
                      <div style={{fontSize:20,fontWeight:900,color:isCheap?OR:BK}}>{d.avail?rp(d.price):"—"}</div>
                      {d.avail&&<div style={{fontSize:11,color:G4,textDecoration:"line-through"}}>{rp(d.mrp)}</div>}
                    </div>
                    <div style={{textAlign:"center"}}>
                      {d.avail
                        ?<Badge bg={GNB} color={GN}>{d.disc}% OFF</Badge>
                        :<span style={{color:G5}}>—</span>}
                    </div>
                    <div style={{textAlign:"center",fontSize:13,fontWeight:700,color:OD}}>
                      {d.avail?`${d.del} min`:<span style={{color:G5,fontSize:12}}>N/A</span>}
                    </div>
                    <div style={{textAlign:"center"}}>{d.avail?<Stars r={d.rating}/>:'—'}</div>
                  </>
                )}
                <div>
                  {d.avail?(
                    <button
                      onClick={()=>handleBuy(key)}
                      style={{
                        width:"100%",padding:"9px 0",borderRadius:10,border:"none",
                        fontSize:13,fontWeight:800,color:WH,
                        background:isR
                          ?`linear-gradient(135deg,${GN},#15803D)`
                          :isCheap
                            ?`linear-gradient(135deg,${OR},${OL})`
                            :`linear-gradient(135deg,#1F2937,#374151)`,
                        boxShadow:isCheap?"0 4px 12px rgba(255,107,0,0.3)":"none",
                      }}>
                      {isR?"Opening ✓":`Buy on ${p.short}`}
                    </button>
                  ):<span style={{display:"block",textAlign:"center",fontSize:12,color:G5}}>Out of stock</span>}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{
          padding:isMobile?"12px":"14px 24px",
          borderTop:`1.5px solid ${G7}`,
          display:"flex",gap:10,flexDirection:isMobile?"column":"row",
          background:G9,flexShrink:0,
        }}>
          <button
            onClick={()=>{ inCart?onRemoveFromCart(product.id):onAddToCart(product,cheapK); onClose(); }}
            style={{
              flex:1,padding:"13px 0",borderRadius:12,border:"none",
              fontSize:15,fontWeight:800,color:WH,
              background:inCart
                ?`linear-gradient(135deg,${RE},#B91C1C)`
                :`linear-gradient(135deg,${OR},${OL})`,
              boxShadow:inCart?"none":"0 4px 14px rgba(255,107,0,0.32)",
            }}>
            {inCart?"Remove from Cart ×":`Add Cheapest to Cart — Save ${rp(savings(product.prices,cheapK))}`}
          </button>
          <button
            onClick={onClose}
            style={{
              padding:"13px 22px",borderRadius:12,
              border:`1.5px solid ${G6}`,background:WH,
              fontSize:14,fontWeight:600,color:G3,
            }}>Close</button>
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product, cart, onOpen, onAddToCart }) {
  const cheapE = cheapest(product.prices);
  const fastE  = fastest(product.prices);
  const cheapK = cheapE?.[0];
  const fastK  = fastE?.[0];
  const maxD   = maxDisc(product.prices);
  const inCart = cart.some(i=>i.id===product.id);

  return (
    <div
      className="hover-card"
      style={{
        background:WH, borderRadius:18,
        border:`1.5px solid ${G7}`,
        overflow:"hidden",
        display:"flex", flexDirection:"column",
        boxShadow:"0 2px 8px rgba(0,0,0,0.05)",
      }}>
      <div style={{
        padding:"14px 14px 12px",
        background:`linear-gradient(135deg,${OP} 0%,${WH} 100%)`,
        borderBottom:`1px solid ${G7}`,
        display:"flex",gap:12,alignItems:"flex-start",
      }}>
        <div style={{
          width:60,height:60,borderRadius:14,flexShrink:0,
          background:OS,border:`2px solid ${OM}`,
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:34,
          boxShadow:"0 2px 8px rgba(255,107,0,0.1)",
        }}>{product.emoji}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{
            fontSize:14,fontWeight:800,color:BK,lineHeight:1.35,
            overflow:"hidden",display:"-webkit-box",
            WebkitLineClamp:2,WebkitBoxOrient:"vertical",
          }}>{product.name}</div>
          <div style={{fontSize:11,color:G4,marginTop:3}}>{product.brand} · {product.unit}</div>
          <div style={{display:"flex",gap:5,marginTop:7,flexWrap:"wrap"}}>
            {cheapE&&<Badge bg={OS} color={OD}>Best {rp(cheapE[1].price)}</Badge>}
            {fastE &&<Badge bg={GNB} color={GN}>⚡ {fastE[1].del}min</Badge>}
            {maxD>=15&&<Badge bg="#FEF3C7" color="#92400E">🔥 {maxD}% off</Badge>}
            {inCart&&<Badge bg={GNB} color={GN}>✓ In cart</Badge>}
          </div>
        </div>
        {cheapK&&<div style={{textAlign:"right",flexShrink:0}}>
          <div style={{fontSize:11,color:G5}}>Save up to</div>
          <div style={{fontSize:16,fontWeight:900,color:GN}}>{rp(savings(product.prices,cheapK))}</div>
        </div>}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",background:G7,gap:1,flex:1}}>
        {Object.entries(product.prices).map(([key,d]) => {
          const p = PLAT[key], isBest = key===cheapK;
          return (
            <div
              key={key}
              onClick={()=>onOpen(product)}
              style={{
                background:isBest?"#FFFAF4":WH,
                padding:"9px 8px",
                display:"flex",flexDirection:"column",gap:2,
                cursor:"pointer",
                opacity:d.avail?1:.38,
                borderTop:isBest?`2.5px solid ${OR}`:"2.5px solid transparent",
                transition:"background .12s",
              }}>
              <div style={{fontSize:10,fontWeight:700,color:p.color}}>{p.emoji} {p.short}</div>
              <div style={{fontSize:15,fontWeight:900,color:isBest?OR:BK,lineHeight:1}}>
                {d.avail?rp(d.price):"—"}
              </div>
              {d.avail&&<>
                <div style={{fontSize:10,fontWeight:600,color:GN}}>{d.disc}% off</div>
                <div style={{fontSize:10,color:G4}}>⏱ {d.del}m</div>
              </>}
            </div>
          );
        })}
      </div>

      <div style={{
        padding:"10px 12px",
        display:"flex",gap:8,
        borderTop:`1px solid ${G7}`,
        background:G9,
      }}>
        <button
          onClick={()=>onOpen(product)}
          style={{
            flex:1,padding:"9px 0",borderRadius:10,border:"none",
            fontSize:13,fontWeight:800,color:WH,
            background:`linear-gradient(135deg,${OR},${OL})`,
            boxShadow:"0 3px 10px rgba(255,107,0,0.28)",
          }}>
          📊 Compare & Buy
        </button>
        <button
          onClick={()=>onAddToCart(product,cheapK)}
          title="Add cheapest to cart"
          style={{
            width:40,height:40,borderRadius:10,
            border:`1.5px solid ${inCart?OR:G6}`,
            background:inCart?OS:WH,
            fontSize:16,display:"flex",alignItems:"center",justifyContent:"center",
          }}>
          {inCart?"✓":"🛒"}
        </button>
      </div>
    </div>
  );
}

function CartPanel({ cart, onRemove, onClose, isMobile=false }) {
  const total   = cart.reduce((s,i)=>s+i.price,0);
  const savings_ = cart.reduce((s,i)=>s+(i.mrp-i.price),0);

  return (
    <div style={{
      position:"fixed",right:0,top:isMobile?"env(safe-area-inset-top, 0px)":60,bottom:0,width:isMobile?"100vw":360,
      background:WH,zIndex:150,
      borderLeft:isMobile?"none":`1.5px solid ${OM}`,
      boxShadow:isMobile?"0 0 40px rgba(0,0,0,0.2)":"-8px 0 40px rgba(255,107,0,0.1)",
      display:"flex",flexDirection:"column",
    }}>
      <div style={{
        padding:"16px 18px",
        borderBottom:`1.5px solid ${OM}`,
        background:`linear-gradient(135deg,${OP},${WH})`,
        display:"flex",alignItems:"center",justifyContent:"space-between",
        flexShrink:0,
      }}>
        <div>
          <div style={{fontSize:16,fontWeight:800,color:BK}}>🛒 Smart Cart</div>
          <div style={{fontSize:12,color:G4,marginTop:2}}>{cart.length} item{cart.length!==1?"s":""}</div>
        </div>
        <button onClick={onClose} style={{
          width:34,height:34,borderRadius:9,border:`1.5px solid ${G6}`,
          background:WH,fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",color:G4,
        }}>×</button>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:12,display:"flex",flexDirection:"column",gap:8}}>
        {cart.length===0?(
          <div style={{textAlign:"center",padding:"60px 20px"}}>
            <div style={{fontSize:52,marginBottom:12}}>🛍️</div>
            <div style={{fontSize:15,fontWeight:700,color:BK,marginBottom:6}}>Cart is empty</div>
            <div style={{fontSize:13,color:G4}}>Search a product and add<br/>the cheapest option</div>
          </div>
        ):cart.map(item=>(
          <div key={item.id} style={{
            display:"flex",gap:10,padding:12,
            border:`1.5px solid ${G7}`,borderRadius:14,
            background:WH,
          }}>
            <div style={{
              width:44,height:44,borderRadius:12,
              background:OS,border:`1px solid ${OM}`,
              display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,flexShrink:0,
            }}>{item.emoji}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:13,fontWeight:700,color:BK,lineHeight:1.3,
                overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>
                {item.name}
              </div>
              <div style={{fontSize:11,color:G4,marginTop:2}}>
                {PLAT[item.platform]?.emoji} {PLAT[item.platform]?.name} · {item.unit}
              </div>
              <div style={{fontSize:15,fontWeight:900,color:OR,marginTop:4}}>{rp(item.price)}</div>
            </div>
            <button onClick={()=>onRemove(item.id)} style={{
              border:"none",background:"none",fontSize:18,color:G4,
              padding:"2px 6px",flexShrink:0,
              borderRadius:8,
            }}>×</button>
          </div>
        ))}
      </div>

      {cart.length>0&&(
        <div style={{padding:`14px 16px calc(env(safe-area-inset-bottom, 0px) + 14px)`,borderTop:`1.5px solid ${OM}`,background:G9,flexShrink:0}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
            <span style={{fontSize:14,fontWeight:600,color:G3}}>Total</span>
            <span style={{fontSize:24,fontWeight:900,color:BK}}>{rp(total)}</span>
          </div>
          <div style={{fontSize:13,color:GN,fontWeight:700,marginBottom:14}}>
            💰 Saving {rp(savings_)} vs MRP across all items
          </div>
          <button style={{
            width:"100%",padding:"14px 0",borderRadius:12,border:"none",
            fontSize:15,fontWeight:800,color:WH,
            background:`linear-gradient(135deg,${OR},${OL})`,
            boxShadow:"0 4px 16px rgba(255,107,0,0.32)",
          }}>
            Checkout — Smart Split →
          </button>
          <div style={{fontSize:11,color:G5,textAlign:"center",marginTop:8}}>
            Redirects to cheapest platform per item
          </div>
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{background:WH,borderRadius:18,border:`1.5px solid ${G7}`,overflow:"hidden",padding:14}}>
      <div style={{display:"flex",gap:12,marginBottom:12}}>
        <div className="skel" style={{width:60,height:60,borderRadius:14,flexShrink:0}}/>
        <div style={{flex:1,display:"flex",flexDirection:"column",gap:7}}>
          <div className="skel" style={{height:16,width:"80%"}}/>
          <div className="skel" style={{height:12,width:"50%"}}/>
          <div style={{display:"flex",gap:6}}>
            <div className="skel" style={{height:20,width:70,borderRadius:99}}/>
            <div className="skel" style={{height:20,width:60,borderRadius:99}}/>
          </div>
        </div>
      </div>
      <div className="skel" style={{height:100,borderRadius:10}}/>
      <div style={{display:"flex",gap:8,marginTop:10}}>
        <div className="skel" style={{flex:1,height:38,borderRadius:10}}/>
        <div className="skel" style={{width:40,height:38,borderRadius:10}}/>
      </div>
    </div>
  );
}

export default function PriceBasketModel() {
  const [query,    setQuery]    = useState("");
  const [activeQ,  setActiveQ]  = useState("");
  const [activeCat,setActiveCat]= useState("All");
  const [sortBy,   setSortBy]   = useState("relevance");
  const [searched, setSearched] = useState(false);
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [selected, setSelected] = useState(null);
  const [cart,     setCart]     = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [toast,    setToast]    = useState(null);
  const [vw,       setVw]       = useState(1280);
  const [vh,       setVh]       = useState(800);

  useEffect(() => {
    const onResize = () => {
      setVw(window.innerWidth || 1280);
      setVh(window.innerHeight || 800);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const isMobile = vw < 768;
  const isTablet = vw < 1024;
  const isNarrow = vw < 420;
  const isLandscapeCompact = vw < 900 && vh < 520;

  const showToast = (msg, type="success") => {
    setToast({msg,type});
    setTimeout(()=>setToast(null),2400);
  };

  const doSearch = useCallback((q=query)=>{
    if(!q.trim())return;
    setLoading(true); setActiveQ(q);
    setTimeout(()=>{
      const r = PRODUCTS.filter(p=>
        p.name.toLowerCase().includes(q.toLowerCase())||
        p.brand.toLowerCase().includes(q.toLowerCase())||
        p.category.toLowerCase().includes(q.toLowerCase())
      );
      setResults(r.length?r:PRODUCTS);
      setSearched(true); setLoading(false);
    },700);
  },[query]);

  const addToCart = (product, platformKey) => {
    if(cart.find(i=>i.id===product.id)){ showToast("Already in cart!","warn"); return; }
    const d = product.prices[platformKey];
    setCart(p=>[...p,{
      id:product.id, name:product.name, emoji:product.emoji,
      platform:platformKey, unit:product.unit,
      price:d.price, mrp:d.mrp,
    }]);
    showToast(`Added via ${PLAT[platformKey].name}!`);
  };
  const removeFromCart = id => {
    setCart(p=>p.filter(i=>i.id!==id));
    showToast("Removed from cart","warn");
  };

  const display = searched
    ? results
    : activeCat==="All" ? PRODUCTS : PRODUCTS.filter(p=>p.category===activeCat);

  const sorted = [...display].sort((a,b)=>{
    if(sortBy==="price-asc")  return (cheapest(a.prices)?.[1].price||999)-(cheapest(b.prices)?.[1].price||999);
    if(sortBy==="price-desc") return (cheapest(b.prices)?.[1].price||0)-(cheapest(a.prices)?.[1].price||0);
    if(sortBy==="fastest")    return (fastest(a.prices)?.[1].del||99)-(fastest(b.prices)?.[1].del||99);
    if(sortBy==="discount")   return maxDisc(b.prices)-maxDisc(a.prices);
    return 0;
  });

  return (
    <>
      <style>{GLOBAL_CSS}</style>

      <div className="pb-root">

      {toast&&<Toast msg={toast.msg} type={toast.type}/>} 
      {selected&&(
        <CompareModal
          product={selected}
          cart={cart}
          isMobile={isMobile}
          onClose={()=>setSelected(null)}
          onAddToCart={addToCart}
          onRemoveFromCart={removeFromCart}
        />
      )}
      {cartOpen&&(
        <CartPanel
          cart={cart}
          isMobile={isMobile}
          onRemove={removeFromCart}
          onClose={()=>setCartOpen(false)}
        />
      )}

      <div style={{display:"none"}}>
        <div
          style={{display:"flex",alignItems:"center",gap:9,cursor:"pointer",flexShrink:0}}
          onClick={()=>{setSearched(false);setQuery("");setActiveCat("All");}}>
          <div style={{
            width:36,height:36,borderRadius:10,
            background:`linear-gradient(135deg,${OR},${OL})`,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:18,boxShadow:`0 4px 12px ${OR}55`,
          }}>🛒</div>
          <div>
            <div style={{fontSize:17,fontWeight:900,color:BK,letterSpacing:"-.4px",lineHeight:1}}>
              Price<span style={{color:OR}}>Basket</span>
            </div>
            {!isMobile&&<div style={{fontSize:10,color:G4,fontWeight:500}}>Compare · Save · Redirect</div>}
          </div>
        </div>

        <div style={{
          flex:1,maxWidth:isMobile?"100%":440,
          display:"flex",alignItems:"center",
          background:OS,border:`1.5px solid ${OM}`,borderRadius:99,
          padding:isNarrow?"0 6px 0 10px":"0 8px 0 14px",gap:8,
          order:isMobile?3:0,width:isMobile?"100%":undefined,
          transition:"border-color .15s, box-shadow .15s",
        }}>
          <span style={{fontSize:15,flexShrink:0}}>🔍</span>
          <input
            value={query}
            onChange={e=>setQuery(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&doSearch()}
            placeholder="Search products, brands…"
            style={{
              flex:1,border:"none",outline:"none",
              background:"transparent",fontSize:14,color:BK,
              padding:"9px 0",
            }}
          />
          <button
            onClick={()=>doSearch()}
            style={{
              padding:isNarrow?"6px 10px":isMobile?"6px 12px":"6px 16px",borderRadius:99,
              background:OR,color:WH,border:"none",
              fontSize:isNarrow?12:13,fontWeight:700,flexShrink:0,
              boxShadow:`0 2px 8px ${OR}44`,
            }}>
            Search
          </button>
        </div>

        {!isMobile && <div style={{display:"flex",gap:4,marginLeft:"auto"}}>
          {["🔥 Deals","⭐ Wishlist"].map(l=>(
            <button key={l} style={{
              padding:"7px 12px",borderRadius:8,border:"none",
              background:"none",fontSize:13,fontWeight:500,color:G3,
            }}>{l}</button>
          ))}
        </div>}

        <button
          onClick={()=>setCartOpen(!cartOpen)}
          style={{
            display:"flex",alignItems:"center",gap:7,
            padding:"8px 16px",borderRadius:99,
            border:`1.5px solid ${cartOpen?OR:OM}`,
            background:cartOpen?OS:WH,
            color:OD,fontWeight:700,fontSize:13,
            position:"relative",
            boxShadow:cartOpen?`0 0 0 3px ${OR}22`:"none",
          }}>
          🛒 <span>Cart</span>
          {cart.length>0&&(
            <span style={{
              position:"absolute",top:-6,right:-6,
              width:20,height:20,borderRadius:"50%",
              background:RE,color:WH,
              fontSize:11,fontWeight:900,
              display:"flex",alignItems:"center",justifyContent:"center",
              border:`2px solid ${WH}`,
            }}>{cart.length}</span>
          )}
        </button>

        {!isMobile && <button style={{
          padding:"8px 20px",borderRadius:99,border:"none",
          background:`linear-gradient(135deg,${OR},${OL})`,
          color:WH,fontSize:13,fontWeight:800,flexShrink:0,
          boxShadow:`0 3px 10px ${OR}44`,
        }}>Sign In</button>}
      </div>

      <div style={{
        background:`linear-gradient(160deg,${OP} 0%,${OS} 45%,#FFE4C4 100%)`,
        borderBottom:`1.5px solid ${OM}`,
        padding:isLandscapeCompact
          ?"12px 12px 16px"
          :isMobile
          ?`20px 12px calc(env(safe-area-inset-bottom, 0px) + 24px)`
          :"44px 24px 52px",
        position:"relative",overflow:"hidden",
      }}>
        <div style={{
          position:"absolute",top:-80,right:-80,
          width:400,height:400,borderRadius:"50%",
          background:`radial-gradient(circle,${OR}18 0%,transparent 70%)`,
          pointerEvents:"none",
        }}/>
        <div style={{
          position:"absolute",bottom:-60,left:"15%",
          width:300,height:300,borderRadius:"50%",
          background:`radial-gradient(circle,${OL}12 0%,transparent 70%)`,
          pointerEvents:"none",
        }}/>

        <div style={{maxWidth:1100,margin:"0 auto",position:"relative"}}>
          <div style={{display:"grid",gridTemplateColumns:isTablet?"1fr":"1fr 1fr",gap:isMobile?24:48,alignItems:"center"}}>

            <div className="anim-fadeup">
              <div style={{
                display:"inline-flex",alignItems:"center",gap:8,
                background:WH,border:`1.5px solid ${OM}`,borderRadius:99,
                padding:"5px 14px 5px 10px",
                fontSize:12,fontWeight:600,color:OD,
                marginBottom:18,
                boxShadow:"0 2px 8px rgba(255,107,0,0.1)",
              }}>
                <LiveDot/> · 6 platforms · Updated every 10 min
              </div>

              <h1 style={{
                fontSize:"clamp(32px,4vw,50px)",
                fontWeight:900,color:BK,
                lineHeight:1.12,letterSpacing:"-1.5px",
                marginBottom:14,
              }} className="pb-hero-title">
                Compare prices.<br/>
                <span style={{color:OR,WebkitTextStroke:`1px ${OD}22`}}>Buy smarter.</span>
              </h1>

              <p style={{
                fontSize:16,color:G3,lineHeight:1.75,
                marginBottom:28,maxWidth:440,
              }}>
                Real-time prices from Blinkit, Zepto, Instamart & more.
                Click <strong>"Compare & Buy"</strong> → redirect to platform
                → we earn commission. <strong>You save money. Simple.</strong>
              </p>

              <div style={{
                display:"flex",alignItems:"center",gap:10,
                background:WH,border:`2px solid ${OM}`,borderRadius:16,
                padding:isMobile?"8px":"8px 8px 8px 18px",
                flexDirection:isMobile?"column":"row",
                boxShadow:`0 8px 32px rgba(255,107,0,0.14)`,
                marginBottom:16,maxWidth:520,
                transition:"box-shadow .2s, border-color .2s",
              }}>
                {!isMobile && <span style={{fontSize:18,flexShrink:0}}>🔍</span>}
                <input
                  value={query}
                  onChange={e=>setQuery(e.target.value)}
                  onKeyDown={e=>e.key==="Enter"&&doSearch()}
                  placeholder="Search milk, bread, chips, medicines…"
                  style={{
                    flex:1,border:"none",outline:"none",
                    background:"transparent",fontSize:15,color:BK,
                    padding:"5px 0",
                  }}
                />
                <button
                  onClick={()=>doSearch()}
                  disabled={loading}
                  style={{
                    flexShrink:0,padding:isMobile?"10px 14px":"12px 28px",borderRadius:12,
                    border:"none",color:WH,fontSize:15,fontWeight:800,
                    background:`linear-gradient(135deg,${OR},${OL})`,
                    boxShadow:`0 4px 16px ${OR}44`,
                    width:isMobile?"100%":undefined,
                    display:"flex",alignItems:"center",gap:8,
                  }}>
                  {loading?<Spinner/>:null}
                  {loading?"Searching…":"Search"}
                </button>
              </div>

              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <span style={{fontSize:12,fontWeight:700,color:G4,textTransform:"uppercase",letterSpacing:".5px"}}>
                  Trending:
                </span>
                {TRENDING.map(t=>(
                  <button key={t} onClick={()=>{setQuery(t);doSearch(t);}} style={{
                    padding:"5px 13px",borderRadius:99,
                    border:`1.5px solid ${OM}`,background:WH,
                    fontSize:12,fontWeight:600,color:OD,
                    boxShadow:"0 1px 4px rgba(0,0,0,0.06)",
                  }}>{t}</button>
                ))}
              </div>
            </div>

            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {Object.entries(PLAT).slice(0,isMobile?3:5).map(([key,p])=>{
                const ex = PRODUCTS[0].prices[key];
                return (
                  <div key={key} className="hover-card" style={{
                    background:WH,borderRadius:14,
                    border:`1.5px solid ${G7}`,
                    padding:"12px 16px",
                    display:"flex",alignItems:"center",gap:12,
                    boxShadow:"0 2px 8px rgba(0,0,0,0.05)",
                  }}>
                    <PlatformIcon k={key} size={40}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:14,fontWeight:700,color:BK}}>{p.name}</div>
                      <div style={{fontSize:12,color:G4}}>Delivers in {p.del} min · Affiliate via CueLinks</div>
                    </div>
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:16,fontWeight:900,color:OR}}>{rp(ex.price)}</div>
                      <div style={{fontSize:11,color:GN,fontWeight:700}}>Save {ex.disc}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div style={{
        background:WH,borderBottom:`1px solid ${G7}`,
        padding:isMobile?"10px 12px":"12px 24px",
      }}>
        <div style={{
          maxWidth:1100,margin:"0 auto",
          display:"flex",alignItems:"center",justifyContent:"center",
          gap:32,flexWrap:"wrap",
        }}>
          {[
            ["🛍","2.8M+","Products tracked"],
            ["🏪","6","Platforms connected"],
            ["💰","₹840+","Avg monthly savings"],
            ["⚡","8 min","Fastest delivery"],
            ["📡","10 min","Price refresh rate"],
            ["🔗","₹40–150","Earned per order"],
          ].map(([icon,val,label])=>(
            <div key={label} style={{display:"flex",alignItems:"center",gap:7,fontSize:13,color:G4,fontWeight:500}}>
              {icon}
              <strong style={{color:BK,fontWeight:800}}>{val}</strong>
              {label}
            </div>
          ))}
        </div>
      </div>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"28px 20px 80px"}}>
        {!searched&&(
          <div className="no-scroll" style={{
            display:"flex",gap:8,overflowX:"auto",
            paddingBottom:4,marginBottom:22,
          }}>
            {CATS.map(c=>(
              <button key={c} onClick={()=>setActiveCat(c)} style={{
                flexShrink:0,
                padding:"8px 18px",borderRadius:99,
                border:`1.5px solid ${activeCat===c?OR:G6}`,
                background:activeCat===c?OR:WH,
                color:activeCat===c?WH:G3,
                fontSize:13,fontWeight:activeCat===c?700:500,
                boxShadow:activeCat===c?`0 3px 12px ${OR}33`:"none",
              }}>{c}</button>
            ))}
          </div>
        )}

        <div style={{
          display:"flex",alignItems:isMobile?"stretch":"center",justifyContent:"space-between",
          flexDirection:isMobile?"column":"row",gap:isMobile?10:0,
          background:WH,border:`1.5px solid ${G7}`,borderRadius:12,
          padding:"10px 16px",marginBottom:20,
        }}>
          <div style={{fontSize:14,fontWeight:700,color:BK}}>
            {searched
              ?<>Results for <span style={{color:OR}}>"{activeQ}"</span></>
              :activeCat}
            <span style={{fontSize:13,fontWeight:400,color:G4,marginLeft:8}}>
              ({sorted.length} products)
            </span>
            {searched&&(
              <button onClick={()=>{setSearched(false);setQuery("");}} style={{
                marginLeft:10,padding:"3px 10px",borderRadius:99,
                border:`1px solid ${G6}`,background:G8,
                fontSize:12,color:G3,fontWeight:500,
              }}>× Clear</button>
            )}
          </div>
          <select
            value={sortBy}
            onChange={e=>setSortBy(e.target.value)}
            style={{
              padding:"7px 12px",borderRadius:9,
              border:`1.5px solid ${G6}`,
              background:G9,fontSize:13,fontWeight:500,
              color:BK,cursor:"pointer",outline:"none",width:isMobile?"100%":undefined,
            }}>
            <option value="relevance">Sort: Relevance</option>
            <option value="price-asc">Price: Low → High</option>
            <option value="price-desc">Price: High → Low</option>
            <option value="fastest">Fastest Delivery</option>
            <option value="discount">Most Discount</option>
          </select>
        </div>

        {loading?(
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(300px,1fr))",gap:16}}>
            {Array.from({length:6}).map((_,i)=><SkeletonCard key={i}/>) }
          </div>
        ):(
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(300px,1fr))",gap:16}}>
            {sorted.map((p,i)=>(
              <div key={p.id} style={{animation:`fadeUp .35s ease ${i*0.05}s both`}}>
                <ProductCard
                  product={p}
                  cart={cart}
                  onOpen={setSelected}
                  onAddToCart={addToCart}
                />
              </div>
            ))}
          </div>
        )}

        <div style={{marginTop:72,borderTop:`1.5px solid ${G7}`,paddingTop:56}}>

          <div style={{textAlign:"center",marginBottom:40}}>
            <Badge bg={OS} color={OD} style={{fontSize:13,padding:"6px 18px",marginBottom:14,display:"inline-flex"}}>
              How PriceBasket works
            </Badge>
            <h2 style={{fontSize:32,fontWeight:900,color:BK,marginBottom:10,letterSpacing:"-.5px"}}>
              Search → Compare → Redirect → Earn
            </h2>
            <p style={{fontSize:16,color:G4,maxWidth:540,margin:"0 auto"}}>
              We compare live prices across 6 platforms. You buy on the platform. We earn commission. You save money.
            </p>
          </div>

          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(240px,1fr))",gap:16,marginBottom:48}}>
            {[
              {emoji:"🔍",title:"Search any product",desc:"Type 'Amul Milk' — we show live prices from all 6 platforms scraped every 10 minutes."},
              {emoji:"📊",title:"Compare instantly",desc:"See cheapest price, fastest delivery, best discount — all side by side. No account needed."},
              {emoji:"🖱️",title:"Click Buy on Platform",desc:"Pick your preferred platform. Click the button. We build an affiliate tracking link."},
              {emoji:"🔗",title:"Redirect to platform",desc:"You land on Blinkit/Zepto's own product page. You complete checkout there safely."},
              {emoji:"✅",title:"Order confirmed",desc:"Platform confirms your order. Their affiliate system records our referral automatically."},
              {emoji:"💰",title:"We earn commission",desc:"CueLinks/vCommission credits ₹40–₹150 per order. BigBasket pays 2–5% of cart value."},
            ].map((s,i)=>(
              <div key={i} style={{
                background:WH,borderRadius:16,
                border:`1.5px solid ${G7}`,
                padding:"20px 18px",
                boxShadow:"0 2px 8px rgba(0,0,0,0.04)",
              }}>
                <div style={{
                  width:44,height:44,borderRadius:12,
                  background:OS,border:`1.5px solid ${OM}`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:24,marginBottom:12,
                }}>{s.emoji}</div>
                <div style={{
                  fontSize:11,fontWeight:700,color:OR,
                  textTransform:"uppercase",letterSpacing:".5px",
                  marginBottom:6,
                }}>Step {i+1}</div>
                <div style={{fontSize:14,fontWeight:700,color:BK,marginBottom:7}}>{s.title}</div>
                <div style={{fontSize:13,color:G4,lineHeight:1.65}}>{s.desc}</div>
              </div>
            ))}
          </div>

          <div style={{
            background:`linear-gradient(135deg,${OS},${OP})`,
            border:`1.5px solid ${OM}`,borderRadius:20,
            padding:isMobile?"20px 14px":"32px 32px 28px",marginBottom:32,
          }}>
            <div style={{textAlign:"center",marginBottom:24}}>
              <h3 style={{fontSize:22,fontWeight:800,color:BK,marginBottom:6}}>Affiliate Networks — Register Week 1</h3>
              <p style={{fontSize:14,color:G4}}>These are real Indian affiliate platforms where Blinkit, Zepto, BigBasket officially list their programs.</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(280px,1fr))",gap:12}}>
              {[
                {name:"CueLinks.com",     plat:"Blinkit · JioMart · BigBasket", earn:"₹40–117/order",  diff:"Easy",   url:"https://cuelinks.com"},
                {name:"vCommission.com",  plat:"Blinkit · Zepto · Instamart",   earn:"CPI + CPS",      diff:"Medium", url:"https://vcommission.com"},
                {name:"EarnKaro.com",     plat:"JioMart · BigBasket · Amazon",  earn:"2–5% of sale",   diff:"Easy",   url:"https://earnkaro.com"},
                {name:"Amazon Associates",plat:"Amazon Fresh",                   earn:"0.5–2.5% cart",  diff:"Easy",   url:"https://affiliate-program.amazon.in"},
              ].map((n,i)=>(
                <div key={i} style={{
                  background:WH,borderRadius:12,
                  border:`1.5px solid ${G7}`,
                  padding:"14px 16px",
                  display:"flex",alignItems:"center",gap:12,
                }}>
                  <div style={{
                    width:40,height:40,borderRadius:10,
                    background:OS,border:`1.5px solid ${OM}`,
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:11,fontWeight:800,color:OR,flexShrink:0,
                  }}>{n.name.slice(0,2)}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:700,color:BK}}>{n.name}</div>
                    <div style={{fontSize:11,color:G4,marginTop:2}}>{n.plat}</div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:13,fontWeight:800,color:GN}}>{n.earn}</div>
                    <Badge bg={GNB} color={GN} style={{fontSize:10,marginTop:4}}>{n.diff}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            background:`linear-gradient(135deg,#1A0A00,#2D1200)`,
            borderRadius:20,padding:isMobile?"16px 12px":"28px 32px",
            display:"grid",gridTemplateColumns:isMobile?"repeat(2,minmax(0,1fr))":"repeat(auto-fill,minmax(180px,1fr))",gap:10,
          }}>
            {[
              ["Mobile App",     "Flutter iOS + Android"],
              ["Web Admin",      "React.js + Tailwind"],
              ["Backend API",    "Node.js 20 + FastAPI"],
              ["Database",       "PostgreSQL + Redis"],
              ["Search",         "Elasticsearch + Fuzzy"],
              ["Real-Time Data", "mitmproxy + EC2 replay"],
              ["Scrapers",       "Playwright + BrightData"],
              ["AI Matching",    "Sentence Transformers"],
              ["Affiliate",      "CueLinks + vCommission"],
              ["DevOps",         "GitHub Actions + Copilot"],
              ["Deployment",     "EC2 → ECS → EKS"],
              ["Domain",         "pricebasket.in"],
            ].map(([label,val])=>(
              <div key={label} style={{
                background:"rgba(255,107,0,0.12)",borderRadius:10,
                padding:"11px 13px",
                border:"1px solid rgba(255,107,0,0.18)",
              }}>
                <div style={{fontSize:10,textTransform:"uppercase",letterSpacing:".8px",color:"rgba(255,255,255,0.4)",fontWeight:700,marginBottom:3}}>{label}</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,0.85)",fontWeight:600}}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
