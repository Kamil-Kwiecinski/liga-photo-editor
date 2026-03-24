import { useState, useCallback } from "react";

const SAMPLE_MATCH = {
  team_home: "Iskra Lubań",
  team_away: "Turbo Ślimaki",
  sets_home: 3,
  sets_away: 0,
  set_scores: [
    { home: 25, away: 22 },
    { home: 25, away: 15 },
    { home: 25, away: 10 },
  ],
  scores: "25:22 | 25:15 | 25:10",
  kolejka: "Ćwierćfinały",
  color_home: "#d4ba0f",
  color_away: "#fc77c2",
  color_liga: "#004aad",
};

// ========== PHOTO OVERLAYS ==========

function PhotoOverlayPost({ s, m }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-end z-10" style={{ pointerEvents: "none", paddingBottom: 40 * s }}>
      <div style={{ position: "absolute", top: 20 * s, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.6)", borderRadius: "50%", width: 90 * s, height: 90 * s, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#fff", fontSize: 12 * s, fontWeight: 700 }}>LIGA</span>
      </div>
      <div style={{ position: "absolute", top: 130 * s, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.5)", padding: `${4 * s}px ${20 * s}px`, borderRadius: 12 * s }}>
        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 20 * s, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>{m.kolejka}</span>
      </div>
      <div className="flex items-center justify-center" style={{ gap: 24 * s, marginBottom: 20 * s }}>
        <div className="flex flex-col items-center" style={{ width: 240 * s }}>
          <div style={{ width: 100 * s, height: 100 * s, borderRadius: "50%", background: "rgba(0,0,0,0.4)", border: `${3 * s}px solid ${m.color_home}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: m.color_home, fontSize: 32 * s, fontWeight: 800 }}>{m.team_home.charAt(0)}</span>
          </div>
          <span style={{ background: m.color_home, color: "#0d1117", fontSize: 20 * s, fontWeight: 700, padding: `${4 * s}px ${16 * s}px`, borderRadius: 10 * s, marginTop: 10 * s }}>{m.team_home}</span>
        </div>
        <span style={{ fontSize: 100 * s, fontWeight: 900, color: "#fff", lineHeight: 1, letterSpacing: 4 * s, textShadow: `0 ${2 * s}px ${12 * s}px rgba(0,0,0,0.6)` }}>
          {m.sets_home} : {m.sets_away}
        </span>
        <div className="flex flex-col items-center" style={{ width: 240 * s }}>
          <div style={{ width: 100 * s, height: 100 * s, borderRadius: "50%", background: "rgba(0,0,0,0.4)", border: `${3 * s}px solid ${m.color_away}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: m.color_away, fontSize: 32 * s, fontWeight: 800 }}>{m.team_away.charAt(0)}</span>
          </div>
          <span style={{ background: m.color_away, color: "#0d1117", fontSize: 20 * s, fontWeight: 700, padding: `${4 * s}px ${16 * s}px`, borderRadius: 10 * s, marginTop: 10 * s }}>{m.team_away}</span>
        </div>
      </div>
      <SetScoresColored s={s} m={m} fontSize={28} />
    </div>
  );
}

