import { useState, useCallback, useRef } from "react";

const N8N_WEBHOOK_URL = "https://primary-production-9c937.up.railway.app/webhook/photo-editor";

const STYLES_RESULT = [
  { id: "classic", label: "Klasyczny" },
  { id: "split_panel", label: "Split Panel" },
];
const STYLES_PREVIEW = [
  { id: "split_panel", label: "Split Panel" },
];

function parseScorers(raw) {
  if (!raw) return [];
  return raw.split(",").filter(Boolean).map(s => {
    const [name, minute] = s.split(":");
    return { name: (name || "").trim(), minute: Number(minute) || 0 };
  });
}

function getMatchFromURL() {
  const p = new URLSearchParams(window.location.search);
  const mode = p.get("mode") || "result";
  const sport = p.get("sport") || "volleyball";
  const grupa = p.get("grupa") || "";
  if (!p.get("match_id")) {
    return {
      match_id: "DEV", mode, sport: "football", grupa: "Grupa A",
      team_home: "Iskra Lubań", team_away: "Turbo Ślimaki",
      sets_home: 3, sets_away: 0,
      set_scores: [{ home: 25, away: 22 }, { home: 25, away: 15 }, { home: 25, away: 10 }],
      goals_home: 3, goals_away: 2,
      half_home: 2, half_away: 1,
      scorers_home: [{ name: "Kowalski", minute: 12 }, { name: "Nowak", minute: 45 }, { name: "Wiśniewski", minute: 78 }],
      scorers_away: [{ name: "Lewandowski", minute: 23 }, { name: "Zieliński", minute: 67 }],
      kolejka: "Ćwierćfinały",
      color_home: "#d4ba0f", color_away: "#fc77c2", color_liga: "#004aad",
      sponsorzy: [],
      data_meczu: "07.04.2026", godzina: "19:20", miejsce: "Hala MOSiR Lubań",
    };
  }
  const wynik = p.get("wynik") || "0:0";
  const [sh, sa] = wynik.split(":").map(Number);
  const setyRaw = p.get("sety") || "";
  const set_scores = setyRaw ? setyRaw.split(",").map(s => { const [h, a] = s.split(":").map(Number); return { home: h || 0, away: a || 0 }; }) : [];
  const sponsorzyRaw = p.get("sponsorzy") || "";
  const sponsorzy = sponsorzyRaw ? sponsorzyRaw.split(",").filter(Boolean) : [];
  const goalsRaw = p.get("goals") || "0:0";
  const [gh, ga] = goalsRaw.split(":").map(Number);
  const przerwaRaw = p.get("przerwa") || "0:0";
  const [hh, ha] = przerwaRaw.split(":").map(Number);
  return {
    match_id: p.get("match_id"), mode, sport, grupa,
    team_home: p.get("team_home") || "Drużyna A", team_away: p.get("team_away") || "Drużyna B",
    sets_home: sh || 0, sets_away: sa || 0, set_scores,
    goals_home: gh || 0, goals_away: ga || 0,
    half_home: hh || 0, half_away: ha || 0,
    scorers_home: parseScorers(p.get("strzelcy_home") || ""),
    scorers_away: parseScorers(p.get("strzelcy_away") || ""),
    kolejka: p.get("kolejka") || "",
    color_home: p.get("color_home") || "#1a56db", color_away: p.get("color_away") || "#dc2626", color_liga: p.get("color_liga") || "#004aad",
    sponsorzy,
    data_meczu: p.get("data") || "", godzina: p.get("godzina") || "19:20", miejsce: p.get("miejsce") || "Hala MOSiR Lubań",
  };
}

// ── CROP MATH ────────────────────────────────────────────────────────────────
function getRenderedImageSize(containerW, containerH, natW, natH, zoom) {
  const imgW = containerW * (zoom / 100);
  const imgH = imgW * (natH / natW);
  return { imgW, imgH };
}
function pxToPercent(bgPos, zoom, targetW, targetH, previewW, natW, natH) {
  const parts = bgPos.replace(/px/g, '').split(' ');
  const px = parseFloat(parts[0]) || 0; const py = parseFloat(parts[1]) || 0;
  const scale = previewW / targetW; const previewH = targetH * scale;
  const { imgW, imgH } = getRenderedImageSize(previewW, previewH, natW, natH, zoom);
  const maxX = imgW - previewW; const maxY = imgH - previewH;
  const xPct = maxX > 0 ? (-px / maxX) * 100 : 50;
  const yPct = maxY > 0 ? (-py / maxY) * 100 : 50;
  return `${xPct.toFixed(1)}% ${yPct.toFixed(1)}%`;
}
function initialBgPos(zoom, targetW, targetH, previewW, natW, natH) {
  if (!natW || !natH) return "0px 0px";
  const scale = previewW / targetW; const previewH = targetH * scale;
  const { imgW, imgH } = getRenderedImageSize(previewW, previewH, natW, natH, zoom);
  return `${(-(imgW - previewW) * 0.5).toFixed(0)}px ${(-(imgH - previewH) * 0.5).toFixed(0)}px`;
}
function rescaleBgPos(bgPos, oldZoom, newZoom, targetW, targetH, previewW, natW, natH) {
  const parts = bgPos.replace(/px/g, '').split(' ');
  const oldPx = parseFloat(parts[0]) || 0; const oldPy = parseFloat(parts[1]) || 0;
  const scale = previewW / targetW; const previewH = targetH * scale;
  const oldImg = getRenderedImageSize(previewW, previewH, natW, natH, oldZoom);
  const newImg = getRenderedImageSize(previewW, previewH, natW, natH, newZoom);
  const newPx = (oldImg.imgW - previewW) > 0 ? (oldPx / (oldImg.imgW - previewW)) * (newImg.imgW - previewW) : -((newImg.imgW - previewW) * 0.5);
  const newPy = (oldImg.imgH - previewH) > 0 ? (oldPy / (oldImg.imgH - previewH)) * (newImg.imgH - previewH) : -((newImg.imgH - previewH) * 0.5);
  return `${newPx.toFixed(0)}px ${newPy.toFixed(0)}px`;
}

// ── FOOTBALL OVERLAYS ────────────────────────────────────────────────────────
function ScorersBlock({ s, m, size, side, center }) {
  const list = side === "home" ? (m.scorers_home || []) : (m.scorers_away || []);
  if (!list.length) return null;
  const align = center ? "center" : (side === "home" ? "right" : "left");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: (size * 0.25) * s, textAlign: align, minWidth: 120 * s }}>
      {list.map((sc, i) => (
        <div key={i} style={{ color: "#fff", fontSize: size * s, fontWeight: 600, textShadow: `0 ${1 * s}px ${4 * s}px rgba(0,0,0,0.6)`, whiteSpace: "nowrap" }}>
          {side === "away" && <span style={{ marginRight: (size * 0.35) * s }}>⚽</span>}
          <span>{sc.name} <span style={{ opacity: 0.7, fontWeight: 400 }}>{sc.minute}'</span></span>
          {side === "home" && <span style={{ marginLeft: (size * 0.35) * s }}>⚽</span>}
        </div>
      ))}
    </div>
  );
}

function FootballPhotoPost({ s, m, selectedSponsors }) {
  const sponsorBarH = selectedSponsors.length > 0 ? 80 : 0;
  return (
    <div className="absolute inset-0 z-10" style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 20 * s, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.6)", borderRadius: "50%", width: 90 * s, height: 90 * s, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#fff", fontSize: 12 * s, fontWeight: 700 }}>LIGA</span></div>
      <div style={{ position: "absolute", top: 130 * s, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.55)", padding: `${5 * s}px ${20 * s}px`, borderRadius: 12 * s, display: "flex", gap: 10 * s, alignItems: "center" }}>
        {m.grupa && <span style={{ color: "#fff", fontSize: 18 * s, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>{m.grupa}</span>}
        {m.grupa && m.kolejka && <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 16 * s }}>·</span>}
        {m.kolejka && <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 18 * s, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase" }}>{m.kolejka}</span>}
      </div>
      <div style={{ position: "absolute", top: "42%", left: 0, right: 0, transform: "translateY(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 * s }}>
        <div className="flex items-center justify-center" style={{ gap: 24 * s }}>
          <div className="flex flex-col items-center" style={{ width: 200 * s }}>
            <div style={{ width: 100 * s, height: 100 * s, borderRadius: "50%", background: "rgba(0,0,0,0.4)", border: `${3 * s}px solid ${m.color_home}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: m.color_home, fontSize: 32 * s, fontWeight: 800 }}>{m.team_home.charAt(0)}</span></div>
            <span style={{ background: m.color_home, color: "#0d1117", fontSize: 18 * s, fontWeight: 700, padding: `${4 * s}px ${14 * s}px`, borderRadius: 10 * s, marginTop: 10 * s, textAlign: "center" }}>{m.team_home}</span></div>
          <span style={{ fontSize: 100 * s, fontWeight: 900, color: "#fff", lineHeight: 1, letterSpacing: 4 * s, textShadow: `0 ${2 * s}px ${12 * s}px rgba(0,0,0,0.6)` }}>{m.goals_home} : {m.goals_away}</span>
          <div className="flex flex-col items-center" style={{ width: 200 * s }}>
            <div style={{ width: 100 * s, height: 100 * s, borderRadius: "50%", background: "rgba(0,0,0,0.4)", border: `${3 * s}px solid ${m.color_away}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: m.color_away, fontSize: 32 * s, fontWeight: 800 }}>{m.team_away.charAt(0)}</span></div>
            <span style={{ background: m.color_away, color: "#0d1117", fontSize: 18 * s, fontWeight: 700, padding: `${4 * s}px ${14 * s}px`, borderRadius: 10 * s, marginTop: 10 * s, textAlign: "center" }}>{m.team_away}</span></div>
        </div>
        <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 16 * s, fontWeight: 500, letterSpacing: 1 }}>Do przerwy {m.half_home}:{m.half_away}</div>
      </div>
      <div style={{ position: "absolute", bottom: (30 + sponsorBarH) * s, left: 24 * s, right: 24 * s, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 16 * s }}>
        <ScorersBlock s={s} m={m} size={14} side="home" />
        <ScorersBlock s={s} m={m} size={14} side="away" />
      </div>
      {selectedSponsors.length > 0 && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80 * s, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 * s }}>
          {selectedSponsors.map((url, i) => <img key={i} src={url} alt="" style={{ height: 42 * s, maxWidth: 120 * s, objectFit: "contain", filter: "brightness(0) invert(1)" }} />)}</div>)}
    </div>);
}

