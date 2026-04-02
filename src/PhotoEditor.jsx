import { useState, useCallback, useRef } from "react";

const N8N_WEBHOOK_URL = "https://primary-production-9c937.up.railway.app/webhook/photo-editor";

function getMatchFromURL() {
  const p = new URLSearchParams(window.location.search);
  if (!p.get("match_id")) {
    return {
      match_id: "DEV",
      team_home: "Iskra Lubań",
      team_away: "Turbo Ślimaki",
      sets_home: 3, sets_away: 0,
      set_scores: [{ home: 25, away: 22 }, { home: 25, away: 15 }, { home: 25, away: 10 }],
      kolejka: "Ćwierćfinały",
      color_home: "#d4ba0f", color_away: "#fc77c2", color_liga: "#004aad",
      sponsorzy: [],
    };
  }
  const wynik = p.get("wynik") || "0:0";
  const [sh, sa] = wynik.split(":").map(Number);
  const setyRaw = p.get("sety") || "";
  const set_scores = setyRaw ? setyRaw.split(",").map(s => {
    const [h, a] = s.split(":").map(Number);
    return { home: h || 0, away: a || 0 };
  }) : [];
  const sponsorzyRaw = p.get("sponsorzy") || "";
  const sponsorzy = sponsorzyRaw ? sponsorzyRaw.split(",").filter(Boolean) : [];
  return {
    match_id: p.get("match_id"),
    team_home: p.get("team_home") || "Drużyna A",
    team_away: p.get("team_away") || "Drużyna B",
    sets_home: sh || 0, sets_away: sa || 0,
    set_scores, kolejka: p.get("kolejka") || "",
    color_home: p.get("color_home") || "#1a56db",
    color_away: p.get("color_away") || "#dc2626",
    color_liga: p.get("color_liga") || "#004aad",
    sponsorzy,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// KLUCZOWA LOGIKA: Obliczenia rozmiaru obrazka przy background-size: X%
//
// CSS background-size: 150% oznacza: szerokość obrazka = 150% szerokości kontenera.
// Wysokość obrazka jest proporcjonalna do naturalnych wymiarów zdjęcia.
//
// Przykład: zdjęcie 4000x2000 (landscape 2:1) w kontenerze 1080x1080 (1:1):
//   background-size: 150% → imgW = 1080 * 1.5 = 1620px
//   imgH = 1620 * (2000/4000) = 810px  ← MNIEJSZE niż kontener!
//   Zakres Y = 810 - 1080 = -270px → obraz nie wypełnia kontenera w pionie
//
// Dlatego MUSIMY znać naturalne wymiary zdjęcia.
// ────────────────────────────────────────────────────────────────────────────

// Oblicz wymiary obrazka renderowanego w kontenerze przy danym zoom
// containerW/H = wymiary kontenera (podglądu lub docelowego)
// natW/natH = naturalne wymiary zdjęcia
// zoom = np. 150 (procent)
function getRenderedImageSize(containerW, containerH, natW, natH, zoom) {
  const imgW = containerW * (zoom / 100);
  const imgH = imgW * (natH / natW);
  return { imgW, imgH };
}

// Przelicz drag offset (px w podglądzie) na background-position %
// Uniwersalne — działa dla dowolnych proporcji zdjęcia i kontenera
function pxToPercent(bgPos, zoom, targetW, targetH, previewW, natW, natH) {
  const parts = bgPos.replace(/px/g, '').split(' ');
  const px = parseFloat(parts[0]) || 0;
  const py = parseFloat(parts[1]) || 0;

  // Wymiary podglądu
  const scale = previewW / targetW;
  const previewH = targetH * scale;

  // Rzeczywiste wymiary obrazka w podglądzie
  const { imgW, imgH } = getRenderedImageSize(previewW, previewH, natW, natH, zoom);

  // Zakres przesunięcia w px
  const maxX = imgW - previewW;
  const maxY = imgH - previewH;

  // Przelicz na % — bez clampu, żeby obraz mógł wychodzić poza krawędzie
  const xPct = maxX > 0 ? (-px / maxX) * 100 : 50;
  const yPct = maxY > 0 ? (-py / maxY) * 100 : 50;

  return `${xPct.toFixed(1)}% ${yPct.toFixed(1)}%`;
}

// Oblicz startowy drag offset (px) odpowiadający bg-position 50% 50%
function initialBgPos(zoom, targetW, targetH, previewW, natW, natH) {
  if (!natW || !natH) {
    // Fallback jeśli nie mamy jeszcze wymiarów (nie powinno się zdarzyć)
    return "0px 0px";
  }
  const scale = previewW / targetW;
  const previewH = targetH * scale;
  const { imgW, imgH } = getRenderedImageSize(previewW, previewH, natW, natH, zoom);
  const maxX = imgW - previewW;
  const maxY = imgH - previewH;
  return `${(-(maxX * 0.5)).toFixed(0)}px ${(-(maxY * 0.5)).toFixed(0)}px`;
}

// Przelicz bgPos ze starego zoomu na nowy zachowując proporcję kadru
function rescaleBgPos(bgPos, oldZoom, newZoom, targetW, targetH, previewW, natW, natH) {
  const parts = bgPos.replace(/px/g, '').split(' ');
  const oldPx = parseFloat(parts[0]) || 0;
  const oldPy = parseFloat(parts[1]) || 0;

  const scale = previewW / targetW;
  const previewH = targetH * scale;

  const oldImg = getRenderedImageSize(previewW, previewH, natW, natH, oldZoom);
  const newImg = getRenderedImageSize(previewW, previewH, natW, natH, newZoom);

  const oldMaxX = oldImg.imgW - previewW;
  const oldMaxY = oldImg.imgH - previewH;
  const newMaxX = newImg.imgW - previewW;
  const newMaxY = newImg.imgH - previewH;

  const newPx = oldMaxX > 0 ? (oldPx / oldMaxX) * newMaxX : -(newMaxX * 0.5);
  const newPy = oldMaxY > 0 ? (oldPy / oldMaxY) * newMaxY : -(newMaxY * 0.5);

  return `${newPx.toFixed(0)}px ${newPy.toFixed(0)}px`;
}

// ========== OVERLAYS ==========

function PhotoOverlayPost({ s, m, showSets, selectedSponsors }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-end z-10" style={{ pointerEvents: "none", paddingBottom: (40 + (selectedSponsors.length > 0 ? 80 * s : 0)) * s }}>
      <div style={{ position: "absolute", top: 20 * s, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.6)", borderRadius: "50%", width: 90 * s, height: 90 * s, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#fff", fontSize: 12 * s, fontWeight: 700 }}>LIGA</span>
      </div>
      <div style={{ position: "absolute", top: 130 * s, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.5)", padding: `${4 * s}px ${20 * s}px`, borderRadius: 12 * s }}>
        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 20 * s, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>{m.kolejka}</span>
      </div>
      <div className="flex items-center justify-center" style={{ gap: 24 * s, marginBottom: showSets ? 10 * s : 20 * s }}>
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
      {showSets && <SetScoresColored s={s} m={m} fontSize={28} />}
      {selectedSponsors.length > 0 && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80 * s, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 * s }}>
          {selectedSponsors.map((url, i) => (
            <img key={i} src={url} alt="" style={{ height: 42 * s, maxWidth: 120 * s, objectFit: "contain", filter: "brightness(0) invert(1)" }} />
          ))}
        </div>
      )}
    </div>
  );
}

