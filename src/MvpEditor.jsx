import { useState, useCallback, useRef } from "react";
import {
  pxToPercent,
  rescaleBgPos,
  makeImageLoader,
} from "./lib/cropUtils";

const N8N_WEBHOOK_URL =
  "https://primary-production-9c937.up.railway.app/webhook/03e681f1-61e0-4560-b798-49d5a4e5cc4c";

// ── URL PARSING ──────────────────────────────────────────────────────────────
function getMvpFromURL() {
  const p = new URLSearchParams(window.location.search);
  if (!p.get("player_name")) {
    // DEV fallback — pre-fill dla testu bez n8n
    return {
      is_dev: true,
      match_id: "DEV",
      sport: "volleyball",
      kolejka: "Kolejka 5",
      kategoria_wiekowa: "U17",
      faza_rozgrywek: "1/4 finału",
      liga_name: "Lubańska Liga Siatkówki",
      liga_color: "#004aad",
      liga_logo: "",
      liga_hashtag: "#LubanskaLigaSiatkowki",
      team_name: "Iskra Lubań",
      team_color: "#d4ba0f",
      team_logo: "",
      player_name: "Jan Kowalski",
      player_number: "7",
      player_position: "Atakujący",
      match_team_home: "Iskra Lubań",
      match_team_away: "Polonia",
      match_score: "3:1",
      sponsorzy: [],
    };
  }
  const sponsorzyRaw = p.get("sponsorzy") || "";
  return {
    is_dev: false,
    match_id: p.get("match_id") || "",
    sport: p.get("sport") || "volleyball",
    kolejka: p.get("kolejka") || "",
    kategoria_wiekowa: p.get("kategoria_wiekowa") || "",
    faza_rozgrywek: p.get("faza_rozgrywek") || "",
    liga_name: p.get("liga_name") || "Liga",
    liga_color: p.get("liga_color") || "#004aad",
    liga_logo: p.get("liga_logo") || "",
    liga_hashtag: p.get("liga_hashtag") || "",
    team_name: p.get("team_name") || "",
    team_color: p.get("team_color") || "#1a56db",
    team_logo: p.get("team_logo") || "",
    player_name: p.get("player_name") || "",
    player_number: p.get("player_number") || "",
    player_position: p.get("player_position") || "",
    match_team_home: p.get("match_team_home") || "",
    match_team_away: p.get("match_team_away") || "",
    match_score: p.get("match_score") || "",
    sponsorzy: sponsorzyRaw ? sponsorzyRaw.split(",").filter(Boolean) : [],
  };
}

// ── AUTO-FIT FONT SIZE (mirror z sport-graphics-api) ─────────────────────────
function computeNameSize(len, base) {
  if (len <= 14) return base;
  if (len <= 20) return Math.round(base * 0.86);
  if (len <= 26) return Math.round(base * 0.74);
  if (len <= 34) return Math.round(base * 0.64);
  return Math.round(base * 0.56);
}
function computeHeaderSize(len, base) {
  if (len <= 22) return base;
  if (len <= 30) return Math.round(base * 0.86);
  if (len <= 38) return Math.round(base * 0.74);
  if (len <= 48) return Math.round(base * 0.64);
  return Math.round(base * 0.56);
}