function FootballPhotoStory({ s, m, selectedSponsors }) {
  const sponsorBarH = selectedSponsors.length > 0 ? 100 : 0;
  return (
    <div className="absolute inset-0 z-10" style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 60 * s, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.6)", borderRadius: "50%", width: 120 * s, height: 120 * s, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#fff", fontSize: 16 * s, fontWeight: 700 }}>LIGA</span></div>
      <div style={{ position: "absolute", top: 210 * s, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.55)", padding: `${6 * s}px ${24 * s}px`, borderRadius: 16 * s, display: "flex", gap: 12 * s, alignItems: "center" }}>
        {m.grupa && <span style={{ color: "#fff", fontSize: 24 * s, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>{m.grupa}</span>}
        {m.grupa && m.kolejka && <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 22 * s }}>·</span>}
        {m.kolejka && <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 24 * s, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase" }}>{m.kolejka}</span>}
      </div>
      <div style={{ position: "absolute", top: "45%", left: 0, right: 0, transform: "translateY(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * s }}>
        <div className="flex items-center justify-center" style={{ gap: 30 * s }}>
          <div className="flex flex-col items-center" style={{ width: 230 * s }}>
            <div style={{ width: 130 * s, height: 130 * s, borderRadius: "50%", background: "rgba(0,0,0,0.4)", border: `${4 * s}px solid ${m.color_home}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: m.color_home, fontSize: 42 * s, fontWeight: 800 }}>{m.team_home.charAt(0)}</span></div>
            <span style={{ background: m.color_home, color: "#0d1117", fontSize: 24 * s, fontWeight: 700, padding: `${6 * s}px ${18 * s}px`, borderRadius: 12 * s, marginTop: 12 * s, textAlign: "center" }}>{m.team_home}</span></div>
          <span style={{ fontSize: 140 * s, fontWeight: 900, color: "#fff", lineHeight: 1, letterSpacing: 6 * s, textShadow: `0 ${3 * s}px ${16 * s}px rgba(0,0,0,0.6)` }}>{m.goals_home} : {m.goals_away}</span>
          <div className="flex flex-col items-center" style={{ width: 230 * s }}>
            <div style={{ width: 130 * s, height: 130 * s, borderRadius: "50%", background: "rgba(0,0,0,0.4)", border: `${4 * s}px solid ${m.color_away}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: m.color_away, fontSize: 42 * s, fontWeight: 800 }}>{m.team_away.charAt(0)}</span></div>
            <span style={{ background: m.color_away, color: "#0d1117", fontSize: 24 * s, fontWeight: 700, padding: `${6 * s}px ${18 * s}px`, borderRadius: 12 * s, marginTop: 12 * s, textAlign: "center" }}>{m.team_away}</span></div>
        </div>
        <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 22 * s, fontWeight: 500, letterSpacing: 2 }}>Do przerwy {m.half_home}:{m.half_away}</div>
      </div>
      <div style={{ position: "absolute", bottom: (60 + sponsorBarH) * s, left: 40 * s, right: 40 * s, display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20 * s }}>
        <ScorersBlock s={s} m={m} size={20} side="home" />
        <ScorersBlock s={s} m={m} size={20} side="away" />
      </div>
      {selectedSponsors.length > 0 && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 100 * s, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 * s }}>
          {selectedSponsors.map((url, i) => <img key={i} src={url} alt="" style={{ height: 52 * s, maxWidth: 140 * s, objectFit: "contain", filter: "brightness(0) invert(1)" }} />)}</div>)}
    </div>);
}

function FootballNoPhotoPost({ s, m, selectedSponsors }) {
  const sponsorBarH = selectedSponsors.length > 0 ? 80 : 0;
  const hasScorers = m.scorers_home?.length > 0 || m.scorers_away?.length > 0;
  return (
    <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${m.color_liga} 0%, #001533 100%)` }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6 * s, background: `linear-gradient(90deg, ${m.color_home}, ${m.color_liga}, ${m.color_away})` }} />
      <div style={{ position: "absolute", bottom: sponsorBarH * s, left: 0, right: 0, height: 6 * s, background: `linear-gradient(90deg, ${m.color_home}, ${m.color_liga}, ${m.color_away})` }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10" style={{ pointerEvents: "none", gap: 12 * s, paddingBottom: sponsorBarH * s }}>
        <LigaLogo s={s} m={m} size={90} light />
        <KolejkaBadge s={s} m={m} fontSize={22} light />
        <div className="flex items-center justify-center" style={{ gap: 32 * s, marginTop: 10 * s }}>
          <TeamCircle s={s} m={m} team="home" size={140} fontSize={24} light />
          <span style={{ fontSize: 116 * s, fontWeight: 900, color: "#fff", lineHeight: 1, letterSpacing: 4 * s }}>{m.goals_home} : {m.goals_away}</span>
          <TeamCircle s={s} m={m} team="away" size={140} fontSize={24} light /></div>
        <div style={{ color: "rgba(255,255,255,0.75)", fontSize: 20 * s, fontWeight: 600, letterSpacing: 2, marginTop: 4 * s }}>Do przerwy {m.half_home}:{m.half_away}</div>
        {hasScorers && (
          <div style={{ width: "85%", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20 * s, marginTop: 6 * s }}>
            <ScorersBlock s={s} m={m} size={16} side="home" />
            <ScorersBlock s={s} m={m} size={16} side="away" />
          </div>
        )}
      </div>
      {selectedSponsors.length > 0 && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80 * s, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 * s, zIndex: 20 }}>
          {selectedSponsors.map((url, i) => <img key={i} src={url} alt="" style={{ height: 42 * s, maxWidth: 120 * s, objectFit: "contain", filter: "brightness(0) invert(1)" }} />)}</div>)}</div>);
}

function FootballNoPhotoStory({ s, m, selectedSponsors }) {
  const sponsorBarH = selectedSponsors.length > 0 ? 100 : 0;
  const hasScorers = m.scorers_home?.length > 0 || m.scorers_away?.length > 0;
  return (
    <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${m.color_liga} 0%, #001533 40%, #001533 100%)` }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6 * s, background: `linear-gradient(90deg, ${m.color_home}, ${m.color_liga}, ${m.color_away})` }} />
      <div style={{ position: "absolute", bottom: sponsorBarH * s, left: 0, right: 0, height: 6 * s, background: `linear-gradient(90deg, ${m.color_home}, ${m.color_liga}, ${m.color_away})` }} />
      <div className="absolute inset-0 flex flex-col items-center justify-evenly z-10" style={{ pointerEvents: "none", paddingTop: 20 * s, paddingBottom: (20 + sponsorBarH) * s }}>
        <div className="flex flex-col items-center" style={{ gap: 12 * s }}>
          <LigaLogo s={s} m={m} size={120} light />
          <KolejkaBadge s={s} m={m} fontSize={28} light /></div>
        <TeamCircle s={s} m={m} team="home" size={200} fontSize={30} light />
        {hasScorers && <ScorersBlock s={s} m={m} size={24} side="home" center />}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
          <span style={{ fontSize: 180 * s, fontWeight: 900, color: "#fff", lineHeight: 1, letterSpacing: 8 * s }}>{m.goals_home} : {m.goals_away}</span>
          <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 28 * s, fontWeight: 600, letterSpacing: 2, marginTop: 12 * s }}>Do przerwy {m.half_home}:{m.half_away}</span>
        </div>
        {hasScorers && <ScorersBlock s={s} m={m} size={24} side="away" center />}
        <TeamCircle s={s} m={m} team="away" size={200} fontSize={30} light />
      </div>
      {selectedSponsors.length > 0 && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 100 * s, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 * s, zIndex: 20 }}>
          {selectedSponsors.map((url, i) => <img key={i} src={url} alt="" style={{ height: 52 * s, maxWidth: 140 * s, objectFit: "contain", filter: "brightness(0) invert(1)" }} />)}</div>)}</div>);
}