function PhotoOverlayStory({ s, m, showSets, selectedSponsors }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-end z-10" style={{ pointerEvents: "none", paddingBottom: (80 + (selectedSponsors.length > 0 ? 100 * s : 0)) * s }}>
      <div style={{ position: "absolute", top: 60 * s, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.6)", borderRadius: "50%", width: 120 * s, height: 120 * s, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#fff", fontSize: 16 * s, fontWeight: 700 }}>LIGA</span>
      </div>
      <div style={{ position: "absolute", top: 210 * s, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.5)", padding: `${6 * s}px ${24 * s}px`, borderRadius: 16 * s }}>
        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 26 * s, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>{m.kolejka}</span>
      </div>
      <div className="flex items-center justify-center" style={{ gap: 30 * s, marginBottom: showSets ? 10 * s : 30 * s }}>
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
      {showSets && <SetScoresColored s={s} m={m} fontSize={32} />}
      {selectedSponsors.length > 0 && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 100 * s, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 * s }}>
          {selectedSponsors.map((url, i) => (
            <img key={i} src={url} alt="" style={{ height: 52 * s, maxWidth: 140 * s, objectFit: "contain", filter: "brightness(0) invert(1)" }} />
          ))}
        </div>
      )}
    </div>
  );
}

function NoPhotoPost({ s, m }) {
  return (
    <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${m.color_liga} 0%, #001533 100%)` }}>
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
      <div className="absolute inset-0 flex flex-col items-center justify-evenly z-10" style={{ pointerEvents: "none", paddingTop: 20 * s, paddingBottom: 20 * s }}>
        <div className="flex flex-col items-center" style={{ gap: 12 * s }}>
          <LigaLogo s={s} m={m} size={120} light />
          <KolejkaBadge s={s} m={m} fontSize={28} light />
        </div>
        <TeamCircle s={s} m={m} team="home" size={200} fontSize={30} light />
        <div className="flex justify-center" style={{ gap: 20 * s }}>
          {m.set_scores.map((sc, i) => {
            const won = sc.home > sc.away;
            return <span key={i} style={{ fontSize: 48 * s, color: won ? m.color_home : m.color_home + '66', fontWeight: won ? 800 : 400, minWidth: 60 * s, textAlign: "center", display: "inline-block" }}>{sc.home}</span>;
          })}
        </div>
        <span style={{ fontSize: 180 * s, fontWeight: 900, color: "#fff", lineHeight: 1, letterSpacing: 8 * s }}>{m.sets_home} : {m.sets_away}</span>
        <div className="flex justify-center" style={{ gap: 20 * s }}>
          {m.set_scores.map((sc, i) => {
            const won = sc.away > sc.home;
            return <span key={i} style={{ fontSize: 48 * s, color: won ? m.color_away : m.color_away + '66', fontWeight: won ? 800 : 400, minWidth: 60 * s, textAlign: "center", display: "inline-block" }}>{sc.away}</span>;
          })}
        </div>
        <TeamCircle s={s} m={m} team="away" size={200} fontSize={30} light />
      </div>
    </div>
  );
}

