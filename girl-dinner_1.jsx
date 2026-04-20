import { useState, useEffect, useRef, useCallback } from "react";

const STORE_ICONS = { "trader joe's": "🛒", "whole foods": "🥑", "aldi": "💰", "wegmans": "✨", "target": "🎯", "walmart": "🏪", "costco": "💎", "safeway": "🛍️", "kroger": "🌽", "publix": "🌿", "stop & shop": "🧺", "giant": "🏬", "food lion": "🦁", "h-e-b": "⭐", "meijer": "🌻", "sprouts": "🌱", "acme": "🏠", "shoprite": "🛍️", "wawa": "☕", "default": "🛒" };
const getIcon = (name) => { const n = name.toLowerCase(); for (const [k, v] of Object.entries(STORE_ICONS)) { if (n.includes(k)) return v; } return STORE_ICONS.default; };

const GIGI_SUGGESTIONS = [
  "What's for dinner under $10?",
  "Quick 15-min meals",
  "Best deals this week?",
  "Healthy meal prep ideas",
  "What's in season right now?",
  "Date night dinner ideas",
];

const callClaude = async (system, userMsg, useSearch = false) => {
  const body = { model: "claude-sonnet-4-20250514", max_tokens: 1000, system, messages: [{ role: "user", content: userMsg }] };
  if (useSearch) body.tools = [{ type: "web_search_20250305", name: "web_search" }];
  const resp = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await resp.json();
  return data.content?.map(b => b.text || "").filter(Boolean).join("\n") || "";
};