// ── CLASSIC OVERLAYS (with photo) ────────────────────────────────────────────
function PhotoOverlayPost({ s, m, showSets, selectedSponsors }) {
  const sponsorBarH = selectedSponsors.length > 0 ? 80 : 0;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-end z-10" style={{ pointerEvents: "none", paddingBottom: (40 + sponsorBarH) * s }}>
      <div style={{ position: "absolute", top: 20 * s, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.6)", borderRadius: "50%", width: 90 * s, height: 90 * s, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#fff", fontSize: 12 * s, fontWeight: 700 }}>LIGA</span></div>
      <div style={{ position: "absolute", top: 130 * s, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.5)", padding: `${4 * s}px ${20 * s}px`, borderRadius: 12 * s }}>
        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 20 * s, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>{m.kolejka}</span></div>
      <div className="flex items-center justify-center" style={{ gap: 24 * s, marginBottom: showSets ? 10 * s : 20 * s }}>
        <div className="flex flex-col items-center" style={{ width: 240 * s }}>
          <div style={{ width: 100 * s, height: 100 * s, borderRadius: "50%", background: "rgba(0,0,0,0.4)", border: `${3 * s}px solid ${m.color_home}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: m.color_home, fontSize: 32 * s, fontWeight: 800 }}>{m.team_home.charAt(0)}</span></div>
          <span style={{ background: m.color_home, color: "#0d1117", fontSize: 20 * s, fontWeight: 700, padding: `${4 * s}px ${16 * s}px`, borderRadius: 10 * s, marginTop: 10 * s }}>{m.team_home}</span></div>
        <span style={{ fontSize: 100 * s, fontWeight: 900, color: "#fff", lineHeight: 1, letterSpacing: 4 * s, textShadow: `0 ${2 * s}px ${12 * s}px rgba(0,0,0,0.6)` }}>{m.sets_home} : {m.sets_away}</span>
        <div className="flex flex-col items-center" style={{ width: 240 * s }}>
          <div style={{ width: 100 * s, height: 100 * s, borderRadius: "50%", background: "rgba(0,0,0,0.4)", border: `${3 * s}px solid ${m.color_away}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: m.color_away, fontSize: 32 * s, fontWeight: 800 }}>{m.team_away.charAt(0)}</span></div>
          <span style={{ background: m.color_away, color: "#0d1117", fontSize: 20 * s, fontWeight: 700, padding: `${4 * s}px ${16 * s}px`, borderRadius: 10 * s, marginTop: 10 * s }}>{m.team_away}</span></div>
      </div>
      {showSets && <SetScoresColored s={s} m={m} fontSize={28} />}
      {selectedSponsors.length > 0 && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80 * s, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 * s }}>
          {selectedSponsors.map((url, i) => <img key={i} src={url} alt="" style={{ height: 42 * s, maxWidth: 120 * s, objectFit: "contain", filter: "brightness(0) invert(1)" }} />)}</div>)}
    </div>);
}
function PhotoOverlayStory({ s, m, showSets, selectedSponsors }) {
  const sponsorBarH = selectedSponsors.length > 0 ? 100 : 0;
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-end z-10" style={{ pointerEvents: "none", paddingBottom: (80 + sponsorBarH) * s }}>
      <div style={{ position: "absolute", top: 60 * s, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.6)", borderRadius: "50%", width: 120 * s, height: 120 * s, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#fff", fontSize: 16 * s, fontWeight: 700 }}>LIGA</span></div>
      <div style={{ position: "absolute", top: 210 * s, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.5)", padding: `${6 * s}px ${24 * s}px`, borderRadius: 16 * s }}>
        <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 26 * s, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>{m.kolejka}</span></div>
      <div className="flex items-center justify-center" style={{ gap: 30 * s, marginBottom: showSets ? 10 * s : 30 * s }}>
        <div className="flex flex-col items-center" style={{ width: 260 * s }}>
          <div style={{ width: 130 * s, height: 130 * s, borderRadius: "50%", background: "rgba(0,0,0,0.4)", border: `${4 * s}px solid ${m.color_home}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: m.color_home, fontSize: 42 * s, fontWeight: 800 }}>{m.team_home.charAt(0)}</span></div>
          <span style={{ background: m.color_home, color: "#0d1117", fontSize: 26 * s, fontWeight: 700, padding: `${6 * s}px ${20 * s}px`, borderRadius: 12 * s, marginTop: 12 * s }}>{m.team_home}</span></div>
        <span style={{ fontSize: 140 * s, fontWeight: 900, color: "#fff", lineHeight: 1, letterSpacing: 6 * s, textShadow: `0 ${3 * s}px ${16 * s}px rgba(0,0,0,0.6)` }}>{m.sets_home} : {m.sets_away}</span>
        <div className="flex flex-col items-center" style={{ width: 260 * s }}>
          <div style={{ width: 130 * s, height: 130 * s, borderRadius: "50%", background: "rgba(0,0,0,0.4)", border: `${4 * s}px solid ${m.color_away}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ color: m.color_away, fontSize: 42 * s, fontWeight: 800 }}>{m.team_away.charAt(0)}</span></div>
          <span style={{ background: m.color_away, color: "#0d1117", fontSize: 26 * s, fontWeight: 700, padding: `${6 * s}px ${20 * s}px`, borderRadius: 12 * s, marginTop: 12 * s }}>{m.team_away}</span></div>
      </div>
      {showSets && <SetScoresColored s={s} m={m} fontSize={32} />}
      {selectedSponsors.length > 0 && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 100 * s, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 * s }}>
          {selectedSponsors.map((url, i) => <img key={i} src={url} alt="" style={{ height: 52 * s, maxWidth: 140 * s, objectFit: "contain", filter: "brightness(0) invert(1)" }} />)}</div>)}
    </div>);
}