// ── SHARED PREVIEW PIECES ────────────────────────────────────────────────────
function HeaderBadge({ s, m, fontSize }) {
  const segments = [];
  if (m.kolejka) segments.push(m.kolejka);
  if (m.kategoria_wiekowa) segments.push(m.kategoria_wiekowa);
  if (m.faza_rozgrywek) segments.push(m.faza_rozgrywek);
  const text = segments.join(" · ");
  if (!text) return null;
  const fs = computeHeaderSize(text.length, fontSize);
  return (
    <div
      style={{
        background: "rgba(0,74,173,0.5)",
        padding: `${6 * s}px ${28 * s}px`,
        borderRadius: 20 * s,
        maxWidth: "90%",
      }}
    >
      <span
        style={{
          color: "rgba(255,255,255,0.85)",
          fontSize: fs * s,
          fontWeight: 600,
          letterSpacing: 2,
          textTransform: "uppercase",
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </span>
    </div>
  );
}

function MvpTitle({ s, fontSize }) {
  const starSize = Math.round(fontSize * 0.7);
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 14 * s,
        color: "#ffd700",
      }}
    >
      <span style={{ fontSize: starSize * s, lineHeight: 1 }}>★</span>
      <span
        style={{
          fontFamily: "Oswald, sans-serif",
          fontSize: fontSize * s,
          fontWeight: 700,
          letterSpacing: 5,
          textTransform: "uppercase",
        }}
      >
        MVP MECZU
      </span>
      <span style={{ fontSize: starSize * s, lineHeight: 1 }}>★</span>
    </div>
  );
}

function LigaLogoSmall({ s, m, size }) {
  return (
    <div
      style={{
        width: size * s,
        height: size * s,
        borderRadius: "50%",
        background: "rgba(255,255,255,0.9)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 ${2 * s}px ${6 * s}px rgba(0,0,0,0.15)`,
      }}
    >
      {m.liga_logo ? (
        <img
          src={m.liga_logo}
          alt=""
          style={{ width: size * 0.8 * s, height: size * 0.8 * s, objectFit: "contain" }}
        />
      ) : (
        <span
          style={{
            color: m.liga_color,
            fontSize: size * 0.16 * s,
            fontWeight: 700,
            fontFamily: "Oswald, sans-serif",
          }}
        >
          LIGA
        </span>
      )}
    </div>
  );
}

function MatchContext({ s, m, fontSize }) {
  const parts = [];
  if (m.match_team_home && m.match_team_away && m.match_score) {
    parts.push(`${m.match_team_home}  ${m.match_score}  ${m.match_team_away}`);
  }
  if (m.kolejka) parts.push(m.kolejka);
  const text = parts.join("  ·  ");
  if (!text) return null;
  const fs = computeHeaderSize(text.length, fontSize);
  return (
    <div
      style={{
        fontFamily: "Oswald, sans-serif",
        fontSize: fs * s,
        fontWeight: 500,
        color: "rgba(255,255,255,0.65)",
        letterSpacing: 1.5,
        textTransform: "uppercase",
        textAlign: "center",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
}

function SponsorBar({ s, sponsors, height }) {
  if (!sponsors.length) return null;
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: height * s,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8 * s,
      }}
    >
      {sponsors.map((url, i) => (
        <img
          key={i}
          src={url}
          alt=""
          style={{
            height: (height * 0.55) * s,
            maxWidth: 140 * s,
            objectFit: "contain",
            filter: "brightness(0) invert(1)",
            opacity: 0.7,
          }}
        />
      ))}
    </div>
  );
}