function SetScoresColored({ s, m, fontSize }) {
  return (
    <div style={{ background: "rgba(0,0,0,0.55)", borderRadius: 12 * s, padding: `${8 * s}px ${18 * s}px`, marginTop: 8 * s, display: "inline-flex", alignItems: "center", gap: 4 * s }}>
      {m.set_scores.map((sc, i) => {
        const homeWon = sc.home > sc.away;
        return (
          <div key={i} style={{ display: "inline-flex", alignItems: "center" }}>
            {i > 0 && <span style={{ fontSize: fontSize * s, color: "rgba(255,255,255,0.2)", margin: `0 ${8 * s}px` }}>|</span>}
            <span style={{ fontSize: fontSize * s, fontWeight: homeWon ? 800 : 400, color: homeWon ? m.color_home : m.color_home + '99' }}>{sc.home}</span>
            <span style={{ fontSize: fontSize * s * 0.7, color: "rgba(255,255,255,0.3)" }}>:</span>
            <span style={{ fontSize: fontSize * s, fontWeight: homeWon ? 400 : 800, color: homeWon ? m.color_away + '99' : m.color_away }}>{sc.away}</span>
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

// ========== PREVIEW PANEL ==========

function PreviewPanel({ label, targetW, targetH, image, imageNat, zoom, bgPos, setBgPos, m, maxPreviewW, showSets, selectedSponsors, onUpload, onRemove, onZoomChange }) {
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);

  const s = maxPreviewW / targetW;
  const pw = targetW * s;
  const ph = targetH * s;
  const isStory = targetH > targetW;

  const grad = isStory
    ? "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 15%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.85) 75%, rgba(0,0,0,0.97) 100%)"
    : "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.1) 25%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0.92) 80%, rgba(0,0,0,0.97) 100%)";

  const onDown = (cx, cy) => {
    if (!image) return;
    setDragging(true);
    const parts = bgPos.replace(/px/g, '').split(' ');
    setDragStart({ cx, cy, px: parseFloat(parts[0]) || 0, py: parseFloat(parts[1]) || 0 });
  };

  const onMove = (cx, cy) => {
    if (!dragging || !dragStart) return;
    const dx = cx - dragStart.cx;
    const dy = cy - dragStart.cy;
    const newX = dragStart.px + dx;
    const newY = dragStart.py + dy;
    setBgPos(`${newX.toFixed(0)}px ${newY.toFixed(0)}px`);
  };

  const onUp = () => { setDragging(false); setDragStart(null); };

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
          <input type="range" min="100" max="300" step="1" value={zoom}
            onChange={(e) => onZoomChange(Number(e.target.value))}
            style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: "#666", width: 36, textAlign: "right" }}>{zoom}%</span>
        </div>
      )}
      <div
        ref={containerRef}
        style={{ width: pw, height: ph, position: "relative", overflow: "hidden", borderRadius: 8, cursor: image ? (dragging ? "grabbing" : "grab") : "default" }}
        className="select-none bg-gray-800"
        onMouseDown={(e) => { e.preventDefault(); onDown(e.clientX, e.clientY); }}
        onMouseMove={(e) => onMove(e.clientX, e.clientY)}
        onMouseUp={onUp} onMouseLeave={onUp}
        onTouchStart={(e) => { const t = e.touches[0]; onDown(t.clientX, t.clientY); }}
        onTouchMove={(e) => { e.preventDefault(); const t = e.touches[0]; onMove(t.clientX, t.clientY); }}
        onTouchEnd={onUp}
      >
        {image ? (
          <>
            <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${image})`, backgroundSize: "cover", backgroundPosition: "center center", filter: "blur(8px) brightness(0.45) saturate(1.3)", transform: "scale(1.12)" }} />
            <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${image})`, backgroundSize: `${zoom}%`, backgroundPosition: bgPos, backgroundRepeat: "no-repeat" }} />
            <div className="absolute inset-0" style={{ background: grad, pointerEvents: "none" }} />
            {isStory
              ? <PhotoOverlayStory s={s} m={m} showSets={showSets} selectedSponsors={selectedSponsors} />
              : <PhotoOverlayPost s={s} m={m} showSets={showSets} selectedSponsors={selectedSponsors} />}
          </>
        ) : (
          isStory ? <NoPhotoStory s={s} m={m} /> : <NoPhotoPost s={s} m={m} />
        )}
      </div>
      {image && <p style={{ fontSize: 10, color: "#999", marginTop: 2 }}>Przeciągnij żeby zmienić kadr</p>}
    </div>
  );
}