// ── SPLIT PANEL OVERLAYS — RESULT ────────────────────────────────────────────
function SplitPanelOverlayPost({ s, m, showSets, selectedSponsors }) {
  const panelW = 0.42; const numSets = m.set_scores.length;
  const scoreFontSize = numSets >= 5 ? 60 : 80; const setFontSize = numSets >= 5 ? 18 : 22;
  const setMarginBottom = numSets >= 5 ? 2 : 4; const teamLogoSize = numSets >= 5 ? 44 : 52;
  const sectionGap = numSets >= 5 ? 4 : 6;
  const homeNameFs = m.team_home.length > 14 ? (numSets >= 5 ? 15 : 18) : (numSets >= 5 ? 18 : 22);
  const awayNameFs = m.team_away.length > 14 ? (numSets >= 5 ? 15 : 18) : (numSets >= 5 ? 18 : 22);
  const sponsorBarH = selectedSponsors.length > 0 ? 80 : 0; const panelPadBottom = 28 + sponsorBarH;
  return (
    <div className="absolute inset-0 z-10" style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: `${panelW * 100}%`, height: "100%", background: "linear-gradient(180deg, #111 0%, #0a0a0a 100%)" }} />
      <div style={{ position: "absolute", top: 0, left: `${panelW * 100}%`, width: "20%", height: "100%", background: "linear-gradient(90deg, #0a0a0a, transparent)" }} />
      <div style={{ position: "absolute", top: 0, left: 0, width: `${panelW * 100}%`, height: 4 * s, background: `linear-gradient(90deg, ${m.color_home}, ${m.color_liga})` }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, width: `${panelW * 100}%`, height: 4 * s, background: `linear-gradient(90deg, ${m.color_away}, ${m.color_liga})` }} />
      <div style={{ position: "absolute", top: 0, left: `${panelW * 100}%`, width: 3 * s, height: "100%", background: `linear-gradient(180deg, ${m.color_home}, ${m.color_liga}, ${m.color_away})`, opacity: 0.5 }} />
      <div style={{ position: "absolute", top: 0, left: 0, width: `${panelW * 100}%`, height: "100%" }}>
        <div style={{ position: "absolute", top: 40 * s, left: 40 * s, right: 32 * s }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 * s }}>
            <div style={{ width: 42 * s, height: 42 * s, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: m.color_liga, fontSize: 9 * s, fontWeight: 700 }}>LIGA</span></div>
            <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 16 * s, fontWeight: 500, textTransform: "uppercase", letterSpacing: 3 }}>{m.kolejka}</span></div>
          <div style={{ fontFamily: "Anton, sans-serif", fontSize: 44 * s, fontWeight: 400, color: "rgba(255,255,255,0.12)", textTransform: "uppercase", letterSpacing: 3, lineHeight: 0.95, marginTop: 6 * s }}>WYNIK<br/>MECZU</div></div>
        <div style={{ position: "absolute", top: "50%", left: 40 * s, right: 32 * s, transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: sectionGap * s }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 * s }}>
            <div style={{ width: teamLogoSize * s, height: teamLogoSize * s, borderRadius: "50%", border: `2px solid ${m.color_home}`, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ color: m.color_home, fontSize: teamLogoSize * 0.42 * s, fontWeight: 800 }}>{m.team_home.charAt(0)}</span></div>
            <span style={{ color: "#fff", fontSize: homeNameFs * s, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{m.team_home}</span></div>
          <div style={{ marginLeft: 64 * s, fontSize: scoreFontSize * s, fontWeight: 700, color: m.color_home, lineHeight: 1 }}>{m.sets_home}</div>
          <div style={{ width: 50 * s, height: 2 * s, background: "rgba(255,255,255,0.1)", marginLeft: 64 * s }} />
          <div style={{ marginLeft: 64 * s, fontSize: scoreFontSize * s, fontWeight: 700, color: m.color_away, lineHeight: 1 }}>{m.sets_away}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 * s }}>
            <div style={{ width: teamLogoSize * s, height: teamLogoSize * s, borderRadius: "50%", border: `2px solid ${m.color_away}`, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ color: m.color_away, fontSize: teamLogoSize * 0.42 * s, fontWeight: 800 }}>{m.team_away.charAt(0)}</span></div>
            <span style={{ color: "#fff", fontSize: awayNameFs * s, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{m.team_away}</span></div></div>
        {showSets && (
          <div style={{ position: "absolute", bottom: panelPadBottom * s, left: 104 * s, right: 32 * s }}>
            <div style={{ fontSize: 11 * s, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 6 * s }}>Wyniki setów</div>
            {m.set_scores.map((sc, i) => { const homeWon = sc.home > sc.away; return (
              <div key={i} style={{ display: "flex", alignItems: "center", marginBottom: setMarginBottom * s }}>
                <span style={{ width: 18 * s, fontSize: 11 * s, color: "rgba(255,255,255,0.35)" }}>{i + 1}</span>
                <span style={{ fontSize: setFontSize * s, fontWeight: homeWon ? 700 : 400, color: homeWon ? m.color_home : "rgba(255,255,255,0.5)", width: 32 * s, textAlign: "right" }}>{sc.home}</span>
                <span style={{ fontSize: 12 * s, color: "rgba(255,255,255,0.25)", margin: `0 ${5 * s}px` }}>–</span>
                <span style={{ fontSize: setFontSize * s, fontWeight: homeWon ? 400 : 700, color: homeWon ? "rgba(255,255,255,0.5)" : m.color_away, width: 32 * s }}>{sc.away}</span></div>); })}
          </div>
        )}</div>
      <div style={{ position: "absolute", bottom: (80 + sponsorBarH) * s, right: 40 * s, fontFamily: "Anton, sans-serif", fontSize: 120 * s, fontWeight: 400, color: "rgba(255,255,255,0.08)", lineHeight: 1.05, textAlign: "right", textTransform: "uppercase", letterSpacing: 2 }}>WYNIK<br/>MECZU</div>
      {selectedSponsors.length > 0 && (<div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80 * s, background: "rgba(0,0,0,0.9)", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 * s }}>
        {selectedSponsors.map((url, i) => <img key={i} src={url} alt="" style={{ height: 42 * s, maxWidth: 120 * s, objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.7 }} />)}</div>)}</div>);
}
function SplitPanelOverlayStory({ s, m, showSets, selectedSponsors }) {
  const splitAt = 0.55; const sponsorBarH = selectedSponsors.length > 0 ? 100 : 0;
  return (
    <div className="absolute inset-0 z-10" style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: `${(1 - splitAt) * 100}%`, background: "linear-gradient(180deg, #111 0%, #0a0a0a 100%)" }} />
      <div style={{ position: "absolute", top: `${(splitAt - 0.12) * 100}%`, left: 0, width: "100%", height: "15%", background: "linear-gradient(180deg, transparent, #0a0a0a)" }} />
      <div style={{ position: "absolute", top: `${splitAt * 100}%`, left: 0, width: "100%", height: 4 * s, background: `linear-gradient(90deg, ${m.color_home}, ${m.color_liga}, ${m.color_away})`, opacity: 0.5 }} />
      <div style={{ position: "absolute", top: 40 * s, left: 40 * s, display: "flex", alignItems: "center", gap: 16 * s }}>
        <div style={{ width: 48 * s, height: 48 * s, borderRadius: "50%", background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#fff", fontSize: 8 * s, fontWeight: 700 }}>LIGA</span></div>
        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 22 * s, fontWeight: 600, textTransform: "uppercase", letterSpacing: 3 }}>{m.kolejka}</span></div>
      <div style={{ position: "absolute", bottom: sponsorBarH * s, left: 0, width: "100%", height: `${(1 - splitAt) * 100}%`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 36 * s }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 36 * s }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 130 * s, height: 130 * s, borderRadius: "50%", border: `4px solid ${m.color_home}`, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}><span style={{ color: m.color_home, fontSize: 52 * s, fontWeight: 800 }}>{m.team_home.charAt(0)}</span></div>
            <div style={{ color: "#fff", fontSize: 30 * s, fontWeight: 700, marginTop: 14 * s, textTransform: "uppercase" }}>{m.team_home}</div></div>
          <div style={{ fontSize: 150 * s, fontWeight: 700, color: "#fff", lineHeight: 1, letterSpacing: 6 * s }}>{m.sets_home} : {m.sets_away}</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 130 * s, height: 130 * s, borderRadius: "50%", border: `4px solid ${m.color_away}`, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}><span style={{ color: m.color_away, fontSize: 52 * s, fontWeight: 800 }}>{m.team_away.charAt(0)}</span></div>
            <div style={{ color: "#fff", fontSize: 30 * s, fontWeight: 700, marginTop: 14 * s, textTransform: "uppercase" }}>{m.team_away}</div></div></div>
        {showSets && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 * s }}>
            {m.set_scores.map((sc, i) => { const homeWon = sc.home > sc.away; return (
              <div key={i} style={{ display: "flex", alignItems: "center" }}>
                {i > 0 && <span style={{ color: "rgba(255,255,255,0.25)", margin: `0 ${6 * s}px`, fontSize: 28 * s }}>|</span>}
                <span style={{ fontSize: 44 * s, fontWeight: homeWon ? 700 : 400, color: homeWon ? m.color_home : "rgba(255,255,255,0.5)" }}>{sc.home}</span>
                <span style={{ fontSize: 28 * s, color: "rgba(255,255,255,0.3)", margin: `0 ${2 * s}px` }}>:</span>
                <span style={{ fontSize: 44 * s, fontWeight: homeWon ? 400 : 700, color: homeWon ? "rgba(255,255,255,0.5)" : m.color_away }}>{sc.away}</span></div>); })}
          </div>
        )}</div>
      {selectedSponsors.length > 0 && (<div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 100 * s, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 * s }}>
        {selectedSponsors.map((url, i) => <img key={i} src={url} alt="" style={{ height: 52 * s, maxWidth: 120 * s, objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.7 }} />)}</div>)}</div>);
}