// ── PHOTO MVP OVERLAY ────────────────────────────────────────────────────────
function MvpPhotoOverlay({ s, m, isStory }) {
  const sponsorBarH = m.sponsorzy.length > 0 ? (isStory ? 100 : 80) : 0;
  const nameBase = isStory ? 96 : 64;
  const chipH = isStory ? 30 : 22;
  const teamSize = isStory ? 32 : 24;
  const posSize = isStory ? 26 : 20;
  const matchSize = isStory ? 28 : 22;

  return (
    <div
      className="absolute inset-0 z-10"
      style={{ pointerEvents: "none" }}
    >
      {/* Top overlay: LigaLogo + Header */}
      <div
        style={{
          position: "absolute",
          top: (isStory ? 60 : 20) * s,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: (isStory ? 16 : 10) * s,
        }}
      >
        <div
          style={{
            background: "rgba(0,0,0,0.6)",
            borderRadius: "50%",
            padding: (isStory ? 14 : 10) * s,
          }}
        >
          <LigaLogoSmall s={s} m={m} size={isStory ? 100 : 70} />
        </div>
        <HeaderBadge s={s} m={m} fontSize={isStory ? 24 : 18} />
      </div>

      {/* Bottom overlay: MVP title + name + chips + team + match */}
      <div
        style={{
          position: "absolute",
          bottom: (sponsorBarH + (isStory ? 80 : 30)) * s,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: (isStory ? 20 : 12) * s,
          padding: `0 ${(isStory ? 60 : 40) * s}px`,
        }}
      >
        <MvpTitle s={s} fontSize={isStory ? 48 : 36} />

        <div
          style={{
            fontFamily: "Oswald, sans-serif",
            fontSize: computeNameSize(m.player_name.length, nameBase) * s,
            fontWeight: 800,
            color: "#fff",
            textTransform: "uppercase",
            letterSpacing: 3,
            lineHeight: 1,
            textAlign: "center",
            textShadow: `0 ${2 * s}px ${12 * s}px rgba(0,0,0,0.8)`,
          }}
        >
          {m.player_name || "IMIĘ NAZWISKO"}
        </div>

        {(m.player_number || m.player_position) && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: (isStory ? 16 : 12) * s,
              fontFamily: "Oswald, sans-serif",
            }}
          >
            {m.player_number && (
              <span
                style={{
                  background: m.team_color,
                  color: "#0d1117",
                  fontSize: chipH * s,
                  fontWeight: 800,
                  padding: `${4 * s}px ${14 * s}px`,
                  borderRadius: 10 * s,
                }}
              >
                #{m.player_number}
              </span>
            )}
            {m.player_position && (
              <span
                style={{
                  color: "rgba(255,255,255,0.85)",
                  fontSize: posSize * s,
                  fontWeight: 500,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                }}
              >
                {m.player_position}
              </span>
            )}
          </div>
        )}

        <div
          style={{
            background: m.team_color,
            color: "#0d1117",
            fontFamily: "Oswald, sans-serif",
            fontSize: teamSize * s,
            fontWeight: 700,
            padding: `${6 * s}px ${22 * s}px`,
            borderRadius: 12 * s,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          {m.team_name || "DRUŻYNA"}
        </div>

        <div
          style={{
            width: (isStory ? 500 : 360) * s,
            height: 1,
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)",
            marginTop: 2 * s,
          }}
        />

        <MatchContext s={s} m={m} fontSize={matchSize} />
      </div>

      <SponsorBar s={s} sponsors={m.sponsorzy} height={sponsorBarH} />
    </div>
  );
}

