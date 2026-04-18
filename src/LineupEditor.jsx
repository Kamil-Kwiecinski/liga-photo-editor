import { useState, useMemo } from "react";

// Renderer v2 (centralny webhook Photo Editor) — wspólny dla wszystkich
// grafik: result / mvp / lineup. Routing po polu body.mode.
const N8N_WEBHOOK_URL =
  "https://primary-production-9c937.up.railway.app/webhook/03e681f1-61e0-4560-b798-49d5a4e5cc4c";

// ── URL PARSING ──────────────────────────────────────────────────────────────
// Players przekazywane jako JSON-encoded array w ?players=
// Przykład: [{"name":"Jan","number":"7","position":"atak","is_libero":false,"foto_url":""}]
function parsePlayersParam(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (Array.isArray(parsed)) {
      return parsed.map((p) => ({
        name: String(p.name || ""),
        number: String(p.number || ""),
        position: String(p.position || ""),
        is_libero: !!p.is_libero,
        foto_url: String(p.foto_url || ""),
      }));
    }
  } catch {
    // fallthrough
  }
  return [];
}

function getLineupFromURL() {
  const p = new URLSearchParams(window.location.search);
  if (!p.get("team_name")) {
    // DEV fallback — pre-fill dla testu bez n8n
    return {
      is_dev: true,
      match_id: "DEV",
      sport: "volleyball",
      kolejka: "Kolejka 5",
      kategoria_wiekowa: "",
      faza_rozgrywek: "",
      liga_name: "Lubańska Liga Siatkówki",
      liga_color: "#004aad",
      liga_logo: "",
      liga_hashtag: "#LubanskaLigaSiatkowki",
      team_name: "Iskra Lubań",
      team_color: "#d4ba0f",
      team_logo: "",
      match_team_home: "Iskra Lubań",
      match_team_away: "Polonia",
      match_data: "",
      match_godzina: "",
      match_miejsce: "",
      sponsorzy: [],
      players: [
        { name: "Bołądź", number: "9", position: "atak", is_libero: false, foto_url: "" },
        { name: "Bieniek", number: "20", position: "rozgrywający", is_libero: false, foto_url: "" },
        { name: "Russell", number: "3", position: "atak", is_libero: false, foto_url: "" },
        { name: "Kwolek", number: "2", position: "przyjmujący", is_libero: false, foto_url: "" },
        { name: "Gladyr", number: "13", position: "środkowy", is_libero: false, foto_url: "" },
        { name: "Tavares", number: "15", position: "środkowy", is_libero: false, foto_url: "" },
        { name: "Popiwczak", number: "10", position: "libero", is_libero: true, foto_url: "" },
      ],
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
    match_team_home: p.get("match_team_home") || "",
    match_team_away: p.get("match_team_away") || "",
    match_data: p.get("match_data") || "",
    match_godzina: p.get("match_godzina") || "",
    match_miejsce: p.get("match_miejsce") || "",
    sponsorzy: sponsorzyRaw ? sponsorzyRaw.split(",").filter(Boolean) : [],
    players: parsePlayersParam(p.get("players")),
  };
}

// ── UTILS ────────────────────────────────────────────────────────────────────
function extractLastName(fullName) {
  const parts = (fullName || "").trim().split(/\s+/);
  return (parts[parts.length - 1] || fullName || "").toUpperCase();
}

function computeNameFontSize(len, base) {
  if (len <= 10) return base;
  if (len <= 14) return Math.round(base * 0.86);
  if (len <= 18) return Math.round(base * 0.72);
  if (len <= 24) return Math.round(base * 0.6);
  return Math.round(base * 0.5);
}

// ── PLAYER TILE (preview) ────────────────────────────────────────────────────
function PlayerTilePreview({ s, team, player, width }) {
  const size = width;
  const displayName = extractLastName(player.name);
  const nameBase = Math.round(size * 0.13);
  const nameFont = computeNameFontSize(displayName.length, nameBase);
  const chipSize = Math.round(size * 0.2);
  const chipFont = Math.round(chipSize * 0.5);
  const bgNumberSize = Math.round(size * 0.7);

  return (
    <div
      style={{
        position: "relative",
        width: size * s,
        height: size * s,
        borderRadius: Math.round(size * 0.06) * s,
        overflow: "hidden",
        background: player.foto_url
          ? "#0a0a0a"
          : `linear-gradient(135deg, ${team.color}, #0a0a0a)`,
        border: player.is_captain
          ? `${4 * s}px solid #ffd700`
          : `${2 * s}px solid ${team.color}`,
        boxShadow: `0 ${8 * s}px ${24 * s}px rgba(0,0,0,0.35)`,
      }}
    >
      {player.foto_url ? (
        <img
          src={player.foto_url}
          alt={player.name}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center top",
          }}
        />
      ) : (
        <>
          {player.number ? (
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -55%)",
                fontFamily: "Oswald, sans-serif",
                fontSize: bgNumberSize * s,
                fontWeight: 900,
                color: "rgba(255,255,255,0.12)",
                lineHeight: 1,
                letterSpacing: -4 * s,
              }}
            >
              {player.number}
            </div>
          ) : null}
          <div
            style={{
              position: "absolute",
              bottom: Math.round(size * 0.3) * s,
              left: 0,
              right: 0,
              textAlign: "center",
              fontFamily: "Oswald, sans-serif",
              fontSize: Math.round(size * 0.28) * s,
              fontWeight: 800,
              color: "rgba(255,255,255,0.92)",
              letterSpacing: 2,
            }}
          >
            {displayName.charAt(0)}
          </div>
        </>
      )}

      {/* Bottom gradient */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "55%",
          background:
            "linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.88) 100%)",
        }}
      />

      {/* Number chip */}
      {player.number ? (
        <div
          style={{
            position: "absolute",
            top: Math.round(size * 0.05) * s,
            right: Math.round(size * 0.05) * s,
            width: chipSize * s,
            height: chipSize * s,
            borderRadius: "50%",
            background: team.color,
            color: "#0d1117",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Oswald, sans-serif",
            fontWeight: 800,
            fontSize: chipFont * s,
          }}
        >
          {player.number}
        </div>
      ) : null}

      {/* Captain chip */}
      {player.is_captain ? (
        <div
          style={{
            position: "absolute",
            top: Math.round(size * 0.05) * s,
            left: Math.round(size * 0.05) * s,
            width: chipSize * s,
            height: chipSize * s,
            borderRadius: "50%",
            background: "#ffd700",
            color: "#0d1117",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Oswald, sans-serif",
            fontWeight: 800,
            fontSize: chipFont * s,
          }}
        >
          K
        </div>
      ) : null}

      {/* Libero ribbon */}
      {player.is_libero ? (
        <div
          style={{
            position: "absolute",
            top: Math.round(size * 0.05) * s,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(255,255,255,0.92)",
            color: "#0d1117",
            padding: `${Math.round(size * 0.015) * s}px ${Math.round(size * 0.05) * s}px`,
            borderRadius: 999,
            fontFamily: "Oswald, sans-serif",
            fontSize: Math.round(size * 0.07) * s,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          Libero
        </div>
      ) : null}

      {/* Name */}
      <div
        style={{
          position: "absolute",
          bottom: Math.round(size * 0.06) * s,
          left: Math.round(size * 0.05) * s,
          right: Math.round(size * 0.05) * s,
          fontFamily: "Oswald, sans-serif",
          fontSize: nameFont * s,
          fontWeight: 800,
          color: "#fff",
          textTransform: "uppercase",
          letterSpacing: 2,
          lineHeight: 1,
          textAlign: "center",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          textShadow: `0 ${2 * s}px ${6 * s}px rgba(0,0,0,0.8)`,
        }}
      >
        {displayName}
      </div>
    </div>
  );
}