// ── SPLIT PANEL OVERLAYS — PREVIEW ───────────────────────────────────────────
function SplitPanelPreviewPost({ s, m, selectedSponsors }) {
  const panelW = 0.42; const sponsorBarH = selectedSponsors.length > 0 ? 80 : 0; const panelPadBottom = 28 + sponsorBarH;
  const homeNameFs = m.team_home.length > 14 ? 18 : 22; const awayNameFs = m.team_away.length > 14 ? 18 : 22;
  return (
    <div className="absolute inset-0 z-10" style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 0, left: 0, width: `${panelW * 100}%`, height: "100%", background: "linear-gradient(180deg, #111 0%, #0a0a0a 100%)" }} />
      <div style={{ position: "absolute", top: 0, left: `${panelW * 100}%`, width: "20%", height: "100%", background: "linear-gradient(90deg, #0a0a0a, transparent)" }} />
      <div style={{ position: "absolute", top: 0, left: 0, width: `${panelW * 100}%`, height: 4 * s, background: `linear-gradient(90deg, ${m.color_home}, ${m.color_liga})` }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, width: `${panelW * 100}%`, height: 4 * s, background: `linear-gradient(90deg, ${m.color_away}, ${m.color_liga})` }} />
      <div style={{ position: "absolute", top: 0, left: `${panelW * 100}%`, width: 3 * s, height: "100%", background: `linear-gradient(180deg, ${m.color_home}, ${m.color_liga}, ${m.color_away})`, opacity: 0.5 }} />
      <div style={{ position: "absolute", top: 0, left: 0, width: `${panelW * 100}%`, height: "100%" }}>
        <div style={{ position: "absolute", top: 40 * s, left: 40 * s, right: 32 * s }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 * s }}>
            <div style={{ width: 42 * s, height: 42 * s, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: m.color_liga, fontSize: 9 * s, fontWeight: 700 }}>LIGA</span></div>
            <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 16 * s, fontWeight: 500, textTransform: "uppercase", letterSpacing: 3 }}>{m.kolejka}</span></div>
          <div style={{ fontFamily: "Anton, sans-serif", fontSize: 44 * s, fontWeight: 400, color: "rgba(255,255,255,0.12)", textTransform: "uppercase", letterSpacing: 3, lineHeight: 0.95, marginTop: 6 * s }}>ZAPOWIEDŹ<br/>MECZU</div></div>
        <div style={{ position: "absolute", top: "50%", left: 40 * s, right: 32 * s, transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: 6 * s }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 * s }}>
            <div style={{ width: 52 * s, height: 52 * s, borderRadius: "50%", border: `2px solid ${m.color_home}`, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ color: m.color_home, fontSize: 22 * s, fontWeight: 800 }}>{m.team_home.charAt(0)}</span></div>
            <span style={{ color: "#fff", fontSize: homeNameFs * s, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{m.team_home}</span></div>
          <div style={{ marginLeft: 64 * s, fontSize: 80 * s, fontWeight: 700, color: "rgba(255,255,255,0.15)", lineHeight: 1 }}>VS</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 * s }}>
            <div style={{ width: 52 * s, height: 52 * s, borderRadius: "50%", border: `2px solid ${m.color_away}`, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ color: m.color_away, fontSize: 22 * s, fontWeight: 800 }}>{m.team_away.charAt(0)}</span></div>
            <span style={{ color: "#fff", fontSize: awayNameFs * s, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{m.team_away}</span></div></div>
        <div style={{ position: "absolute", bottom: panelPadBottom * s, left: 40 * s, right: 32 * s }}>
          <div style={{ fontSize: 11 * s, fontWeight: 600, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 * s }}>Kiedy i gdzie</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 * s, marginBottom: 4 * s }}>
            <span style={{ color: m.color_home, fontSize: 22 * s, fontWeight: 700 }}>{m.data_meczu}</span>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 16 * s }}>•</span>
            <span style={{ color: "#fff", fontSize: 22 * s, fontWeight: 600 }}>{m.godzina}</span></div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 * s }}>{m.miejsce}</div></div></div>
      <div style={{ position: "absolute", bottom: (80 + sponsorBarH) * s, right: 40 * s, fontFamily: "Anton, sans-serif", fontSize: 120 * s, fontWeight: 400, color: "rgba(255,255,255,0.08)", lineHeight: 1.05, textAlign: "right", textTransform: "uppercase", letterSpacing: 2 }}>GAME<br/>DAY</div>
      {selectedSponsors.length > 0 && (<div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80 * s, background: "rgba(0,0,0,0.9)", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 * s }}>
        {selectedSponsors.map((url, i) => <img key={i} src={url} alt="" style={{ height: 42 * s, maxWidth: 120 * s, objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.7 }} />)}</div>)}</div>);
}
function SplitPanelPreviewStory({ s, m, selectedSponsors }) {
  const splitAt = 0.55; const sponsorBarH = selectedSponsors.length > 0 ? 100 : 0;
  return (
    <div className="absolute inset-0 z-10" style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: `${(1 - splitAt) * 100}%`, background: "linear-gradient(180deg, #111 0%, #0a0a0a 100%)" }} />
      <div style={{ position: "absolute", top: `${(splitAt - 0.12) * 100}%`, left: 0, width: "100%", height: "15%", background: "linear-gradient(180deg, transparent, #0a0a0a)" }} />
      <div style={{ position: "absolute", top: `${splitAt * 100}%`, left: 0, width: "100%", height: 4 * s, background: `linear-gradient(90deg, ${m.color_home}, ${m.color_liga}, ${m.color_away})`, opacity: 0.5 }} />
      <div style={{ position: "absolute", top: 40 * s, left: 40 * s, display: "flex", alignItems: "center", gap: 16 * s }}>
        <div style={{ width: 48 * s, height: 48 * s, borderRadius: "50%", background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ color: "#fff", fontSize: 8 * s, fontWeight: 700 }}>LIGA</span></div>
        <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 22 * s, fontWeight: 600, textTransform: "uppercase", letterSpacing: 3 }}>{m.kolejka}</span></div>
      <div style={{ position: "absolute", bottom: sponsorBarH * s, left: 0, width: "100%", height: `${(1 - splitAt) * 100}%`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 36 * s }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 36 * s }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 130 * s, height: 130 * s, borderRadius: "50%", border: `4px solid ${m.color_home}`, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}><span style={{ color: m.color_home, fontSize: 52 * s, fontWeight: 800 }}>{m.team_home.charAt(0)}</span></div>
            <div style={{ color: "#fff", fontSize: 30 * s, fontWeight: 700, marginTop: 14 * s, textTransform: "uppercase" }}>{m.team_home}</div></div>
          <div style={{ fontSize: 150 * s, fontWeight: 700, color: "rgba(255,255,255,0.15)", lineHeight: 1, letterSpacing: 6 * s }}>VS</div>
          <div style={{ textAlign: "center" }}>
            <div style={{ width: 130 * s, height: 130 * s, borderRadius: "50%", border: `4px solid ${m.color_away}`, background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto" }}><span style={{ color: m.color_away, fontSize: 52 * s, fontWeight: 800 }}>{m.team_away.charAt(0)}</span></div>
            <div style={{ color: "#fff", fontSize: 30 * s, fontWeight: 700, marginTop: 14 * s, textTransform: "uppercase" }}>{m.team_away}</div></div></div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 44 * s, fontWeight: 700, color: "#fff", letterSpacing: 2 }}>{m.data_meczu} • {m.godzina}</div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 22 * s, marginTop: 6 * s }}>{m.miejsce}</div></div></div>
      {selectedSponsors.length > 0 && (<div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 100 * s, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 * s }}>
        {selectedSponsors.map((url, i) => <img key={i} src={url} alt="" style={{ height: 52 * s, maxWidth: 120 * s, objectFit: "contain", filter: "brightness(0) invert(1)", opacity: 0.7 }} />)}</div>)}</div>);
}