function PhotoOverlayStory({ s, m }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-end z-10" style={{ pointerEvents: "none", paddingBottom: 80 * s }}>
      <div style={{ position: "absolute", top: 60 * s, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.6)", borderRadius: "50%", width: 120 * s, height: 120 * s, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#fff", fontSize: 16 * s, fontWeight: 700 }}>LIGA</span>
      </div>
      <div style={{ position: "absolute", top: 210 * s, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.5)", padding: `${6 * s}px ${24 * s}px`, borderRadius: 16 * s }}>
        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 26 * s, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>{m.kolejka}</span>
      </div>
      <div className="flex items-center justify-center" style={{ gap: 30 * s, marginBottom: 30 * s }}>
        <div className="flex flex-col items-center" style={{ width: 260 * s }}>
          <div style={{ width: 130 * s, height: 130 * s, borderRadius: "50%", background: "rgba(0,0,0,0.4)", border: `${4 * s}px solid ${m.color_home}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: m.color_home, fontSize: 42 * s, fontWeight: 800 }}>{m.team_home.charAt(0)}</span>
          </div>
          <span style={{ background: m.color_home, color: "#0d1117", fontSize: 26 * s, fontWeight: 700, padding: `${6 * s}px ${20 * s}px`, borderRadius: 12 * s, marginTop: 12 * s }}>{m.team_home}</span>
        </div>
        <span style={{ fontSize: 140 * s, fontWeight: 900, color: "#fff", lineHeight: 1, letterSpacing: 6 * s, textShadow: `0 ${3 * s}px ${16 * s}px rgba(0,0,0,0.6)` }}>
          {m.sets_home} : {m.sets_away}
        </span>
        <div className="flex flex-col items-center" style={{ width: 260 * s }}>
          <div style={{ width: 130 * s, height: 130 * s, borderRadius: "50%", background: "rgba(0,0,0,0.4)", border: `${4 * s}px solid ${m.color_away}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: m.color_away, fontSize: 42 * s, fontWeight: 800 }}>{m.team_away.charAt(0)}</span>
          </div>
          <span style={{ background: m.color_away, color: "#0d1117", fontSize: 26 * s, fontWeight: 700, padding: `${6 * s}px ${20 * s}px`, borderRadius: 12 * s, marginTop: 12 * s }}>{m.team_away}</span>
        </div>
      </div>
      <SetScoresColored s={s} m={m} fontSize={32} />
    </div>
  );
}

// ========== NO-PHOTO OVERLAYS ==========

function NoPhotoPost({ s, m }) {
  return (
    <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${m.color_liga} 0%, #001533 100%)` }}>
      <Accents s={s} m={m} w={10} />
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10" style={{ pointerEvents: "none", gap: 12 * s }}>
        <LigaLogo s={s} m={m} size={90} light />
        <KolejkaBadge s={s} m={m} fontSize={22} light />
        <div className="flex items-center justify-center" style={{ gap: 32 * s, marginTop: 10 * s }}>
          <TeamCircle s={s} m={m} team="home" size={140} fontSize={24} light />
          <span style={{ fontSize: 116 * s, fontWeight: 900, color: "#fff", lineHeight: 1, letterSpacing: 4 * s }}>{m.sets_home} : {m.sets_away}</span>
          <TeamCircle s={s} m={m} team="away" size={140} fontSize={24} light />
        </div>
        <SetTable s={s} m={m} />
      </div>
    </div>
  );
}

function NoPhotoStory({ s, m }) {
  return (
    <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${m.color_liga} 0%, #001533 40%, #001533 100%)` }}>
      <Accents s={s} m={m} w={10} />
      <div className="absolute inset-0 flex flex-col items-center justify-evenly z-10" style={{ pointerEvents: "none", paddingTop: 20 * s, paddingBottom: 20 * s }}>
        {/* Liga + kolejka */}
        <div className="flex flex-col items-center" style={{ gap: 12 * s }}>
          <LigaLogo s={s} m={m} size={120} light />
          <KolejkaBadge s={s} m={m} fontSize={28} light />
        </div>
        {/* Home team */}
        <TeamCircle s={s} m={m} team="home" size={200} fontSize={30} light />
        {/* Home scores row */}
        <div className="flex justify-center" style={{ gap: 20 * s }}>
          {m.set_scores.map((sc, i) => {
            const won = sc.home > sc.away;
            return <span key={i} style={{ fontSize: 48 * s, color: won ? m.color_home : m.color_home + '66', fontWeight: won ? 800 : 400, minWidth: 60 * s, textAlign: "center", display: "inline-block" }}>{sc.home}</span>;
          })}
        </div>
        {/* Main score */}
        <span style={{ fontSize: 180 * s, fontWeight: 900, color: "#fff", lineHeight: 1, letterSpacing: 8 * s }}>{m.sets_home} : {m.sets_away}</span>
        {/* Away scores row */}
        <div className="flex justify-center" style={{ gap: 20 * s }}>
          {m.set_scores.map((sc, i) => {
            const won = sc.away > sc.home;
            return <span key={i} style={{ fontSize: 48 * s, color: won ? m.color_away : m.color_away + '66', fontWeight: won ? 800 : 400, minWidth: 60 * s, textAlign: "center", display: "inline-block" }}>{sc.away}</span>;
          })}
        </div>
        {/* Away team */}
        <TeamCircle s={s} m={m} team="away" size={200} fontSize={30} light />
      </div>
    </div>
  );
}