// ── LINEUP PREVIEW (grid 3x2 + libero + context) ────────────────────────────
function LineupPreview({ targetW, targetH, maxPreviewW, m }) {
  const s = maxPreviewW / targetW;
  const isStory = targetH > targetW;
  const sponsorBarH = m.sponsorzy.length > 0 ? (isStory ? 100 : 80) : 0;
  const cLiga = m.liga_color;
  const cTeam = m.team_color;

  const starters = m.players.filter((p) => !p.is_libero).slice(0, 6);
  const libero = m.players.find((p) => p.is_libero);

  const gridW = isStory ? 960 : 900;
  const tileGap = isStory ? 24 : 18;
  const tileSize = Math.floor((gridW - tileGap * 2) / 3);
  const liberoSize = isStory ? Math.round(tileSize * 1.05) : Math.round(tileSize * 0.88);

  const ownIsHome = (m.match_team_home || "")
    .toLowerCase()
    .includes((m.team_name || "").toLowerCase());
  const opponent = ownIsHome ? m.match_team_away : m.match_team_home;
  const vsLine = opponent ? `VS ${opponent.toUpperCase()}` : "";

  const headerSegs = [m.kolejka, m.kategoria_wiekowa, m.faza_rozgrywek]
    .filter(Boolean)
    .join(" · ");

  const team = { name: m.team_name, color: cTeam };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `linear-gradient(180deg, ${cLiga} 0%, #001533 ${isStory ? "50%" : "55%"}, #000611 100%)`,
        overflow: "hidden",
      }}
    >
      {/* Accent lines */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: (isStory ? 8 : 6) * s, background: `linear-gradient(90deg, ${cTeam}, ${cLiga}, #ffd700)` }} />
      <div style={{ position: "absolute", bottom: sponsorBarH * s, left: 0, right: 0, height: (isStory ? 8 : 6) * s, background: `linear-gradient(90deg, ${cTeam}, ${cLiga}, #ffd700)` }} />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: (isStory ? 80 : 32) * s,
          paddingBottom: ((isStory ? 60 : 24) + sponsorBarH) * s,
          gap: (isStory ? 32 : 18) * s,
          zIndex: 2,
        }}
      >
        {/* Top — logo + header */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: (isStory ? 18 : 10) * s }}>
          <div
            style={{
              width: (isStory ? 100 : 64) * s,
              height: (isStory ? 100 : 64) * s,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.95)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: `0 ${2 * s}px ${8 * s}px rgba(0,0,0,0.15)`,
              overflow: "hidden",
            }}
          >
            {m.liga_logo ? (
              <img
                src={m.liga_logo}
                alt=""
                style={{
                  width: (isStory ? 80 : 52) * s,
                  height: (isStory ? 80 : 52) * s,
                  objectFit: "contain",
                }}
              />
            ) : (
              <span style={{ color: cLiga, fontSize: (isStory ? 16 : 10) * s, fontWeight: 700, fontFamily: "Oswald, sans-serif" }}>LIGA</span>
            )}
          </div>
          {headerSegs && (
            <div
              style={{
                background: "rgba(0,74,173,0.5)",
                padding: `${(isStory ? 6 : 5) * s}px ${(isStory ? 28 : 22) * s}px`,
                borderRadius: 20 * s,
              }}
            >
              <span style={{ color: "rgba(255,255,255,0.85)", fontFamily: "Oswald, sans-serif", fontSize: (isStory ? 22 : 18) * s, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", whiteSpace: "nowrap" }}>
                {headerSegs}
              </span>
            </div>
          )}
        </div>

        {/* Title */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 * s }}>
          <span style={{ fontFamily: "'Great Vibes', cursive", fontSize: (isStory ? 36 : 28) * s, color: "#ffd700", lineHeight: 1 }}>
            starting six
          </span>
          <span style={{ fontFamily: "Oswald, sans-serif", fontSize: (isStory ? 76 : 56) * s, fontWeight: 800, color: "#fff", textTransform: "uppercase", letterSpacing: (isStory ? 6 : 4) * s, lineHeight: 1 }}>
            WYJŚCIOWA SZÓSTKA
          </span>
        </div>

        {/* Grid 3×2 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(3, ${tileSize * s}px)`,
            gridTemplateRows: `${tileSize * s}px ${tileSize * s}px`,
            gap: tileGap * s,
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => {
            const p = starters[i];
            if (!p) {
              return (
                <div
                  key={`empty-${i}`}
                  style={{
                    width: tileSize * s,
                    height: tileSize * s,
                    borderRadius: Math.round(tileSize * 0.06) * s,
                    border: `2px dashed rgba(255,255,255,0.15)`,
                    background: "rgba(255,255,255,0.03)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "rgba(255,255,255,0.3)",
                    fontFamily: "Oswald, sans-serif",
                    fontSize: 14 * s,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  slot {i + 1}
                </div>
              );
            }
            return (
              <PlayerTilePreview key={`s-${i}`} s={s} team={team} player={p} width={tileSize} />
            );
          })}
        </div>

        {/* Libero */}
        {libero ? (
          isStory ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 * s }}>
              <span style={{ fontFamily: "Oswald, sans-serif", fontSize: 28 * s, fontWeight: 700, color: "#ffd700", textTransform: "uppercase", letterSpacing: 6 }}>
                LIBERO
              </span>
              <PlayerTilePreview s={s} team={team} player={libero} width={liberoSize} />
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 16 * s }}>
              <span style={{ fontFamily: "Oswald, sans-serif", fontSize: 22 * s, fontWeight: 700, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", letterSpacing: 4 }}>
                LIBERO
              </span>
              <div style={{ width: 2 * s, height: 40 * s, background: "rgba(255,255,255,0.2)" }} />
              <PlayerTilePreview s={s} team={team} player={libero} width={liberoSize} />
            </div>
          )
        ) : null}

        <div style={{ flex: 1 }} />

        {/* Match context */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: (isStory ? 14 : 8) * s }}>
          <div style={{ width: (isStory ? 520 : 400) * s, height: 1, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)" }} />
          <div style={{ display: "flex", alignItems: "baseline", gap: (isStory ? 18 : 12) * s, fontFamily: "Oswald, sans-serif" }}>
            <span style={{ background: cTeam, color: "#0d1117", fontSize: (isStory ? 30 : 22) * s, fontWeight: 800, padding: `${(isStory ? 6 : 4) * s}px ${(isStory ? 22 : 16) * s}px`, borderRadius: (isStory ? 14 : 10) * s, letterSpacing: 2, textTransform: "uppercase" }}>
              {m.team_name || "DRUŻYNA"}
            </span>
            {vsLine && (
              <span style={{ color: "#fff", fontSize: (isStory ? 30 : 22) * s, fontWeight: 600, letterSpacing: (isStory ? 4 : 3), textTransform: "uppercase" }}>
                {vsLine}
              </span>
            )}
          </div>
          {(m.match_data || m.match_godzina || m.match_miejsce) && (
            <span style={{ fontFamily: "Oswald, sans-serif", fontSize: (isStory ? 22 : 16) * s, fontWeight: 500, color: "rgba(255,255,255,0.65)", letterSpacing: 2, textTransform: "uppercase" }}>
              {[m.match_data, m.match_godzina, m.match_miejsce].filter(Boolean).join(" · ")}
            </span>
          )}
        </div>

        {/* Hashtag */}
        {m.liga_hashtag && (
          <div style={{ position: "absolute", bottom: (sponsorBarH + 8) * s, left: 0, right: 0, textAlign: "center" }}>
            <span style={{ color: "rgba(255,255,255,0.55)", fontFamily: "Oswald, sans-serif", fontSize: 16 * s, fontWeight: 500, letterSpacing: 1.5 }}>
              {m.liga_hashtag.startsWith("#") ? m.liga_hashtag : `#${m.liga_hashtag}`}
            </span>
          </div>
        )}

        {/* Sponsors */}
        {m.sponsorzy.length > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: sponsorBarH * s,
              background: "rgba(0,0,0,0.9)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8 * s,
              zIndex: 10,
            }}
          >
            {m.sponsorzy.map((url, i) => (
              <img
                key={i}
                src={url}
                alt=""
                style={{
                  height: sponsorBarH * 0.55 * s,
                  maxWidth: 140 * s,
                  objectFit: "contain",
                  filter: "brightness(0) invert(1)",
                  opacity: 0.7,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── PREVIEW PANEL WRAPPER ────────────────────────────────────────────────────
function PreviewPanel({ label, targetW, targetH, maxPreviewW, m }) {
  const scale = maxPreviewW / targetW;
  const containerW = maxPreviewW;
  const containerH = targetH * scale;
  return (
    <div className="flex flex-col items-center gap-2" style={{ width: containerW + 20 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary, #222)" }}>
        {label}
      </div>
      <div
        style={{
          position: "relative",
          width: containerW,
          height: containerH,
          overflow: "hidden",
          borderRadius: 8,
          border: "1px solid rgba(0,0,0,0.1)",
          background: "#0a1628",
        }}
      >
        <LineupPreview targetW={targetW} targetH={targetH} maxPreviewW={containerW} m={m} />
      </div>
    </div>
  );
}

// ── SPONSORS SELECTOR (reuse styl z MvpEditor) ───────────────────────────────
function SponsorsSelector({ sponsorzy, selected, setSelected }) {
  if (!sponsorzy || sponsorzy.length === 0) return null;
  const toggle = (url) =>
    setSelected((prev) =>
      prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
    );
  return (
    <div style={{ background: "rgba(0,0,0,0.15)", borderRadius: 10, padding: "10px 14px" }}>
      <p style={{ fontSize: 11, color: "var(--color-text-secondary, #888)", marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
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
                border: isSelected ? "2px solid #2563eb" : "2px solid rgba(255,255,255,0.15)",
                borderRadius: 8,
                padding: "6px 10px",
                cursor: "pointer",
                background: isSelected ? "rgba(37,99,235,0.15)" : "rgba(255,255,255,0.05)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 80,
                height: 44,
                transition: "all 0.15s",
              }}
            >
              <img src={url} alt={`Sponsor ${i + 1}`} style={{ height: 28, maxWidth: 100, objectFit: "contain" }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── PLAYERS LIST (captain toggle) ────────────────────────────────────────────
function PlayersListEditor({ players, captainIdx, setCaptainIdx }) {
  return (
    <div style={{ background: "rgba(0,0,0,0.04)", borderRadius: 12, padding: "14px 18px" }}>
      <p style={{ fontSize: 11, color: "var(--color-text-secondary, #888)", marginBottom: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>
        Zawodnicy ({players.length}) · wybierz kapitana (opcjonalne)
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {players.map((p, i) => {
          const isCaptain = captainIdx === i;
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                background: isCaptain ? "rgba(255,215,0,0.15)" : "rgba(255,255,255,0.04)",
                border: isCaptain ? "2px solid #ffd700" : "2px solid transparent",
                borderRadius: 8,
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                <span style={{ fontFamily: "Oswald, sans-serif", fontSize: 16, fontWeight: 800, color: "#2563eb", minWidth: 30, textAlign: "center" }}>
                  #{p.number || "?"}
                </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-primary, #222)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.name || "(brak nazwiska)"}
                </span>
                {p.position && (
                  <span style={{ fontSize: 11, color: "var(--color-text-secondary, #888)", textTransform: "uppercase", letterSpacing: 1 }}>
                    {p.position}
                  </span>
                )}
                {p.is_libero && (
                  <span style={{ fontSize: 10, background: "#fff", color: "#0d1117", padding: "2px 8px", borderRadius: 999, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>
                    libero
                  </span>
                )}
              </div>
              <button
                onClick={() => setCaptainIdx(isCaptain ? null : i)}
                disabled={p.is_libero}
                title={p.is_libero ? "Libero nie może być kapitanem" : ""}
                style={{
                  padding: "4px 12px",
                  fontSize: 11,
                  fontWeight: 700,
                  border: "none",
                  borderRadius: 6,
                  cursor: p.is_libero ? "not-allowed" : "pointer",
                  background: isCaptain ? "#ffd700" : "rgba(0,0,0,0.08)",
                  color: isCaptain ? "#0d1117" : "var(--color-text-secondary, #888)",
                  opacity: p.is_libero ? 0.4 : 1,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                {isCaptain ? "★ Kapitan" : "Kapitan?"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── MAIN ─────────────────────────────────────────────────────────────────────
export default function LineupEditor() {
  const urlData = getLineupFromURL();
  const isDev = urlData.is_dev;

  const [selectedSponsors, setSelectedSponsors] = useState(urlData.sponsorzy);
  const [captainIdx, setCaptainIdx] = useState(null);
  const [status, setStatus] = useState(null);
  const [resultUrls, setResultUrls] = useState(null);

  // Merge players z captain flag
  const playersWithCaptain = useMemo(
    () =>
      urlData.players.map((p, i) => ({
        ...p,
        is_captain: captainIdx === i,
      })),
    [urlData.players, captainIdx]
  );

  const mPreview = {
    ...urlData,
    players: playersWithCaptain,
    sponsorzy: selectedSponsors,
  };

  const startersCount = urlData.players.filter((p) => !p.is_libero).length;
  const liberoCount = urlData.players.filter((p) => p.is_libero).length;
  const validLineup = startersCount === 6 && liberoCount <= 1;

  const generateGraphics = async () => {
    if (isDev) {
      alert("Tryb deweloperski — otwórz przez link z n8n.");
      return;
    }
    if (!validLineup) {
      alert(`Wymagane dokładnie 6 zawodników startowych + max 1 libero. Masz: ${startersCount} + ${liberoCount} libero.`);
      return;
    }
    setStatus("sending");
    setResultUrls(null);

    const payload = {
      mode: "lineup",
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
      match: {
        team_home: urlData.match_team_home,
        team_away: urlData.match_team_away,
        data: urlData.match_data,
        godzina: urlData.match_godzina,
        miejsce: urlData.match_miejsce,
      },
      players: playersWithCaptain,
      sponsorzy: selectedSponsors,
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
    : `${urlData.team_name} · ${urlData.match_team_home} vs ${urlData.match_team_away} · ${urlData.kolejka}`;

  return (
    <div className="flex flex-col items-center gap-3 p-3 max-w-5xl mx-auto">
      <div className="text-center">
        <h2 style={{ fontSize: 18, fontWeight: 600, color: "var(--color-text-primary, #222)", margin: 0 }}>
          🏐 Edytor Wyjściowej Szóstki
        </h2>
        <p style={{ fontSize: 11, color: isDev ? "#f59e0b" : "var(--color-text-secondary, #888)", marginTop: 4 }}>
          {headerText}
        </p>
      </div>

      {!validLineup && (
        <div style={{ padding: "8px 14px", background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 8, fontSize: 12, color: "#dc2626" }}>
          ⚠️ Wymagane 6 zawodników startowych + max 1 libero. Masz: {startersCount} startowych, {liberoCount} libero.
        </div>
      )}

      {/* Preview panels */}
      <div className="flex gap-6 flex-wrap justify-center items-start">
        <PreviewPanel label="Post 1080×1080" targetW={1080} targetH={1080} maxPreviewW={340} m={mPreview} />
        <PreviewPanel label="Story 1080×1920" targetW={1080} targetH={1920} maxPreviewW={220} m={mPreview} />
      </div>

      {/* Players list + captain toggle */}
      {urlData.players.length > 0 && (
        <div style={{ width: "100%", maxWidth: 600 }}>
          <PlayersListEditor players={playersWithCaptain} captainIdx={captainIdx} setCaptainIdx={setCaptainIdx} />
        </div>
      )}

      {/* Sponsors */}
      {urlData.sponsorzy.length > 0 && (
        <div style={{ width: "100%", maxWidth: 600, marginTop: 8 }}>
          <SponsorsSelector sponsorzy={urlData.sponsorzy} selected={selectedSponsors} setSelected={setSelectedSponsors} />
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={generateGraphics}
        disabled={status === "sending" || !validLineup}
        className="px-6 py-3 rounded-lg text-sm font-bold text-white"
        style={{
          marginTop: 8,
          minWidth: 220,
          border: "none",
          cursor: status === "sending" || !validLineup ? "not-allowed" : "pointer",
          background:
            !validLineup
              ? "#6b7280"
              : status === "sending"
              ? "#6b7280"
              : status === "ok"
              ? "#059669"
              : status === "error"
              ? "#dc2626"
              : "#ffd700",
          color: status === "sending" || status === "ok" || status === "error" || !validLineup ? "#fff" : "#0d1117",
          opacity: !validLineup ? 0.6 : 1,
        }}
      >
        {status === "sending"
          ? "⏳ Generuję lineup…"
          : status === "ok"
          ? "✅ Gotowe! Generuj ponownie"
          : status === "error"
          ? "❌ Błąd — spróbuj ponownie"
          : "🏐 Generuj Wyjściową Szóstkę"}
      </button>

      {/* Results */}
      {resultUrls && (resultUrls.post || resultUrls.story) && (
        <div style={{ marginTop: 16, padding: "16px 20px", background: "rgba(5,150,105,0.1)", borderRadius: 12, border: "1px solid rgba(5,150,105,0.3)" }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: "#059669", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, textAlign: "center" }}>
            Gotowe! Kliknij żeby otworzyć
          </p>
          <div style={{ display: "flex", gap: 16, justifyContent: "center" }}>
            {resultUrls.post && (
              <a href={resultUrls.post} target="_blank" rel="noopener noreferrer" style={{ textAlign: "center", textDecoration: "none" }}>
                <img src={resultUrls.post} alt="Post Lineup" style={{ width: 160, height: 160, objectFit: "cover", borderRadius: 8, border: "2px solid #059669" }} />
                <div style={{ fontSize: 11, color: "#059669", marginTop: 6, fontWeight: 600 }}>📥 Post 1080×1080</div>
              </a>
            )}
            {resultUrls.story && (
              <a href={resultUrls.story} target="_blank" rel="noopener noreferrer" style={{ textAlign: "center", textDecoration: "none" }}>
                <img src={resultUrls.story} alt="Story Lineup" style={{ width: 90, height: 160, objectFit: "cover", borderRadius: 8, border: "2px solid #059669" }} />
                <div style={{ fontSize: 11, color: "#059669", marginTop: 6, fontWeight: 600 }}>📥 Story 1080×1920</div>
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