// ── NO-PHOTO VARIANTS ────────────────────────────────────────────────────────
function NoPhotoPost({ s, m, showSets, selectedSponsors }) {
  if (m.sport === "football") return <FootballNoPhotoPost s={s} m={m} selectedSponsors={selectedSponsors} />;
  const isPreview = m.mode === "preview";
  const sponsorBarH = selectedSponsors.length > 0 ? 80 : 0;
  return (
    <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${m.color_liga} 0%, #001533 100%)` }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6 * s, background: `linear-gradient(90deg, ${m.color_home}, ${m.color_liga}, ${m.color_away})` }} />
      <div style={{ position: "absolute", bottom: sponsorBarH * s, left: 0, right: 0, height: 6 * s, background: `linear-gradient(90deg, ${m.color_home}, ${m.color_liga}, ${m.color_away})` }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10" style={{ pointerEvents: "none", gap: 12 * s, paddingBottom: sponsorBarH * s }}>
        <LigaLogo s={s} m={m} size={90} light />
        <KolejkaBadge s={s} m={m} fontSize={22} light />
        <div className="flex items-center justify-center" style={{ gap: 32 * s, marginTop: 10 * s }}>
          <TeamCircle s={s} m={m} team="home" size={140} fontSize={24} light />
          <span style={{ fontSize: 116 * s, fontWeight: 900, color: "#fff", lineHeight: 1, letterSpacing: 4 * s }}>{isPreview ? "VS" : `${m.sets_home} : ${m.sets_away}`}</span>
          <TeamCircle s={s} m={m} team="away" size={140} fontSize={24} light /></div>
        {isPreview ? (
          <div style={{ textAlign: "center", marginTop: 10 * s }}>
            <div style={{ fontSize: 28 * s, fontWeight: 700, color: "#fff" }}>{m.data_meczu} • {m.godzina}</div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 18 * s, marginTop: 4 * s }}>{m.miejsce}</div></div>
        ) : (showSets && <SetTable s={s} m={m} />)}</div>
      {selectedSponsors.length > 0 && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 80 * s, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 * s, zIndex: 20 }}>
          {selectedSponsors.map((url, i) => <img key={i} src={url} alt="" style={{ height: 42 * s, maxWidth: 120 * s, objectFit: "contain", filter: "brightness(0) invert(1)" }} />)}</div>)}</div>);
}
function NoPhotoStory({ s, m, showSets, selectedSponsors }) {
  if (m.sport === "football") return <FootballNoPhotoStory s={s} m={m} selectedSponsors={selectedSponsors} />;
  const isPreview = m.mode === "preview";
  const sponsorBarH = selectedSponsors.length > 0 ? 100 : 0;
  return (
    <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${m.color_liga} 0%, #001533 40%, #001533 100%)` }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6 * s, background: `linear-gradient(90deg, ${m.color_home}, ${m.color_liga}, ${m.color_away})` }} />
      <div style={{ position: "absolute", bottom: sponsorBarH * s, left: 0, right: 0, height: 6 * s, background: `linear-gradient(90deg, ${m.color_home}, ${m.color_liga}, ${m.color_away})` }} />
      <div className="absolute inset-0 flex flex-col items-center justify-evenly z-10" style={{ pointerEvents: "none", paddingTop: 20 * s, paddingBottom: (20 + sponsorBarH) * s }}>
        <div className="flex flex-col items-center" style={{ gap: 12 * s }}>
          <LigaLogo s={s} m={m} size={120} light />
          <KolejkaBadge s={s} m={m} fontSize={28} light /></div>
        <TeamCircle s={s} m={m} team="home" size={200} fontSize={30} light />
        {isPreview ? (
          <span style={{ fontSize: 180 * s, fontWeight: 900, color: "#fff", lineHeight: 1, letterSpacing: 8 * s }}>VS</span>
        ) : (<>
          {showSets && <div className="flex justify-center" style={{ gap: 20 * s }}>
            {m.set_scores.map((sc, i) => { const won = sc.home > sc.away; return <span key={i} style={{ fontSize: 48 * s, color: won ? m.color_home : m.color_home + '66', fontWeight: won ? 800 : 400, minWidth: 60 * s, textAlign: "center", display: "inline-block" }}>{sc.home}</span>; })}</div>}
          <span style={{ fontSize: 180 * s, fontWeight: 900, color: "#fff", lineHeight: 1, letterSpacing: 8 * s }}>{m.sets_home} : {m.sets_away}</span>
          {showSets && <div className="flex justify-center" style={{ gap: 20 * s }}>
            {m.set_scores.map((sc, i) => { const won = sc.away > sc.home; return <span key={i} style={{ fontSize: 48 * s, color: won ? m.color_away : m.color_away + '66', fontWeight: won ? 800 : 400, minWidth: 60 * s, textAlign: "center", display: "inline-block" }}>{sc.away}</span>; })}</div>}</>)}
        <TeamCircle s={s} m={m} team="away" size={200} fontSize={30} light />
        {isPreview && (<div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48 * s, fontWeight: 700, color: "#fff", letterSpacing: 2 }}>{m.data_meczu} • {m.godzina}</div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 28 * s, marginTop: 6 * s }}>{m.miejsce}</div></div>)}</div>
      {selectedSponsors.length > 0 && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 100 * s, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 * s, zIndex: 20 }}>
          {selectedSponsors.map((url, i) => <img key={i} src={url} alt="" style={{ height: 52 * s, maxWidth: 140 * s, objectFit: "contain", filter: "brightness(0) invert(1)" }} />)}</div>)}</div>);
}