// ── NO-PHOTO MVP (fallback kiedy brak foto) ──────────────────────────────────
function MvpNoPhoto({ s, m, isStory }) {
  const sponsorBarH = m.sponsorzy.length > 0 ? (isStory ? 100 : 80) : 0;
  const cLiga = m.liga_color;
  const cTeam = m.team_color;
  const circleSize = isStory ? 220 : 160;
  const nameBase = isStory ? 72 : 56;
  const teamSize = isStory ? 32 : 24;
  const posSize = isStory ? 22 : 18;
  const matchSize = isStory ? 28 : 22;

  return (
    <div
      className="absolute inset-0"
      style={{
        background: `linear-gradient(180deg, ${cLiga} 0%, #001533 60%, #000611 100%)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 6 * s,
          background: `linear-gradient(90deg, ${cTeam}, ${cLiga}, #ffd700)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: sponsorBarH * s,
          left: 0,
          right: 0,
          height: 6 * s,
          background: `linear-gradient(90deg, ${cTeam}, ${cLiga}, #ffd700)`,
        }}
      />

      <div
        className="absolute inset-0 flex flex-col items-center z-10"
        style={{
          pointerEvents: "none",
          justifyContent: "space-between",
          paddingTop: (isStory ? 80 : 40) * s,
          paddingBottom: (sponsorBarH + (isStory ? 60 : 30)) * s,
        }}
      >
        {/* Top */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: (isStory ? 18 : 14) * s,
          }}
        >
          <LigaLogoSmall s={s} m={m} size={isStory ? 110 : 80} />
          <HeaderBadge s={s} m={m} fontSize={isStory ? 24 : 22} />
          <MvpTitle s={s} fontSize={isStory ? 48 : 36} />
        </div>

        {/* Middle — circle + name + team + position */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16 * s,
          }}
        >
          {/* Circle z team logo / initial */}
          <div
            style={{
              position: "relative",
              width: circleSize * s,
              height: circleSize * s,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.06)",
              border: `${5 * s}px solid ${cTeam}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {m.team_logo ? (
              <img
                src={m.team_logo}
                alt=""
                style={{
                  width: circleSize * 0.7 * s,
                  height: circleSize * 0.7 * s,
                  objectFit: "contain",
                }}
              />
            ) : (
              <span
                style={{
                  color: cTeam,
                  fontSize: circleSize * 0.4 * s,
                  fontWeight: 800,
                  fontFamily: "Oswald, sans-serif",
                }}
              >
                {(m.team_name || "?").charAt(0)}
              </span>
            )}
            {/* Number badge */}
            {m.player_number && (
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  transform: "translate(25%, 25%)",
                  width: circleSize * 0.42 * s,
                  height: circleSize * 0.42 * s,
                  borderRadius: "50%",
                  background: cTeam,
                  color: "#0d1117",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "Oswald, sans-serif",
                  fontWeight: 800,
                  fontSize: Math.round(circleSize * 0.25) * s,
                  border: `${4 * s}px solid #0d1117`,
                }}
              >
                {m.player_number}
              </div>
            )}
          </div>

          <div
            style={{
              fontFamily: "Oswald, sans-serif",
              fontSize: computeNameSize(m.player_name.length, nameBase) * s,
              fontWeight: 800,
              color: "#fff",
              textTransform: "uppercase",
              letterSpacing: 2,
              lineHeight: 1,
              textAlign: "center",
            }}
          >
            {m.player_name || "IMIĘ NAZWISKO"}
          </div>

          <div
            style={{
              fontFamily: "Oswald, sans-serif",
              fontSize: teamSize * s,
              fontWeight: 600,
              color: cTeam,
              textTransform: "uppercase",
              letterSpacing: 3,
            }}
          >
            {m.team_name || "DRUŻYNA"}
          </div>

          {m.player_position && (
            <div
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.2)",
                padding: `${posSize * 0.35 * s}px ${posSize * 0.9 * s}px`,
                borderRadius: 999,
                fontFamily: "Oswald, sans-serif",
                fontSize: posSize * s,
                fontWeight: 500,
                color: "rgba(255,255,255,0.75)",
                textTransform: "uppercase",
                letterSpacing: 2,
              }}
            >
              {m.player_position}
            </div>
          )}
        </div>

        {/* Bottom — match context */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12 * s,
          }}
        >
          <div
            style={{
              width: (isStory ? 500 : 400) * s,
              height: 1,
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)",
            }}
          />
          <MatchContext s={s} m={m} fontSize={matchSize} />
        </div>
      </div>

      <SponsorBar s={s} sponsors={m.sponsorzy} height={sponsorBarH} />
    </div>
  );
}