// ========== SHARED COMPONENTS ==========

function SetScoresColored({ s, m, fontSize }) {
  return (
    <div className="flex items-center" style={{ gap: 4 * s }}>
      {m.set_scores.map((sc, i) => {
        const homeWon = sc.home > sc.away;
        return (
          <div key={i} className="flex items-center" style={{ gap: 0 }}>
            {i > 0 && <span style={{ color: "rgba(255,255,255,0.3)", margin: `0 ${6 * s}px`, fontSize: fontSize * s }}>|</span>}
            <span style={{ color: homeWon ? m.color_home : m.color_home + '66', fontWeight: homeWon ? 800 : 400, fontSize: fontSize * s }}>{sc.home}</span>
            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: fontSize * s }}>:</span>
            <span style={{ color: homeWon ? m.color_away + '66' : m.color_away, fontWeight: homeWon ? 400 : 800, fontSize: fontSize * s }}>{sc.away}</span>
          </div>
        );
      })}
    </div>
  );
}

function SetTable({ s, m }) {
  return (
    <div style={{ width: 500 * s, marginTop: 20 * s }}>
      <div className="flex" style={{ marginBottom: 4 * s }}>
        <div style={{ flex: 1.2, textAlign: "center", padding: 6 * s, borderBottom: `${3 * s}px solid ${m.color_home}` }} />
        <div style={{ flex: 0.8, textAlign: "center", padding: 6 * s }}>
          <span style={{ fontSize: 16 * s, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 2 }}>Set</span>
        </div>
        <div style={{ flex: 1.2, textAlign: "center", padding: 6 * s, borderBottom: `${3 * s}px solid ${m.color_away}` }} />
      </div>
      {m.set_scores.map((sc, i) => {
        const homeWon = sc.home > sc.away;
        return (
          <div key={i} className="flex items-center" style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.03)" : "transparent", borderRadius: 8 * s, margin: `${4 * s}px 0` }}>
            <div style={{ flex: 1.2, textAlign: "center", padding: 12 * s }}>
              <span style={{ fontSize: (homeWon ? 36 : 32) * s, color: homeWon ? m.color_home : m.color_home + '66', fontWeight: homeWon ? 800 : 400 }}>{sc.home}</span>
            </div>
            <div style={{ flex: 0.8, textAlign: "center", padding: 12 * s }}>
              <span style={{ fontSize: 24 * s, color: "rgba(255,255,255,0.3)" }}>{i + 1}</span>
            </div>
            <div style={{ flex: 1.2, textAlign: "center", padding: 12 * s }}>
              <span style={{ fontSize: (homeWon ? 32 : 36) * s, color: homeWon ? m.color_away + '66' : m.color_away, fontWeight: homeWon ? 400 : 800 }}>{sc.away}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LigaLogo({ s, m, size, light }) {
  const bg = light ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.6)";
  const color = light ? m.color_liga : "#fff";
  return (
    <div style={{ width: size * s, height: size * s, borderRadius: "50%", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ color, fontSize: (size * 0.16) * s, fontWeight: 700 }}>LIGA</span>
    </div>
  );
}

function KolejkaBadge({ s, m, fontSize, light }) {
  const bg = light ? "rgba(0,74,173,0.5)" : "rgba(0,0,0,0.5)";
  return (
    <div style={{ background: bg, padding: `${6 * s}px ${28 * s}px`, borderRadius: 20 * s }}>
      <span style={{ color: "rgba(255,255,255,0.7)", fontSize: fontSize * s, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>{m.kolejka}</span>
    </div>
  );
}

function TeamCircle({ s, m, team, size, fontSize, light }) {
  const isHome = team === "home";
  const color = isHome ? m.color_home : m.color_away;
  const name = isHome ? m.team_home : m.team_away;
  const borderW = Math.max(2, (size > 150 ? 5 : 4) * s);
  const bg = light ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.4)";
  return (
    <div className="flex flex-col items-center" style={{ width: (size + 100) * s }}>
      <div style={{ width: size * s, height: size * s, borderRadius: "50%", background: bg, border: `${borderW}px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color, fontSize: (size * 0.35) * s, fontWeight: 800 }}>{name.charAt(0)}</span>
      </div>
      <span style={{ background: color, color: "#0d1117", fontSize: fontSize * s, fontWeight: 700, padding: `${(fontSize * 0.25) * s}px ${(fontSize * 0.8) * s}px`, borderRadius: (fontSize * 0.5) * s, marginTop: (fontSize * 0.5) * s, display: "inline-block" }}>{name}</span>
    </div>
  );
}

function Accents({ s, m, w }) {
  return (
    <>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: w * s, background: `linear-gradient(180deg, ${m.color_home}, ${m.color_home} 50%, ${m.color_away} 50%, ${m.color_away})`, zIndex: 3, pointerEvents: "none" }} />
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: w * s, background: `linear-gradient(180deg, ${m.color_home}, ${m.color_home} 50%, ${m.color_away} 50%, ${m.color_away})`, zIndex: 3, pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6 * s, background: `linear-gradient(90deg, ${m.color_home}, ${m.color_liga}, ${m.color_away})`, zIndex: 3, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 6 * s, background: `linear-gradient(90deg, ${m.color_home}, ${m.color_liga}, ${m.color_away})`, zIndex: 3, pointerEvents: "none" }} />
    </>
  );
}

// ========== PREVIEW PANEL ==========

function PreviewPanel({ label, targetW, targetH, image, imgNatW, imgNatH, zoom, setZoom, pos, setPos, onUpload, onRemove, m, maxPreviewW }) {
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const s = maxPreviewW / targetW;
  const pw = targetW * s;
  const ph = targetH * s;
  const isStory = targetH > targetW;

  let imgDisplayW = pw;
  let imgDisplayH = ph;
  if (image && imgNatW > 0 && imgNatH > 0) {
    const imgRatio = imgNatW / imgNatH;
    const containerRatio = pw / ph;
    if (imgRatio > containerRatio) {
      imgDisplayH = ph * zoom;
      imgDisplayW = imgDisplayH * imgRatio;
    } else {
      imgDisplayW = pw * zoom;
      imgDisplayH = imgDisplayW / imgRatio;
    }
  }

  const onDown = (cx, cy) => {
    if (!image) return;
    setDragging(true);
    setDragStart({ x: cx - pos.x, y: cy - pos.y });
  };
  const onMove = (cx, cy) => {
    if (!dragging) return;
    setPos({ x: cx - dragStart.x, y: cy - dragStart.y });
  };
  const onUp = () => setDragging(false);

  const grad = isStory
    ? "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 15%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.85) 75%, rgba(0,0,0,0.97) 100%)"
    : "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.1) 25%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0.92) 80%, rgba(0,0,0,0.97) 100%)";

  return (
    <div className="flex flex-col items-center gap-1">
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary, #333)" }}>{label}</span>
      <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
        <label style={{ fontSize: 11, color: "#fff", background: "#2563eb", padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 500 }}>
          {image ? "Zmień foto" : "Dodaj foto"}
          <input type="file" accept="image/*" onChange={onUpload} style={{ display: "none" }} />
        </label>
        {image && (
          <button onClick={onRemove} style={{ fontSize: 11, color: "#ef4444", background: "none", border: "1px solid #ef4444", padding: "4px 12px", borderRadius: 6, cursor: "pointer" }}>Usuń foto</button>
        )}
      </div>
      {image && (
        <div className="flex items-center gap-2" style={{ width: pw, marginBottom: 4 }}>
          <span style={{ fontSize: 11, color: "#888" }}>Zoom</span>
          <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: "#666", width: 36, textAlign: "right" }}>{Math.round(zoom * 100)}%</span>
        </div>
      )}
      <div
        style={{ width: pw, height: ph }}
        className={`relative overflow-hidden rounded-lg select-none ${image ? "cursor-grab active:cursor-grabbing" : ""}`}
        onMouseDown={(e) => { e.preventDefault(); onDown(e.clientX, e.clientY); }}
        onMouseMove={(e) => onMove(e.clientX, e.clientY)}
        onMouseUp={onUp}
        onMouseLeave={onUp}
        onTouchStart={(e) => { const t = e.touches[0]; onDown(t.clientX, t.clientY); }}
        onTouchMove={(e) => { e.preventDefault(); const t = e.touches[0]; onMove(t.clientX, t.clientY); }}
        onTouchEnd={onUp}
      >
        {image ? (
          <>
            <div className="absolute inset-0" style={{ background: "#111" }} />
            <img src={image} alt="" draggable={false} style={{ position: "absolute", width: imgDisplayW, height: imgDisplayH, maxWidth: "none", maxHeight: "none", left: pos.x, top: pos.y, pointerEvents: "none" }} />
            <div className="absolute inset-0" style={{ background: grad, pointerEvents: "none" }} />
            <Accents s={s} m={m} w={8} />
            {isStory ? <PhotoOverlayStory s={s} m={m} /> : <PhotoOverlayPost s={s} m={m} />}
          </>
        ) : (
          isStory ? <NoPhotoStory s={s} m={m} /> : <NoPhotoPost s={s} m={m} />
        )}
      </div>
    </div>
  );
}

// ========== MAIN ==========

export default function PhotoEditor() {
  const [postImage, setPostImage] = useState(null);
  const [postNatW, setPostNatW] = useState(0);
  const [postNatH, setPostNatH] = useState(0);
  const [postZoom, setPostZoom] = useState(1.0);
  const [postPos, setPostPos] = useState({ x: 0, y: 0 });

  const [storyImage, setStoryImage] = useState(null);
  const [storyNatW, setStoryNatW] = useState(0);
  const [storyNatH, setStoryNatH] = useState(0);
  const [storyZoom, setStoryZoom] = useState(1.0);
  const [storyPos, setStoryPos] = useState({ x: 0, y: 0 });

  const loadImage = useCallback((callback) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target.result;
      const img = new Image();
      img.onload = () => callback(src, img.naturalWidth, img.naturalHeight);
      img.src = src;
    };
    reader.readAsDataURL(file);
  }, []);

  const m = SAMPLE_MATCH;

  const exportSettings = () => {
    const data = {
      post: { has_photo: !!postImage, x: Math.round(postPos.x), y: Math.round(postPos.y), zoom: Math.round(postZoom * 100) },
      story: { has_photo: !!storyImage, x: Math.round(storyPos.x), y: Math.round(storyPos.y), zoom: Math.round(storyZoom * 100) },
    };
    navigator.clipboard?.writeText(JSON.stringify(data));
    alert("Skopiowano ustawienia!");
  };

  return (
    <div className="flex flex-col items-center gap-3 p-3 max-w-5xl mx-auto">
      <div className="text-center">
        <h2 style={{ fontSize: 16, fontWeight: 500, color: "var(--color-text-primary, #222)", margin: 0 }}>Edytor zdjęcia meczu</h2>
        <p style={{ fontSize: 11, color: "var(--color-text-secondary, #888)", marginTop: 4 }}>
          Każdy format ma osobne zdjęcie, zoom i pozycję. Bez foto = grafika klasyczna.
        </p>
      </div>
      <div className="flex gap-6 flex-wrap justify-center items-start">
        <PreviewPanel label="Post 1080×1080" targetW={1080} targetH={1080} image={postImage} imgNatW={postNatW} imgNatH={postNatH} zoom={postZoom} setZoom={setPostZoom} pos={postPos} setPos={setPostPos}
          onUpload={loadImage((src, w, h) => { setPostImage(src); setPostNatW(w); setPostNatH(h); setPostPos({ x: 0, y: 0 }); setPostZoom(1.0); })}
          onRemove={() => { setPostImage(null); setPostPos({ x: 0, y: 0 }); setPostZoom(1.0); }}
          m={m} maxPreviewW={340} />
        <PreviewPanel label="Story 1080×1920" targetW={1080} targetH={1920} image={storyImage} imgNatW={storyNatW} imgNatH={storyNatH} zoom={storyZoom} setZoom={setStoryZoom} pos={storyPos} setPos={setStoryPos}
          onUpload={loadImage((src, w, h) => { setStoryImage(src); setStoryNatW(w); setStoryNatH(h); setStoryPos({ x: 0, y: 0 }); setStoryZoom(1.0); })}
          onRemove={() => { setStoryImage(null); setStoryPos({ x: 0, y: 0 }); setStoryZoom(1.0); }}
          m={m} maxPreviewW={190} />
      </div>
      <button onClick={exportSettings} className="px-5 py-2 rounded-lg text-sm font-medium text-white" style={{ background: "#16a34a", border: "none", cursor: "pointer", marginTop: 8 }}>
        Kopiuj ustawienia
      </button>
    </div>
  );
}