// ── SHARED COMPONENTS ────────────────────────────────────────────────────────
function SetScoresColored({ s, m, fontSize }) {
  return (<div style={{ background: "rgba(0,0,0,0.55)", borderRadius: 12 * s, padding: `${8 * s}px ${18 * s}px`, marginTop: 8 * s, display: "inline-flex", alignItems: "center", gap: 4 * s }}>
    {m.set_scores.map((sc, i) => { const homeWon = sc.home > sc.away; return (
      <div key={i} style={{ display: "inline-flex", alignItems: "center" }}>
        {i > 0 && <span style={{ fontSize: fontSize * s, color: "rgba(255,255,255,0.2)", margin: `0 ${8 * s}px` }}>|</span>}
        <span style={{ fontSize: fontSize * s, fontWeight: homeWon ? 800 : 400, color: homeWon ? m.color_home : m.color_home + '99' }}>{sc.home}</span>
        <span style={{ fontSize: fontSize * s * 0.7, color: "rgba(255,255,255,0.3)" }}>:</span>
        <span style={{ fontSize: fontSize * s, fontWeight: homeWon ? 400 : 800, color: homeWon ? m.color_away + '99' : m.color_away }}>{sc.away}</span></div>); })}</div>);
}
function SetTable({ s, m }) {
  return (<div style={{ width: 500 * s, marginTop: 20 * s }}>
    <div className="flex" style={{ marginBottom: 4 * s }}>
      <div style={{ flex: 1.2, textAlign: "center", padding: 6 * s, borderBottom: `${3 * s}px solid ${m.color_home}` }} />
      <div style={{ flex: 0.8, textAlign: "center", padding: 6 * s }}><span style={{ fontSize: 16 * s, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 2 }}>Set</span></div>
      <div style={{ flex: 1.2, textAlign: "center", padding: 6 * s, borderBottom: `${3 * s}px solid ${m.color_away}` }} /></div>
    {m.set_scores.map((sc, i) => { const homeWon = sc.home > sc.away; return (
      <div key={i} className="flex items-center" style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.03)" : "transparent", borderRadius: 8 * s, margin: `${4 * s}px 0` }}>
        <div style={{ flex: 1.2, textAlign: "center", padding: 12 * s }}><span style={{ fontSize: (homeWon ? 36 : 32) * s, color: homeWon ? m.color_home : m.color_home + '66', fontWeight: homeWon ? 800 : 400 }}>{sc.home}</span></div>
        <div style={{ flex: 0.8, textAlign: "center", padding: 12 * s }}><span style={{ fontSize: 24 * s, color: "rgba(255,255,255,0.3)" }}>{i + 1}</span></div>
        <div style={{ flex: 1.2, textAlign: "center", padding: 12 * s }}><span style={{ fontSize: (homeWon ? 32 : 36) * s, color: homeWon ? m.color_away + '66' : m.color_away, fontWeight: homeWon ? 400 : 800 }}>{sc.away}</span></div></div>); })}</div>);
}
function LigaLogo({ s, m, size, light }) {
  return (<div style={{ width: size * s, height: size * s, borderRadius: "50%", background: light ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
    <span style={{ color: light ? m.color_liga : "#fff", fontSize: (size * 0.16) * s, fontWeight: 700 }}>LIGA</span></div>);
}
function KolejkaBadge({ s, m, fontSize, light }) {
  return (<div style={{ background: light ? "rgba(0,74,173,0.5)" : "rgba(0,0,0,0.5)", padding: `${6 * s}px ${28 * s}px`, borderRadius: 20 * s }}>
    <span style={{ color: "rgba(255,255,255,0.7)", fontSize: fontSize * s, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase" }}>{m.kolejka}</span></div>);
}
function TeamCircle({ s, m, team, size, fontSize, light }) {
  const isHome = team === "home"; const color = isHome ? m.color_home : m.color_away; const name = isHome ? m.team_home : m.team_away;
  const borderW = Math.max(2, (size > 150 ? 5 : 4) * s);
  return (<div className="flex flex-col items-center" style={{ width: (size + 100) * s }}>
    <div style={{ width: size * s, height: size * s, borderRadius: "50%", background: light ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.4)", border: `${borderW}px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <span style={{ color, fontSize: (size * 0.35) * s, fontWeight: 800 }}>{name.charAt(0)}</span></div>
    <span style={{ background: color, color: "#0d1117", fontSize: fontSize * s, fontWeight: 700, padding: `${(fontSize * 0.25) * s}px ${(fontSize * 0.8) * s}px`, borderRadius: (fontSize * 0.5) * s, marginTop: (fontSize * 0.5) * s, display: "inline-block" }}>{name}</span></div>);
}

// ── STYLE SELECTOR ───────────────────────────────────────────────────────────
function StyleSelector({ styles, value, onChange }) {
  if (styles.length <= 1) return null;
  return (<div style={{ display: "flex", gap: 6, background: "rgba(0,0,0,0.1)", borderRadius: 8, padding: 3 }}>
    {styles.map(st => (<button key={st.id} onClick={() => onChange(st.id)} style={{ fontSize: 11, fontWeight: value === st.id ? 600 : 400, padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer", background: value === st.id ? "#2563eb" : "transparent", color: value === st.id ? "#fff" : "var(--color-text-secondary, #888)", transition: "all 0.15s" }}>{st.label}</button>))}</div>);
}

// ── PREVIEW PANEL ────────────────────────────────────────────────────────────
function PreviewPanel({ label, targetW, targetH, image, imageNat, zoom, bgPos, setBgPos, m, maxPreviewW, showSets, selectedSponsors, onUpload, onRemove, onZoomChange, graphicStyle }) {
  const containerRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);
  const s = maxPreviewW / targetW; const pw = targetW * s; const ph = targetH * s; const isStory = targetH > targetW;
  const grad = isStory ? "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 15%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.85) 75%, rgba(0,0,0,0.97) 100%)" : "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.1) 25%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0.92) 80%, rgba(0,0,0,0.97) 100%)";
  const onDown = (cx, cy) => { if (!image) return; setDragging(true); const parts = bgPos.replace(/px/g, '').split(' '); setDragStart({ cx, cy, px: parseFloat(parts[0]) || 0, py: parseFloat(parts[1]) || 0 }); };
  const onMove = (cx, cy) => { if (!dragging || !dragStart) return; setBgPos(`${(dragStart.px + (cx - dragStart.cx)).toFixed(0)}px ${(dragStart.py + (cy - dragStart.cy)).toFixed(0)}px`); };
  const onUp = () => { setDragging(false); setDragStart(null); };

  function renderOverlay() {
    if (!image) return isStory ? <NoPhotoStory s={s} m={m} showSets={showSets} selectedSponsors={selectedSponsors} /> : <NoPhotoPost s={s} m={m} showSets={showSets} selectedSponsors={selectedSponsors} />;
    if (m.sport === "football") return isStory ? <FootballPhotoStory s={s} m={m} selectedSponsors={selectedSponsors} /> : <FootballPhotoPost s={s} m={m} selectedSponsors={selectedSponsors} />;
    if (m.mode === "preview") return isStory ? <SplitPanelPreviewStory s={s} m={m} selectedSponsors={selectedSponsors} /> : <SplitPanelPreviewPost s={s} m={m} selectedSponsors={selectedSponsors} />;
    if (graphicStyle === "split_panel") return isStory ? <SplitPanelOverlayStory s={s} m={m} showSets={showSets} selectedSponsors={selectedSponsors} /> : <SplitPanelOverlayPost s={s} m={m} showSets={showSets} selectedSponsors={selectedSponsors} />;
    return isStory ? <PhotoOverlayStory s={s} m={m} showSets={showSets} selectedSponsors={selectedSponsors} /> : <PhotoOverlayPost s={s} m={m} showSets={showSets} selectedSponsors={selectedSponsors} />;
  }
  const showDefaultGrad = image && (m.sport === "football" || (graphicStyle !== "split_panel" && m.mode !== "preview"));
  return (
    <div className="flex flex-col items-center gap-1">
      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary, #333)" }}>{label}</span>
      <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
        <label style={{ fontSize: 11, color: "#fff", background: "#2563eb", padding: "4px 12px", borderRadius: 6, cursor: "pointer", fontWeight: 500 }}>{image ? "Zmień foto" : "Dodaj foto"}<input type="file" accept="image/*" onChange={onUpload} style={{ display: "none" }} /></label>
        {image && <button onClick={onRemove} style={{ fontSize: 11, color: "#ef4444", background: "none", border: "1px solid #ef4444", padding: "4px 12px", borderRadius: 6, cursor: "pointer" }}>Usuń foto</button>}</div>
      {image && (<div className="flex items-center gap-2" style={{ width: pw, marginBottom: 4 }}><span style={{ fontSize: 11, color: "#888" }}>Zoom</span><input type="range" min="100" max="300" step="1" value={zoom} onChange={(e) => onZoomChange(Number(e.target.value))} style={{ flex: 1 }} /><span style={{ fontSize: 11, color: "#666", width: 36, textAlign: "right" }}>{zoom}%</span></div>)}
      <div ref={containerRef} style={{ width: pw, height: ph, position: "relative", overflow: "hidden", borderRadius: 8, cursor: image ? (dragging ? "grabbing" : "grab") : "default" }} className="select-none bg-gray-800"
        onMouseDown={(e) => { e.preventDefault(); onDown(e.clientX, e.clientY); }} onMouseMove={(e) => onMove(e.clientX, e.clientY)} onMouseUp={onUp} onMouseLeave={onUp}
        onTouchStart={(e) => { const t = e.touches[0]; onDown(t.clientX, t.clientY); }} onTouchMove={(e) => { e.preventDefault(); const t = e.touches[0]; onMove(t.clientX, t.clientY); }} onTouchEnd={onUp}>
        {image ? (<><div style={{ position: "absolute", inset: 0, backgroundImage: `url(${image})`, backgroundSize: "cover", backgroundPosition: "center center", filter: "blur(8px) brightness(0.45) saturate(1.3)", transform: "scale(1.12)" }} />
          <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${image})`, backgroundSize: `${zoom}%`, backgroundPosition: bgPos, backgroundRepeat: "no-repeat" }} />
          {showDefaultGrad && <div className="absolute inset-0" style={{ background: grad, pointerEvents: "none" }} />}{renderOverlay()}</>) : renderOverlay()}</div>
      {image && <p style={{ fontSize: 10, color: "#999", marginTop: 2 }}>Przeciągnij żeby zmienić kadr</p>}</div>);
}

// ── SPONSORS SELECTOR ────────────────────────────────────────────────────────
function SponsorsSelector({ sponsorzy, selected, setSelected }) {
  if (sponsorzy.length === 0) return null;
  const toggle = (url) => setSelected(prev => prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]);
  return (<div style={{ background: "rgba(0,0,0,0.15)", borderRadius: 10, padding: "10px 14px" }}>
    <p style={{ fontSize: 11, color: "var(--color-text-secondary, #888)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Sponsorzy na grafice</p>
    <div className="flex flex-wrap gap-2">
      {sponsorzy.map((url, i) => { const isSelected = selected.includes(url); return (
        <div key={i} onClick={() => toggle(url)} style={{ border: isSelected ? "2px solid #2563eb" : "2px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "6px 10px", cursor: "pointer", background: isSelected ? "rgba(37,99,235,0.15)" : "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", minWidth: 80, height: 44, transition: "all 0.15s" }}>
          <img src={url} alt={`Sponsor ${i + 1}`} style={{ height: 28, maxWidth: 100, objectFit: "contain" }} /></div>); })}</div>
    {selected.length > 0 && <p style={{ fontSize: 10, color: "#2563eb", marginTop: 6 }}>{selected.length} sponsor{selected.length > 1 ? "ów" : ""} wybrany{selected.length > 1 ? "ch" : ""}</p>}</div>);
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
export default function PhotoEditor() {
  const m = getMatchFromURL();
  const isDev = m.match_id === "DEV";
  const isPreview = m.mode === "preview";
  const isFootball = m.sport === "football";
  const availableStyles = isPreview ? STYLES_PREVIEW : STYLES_RESULT;
  const [graphicStyle, setGraphicStyle] = useState(isPreview ? "split_panel" : "classic");

  const [postImage, setPostImage] = useState(null); const [postImageNat, setPostImageNat] = useState({ w: 0, h: 0 });
  const [postZoom, setPostZoom] = useState(150); const [postBgPos, setPostBgPos] = useState("0px 0px");
  const [storyImage, setStoryImage] = useState(null); const [storyImageNat, setStoryImageNat] = useState({ w: 0, h: 0 });
  const [storyZoom, setStoryZoom] = useState(150); const [storyBgPos, setStoryBgPos] = useState("0px 0px");

  // Shared controls
  const [showSets, setShowSets] = useState(false);
  const [selectedSponsors, setSelectedSponsors] = useState(m.sponsorzy || []);

  const [status, setStatus] = useState(null);
  const [resultUrls, setResultUrls] = useState(null);

  const loadImage = useCallback((onLoaded, targetW, targetH, previewW) => (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { const src = ev.target.result; const img = new Image();
      img.onload = () => { const nat = { w: img.naturalWidth, h: img.naturalHeight }; onLoaded(src, nat, initialBgPos(150, targetW, targetH, previewW, nat.w, nat.h)); };
      img.src = src; }; reader.readAsDataURL(file); }, []);

  const generateGraphics = async () => {
    if (isDev) { alert("Tryb deweloperski — otwórz edytor przez link z n8n."); return; }
    setStatus("sending");
    setResultUrls(null);

    const hasAnyPhoto = postImage || storyImage;
    const effectiveMode = !hasAnyPhoto ? 'classic' : m.mode;

    const payload = {
      match_id: m.match_id,
      played_sets: m.set_scores,
      mode: effectiveMode,
      sport: m.sport,
      grupa: m.grupa,
      team_home: m.team_home,
      team_away: m.team_away,
      wynik: isFootball ? (m.goals_home + ':' + m.goals_away) : (m.sets_home + ':' + m.sets_away),
      sety: m.set_scores.map(s => s.home + ':' + s.away).join(','),
      goals_home: m.goals_home,
      goals_away: m.goals_away,
      half_home: m.half_home,
      half_away: m.half_away,
      przerwa: m.half_home + ':' + m.half_away,
      scorers_home: m.scorers_home,
      scorers_away: m.scorers_away,
      strzelcy_home: (m.scorers_home || []).map(sc => `${sc.name}:${sc.minute}`).join(','),
      strzelcy_away: (m.scorers_away || []).map(sc => `${sc.name}:${sc.minute}`).join(','),
      kolejka: m.kolejka,
      color_home: m.color_home,
      color_away: m.color_away,
      color_liga: m.color_liga,
      data_meczu: m.data_meczu,
      godzina: m.godzina,
      miejsce: m.miejsce,
      sponsorzy: !hasAnyPhoto ? selectedSponsors.join(',') : '',
      set_points: !hasAnyPhoto ? showSets : false,
      submitted_by: '',
      post: postImage ? {
        photo_base64: postImage,
        photo_position: pxToPercent(postBgPos, postZoom, 1080, 1080, 340, postImageNat.w, postImageNat.h),
        photo_zoom: `${postZoom}%`,
        show_sets: showSets,
        sponsorzy: selectedSponsors,
        style: isPreview ? "preview" : graphicStyle,
      } : (!hasAnyPhoto ? {
        style: 'classic',
        photo_base64: '',
        photo_position: '50% 50%',
        photo_zoom: '150%',
        show_sets: showSets,
        sponsorzy: selectedSponsors,
      } : null),
      story: storyImage ? {
        photo_base64: storyImage,
        photo_position: pxToPercent(storyBgPos, storyZoom, 1080, 1920, 190, storyImageNat.w, storyImageNat.h),
        photo_zoom: `${storyZoom}%`,
        show_sets: showSets,
        sponsorzy: selectedSponsors,
        style: isPreview ? "preview" : graphicStyle,
      } : (!hasAnyPhoto ? {
        style: 'classic',
        photo_base64: '',
        photo_position: '50% 50%',
        photo_zoom: '150%',
        show_sets: showSets,
        sponsorzy: selectedSponsors,
      } : null),
    };

    try {
      const res = await fetch(N8N_WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStatus("ok");
      setResultUrls({ post: data.grafika_post || '', story: data.grafika_story || '' });
    } catch (err) { console.error(err); setStatus("error"); }
  };

  const headerText = isFootball
    ? `${m.team_home} vs ${m.team_away}  ·  ${m.goals_home}:${m.goals_away}${m.grupa ? `  ·  ${m.grupa}` : ""}${m.kolejka ? `  ·  ${m.kolejka}` : ""}  ·  mecz #${m.match_id}`
    : isPreview
      ? `${m.team_home} vs ${m.team_away}  ·  ${m.kolejka}  ·  ${m.data_meczu} ${m.godzina}`
      : `${m.team_home} vs ${m.team_away}  ·  ${m.sets_home}:${m.sets_away}  ·  ${m.kolejka}  ·  mecz #${m.match_id}`;

  return (
    <div className="flex flex-col items-center gap-3 p-3 max-w-5xl mx-auto">
      <div className="text-center">
        <h2 style={{ fontSize: 16, fontWeight: 500, color: "var(--color-text-primary, #222)", margin: 0 }}>
          {isPreview ? "Edytor zapowiedzi meczu" : "Edytor grafiki meczu"}
        </h2>
        <p style={{ fontSize: 11, color: isDev ? "#f59e0b" : "var(--color-text-secondary, #888)", marginTop: 4 }}>
          {isDev ? "⚠️ Tryb deweloperski — brak parametrów w URL" : headerText}
        </p>
      </div>

      {!isFootball && <StyleSelector styles={availableStyles} value={graphicStyle} onChange={setGraphicStyle} />}

      {/* ── Preview panels ── */}
      <div className="flex gap-6 flex-wrap justify-center items-start">
        <PreviewPanel label="Post 1080×1080" targetW={1080} targetH={1080} image={postImage} imageNat={postImageNat} zoom={postZoom} bgPos={postBgPos} setBgPos={setPostBgPos}
          onUpload={loadImage((src, nat, initPos) => { setPostImage(src); setPostImageNat(nat); setPostZoom(150); setPostBgPos(initPos); setStatus(null); setResultUrls(null);}, 1080, 1080, 340)}
          onRemove={() => { setPostImage(null); setPostImageNat({ w: 0, h: 0 }); setPostZoom(150); setPostBgPos("0px 0px"); }}
          m={m} maxPreviewW={340} showSets={showSets} selectedSponsors={selectedSponsors}
          onZoomChange={(z) => { setPostBgPos(prev => rescaleBgPos(prev, postZoom, z, 1080, 1080, 340, postImageNat.w, postImageNat.h)); setPostZoom(z); }} graphicStyle={graphicStyle} />
        <PreviewPanel label="Story 1080×1920" targetW={1080} targetH={1920} image={storyImage} imageNat={storyImageNat} zoom={storyZoom} bgPos={storyBgPos} setBgPos={setStoryBgPos}
          onUpload={loadImage((src, nat, initPos) => { setStoryImage(src); setStoryImageNat(nat); setStoryZoom(150); setStoryBgPos(initPos); setStatus(null); setResultUrls(null);}, 1080, 1920, 190)}
          onRemove={() => { setStoryImage(null); setStoryImageNat({ w: 0, h: 0 }); setStoryZoom(150); setStoryBgPos("0px 0px"); }}
          m={m} maxPreviewW={190} showSets={showSets} selectedSponsors={selectedSponsors}
          onZoomChange={(z) => { setStoryBgPos(prev => rescaleBgPos(prev, storyZoom, z, 1080, 1920, 190, storyImageNat.w, storyImageNat.h)); setStoryZoom(z); }} graphicStyle={graphicStyle} />
      </div>

      {/* ── Shared controls BELOW panels ── */}
      {(!isPreview || m.sponsorzy.length > 0) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%", maxWidth: 600, background: "rgba(0,0,0,0.04)", borderRadius: 12, padding: "12px 16px" }}>
          {!isPreview && !isFootball && (
            <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", userSelect: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>📊</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary, #333)" }}>Małe punkty (sety)</div>
                  <div style={{ fontSize: 10, color: "var(--color-text-secondary, #888)" }}>Pokaż wyniki setów na grafice</div>
                </div>
              </div>
              <div onClick={(e) => { e.preventDefault(); setShowSets(v => !v); }}
                style={{ width: 42, height: 24, borderRadius: 12, background: showSets ? "#2563eb" : "#374151", position: "relative", transition: "background 0.2s", flexShrink: 0, cursor: "pointer" }}>
                <div style={{ position: "absolute", top: 3, left: showSets ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
              </div>
            </label>
          )}
          {m.sponsorzy.length > 0 && (
            <SponsorsSelector sponsorzy={m.sponsorzy} selected={selectedSponsors} setSelected={setSelectedSponsors} />
          )}
        </div>
      )}

      {/* ── Generate button ── */}
      <button onClick={generateGraphics} disabled={status === "sending"} className="px-6 py-3 rounded-lg text-sm font-bold text-white"
        style={{ marginTop: 8, minWidth: 200, border: "none", cursor: status === "sending" ? "not-allowed" : "pointer",
          background: status === "sending" ? "#6b7280" : status === "ok" ? "#059669" : status === "error" ? "#dc2626" : "#2563eb" }}>
        {status === "sending" ? "⏳ Generuję…" : status === "ok" ? "✅ Gotowe! Generuj ponownie" : status === "error" ? "❌ Błąd — spróbuj ponownie" : "🚀 Generuj grafiki"}
      </button>

      {/* ── Result thumbnails ── */}
      {resultUrls && (resultUrls.post || resultUrls.story) && (
        <div style={{ marginTop: 16, padding: "16px 20px", background: "rgba(5,150,105,0.1)", borderRadius: 12, border: "1px solid rgba(5,150,105,0.3)" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#059669", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, textAlign: "center" }}>Gotowe! Kliknij żeby otworzyć</p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            {resultUrls.post && (
              <a href={resultUrls.post} target="_blank" rel="noopener noreferrer" style={{ textAlign: "center", textDecoration: "none" }}>
                <img src={resultUrls.post} alt="Post" style={{ width: 160, height: 160, objectFit: "cover", borderRadius: 8, border: "2px solid #059669" }} />
                <div style={{ fontSize: 11, color: "#059669", marginTop: 6, fontWeight: 600 }}>📥 Post 1080×1080</div>
              </a>)}
            {resultUrls.story && (
              <a href={resultUrls.story} target="_blank" rel="noopener noreferrer" style={{ textAlign: "center", textDecoration: "none" }}>
                <img src={resultUrls.story} alt="Story" style={{ width: 90, height: 160, objectFit: "cover", borderRadius: 8, border: "2px solid #059669" }} />
                <div style={{ fontSize: 11, color: "#059669", marginTop: 6, fontWeight: 600 }}>📥 Story 1080×1920</div>
              </a>)}
          </div>
          <p style={{ fontSize: 10, color: "#6b7280", marginTop: 8, textAlign: "center" }}>Przytrzymaj obrazek żeby zapisać na telefonie</p>
        </div>
      )}

      {status === "error" && <p style={{ fontSize: 11, color: "#dc2626", textAlign: "center" }}>Sprawdź czy workflow w n8n jest aktywny (Production).</p>}
    </div>
  );
}