// ── PREVIEW PANEL ────────────────────────────────────────────────────────────
function PreviewPanel({
  label,
  targetW,
  targetH,
  image,
  imageNat,
  zoom,
  bgPos,
  setBgPos,
  m,
  maxPreviewW,
  onUpload,
  onRemove,
  onZoomChange,
}) {
  const isStory = targetH > targetW;
  const scale = maxPreviewW / targetW;
  const s = scale;
  const containerW = maxPreviewW;
  const containerH = targetH * scale;

  // Drag-to-move (photo crop positioning)
  const dragRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState(null);

  const onMouseDown = (e) => {
    if (!image) return;
    setDragging(true);
    const parts = bgPos.replace(/px/g, "").split(" ");
    setDragStart({
      mx: e.clientX,
      my: e.clientY,
      px: parseFloat(parts[0]) || 0,
      py: parseFloat(parts[1]) || 0,
    });
  };
  const onMouseMove = (e) => {
    if (!dragging || !dragStart) return;
    const dx = e.clientX - dragStart.mx;
    const dy = e.clientY - dragStart.my;
    const newPx = dragStart.px + dx;
    const newPy = dragStart.py + dy;
    setBgPos(`${newPx.toFixed(0)}px ${newPy.toFixed(0)}px`);
  };
  const onMouseUp = () => {
    setDragging(false);
    setDragStart(null);
  };

  return (
    <div
      className="flex flex-col items-center gap-2"
      style={{ width: containerW + 20 }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary, #222)" }}>
        {label}
      </div>
      <div
        ref={dragRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        style={{
          position: "relative",
          width: containerW,
          height: containerH,
          overflow: "hidden",
          borderRadius: 8,
          border: "1px solid rgba(0,0,0,0.1)",
          cursor: image ? (dragging ? "grabbing" : "grab") : "default",
          background: "#0a1628",
        }}
      >
        {image ? (
          <>
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `url('${image}')`,
                backgroundSize: `${zoom}%`,
                backgroundPosition: bgPos,
                backgroundRepeat: "no-repeat",
              }}
            />
            <MvpPhotoOverlay s={s} m={m} isStory={isStory} />
          </>
        ) : (
          <MvpNoPhoto s={s} m={m} isStory={isStory} />
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2" style={{ marginTop: 4 }}>
        <label
          style={{
            padding: "6px 14px",
            background: "#2563eb",
            color: "#fff",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {image ? "Zmień foto" : "Dodaj foto"}
          <input
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={onUpload}
          />
        </label>
        {image && (
          <>
            <button
              onClick={onRemove}
              style={{
                padding: "6px 12px",
                background: "#374151",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              Usuń
            </button>
            <div className="flex items-center gap-1">
              <span style={{ fontSize: 11, color: "#888" }}>Zoom</span>
              <input
                type="range"
                min="100"
                max="300"
                value={zoom}
                onChange={(e) => onZoomChange(Number(e.target.value))}
                style={{ width: 100 }}
              />
              <span style={{ fontSize: 11, color: "#888", minWidth: 36 }}>
                {zoom}%
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── SPONSORS SELECTOR ────────────────────────────────────────────────────────
function SponsorsSelector({ sponsorzy, selected, setSelected }) {
  if (!sponsorzy || sponsorzy.length === 0) return null;
  const toggle = (url) =>
    setSelected((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
    );
  return (
    <div
      style={{
        background: "rgba(0,0,0,0.15)",
        borderRadius: 10,
        padding: "10px 14px",
      }}
    >
      <p
        style={{
          fontSize: 11,
          color: "var(--color-text-secondary, #888)",
          marginBottom: 8,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        Sponsorzy na grafice
      </p>
      <div className="flex flex-wrap gap-2">
        {sponsorzy.map((url, i) => {
          const isSelected = selected.includes(url);
          return (
            <div
              key={i}
              onClick={() => toggle(url)}
              style={{
                border: isSelected
                  ? "2px solid #2563eb"
                  : "2px solid rgba(255,255,255,0.15)",
                borderRadius: 8,
                padding: "6px 10px",
                cursor: "pointer",
                background: isSelected
                  ? "rgba(37,99,235,0.15)"
                  : "rgba(255,255,255,0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 80,
                height: 44,
                transition: "all 0.15s",
              }}
            >
              <img
                src={url}
                alt={`Sponsor ${i + 1}`}
                style={{ height: 28, maxWidth: 100, objectFit: "contain" }}
              />
            </div>
          );
        })}
      </div>
      {selected.length > 0 && (
        <p style={{ fontSize: 10, color: "#2563eb", marginTop: 6 }}>
          {selected.length} sponsor{selected.length > 1 ? "ów" : ""} wybrany
          {selected.length > 1 ? "ch" : ""}
        </p>
      )}
    </div>
  );
}

// ── PLAYER FIELD (editable input z labelem) ──────────────────────────────────
function PlayerField({ label, value, onChange, placeholder, width }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, width: width || "auto" }}>
      <span
        style={{
          fontSize: 11,
          color: "var(--color-text-secondary, #888)",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        {label}
      </span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "8px 12px",
          borderRadius: 6,
          border: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(255,255,255,0.05)",
          color: "var(--color-text-primary, #222)",
          fontSize: 13,
          outline: "none",
        }}
      />
    </label>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
export default function MvpEditor() {
  const urlData = getMvpFromURL();
  const isDev = urlData.is_dev;

  // Editable player fields (seed z URL, trener może poprawić)
  const [playerName, setPlayerName] = useState(urlData.player_name);
  const [playerNumber, setPlayerNumber] = useState(urlData.player_number);
  const [playerPosition, setPlayerPosition] = useState(urlData.player_position);

  // Sponsors — seed all from URL jako "selected" (domyślnie wszyscy aktywni).
  // Trener może odznaczyć przez toggle w UI.
  const [selectedSponsors, setSelectedSponsors] = useState(urlData.sponsorzy);

  // Photos + crop state per panel
  const [postImage, setPostImage] = useState(null);
  const [postImageNat, setPostImageNat] = useState({ w: 0, h: 0 });
  const [postZoom, setPostZoom] = useState(150);
  const [postBgPos, setPostBgPos] = useState("0px 0px");

  const [storyImage, setStoryImage] = useState(null);
  const [storyImageNat, setStoryImageNat] = useState({ w: 0, h: 0 });
  const [storyZoom, setStoryZoom] = useState(150);
  const [storyBgPos, setStoryBgPos] = useState("0px 0px");

  const [status, setStatus] = useState(null);
  const [resultUrls, setResultUrls] = useState(null);

  const loadImage = useCallback(
    (onLoaded, targetW, targetH, previewW) =>
      makeImageLoader(onLoaded, targetW, targetH, previewW),
    []
  );

  // Preview data: merge URL + live state
  const mPreview = {
    ...urlData,
    player_name: playerName.trim() || urlData.player_name,
    player_number: playerNumber.trim(),
    player_position: playerPosition.trim(),
    sponsorzy: selectedSponsors,
  };

  const generateGraphics = async () => {
    if (isDev) {
      alert("Tryb deweloperski — otwórz przez link z n8n.");
      return;
    }
    setStatus("sending");
    setResultUrls(null);

    const hasAnyPhoto = postImage || storyImage;

    const payload = {
      mode: "mvp",
      match_id: urlData.match_id,
      sport: urlData.sport,
      kolejka: urlData.kolejka,
      kategoria_wiekowa: urlData.kategoria_wiekowa,
      faza_rozgrywek: urlData.faza_rozgrywek,
      liga: {
        name: urlData.liga_name,
        logo_url: urlData.liga_logo,
        primary_color: urlData.liga_color,
        hashtag: urlData.liga_hashtag,
      },
      team: {
        name: urlData.team_name,
        logo_url: urlData.team_logo,
        primary_color: urlData.team_color,
      },
      player: {
        name: playerName.trim(),
        number: playerNumber.trim(),
        position: playerPosition.trim(),
      },
      match: {
        team_home: urlData.match_team_home,
        team_away: urlData.match_team_away,
        score: urlData.match_score,
      },
      sponsorzy: selectedSponsors,
      post: postImage
        ? {
            photo_base64: postImage,
            photo_position: pxToPercent(
              postBgPos,
              postZoom,
              1080,
              1080,
              340,
              postImageNat.w,
              postImageNat.h
            ),
            photo_zoom: `${postZoom}%`,
          }
        : null,
      story: storyImage
        ? {
            photo_base64: storyImage,
            photo_position: pxToPercent(
              storyBgPos,
              storyZoom,
              1080,
              1920,
              190,
              storyImageNat.w,
              storyImageNat.h
            ),
            photo_zoom: `${storyZoom}%`,
          }
        : null,
      with_photo: !!hasAnyPhoto,
    };

    try {
      const res = await fetch(N8N_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStatus("ok");
      setResultUrls({
        post: data.grafika_post || "",
        story: data.grafika_story || "",
      });
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  };

  const headerText = isDev
    ? "⚠️ Tryb deweloperski — brak parametrów w URL"
    : `${urlData.team_name} · ${urlData.match_team_home} ${urlData.match_score} ${urlData.match_team_away} · ${urlData.kolejka}`;

  return (
    <div className="flex flex-col items-center gap-3 p-3 max-w-5xl mx-auto">
      <div className="text-center">
        <h2
          style={{
            fontSize: 18,
            fontWeight: 600,
            color: "var(--color-text-primary, #222)",
            margin: 0,
          }}
        >
          ★ Edytor grafiki MVP ★
        </h2>
        <p
          style={{
            fontSize: 11,
            color: isDev ? "#f59e0b" : "var(--color-text-secondary, #888)",
            marginTop: 4,
          }}
        >
          {headerText}
        </p>
      </div>

      {/* Preview panels */}
      <div className="flex gap-6 flex-wrap justify-center items-start">
        <PreviewPanel
          label="Post 1080×1080"
          targetW={1080}
          targetH={1080}
          image={postImage}
          imageNat={postImageNat}
          zoom={postZoom}
          bgPos={postBgPos}
          setBgPos={setPostBgPos}
          onUpload={loadImage(
            (src, nat, initPos) => {
              setPostImage(src);
              setPostImageNat(nat);
              setPostZoom(150);
              setPostBgPos(initPos);
              setStatus(null);
              setResultUrls(null);
            },
            1080,
            1080,
            340
          )}
          onRemove={() => {
            setPostImage(null);
            setPostImageNat({ w: 0, h: 0 });
            setPostZoom(150);
            setPostBgPos("0px 0px");
          }}
          m={mPreview}
          maxPreviewW={340}
          onZoomChange={(z) => {
            setPostBgPos((prev) =>
              rescaleBgPos(
                prev,
                postZoom,
                z,
                1080,
                1080,
                340,
                postImageNat.w,
                postImageNat.h
              )
            );
            setPostZoom(z);
          }}
        />
        <PreviewPanel
          label="Story 1080×1920"
          targetW={1080}
          targetH={1920}
          image={storyImage}
          imageNat={storyImageNat}
          zoom={storyZoom}
          bgPos={storyBgPos}
          setBgPos={setStoryBgPos}
          onUpload={loadImage(
            (src, nat, initPos) => {
              setStoryImage(src);
              setStoryImageNat(nat);
              setStoryZoom(150);
              setStoryBgPos(initPos);
              setStatus(null);
              setResultUrls(null);
            },
            1080,
            1920,
            190
          )}
          onRemove={() => {
            setStoryImage(null);
            setStoryImageNat({ w: 0, h: 0 });
            setStoryZoom(150);
            setStoryBgPos("0px 0px");
          }}
          m={mPreview}
          maxPreviewW={190}
          onZoomChange={(z) => {
            setStoryBgPos((prev) =>
              rescaleBgPos(
                prev,
                storyZoom,
                z,
                1080,
                1920,
                190,
                storyImageNat.w,
                storyImageNat.h
              )
            );
            setStoryZoom(z);
          }}
        />
      </div>

      {/* Player editing */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          width: "100%",
          maxWidth: 600,
          background: "rgba(0,0,0,0.04)",
          borderRadius: 12,
          padding: "16px 20px",
          marginTop: 12,
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: "var(--color-text-secondary, #888)",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          ZAWODNIK (dane pre-filled z formularza — możesz poprawić)
        </span>
        <PlayerField
          label="Imię i nazwisko"
          value={playerName}
          onChange={setPlayerName}
          placeholder="np. Jan Kowalski"
        />
        <div className="flex gap-3">
          <PlayerField
            label="Numer"
            value={playerNumber}
            onChange={setPlayerNumber}
            placeholder="7"
            width={100}
          />
          <PlayerField
            label="Pozycja"
            value={playerPosition}
            onChange={setPlayerPosition}
            placeholder="np. Atakujący"
          />
        </div>
      </div>

      {/* Sponsors selector */}
      {urlData.sponsorzy.length > 0 && (
        <div
          style={{
            width: "100%",
            maxWidth: 600,
            marginTop: 12,
          }}
        >
          <SponsorsSelector
            sponsorzy={urlData.sponsorzy}
            selected={selectedSponsors}
            setSelected={setSelectedSponsors}
          />
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={generateGraphics}
        disabled={status === "sending"}
        className="px-6 py-3 rounded-lg text-sm font-bold text-white"
        style={{
          marginTop: 8,
          minWidth: 200,
          border: "none",
          cursor: status === "sending" ? "not-allowed" : "pointer",
          background:
            status === "sending"
              ? "#6b7280"
              : status === "ok"
              ? "#059669"
              : status === "error"
              ? "#dc2626"
              : "#ffd700",
          color: status === "sending" || status === "ok" || status === "error" ? "#fff" : "#0d1117",
        }}
      >
        {status === "sending"
          ? "⏳ Generuję MVP…"
          : status === "ok"
          ? "✅ Gotowe! Generuj ponownie"
          : status === "error"
          ? "❌ Błąd — spróbuj ponownie"
          : "★ Generuj MVP"}
      </button>

      {/* Results */}
      {resultUrls && (resultUrls.post || resultUrls.story) && (
        <div
          style={{
            marginTop: 16,
            padding: "16px 20px",
            background: "rgba(5,150,105,0.1)",
            borderRadius: 12,
            border: "1px solid rgba(5,150,105,0.3)",
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              color: "#059669",
              textTransform: "uppercase",
              letterSpacing: 1,
              marginBottom: 12,
              textAlign: "center",
            }}
          >
            Gotowe! Kliknij żeby otworzyć
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            {resultUrls.post && (
              <a
                href={resultUrls.post}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textAlign: "center", textDecoration: "none" }}
              >
                <img
                  src={resultUrls.post}
                  alt="Post MVP"
                  style={{
                    width: 160,
                    height: 160,
                    objectFit: "cover",
                    borderRadius: 8,
                    border: "2px solid #059669",
                  }}
                />
                <div
                  style={{
                    fontSize: 11,
                    color: "#059669",
                    marginTop: 6,
                    fontWeight: 600,
                  }}
                >
                  📥 Post 1080×1080
                </div>
              </a>
            )}
            {resultUrls.story && (
              <a
                href={resultUrls.story}
                target="_blank"
                rel="noopener noreferrer"
                style={{ textAlign: "center", textDecoration: "none" }}
              >
                <img
                  src={resultUrls.story}
                  alt="Story MVP"
                  style={{
                    width: 90,
                    height: 160,
                    objectFit: "cover",
                    borderRadius: 8,
                    border: "2px solid #059669",
                  }}
                />
                <div
                  style={{
                    fontSize: 11,
                    color: "#059669",
                    marginTop: 6,
                    fontWeight: 600,
                  }}
                >
                  📥 Story 1080×1920
                </div>
              </a>
            )}
          </div>
        </div>
      )}

      {status === "error" && (
        <p style={{ fontSize: 11, color: "#dc2626", textAlign: "center" }}>
          Sprawdź czy workflow n8n jest gotowy i aktywny (Production).
        </p>
      )}
    </div>
  );
}