export default function GirlDinner() {
  const [dark, setDark] = useState(false);
  const [zip, setZip] = useState("");
  const [entered, setEntered] = useState(false);
  const [editingZip, setEditingZip] = useState(false);
  const [tempZip, setTempZip] = useState("");
  const [activeTab, setActiveTab] = useState("gigi");
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [stores, setStores] = useState([]);
  const [deals, setDeals] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [dealsLoading, setDealsLoading] = useState(false);
  const [recipesLoading, setRecipesLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [gigiMessages, setGigiMessages] = useState([]);
  const [gigiInput, setGigiInput] = useState("");
  const [gigiLoading, setGigiLoading] = useState(false);
  const chatEndRef = useRef(null);
  const zipEditRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [gigiMessages]);

  const fetchStores = useCallback(async (z) => {
    setStoresLoading(true);
    try {
      const raw = await callClaude(
        `You find real supermarkets near a US ZIP code. Return ONLY a JSON array, no markdown, no backticks, no explanation. Each object: {"name":"Store Name","address":"Full address","dist":"X.X mi"}. Return the 6 closest real grocery stores/supermarkets with accurate names and addresses.`,
        `Find the 6 closest grocery stores and supermarkets near ZIP code ${z}. Use real store names and addresses.`, true
      );
      const match = raw.replace(/```json|```/g, "").match(/\[[\s\S]*?\]/);
      if (match) setStores(JSON.parse(match[0]).map((s, i) => ({ ...s, id: i, icon: getIcon(s.name) })));
    } catch (e) { console.error(e); }
    setStoresLoading(false);
  }, []);

  const fetchDeals = useCallback(async (z, names) => {
    setDealsLoading(true);
    try {
      const raw = await callClaude(
        `You find current real grocery deals. Return ONLY a JSON array. Each object: {"item":"Product","price":"$X.XX","was":"$X.XX","store":"Store Name","tag":"emoji + label","pct":"XX%"}. Tags: "🔥 Hot Deal", "💎 Best Value", "⚡ Flash Sale", "✨ Staff Pick", "🆕 New Price". Return 8 realistic current weekly deals.`,
        `Search for this week's real grocery deals and weekly ad sales near ZIP ${z} from: ${names}. Find actual current promotions and sale items.`, true
      );
      const match = raw.replace(/```json|```/g, "").match(/\[[\s\S]*?\]/);
      if (match) setDeals(JSON.parse(match[0]).map((d, i) => ({ ...d, id: i })));
    } catch (e) { console.error(e); }
    setDealsLoading(false);
  }, []);

  const fetchRecipes = useCallback(async (z, names) => {
    setRecipesLoading(true);
    try {
      const raw = await callClaude(
        `You suggest budget recipes using local store ingredients. Return ONLY a JSON array. Each object: {"title":"Name","time":"XX min","cost":"$X.XX","vibe":"2-3 word vibe","emoji":"emoji","ingredients":["item1","item2","item3","item4","item5"],"store":"Store","steps":["Step 1","Step 2","Step 3"]}. Vibes: trendy Gen Z like "Clean Girl Energy","Cozy Night In","That Girl Lunch","Hot Girl Summer". Return 5 recipes under $12.`,
        `Create 5 trendy budget dinner recipes using ingredients from: ${names} near ZIP ${z}.`, true
      );
      const colors = ["#FFE4B5", "#FFB3C6", "#C8E6C9", "#E1BEE7", "#B3E5FC"];
      const match = raw.replace(/```json|```/g, "").match(/\[[\s\S]*?\]/);
      if (match) setRecipes(JSON.parse(match[0]).map((r, i) => ({ ...r, id: i, color: colors[i % 5] })));
    } catch (e) { console.error(e); }
    setRecipesLoading(false);
  }, []);

  const loadData = useCallback(async (z) => {
    setStores([]); setDeals([]); setRecipes([]);
    await fetchStores(z);
  }, [fetchStores]);

  useEffect(() => {
    if (stores.length > 0 && deals.length === 0 && !dealsLoading) {
      const names = stores.map(s => s.name).join(", ");
      fetchDeals(zip, names);
      fetchRecipes(zip, names);
      setLastUpdated(new Date());
    }
  }, [stores]);

  const handleZipSubmit = () => { if (zip.length === 5 && /^\d+$/.test(zip)) { setEntered(true); setEditingZip(false); loadData(zip); } };
  const openZipEdit = () => { setTempZip(zip); setEditingZip(true); setTimeout(() => zipEditRef.current?.focus(), 50); };
  const confirmZipEdit = () => { if (tempZip.length === 5 && /^\d+$/.test(tempZip)) { setZip(tempZip); setEditingZip(false); setDeals([]); setRecipes([]); loadData(tempZip); } };

  const sendGigiMessage = async (text) => {
    const msg = text || gigiInput;
    if (!msg.trim()) return;
    const newMsgs = [...gigiMessages, { role: "user", text: msg }];
    setGigiMessages(newMsgs); setGigiInput(""); setGigiLoading(true);
    try {
      const ctx = stores.length > 0 ? `Nearby stores: ${stores.map(s => `${s.name} (${s.dist})`).join(", ")}.` : "";
      const dealCtx = deals.length > 0 ? ` Current deals: ${deals.slice(0, 5).map(d => `${d.item} ${d.price} at ${d.store}`).join("; ")}.` : "";
      const history = newMsgs.slice(-8).map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }));
      const resp = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000,
          system: `You are Gigi ✦ the AI shopping assistant for Girl Dinner. Smart, witty best friend who knows cooking and loves deals. Playful, empowering, never condescending. Use light emoji. Keep responses 2-5 sentences. ZIP: ${zip}. ${ctx}${dealCtx}`,
          messages: history, tools: [{ type: "web_search_20250305", name: "web_search" }] }),
      });
      const data = await resp.json();
      const reply = data.content?.map(b => b.text || "").filter(Boolean).join("\n") || "Hmm, try again? ✦";
      setGigiMessages(prev => [...prev, { role: "assistant", text: reply }]);
    } catch { setGigiMessages(prev => [...prev, { role: "assistant", text: "Connection hiccup 💫 Try again!" }]); }
    setGigiLoading(false);
  };

  const Shimmer = ({ w = "100%", h = 16, r = 8 }) => (
    <div style={{ width: w, height: h, borderRadius: r, background: dark ? "rgba(255,255,255,0.06)" : "rgba(232,99,122,0.08)", animation: "shimPulse 1.5s ease-in-out infinite" }} />
  );

  return (
    <div style={{ minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Cormorant+Garamond:ital,wght@0,300;0,600;1,300;1,600&family=Bodoni+Moda:ital,opsz,wght@0,6..96,400;0,6..96,700;0,6..96,900;1,6..96,400;1,6..96,700;1,6..96,900&family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        @property --gd-angle{syntax:'<angle>';initial-value:0deg;inherits:false}
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        .gd-app{min-height:100vh;font-family:'Inter',sans-serif;overflow-x:hidden;transition:background 0.6s ease}
        .gd-app.lm{background:linear-gradient(155deg,#FFF0F5 0%,#FFE4D6 25%,#FFDDD0 50%,#FFE8DC 75%,#FFF5F0 100%);background-size:300% 300%;animation:gdrift 12s ease infinite;color:#2C1810}
        .gd-app.dm{background:linear-gradient(180deg,#030609 0%,#071228 20%,#0A1535 50%,#060E24 80%,#020508 100%);color:#F0F4FF}
        @keyframes gdrift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes shimPulse{0%,100%{opacity:0.4}50%{opacity:0.8}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px) scale(0.95)}to{opacity:1;transform:none}}
        .glass-bg{position:fixed;inset:0;pointer-events:none;z-index:0;overflow:hidden}
        .gfl{position:absolute;pointer-events:none;filter:blur(0.5px);animation-timing-function:ease-in-out;animation-iteration-count:infinite;animation-direction:alternate}
        .lm .gfl svg{filter:drop-shadow(0 4px 12px rgba(232,99,122,0.08))}
        .dm .gfl svg{filter:drop-shadow(0 4px 16px rgba(0,0,0,0.3))}
        .lm .hf{fill:rgba(232,99,122,0.12);stroke:rgba(255,255,255,0.4);stroke-width:1}
        .lm .hfa{fill:rgba(255,182,193,0.10);stroke:rgba(255,255,255,0.35);stroke-width:1}
        .dm .hf{fill:rgba(79,195,247,0.07);stroke:rgba(255,255,255,0.06);stroke-width:0.5}
        .dm .hfa{fill:rgba(255,255,255,0.04);stroke:rgba(255,255,255,0.05);stroke-width:0.5}
        .gfl:nth-child(1){top:5%;left:-2%;width:140px;animation:f1 18s ease-in-out infinite alternate}
        .gfl:nth-child(2){top:22%;right:-3%;width:100px;animation:f2 22s ease-in-out infinite alternate}
        .gfl:nth-child(3){top:48%;left:8%;width:120px;animation:f3 20s ease-in-out infinite alternate}
        .gfl:nth-child(4){top:68%;right:2%;width:90px;animation:f4 24s ease-in-out infinite alternate}
        .gfl:nth-child(5){top:35%;left:55%;width:80px;animation:f5 16s ease-in-out infinite alternate}
        .gfl:nth-child(6){top:82%;left:12%;width:110px;animation:f6 21s ease-in-out infinite alternate}
        .gfl:nth-child(7){top:12%;left:40%;width:70px;animation:f7 19s ease-in-out infinite alternate}
        .gfl:nth-child(8){top:58%;right:18%;width:95px;animation:f8 23s ease-in-out infinite alternate}
        @keyframes f1{0%{transform:translate(0,0) rotate(-10deg)}100%{transform:translate(35px,50px) rotate(5deg)}}
        @keyframes f2{0%{transform:translate(0,0) rotate(15deg)}100%{transform:translate(-40px,35px) rotate(-5deg)}}
        @keyframes f3{0%{transform:translate(0,0) rotate(5deg)}100%{transform:translate(25px,-40px) rotate(15deg)}}
        @keyframes f4{0%{transform:translate(0,0) rotate(-8deg)}100%{transform:translate(-30px,-25px) rotate(8deg)}}
        @keyframes f5{0%{transform:translate(0,0) rotate(12deg)}100%{transform:translate(-20px,40px) rotate(-3deg)}}
        @keyframes f6{0%{transform:translate(0,0) rotate(-5deg)}100%{transform:translate(40px,-20px) rotate(10deg)}}
        @keyframes f7{0%{transform:translate(0,0) rotate(8deg)}100%{transform:translate(15px,30px) rotate(-8deg)}}
        @keyframes f8{0%{transform:translate(0,0) rotate(-12deg)}100%{transform:translate(-25px,-35px) rotate(6deg)}}
        .sbg{position:fixed;inset:0;pointer-events:none;z-index:0;opacity:0;transition:opacity 0.6s}
        .dm .sbg{opacity:1;background:radial-gradient(ellipse 35% 45% at 50% 0%,rgba(255,255,255,0.10) 0%,transparent 70%)}
        .gc{position:relative;border-radius:28px;padding:1.5px;isolation:isolate;transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1)}
        .gc::before{content:'';position:absolute;inset:0;border-radius:28px;padding:2px;animation:gbt 12s linear infinite;z-index:-1;pointer-events:none;-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);mask-composite:exclude}
        .lm .gc::before{background:conic-gradient(from var(--gd-angle),transparent 0deg,transparent 40deg,rgba(255,182,193,0.10) 55deg,rgba(255,182,193,0.40) 68deg,rgba(255,215,0,0.75) 78deg,rgba(255,255,255,1) 88deg,rgba(232,99,122,0.80) 98deg,rgba(212,175,55,0.45) 110deg,rgba(255,182,193,0.10) 125deg,transparent 140deg,transparent 360deg)}
        .dm .gc::before{background:conic-gradient(from var(--gd-angle),transparent 0deg,transparent 38deg,rgba(255,255,255,0.03) 52deg,rgba(255,255,255,0.20) 66deg,rgba(255,255,255,0.65) 78deg,rgba(255,255,255,1) 88deg,rgba(200,230,255,0.70) 98deg,rgba(79,195,247,0.50) 110deg,rgba(79,195,247,0.10) 124deg,transparent 140deg,transparent 360deg)}
        @keyframes gbt{to{--gd-angle:360deg}}
        .gc::after{content:'';position:absolute;inset:-4px;border-radius:32px;padding:4px;z-index:-2;pointer-events:none;animation:gbr 10s ease-in-out infinite;-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);mask-composite:exclude}
        .lm .gc::after{box-shadow:0 0 12px 4px rgba(232,99,122,0.22),0 0 28px 6px rgba(232,99,122,0.10)}
        .dm .gc::after{box-shadow:0 0 10px 3px rgba(79,195,247,0.15),0 0 24px 6px rgba(79,195,247,0.08)}
        @keyframes gbr{0%,100%{opacity:0.45}50%{opacity:1}}
        .gs{position:relative;width:100%;height:100%;border-radius:26.5px;overflow:hidden;transition:background 0.3s ease}
        .lm .gs{background:rgba(255,255,255,0.30);backdrop-filter:blur(24px) saturate(180%) brightness(1.04);-webkit-backdrop-filter:blur(24px) saturate(180%) brightness(1.04);border:1px solid rgba(255,200,210,0.30);box-shadow:inset 0 1px 0 rgba(255,255,255,0.50),0 2px 8px rgba(0,0,0,0.04)}
        .dm .gs{background:rgba(255,255,255,0.045);backdrop-filter:blur(32px) saturate(200%);-webkit-backdrop-filter:blur(32px) saturate(200%);border:1px solid rgba(255,255,255,0.08);box-shadow:inset 0 1px 0 rgba(255,255,255,0.10),0 4px 16px rgba(0,0,0,0.40)}
        .gc:hover{transform:translateY(-3px) scale(1.008)}.gc:hover::before{animation-duration:6s}
        .sp{position:absolute;top:0;left:0;right:0;height:60%;background:radial-gradient(ellipse 50% 50% at 50% -5%,rgba(255,255,255,0.28) 0%,rgba(255,255,255,0.14) 25%,rgba(255,255,255,0.06) 50%,transparent 75%);pointer-events:none;z-index:1;border-radius:26.5px 26.5px 0 0;opacity:0;transition:opacity 0.3s}.dm .sp{opacity:1}
        .sm{border-radius:20px;padding:1px}.sm::before{border-radius:20px;padding:1.5px}.sm::after{border-radius:24px;inset:-3px;padding:3px}.sm .gs{border-radius:19px}.sm .sp{border-radius:19px 19px 0 0}
        .lg{font-family:'Bodoni Moda',serif;font-weight:400;font-style:italic;color:#E8637A}.dm .lg{color:#FF8FAB}
        .ld{font-family:'Playfair Display',serif;font-weight:900;letter-spacing:-0.02em}.lm .ld{color:#2C1810}.dm .ld{color:#fff;text-shadow:0 0 10px rgba(255,255,255,0.90),0 0 25px rgba(255,255,255,0.50)}
        .tl{font-family:'Cormorant Garamond',serif;font-style:italic;font-weight:300;letter-spacing:0.02em}.lm .tl{color:rgba(44,24,16,0.65)}.dm .tl{color:rgba(240,244,255,0.60);text-shadow:0 0 12px rgba(255,255,255,0.25)}
        .sh{font-family:'Playfair Display',serif;font-weight:700;letter-spacing:-0.01em}.dm .sh{text-shadow:0 0 20px rgba(255,255,255,0.45)}
        .gb{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 32px;border-radius:100px;cursor:pointer;border:none;isolation:isolate;font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:13px;letter-spacing:0.10em;text-transform:uppercase;transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1)}
        .gb::before{content:'';position:absolute;inset:0;border-radius:100px;padding:1.5px;background:conic-gradient(from var(--gd-angle),transparent 0deg,transparent 45deg,rgba(212,175,55,0.5) 70deg,rgba(255,255,255,1) 85deg,rgba(232,99,122,0.7) 100deg,transparent 118deg,transparent 360deg);animation:gbt 10s linear infinite;z-index:-1;-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);mask-composite:exclude}
        .lm .gb{background:rgba(255,255,255,0.38);backdrop-filter:blur(16px);color:#A63850;box-shadow:inset 0 1px 0 rgba(255,255,255,0.60)}
        .dm .gb{background:rgba(255,255,255,0.08);backdrop-filter:blur(16px);color:#fff;text-shadow:0 0 10px rgba(255,255,255,0.90),0 0 25px rgba(255,255,255,0.50)}
        .dm .gb::before{background:conic-gradient(from var(--gd-angle),transparent 0deg,transparent 38deg,rgba(255,255,255,0.20) 66deg,rgba(255,255,255,1) 88deg,rgba(79,195,247,0.50) 110deg,transparent 135deg,transparent 360deg)}
        .gb:hover{transform:translateY(-3px) scale(1.04)}.gb:active{transform:scale(0.96)}
        .iw{position:relative;border-radius:22px}.iw::before{content:'';position:absolute;inset:0;border-radius:22px;padding:2px;background:conic-gradient(from var(--gd-angle),transparent 0deg,transparent 60deg,rgba(212,175,55,0.5) 78deg,rgba(255,255,255,0.95) 90deg,rgba(232,99,122,0.7) 102deg,transparent 120deg,transparent 360deg);animation:gbt 9s linear infinite;opacity:0;transition:opacity 0.35s;z-index:-1;-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);mask-composite:exclude}.iw:focus-within::before{opacity:1}
        .gi{width:100%;padding:18px 56px 18px 24px;border-radius:20px;font-family:'Inter',sans-serif;font-size:18px;font-weight:500;outline:none;transition:all 0.3s;border:1.5px solid transparent}
        .lm .gi{background:rgba(255,255,255,0.30);backdrop-filter:blur(20px);border-color:rgba(255,200,210,0.50);color:#A63850;box-shadow:inset 0 1px 0 rgba(255,255,255,0.70)}.lm .gi::placeholder{color:rgba(139,94,106,0.55);font-style:italic}.lm .gi:focus{background:rgba(255,255,255,0.50);border-color:rgba(232,99,122,0.60)}
        .dm .gi{background:rgba(255,255,255,0.07);backdrop-filter:blur(20px);border-color:rgba(255,255,255,0.16);color:#F0F4FF}.dm .gi::placeholder{color:rgba(200,210,230,0.40);font-style:italic}.dm .gi:focus{background:rgba(255,255,255,0.12);border-color:rgba(79,195,247,0.40)}
        .tb{display:flex;gap:4px;padding:4px;border-radius:16px}.lm .tb{background:rgba(255,255,255,0.25)}.dm .tb{background:rgba(255,255,255,0.04)}
        .tt{flex:1;padding:10px 8px;border-radius:12px;border:none;cursor:pointer;font-family:'Space Grotesk',sans-serif;font-weight:600;font-size:11px;letter-spacing:0.04em;text-transform:uppercase;transition:all 0.3s;background:transparent;white-space:nowrap}
        .lm .tt{color:rgba(44,24,16,0.5)}.dm .tt{color:rgba(240,244,255,0.4)}
        .lm .tt.on{background:rgba(255,255,255,0.55);color:#A63850;box-shadow:0 2px 12px rgba(232,99,122,0.15)}.dm .tt.on{background:rgba(255,255,255,0.10);color:#fff;text-shadow:0 0 10px rgba(255,255,255,0.6)}
        .dt{display:inline-block;padding:4px 10px;border-radius:100px;font-size:11px;font-weight:700;font-family:'Space Grotesk',sans-serif}.lm .dt{background:rgba(232,99,122,0.12);color:#C94D64}.dm .dt{background:rgba(79,195,247,0.12);color:#93D5F5}
        .po{font-family:'Space Grotesk',sans-serif;font-weight:800;font-size:20px}.lm .po{color:#E8637A}.dm .po{color:#4FC3F7;text-shadow:0 0 12px rgba(79,195,247,0.5)}
        .gm{max-width:88%;padding:12px 16px;border-radius:20px;font-size:14px;line-height:1.6;animation:fadeIn 0.25s ease;word-wrap:break-word}
        .gm.u{align-self:flex-end;border-radius:20px 20px 4px 20px}.lm .gm.u{background:linear-gradient(135deg,#E8637A,#D4AF37);color:#fff}.dm .gm.u{background:linear-gradient(135deg,#162660,#0A1535);color:#fff;border:1px solid rgba(79,195,247,0.2)}
        .gm.b{align-self:flex-start;border-radius:20px 20px 20px 4px}.lm .gm.b{background:rgba(255,255,255,0.55);color:#2C1810}.dm .gm.b{background:rgba(255,255,255,0.08);color:#F0F4FF}
        .gs2{padding:8px 14px;border-radius:100px;font-size:12px;cursor:pointer;border:none;font-family:'Inter',sans-serif;transition:all 0.2s}.lm .gs2{background:rgba(232,99,122,0.08);color:#C94D64}.lm .gs2:hover{background:rgba(232,99,122,0.18)}.dm .gs2{background:rgba(79,195,247,0.08);color:#93D5F5}.dm .gs2:hover{background:rgba(79,195,247,0.18)}
        .tg{width:52px;height:28px;border-radius:100px;cursor:pointer;border:none;position:relative;transition:background 0.3s}.lm .tg{background:rgba(232,99,122,0.2)}.dm .tg{background:rgba(79,195,247,0.2)}.tg .kn{position:absolute;top:3px;width:22px;height:22px;border-radius:50%;transition:all 0.3s cubic-bezier(0.34,1.56,0.64,1)}.lm .tg .kn{left:3px;background:linear-gradient(135deg,#E8637A,#D4AF37)}.dm .tg .kn{left:27px;background:linear-gradient(135deg,#4FC3F7,#fff);box-shadow:0 0 12px rgba(79,195,247,0.5)}
        .pd{width:8px;height:8px;border-radius:50%;animation:pdot 1.2s ease-in-out infinite}@keyframes pdot{0%,100%{opacity:0.3;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}.lm .pd{background:#E8637A}.dm .pd{background:#4FC3F7}
        .mo{position:fixed;inset:0;z-index:900;display:flex;align-items:flex-end;justify-content:center;animation:fadeIn 0.3s}.lm .mo{background:rgba(255,200,210,0.3);backdrop-filter:blur(8px)}.dm .mo{background:rgba(0,0,0,0.6);backdrop-filter:blur(8px)}
        .mc{width:100%;max-width:420px;max-height:85vh;overflow-y:auto;animation:slideUp 0.35s cubic-bezier(0.34,1.56,0.64,1)}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}.lm ::-webkit-scrollbar-thumb{background:rgba(232,99,122,0.25);border-radius:4px}.dm ::-webkit-scrollbar-thumb{background:rgba(79,195,247,0.25);border-radius:4px}
      `}</style>

      <div className={`gd-app ${dark?"dm":"lm"}`}>
        <div className="sbg"/>
        <div className="glass-bg">{[...Array(8)].map((_,i)=>(<div key={i} className="gfl"><svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path className={i%2===0?"hf":"hfa"} d="M50 88 C25 65 2 50 2 30 C2 14 14 2 30 2 C39 2 46 6 50 14 C54 6 61 2 70 2 C86 2 98 14 98 30 C98 50 75 65 50 88Z"/></svg></div>))}</div>

        {/* TOP BAR */}
        <div style={{position:"sticky",top:0,zIndex:100,padding:"12px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderBottom:dark?"1px solid rgba(255,255,255,0.06)":"1px solid rgba(255,200,210,0.3)",background:dark?"rgba(6,14,36,0.8)":"rgba(255,240,245,0.7)"}}>
          <div style={{display:"flex",alignItems:"baseline",gap:4}}>
            <span className="lg" style={{fontSize:22}}>Girl</span>
            <span className="ld" style={{fontSize:20}}>Dinner</span>
            <span style={{fontSize:10,marginLeft:2}}>✦</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {entered&&!editingZip&&(<button onClick={openZipEdit} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:100,border:"none",cursor:"pointer",fontFamily:"'Space Grotesk',sans-serif",fontSize:12,fontWeight:600,background:dark?"rgba(79,195,247,0.10)":"rgba(232,99,122,0.08)",color:dark?"#93D5F5":"#C94D64"}}>📍 {zip} <span style={{fontSize:10,opacity:0.6}}>✎</span></button>)}
            {editingZip&&(<div style={{display:"flex",alignItems:"center",gap:6}}><input ref={zipEditRef} type="text" inputMode="numeric" maxLength={5} value={tempZip} onChange={e=>setTempZip(e.target.value.replace(/\D/g,""))} onKeyDown={e=>{if(e.key==="Enter")confirmZipEdit();if(e.key==="Escape")setEditingZip(false)}} style={{width:72,padding:"6px 10px",borderRadius:12,fontSize:13,fontWeight:600,fontFamily:"'Space Grotesk',sans-serif",outline:"none",textAlign:"center",background:dark?"rgba(255,255,255,0.08)":"rgba(255,255,255,0.5)",border:dark?"1px solid rgba(79,195,247,0.3)":"1px solid rgba(232,99,122,0.4)",color:dark?"#F0F4FF":"#A63850"}}/><button onClick={confirmZipEdit} disabled={tempZip.length!==5} style={{padding:"6px 12px",borderRadius:10,border:"none",cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"'Space Grotesk',sans-serif",background:dark?"rgba(79,195,247,0.2)":"rgba(232,99,122,0.15)",color:dark?"#4FC3F7":"#E8637A",opacity:tempZip.length!==5?0.4:1}}>GO</button><button onClick={()=>setEditingZip(false)} style={{padding:"6px 8px",borderRadius:10,border:"none",cursor:"pointer",fontSize:12,background:"transparent",color:dark?"#F0F4FF":"#2C1810",opacity:0.5}}>✕</button></div>)}
            <button className="tg" onClick={()=>setDark(!dark)}><div className="kn"/></button>
          </div>
        </div>

        {/* HERO */}
        {!entered&&(<div style={{padding:"60px 24px 40px",textAlign:"center",position:"relative",zIndex:1}}>
          <div style={{fontSize:48,marginBottom:12,filter:dark?"drop-shadow(0 0 20px rgba(255,255,255,0.3))":"none"}}>🍸<span style={{fontSize:16,position:"relative",top:-20,left:-8}}>✦</span></div>
          <div style={{marginBottom:8}}><span className="lg" style={{fontSize:"clamp(48px,12vw,72px)",lineHeight:1}}>Girl</span></div>
          <div style={{marginTop:-12}}><span className="ld" style={{fontSize:"clamp(42px,10vw,64px)",lineHeight:1}}>Dinner</span></div>
          <p className="tl" style={{fontSize:"clamp(14px,3vw,18px)",marginTop:16,padding:"0 20px"}}>Because Every Meal Deserves a Main Character Moment.</p>
          <div style={{maxWidth:380,margin:"40px auto 0"}}><div className="gc"><div className="gs" style={{padding:"32px 24px"}}><div className="sp"/>
            <p style={{fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:18,marginBottom:4,position:"relative",zIndex:2}}>Find Your Stores</p>
            <p style={{fontSize:13,opacity:0.6,marginBottom:20,position:"relative",zIndex:2}}>Enter your ZIP to unlock deals, recipes & Gigi ✦</p>
            <div className="iw" style={{position:"relative",zIndex:2}}><input className="gi" type="text" inputMode="numeric" maxLength={5} placeholder="Enter your ZIP code ✦" value={zip} onChange={e=>setZip(e.target.value.replace(/\D/g,""))} onKeyDown={e=>e.key==="Enter"&&handleZipSubmit()}/></div>
            <button className="gb" style={{marginTop:20,width:"100%",position:"relative",zIndex:2}} onClick={handleZipSubmit} disabled={zip.length!==5}>✦ Discover My Stores</button>
          </div></div></div>
        </div>)}

        {/* MAIN */}
        {entered&&(<div style={{padding:"16px 16px 40px",position:"relative",zIndex:1}}>
          {/* Stores */}
          <div style={{marginBottom:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0 4px",marginBottom:10}}>
              <h2 className="sh" style={{fontSize:20}}>✦ Nearby Stores</h2>
              {lastUpdated&&<span style={{fontSize:10,opacity:0.4,fontFamily:"'Space Grotesk',sans-serif"}}>Updated {lastUpdated.toLocaleDateString()}</span>}
            </div>
            <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:8,scrollSnapType:"x mandatory"}}>
              {storesLoading?[...Array(4)].map((_,i)=>(<div key={i} className="gc sm" style={{minWidth:140,scrollSnapAlign:"start"}}><div className="gs" style={{padding:"16px 14px",textAlign:"center"}}><Shimmer w={40} h={40} r={12}/><div style={{marginTop:8}}><Shimmer w="80%" h={14}/></div><div style={{marginTop:6}}><Shimmer w="60%" h={10}/></div></div></div>)):stores.map(s=>(<div key={s.id} className="gc sm" style={{minWidth:150,scrollSnapAlign:"start"}}><div className="gs" style={{padding:"14px 12px",textAlign:"center"}}><div className="sp"/><div style={{fontSize:28,marginBottom:4,position:"relative",zIndex:2}}>{s.icon}</div><div style={{fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:13,position:"relative",zIndex:2,lineHeight:1.2}}>{s.name}</div><div style={{fontSize:10,opacity:0.5,marginTop:3,position:"relative",zIndex:2}}>{s.dist}</div>{s.address&&<div style={{fontSize:9,opacity:0.35,marginTop:2,position:"relative",zIndex:2,lineHeight:1.2}}>{s.address.split(",")[0]}</div>}</div></div>))}
            </div>
          </div>

          {/* Tabs */}
          <div className="tb" style={{marginBottom:16}}>
            {[{key:"gigi",label:"✦ Gigi AI"},{key:"deals",label:"🏷️ Deals"},{key:"recipes",label:"🍽️ Recipes"}].map(t=>(<button key={t.key} className={`tt ${activeTab===t.key?"on":""}`} onClick={()=>setActiveTab(t.key)}>{t.label}</button>))}
          </div>

          {/* GIGI TAB */}
          {activeTab==="gigi"&&(<div>
            <div className="gc" style={{marginBottom:16}}><div className="gs" style={{padding:"24px 20px"}}><div className="sp"/>
              <div style={{position:"relative",zIndex:2}}>
                <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:16}}>
                  <div style={{width:52,height:52,borderRadius:"50%",background:dark?"linear-gradient(135deg,#162660,#0A1535)":"linear-gradient(135deg,#E8637A,#D4AF37)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,color:"#fff",flexShrink:0}}>✦</div>
                  <div><div style={{fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:22}}>Hey, I'm Gigi</div><div className="tl" style={{fontSize:13,marginTop:2}}>Your AI-powered shopping bestie ✦</div></div>
                </div>
                <p style={{fontSize:14,lineHeight:1.6,opacity:0.7,marginBottom:16}}>I know what's on sale near you, can create recipes from your local stores, and help you eat amazing on any budget. Ask me anything!</p>
                {gigiMessages.length===0&&<div style={{display:"flex",flexWrap:"wrap",gap:8}}>{GIGI_SUGGESTIONS.map((s,i)=>(<button key={i} className="gs2" onClick={()=>sendGigiMessage(s)}>{s}</button>))}</div>}
              </div>
            </div></div>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
              {gigiMessages.map((m,i)=>(<div key={i} className={`gm ${m.role==="user"?"u":"b"}`}>{m.text}</div>))}
              {gigiLoading&&<div className="gm b" style={{display:"flex",gap:6,padding:"14px 18px"}}><div className="pd"/><div className="pd" style={{animationDelay:"0.2s"}}/><div className="pd" style={{animationDelay:"0.4s"}}/></div>}
              <div ref={chatEndRef}/>
            </div>
            <div className="gc sm" style={{position:"sticky",bottom:16}}><div className="gs" style={{padding:"10px 14px",display:"flex",gap:8,alignItems:"center"}}><div className="sp"/>
              <input placeholder="Ask Gigi anything..." value={gigiInput} onChange={e=>setGigiInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendGigiMessage()} style={{flex:1,padding:"12px 16px",borderRadius:100,border:"none",fontSize:14,outline:"none",fontFamily:"'Inter',sans-serif",position:"relative",zIndex:2,background:dark?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.4)",color:dark?"#F0F4FF":"#2C1810"}}/>
              <button onClick={()=>sendGigiMessage()} style={{width:42,height:42,borderRadius:"50%",border:"none",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,position:"relative",zIndex:2,background:dark?"rgba(79,195,247,0.2)":"linear-gradient(135deg,#E8637A,#D4AF37)",color:dark?"#4FC3F7":"#fff",flexShrink:0}}>↑</button>
            </div></div>
          </div>)}

          {/* DEALS TAB */}
          {activeTab==="deals"&&(<div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0 4px"}}><p className="tl" style={{fontSize:13}}>This week's hottest local deals 💰</p>{lastUpdated&&<span style={{fontSize:10,opacity:0.35,fontFamily:"'Space Grotesk',sans-serif"}}>Refreshes daily</span>}</div>
            {dealsLoading?[...Array(4)].map((_,i)=>(<div key={i} className="gc sm"><div className="gs" style={{padding:"16px 18px",display:"flex",gap:14}}><div style={{flex:1}}><Shimmer w="40%" h={12}/><div style={{marginTop:8}}><Shimmer w="70%" h={16}/></div><div style={{marginTop:6}}><Shimmer w="30%" h={10}/></div></div><div><Shimmer w={50} h={24}/><div style={{marginTop:6}}><Shimmer w={60} h={18}/></div></div></div></div>)):deals.map(d=>(<div key={d.id} className="gc sm"><div className="gs" style={{padding:"16px 18px",display:"flex",alignItems:"center",gap:14}}><div className="sp"/><div style={{position:"relative",zIndex:2,flex:1}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}><div><span className="dt">{d.tag}</span><div style={{fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:15,marginTop:6}}>{d.item}</div><div style={{fontSize:12,opacity:0.5,marginTop:2}}>{d.store}</div></div><div style={{textAlign:"right",flexShrink:0}}><div className="po">-{d.pct}</div><div style={{fontFamily:"'Space Grotesk',sans-serif",fontWeight:700,fontSize:18,marginTop:2}}>{d.price}</div><div style={{fontSize:12,opacity:0.4,textDecoration:"line-through"}}>{d.was}</div></div></div></div></div></div>))}
            {!dealsLoading&&deals.length===0&&<div style={{textAlign:"center",padding:40,opacity:0.5}}><div style={{fontSize:40,marginBottom:8}}>🏷️</div><p className="tl">Deals loading — hang tight bestie!</p></div>}
          </div>)}

          {/* RECIPES TAB */}
          {activeTab==="recipes"&&(<div style={{display:"flex",flexDirection:"column",gap:14}}>
            <p className="tl" style={{fontSize:13,padding:"0 4px"}}>Curated from your local stores — tap for details ✦</p>
            {recipesLoading?[...Array(3)].map((_,i)=>(<div key={i} className="gc"><div className="gs" style={{padding:"20px",display:"flex",gap:16,alignItems:"center"}}><Shimmer w={64} h={64} r={18}/><div style={{flex:1}}><Shimmer w="70%" h={16}/><div style={{marginTop:8}}><Shimmer w="40%" h={12}/></div></div></div></div>)):recipes.map(r=>(<div key={r.id} className="gc" onClick={()=>setSelectedRecipe(r)} style={{cursor:"pointer"}}><div className="gs" style={{padding:"20px",display:"flex",gap:16,alignItems:"center"}}><div className="sp"/><div style={{width:64,height:64,borderRadius:18,background:dark?"rgba(255,255,255,0.06)":`${r.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,flexShrink:0,position:"relative",zIndex:2}}>{r.emoji}</div><div style={{flex:1,position:"relative",zIndex:2}}><div style={{fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:16}}>{r.title}</div><div style={{fontSize:12,opacity:0.6,marginTop:3}}>{r.vibe}</div><div style={{display:"flex",gap:12,marginTop:8,fontSize:12,fontFamily:"'Space Grotesk',sans-serif"}}><span>⏱ {r.time}</span><span style={{fontWeight:700}}>{r.cost}</span><span style={{opacity:0.5}}>{r.store}</span></div></div></div></div>))}
            {!recipesLoading&&recipes.length===0&&<div style={{textAlign:"center",padding:40,opacity:0.5}}><div style={{fontSize:40,marginBottom:8}}>🍽️</div><p className="tl">Cooking up recipes...</p></div>}
          </div>)}
        </div>)}

        {/* RECIPE MODAL */}
        {selectedRecipe&&(<div className="mo" onClick={()=>setSelectedRecipe(null)}><div className="mc" onClick={e=>e.stopPropagation()}><div className="gc" style={{borderRadius:"28px 28px 0 0"}}><div className="gs" style={{padding:"28px 24px 32px",borderRadius:"26.5px 26.5px 0 0"}}><div className="sp"/><div style={{position:"relative",zIndex:2}}>
          <button onClick={()=>setSelectedRecipe(null)} style={{position:"absolute",top:0,right:0,background:"none",border:"none",fontSize:20,cursor:"pointer",opacity:0.5,color:"inherit"}}>✕</button>
          <div style={{fontSize:56,textAlign:"center",marginBottom:12}}>{selectedRecipe.emoji}</div>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontWeight:900,fontSize:24,textAlign:"center"}}>{selectedRecipe.title}</h2>
          <p className="tl" style={{textAlign:"center",marginTop:4}}>{selectedRecipe.vibe}</p>
          <div style={{display:"flex",justifyContent:"center",gap:24,marginTop:20,fontFamily:"'Space Grotesk',sans-serif",fontSize:13}}>
            <div style={{textAlign:"center"}}><div style={{fontSize:20,fontWeight:800}}>{selectedRecipe.time}</div><div style={{opacity:0.5,fontSize:11}}>Cook Time</div></div>
            <div style={{width:1,background:dark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"}}/>
            <div style={{textAlign:"center"}}><div style={{fontSize:20,fontWeight:800}}>{selectedRecipe.cost}</div><div style={{opacity:0.5,fontSize:11}}>Est. Cost</div></div>
          </div>
          <div style={{marginTop:28}}><h3 style={{fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:16,marginBottom:12}}>Ingredients from {selectedRecipe.store}</h3>
            {selectedRecipe.ingredients?.map((ing,i)=>(<div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${dark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)"}`}}><div style={{width:24,height:24,borderRadius:8,background:dark?"rgba(79,195,247,0.12)":"rgba(232,99,122,0.10)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:dark?"#4FC3F7":"#E8637A"}}>{i+1}</div><span style={{fontSize:14}}>{ing}</span></div>))}
          </div>
          {selectedRecipe.steps&&<div style={{marginTop:24}}><h3 style={{fontFamily:"'Playfair Display',serif",fontWeight:700,fontSize:16,marginBottom:12}}>Steps</h3>{selectedRecipe.steps.map((step,i)=>(<div key={i} style={{display:"flex",gap:12,marginBottom:14}}><div style={{width:28,height:28,borderRadius:"50%",background:dark?"rgba(79,195,247,0.12)":"rgba(232,99,122,0.10)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:dark?"#4FC3F7":"#E8637A",flexShrink:0}}>{i+1}</div><p style={{fontSize:14,lineHeight:1.5,paddingTop:4}}>{step}</p></div>))}</div>}
          <button className="gb" style={{width:"100%",marginTop:24}}>✦ Add All to Shopping List</button>
        </div></div></div></div></div>)}
      </div>
    </div>
  );
}