// ========== SPONSORS SELECTOR ==========

function SponsorsSelector({ sponsorzy, selected, setSelected }) {
  if (sponsorzy.length === 0) return null;
  const toggle = (url) => {
    setSelected(prev => prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]);
  };
  return (
    <div style={{ background: "rgba(0,0,0,0.15)", borderRadius: 10, padding: "10px 14px" }}>
      <p style={{ fontSize: 11, color: "var(--color-text-secondary, #888)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
        Sponsorzy na grafice
      </p>
      <div className="flex flex-wrap gap-2">
        {sponsorzy.map((url, i) => {
          const isSelected = selected.includes(url);
          return (
            <div key={i} onClick={() => toggle(url)} style={{ border: isSelected ? "2px solid #2563eb" : "2px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "6px 10px", cursor: "pointer", background: isSelected ? "rgba(37,99,235,0.15)" : "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", minWidth: 80, height: 44, transition: "all 0.15s" }}>
              <img src={url} alt={`Sponsor ${i + 1}`} style={{ height: 28, maxWidth: 100, objectFit: "contain" }} />
            </div>
          );
        })}
      </div>
      {selected.length > 0 && (
        <p style={{ fontSize: 10, color: "#2563eb", marginTop: 6 }}>
          {selected.length} sponsor{selected.length > 1 ? "ów" : ""} wybrany{selected.length > 1 ? "ch" : ""}
        </p>
      )}
    </div>
  );
}

// ========== MAIN ==========

export default function PhotoEditor() {
  const m = getMatchFromURL();
  const isDev = m.match_id === "DEV";

  // Post state
  const [postImage, setPostImage] = useState(null);
  const [postImageNat, setPostImageNat] = useState({ w: 0, h: 0 }); // naturalne wymiary
  const [postZoom, setPostZoom] = useState(150);
  const [postBgPos, setPostBgPos] = useState("0px 0px");
  const [postShowSets, setPostShowSets] = useState(false);
  const [postSponsors, setPostSponsors] = useState([]);

  // Story state
  const [storyImage, setStoryImage] = useState(null);
  const [storyImageNat, setStoryImageNat] = useState({ w: 0, h: 0 });
  const [storyZoom, setStoryZoom] = useState(150);
  const [storyBgPos, setStoryBgPos] = useState("0px 0px");
  const [storyShowSets, setStoryShowSets] = useState(false);
  const [storySponsors, setStorySponsors] = useState([]);

  const [status, setStatus] = useState(null);

  // Wczytaj zdjęcie i odczytaj naturalne wymiary
  const loadImage = useCallback((onLoaded, targetW, targetH, previewW) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target.result;
      const img = new Image();
      img.onload = () => {
        const nat = { w: img.naturalWidth, h: img.naturalHeight };
        const initPos = initialBgPos(150, targetW, targetH, previewW, nat.w, nat.h);
        onLoaded(src, nat, initPos);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }, []);

  const generateGraphics = async () => {
    if (!postImage && !storyImage) { alert("Wgraj przynajmniej jedno zdjęcie."); return; }
    if (isDev) { alert("Tryb deweloperski — otwórz edytor przez link z n8n."); return; }
    setStatus("sending");
    const payload = {
      match_id: m.match_id,
      played_sets: m.set_scores,
      post: postImage ? {
        photo_base64: postImage,
        photo_position: pxToPercent(postBgPos, postZoom, 1080, 1080, 340, postImageNat.w, postImageNat.h),
        photo_zoom: `${postZoom}%`,
        show_sets: postShowSets,
        sponsorzy: postSponsors,
      } : null,
      story: storyImage ? {
        photo_base64: storyImage,
        photo_position: pxToPercent(storyBgPos, storyZoom, 1080, 1920, 190, storyImageNat.w, storyImageNat.h),
        photo_zoom: `${storyZoom}%`,
        show_sets: storyShowSets,
        sponsorzy: storySponsors,
      } : null,
    };
    try {
      const res = await fetch(N8N_WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus("ok");
    } catch (err) { console.error(err); setStatus("error"); }
  };

  return (
    <div className="flex flex-col items-center gap-3 p-3 max-w-5xl mx-auto">
      <div className="text-center">
        <h2 style={{ fontSize: 16, fontWeight: 500, color: "var(--color-text-primary, #222)", margin: 0 }}>Edytor zdjęcia meczu</h2>
        <p style={{ fontSize: 11, color: isDev ? "#f59e0b" : "var(--color-text-secondary, #888)", marginTop: 4 }}>
          {isDev ? "⚠️ Tryb deweloperski — brak parametrów w URL" : `${m.team_home} vs ${m.team_away}  ·  ${m.sets_home}:${m.sets_away}  ·  ${m.kolejka}  ·  mecz #${m.match_id}`}
        </p>
      </div>

      <div className="flex gap-6 flex-wrap justify-center items-start">
        {/* POST */}
        <div className="flex flex-col items-center gap-2">
          <PreviewPanel
            label="Post 1080×1080" targetW={1080} targetH={1080}
            image={postImage} imageNat={postImageNat} zoom={postZoom} bgPos={postBgPos} setBgPos={setPostBgPos}
            onUpload={loadImage(
              (src, nat, initPos) => { setPostImage(src); setPostImageNat(nat); setPostZoom(150); setPostBgPos(initPos); },
              1080, 1080, 340
            )}
            onRemove={() => { setPostImage(null); setPostImageNat({ w: 0, h: 0 }); setPostZoom(150); setPostBgPos("0px 0px"); }}
            m={m} maxPreviewW={340} showSets={postShowSets} selectedSponsors={postSponsors}
            onZoomChange={(z) => {
              setPostBgPos(prev => rescaleBgPos(prev, postZoom, z, 1080, 1080, 340, postImageNat.w, postImageNat.h));
              setPostZoom(z);
            }}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
            <div onClick={() => setPostShowSets(v => !v)} style={{ width: 36, height: 20, borderRadius: 10, background: postShowSets ? "#2563eb" : "#374151", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
              <div style={{ position: "absolute", top: 2, left: postShowSets ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
            </div>
            <span style={{ fontSize: 11, color: "var(--color-text-secondary, #888)" }}>Sety</span>
          </label>
          <SponsorsSelector sponsorzy={m.sponsorzy} selected={postSponsors} setSelected={setPostSponsors} />
        </div>

        {/* STORY */}
        <div className="flex flex-col items-center gap-2">
          <PreviewPanel
            label="Story 1080×1920" targetW={1080} targetH={1920}
            image={storyImage} imageNat={storyImageNat} zoom={storyZoom} bgPos={storyBgPos} setBgPos={setStoryBgPos}
            onUpload={loadImage(
              (src, nat, initPos) => { setStoryImage(src); setStoryImageNat(nat); setStoryZoom(150); setStoryBgPos(initPos); },
              1080, 1920, 190
            )}
            onRemove={() => { setStoryImage(null); setStoryImageNat({ w: 0, h: 0 }); setStoryZoom(150); setStoryBgPos("0px 0px"); }}
            m={m} maxPreviewW={190} showSets={storyShowSets} selectedSponsors={storySponsors}
            onZoomChange={(z) => {
              setStoryBgPos(prev => rescaleBgPos(prev, storyZoom, z, 1080, 1920, 190, storyImageNat.w, storyImageNat.h));
              setStoryZoom(z);
            }}
          />
          <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", userSelect: "none" }}>
            <div onClick={() => setStoryShowSets(v => !v)} style={{ width: 36, height: 20, borderRadius: 10, background: storyShowSets ? "#2563eb" : "#374151", position: "relative", transition: "background 0.2s", flexShrink: 0 }}>
              <div style={{ position: "absolute", top: 2, left: storyShowSets ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
            </div>
            <span style={{ fontSize: 11, color: "var(--color-text-secondary, #888)" }}>Sety</span>
          </label>
          <SponsorsSelector sponsorzy={m.sponsorzy} selected={storySponsors} setSelected={setStorySponsors} />
        </div>
      </div>

      <button onClick={generateGraphics} disabled={status === "sending"} className="px-6 py-3 rounded-lg text-sm font-bold text-white"
        style={{ marginTop: 8, minWidth: 200, border: "none", cursor: status === "sending" ? "not-allowed" : "pointer",
          background: status === "sending" ? "#6b7280" : status === "ok" ? "#059669" : status === "error" ? "#dc2626" : "#2563eb" }}>
        {status === "sending" ? "⏳ Wysyłanie…" : status === "ok" ? "✅ Wysłano! Grafiki za chwilę w arkuszu." : status === "error" ? "❌ Błąd — spróbuj ponownie" : "🚀 Generuj grafiki z tym zdjęciem"}
      </button>

      {status === "error" && <p style={{ fontSize: 11, color: "#dc2626", textAlign: "center" }}>Sprawdź czy workflow w n8n jest aktywny (Production).</p>}
    </div>
  );
}
