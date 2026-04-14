import { useState, useEffect } from "react";

/**
 * Universal result page for generated graphics.
 * URL params:
 *   ?view=result          (required — triggers this page)
 *   &post_url=...         (screenshot URL for post 1080x1080)
 *   &story_url=...        (screenshot URL for story 1080x1920)
 *   &type=zapowiedz|tabela|wynik  (graphic type — for display label)
 *   &title=...            (optional custom title, e.g. "Kolejka 5")
 *   &editor_links=...     (optional — URL-encoded editor links for preview mode)
 */
export default function ResultPage() {
  const p = new URLSearchParams(window.location.search);
  const postUrl = p.get("post_url") || "";
  const storyUrl = p.get("story_url") || "";
  const type = p.get("type") || "grafika";
  const title = p.get("title") || "";
  const editorLinksRaw = p.get("editor_links") || "";

  const typeLabels = {
    zapowiedz: "Zapowiedź",
    tabela: "Tabela ligowa",
    wynik: "Wynik meczu",
    grafika: "Grafika",
  };
  const displayType = typeLabels[type] || typeLabels.grafika;
  const displayTitle = title || displayType;

  // Parse editor links (format: "Team A vs Team B:\nhttps://...\n\nTeam C vs Team D:\nhttps://...")
  const editorLinks = [];
  if (editorLinksRaw) {
    const decoded = decodeURIComponent(editorLinksRaw);
    const blocks = decoded.split("\n\n").filter(Boolean);
    blocks.forEach((block) => {
      const lines = block.split("\n").filter(Boolean);
      if (lines.length >= 2) {
        editorLinks.push({ label: lines[0].replace(/:$/, ""), url: lines[1] });
      }
    });
  }

  const [postLoaded, setPostLoaded] = useState(false);
  const [storyLoaded, setStoryLoaded] = useState(false);
  const [postError, setPostError] = useState(false);
  const [storyError, setStoryError] = useState(false);

  const hasAny = postUrl || storyUrl;

  if (!hasAny) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🤷</div>
          <h2 style={styles.title}>Brak grafik</h2>
          <p style={styles.subtitle}>
            Nie znaleziono URL-i grafik w parametrach.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 56,
              height: 56,
              borderRadius: "50%",
              background: "#059669",
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 28, lineHeight: 1 }}>✓</span>
          </div>
          <h2 style={styles.title}>{displayTitle}</h2>
          <p style={styles.subtitle}>
            {displayType} wygenerowana. Kliknij miniaturkę żeby otworzyć w
            pełnym rozmiarze.
          </p>
        </div>

        {/* Thumbnails */}
        <div style={styles.thumbRow}>
          {postUrl && (
            <a
              href={postUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.thumbLink}
            >
              <div style={styles.thumbContainer}>
                {!postLoaded && !postError && (
                  <div style={styles.thumbPlaceholder}>
                    <div style={styles.spinner} />
                  </div>
                )}
                {postError && (
                  <div style={styles.thumbPlaceholder}>
                    <span style={{ fontSize: 11, color: "#ef4444" }}>
                      Błąd ładowania
                    </span>
                  </div>
                )}
                <img
                  src={postUrl}
                  alt="Post"
                  onLoad={() => setPostLoaded(true)}
                  onError={() => setPostError(true)}
                  style={{
                    ...styles.thumbImg,
                    width: 200,
                    height: 200,
                    display: postLoaded ? "block" : "none",
                  }}
                />
              </div>
              <span style={styles.thumbLabel}>📥 Post 1080×1080</span>
              <span style={styles.thumbHint}>Kliknij → otwórz</span>
            </a>
          )}

          {storyUrl && (
            <a
              href={storyUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.thumbLink}
            >
              <div style={styles.thumbContainer}>
                {!storyLoaded && !storyError && (
                  <div
                    style={{ ...styles.thumbPlaceholder, width: 112, height: 200 }}
                  >
                    <div style={styles.spinner} />
                  </div>
                )}
                {storyError && (
                  <div
                    style={{ ...styles.thumbPlaceholder, width: 112, height: 200 }}
                  >
                    <span style={{ fontSize: 11, color: "#ef4444" }}>
                      Błąd ładowania
                    </span>
                  </div>
                )}
                <img
                  src={storyUrl}
                  alt="Story"
                  onLoad={() => setStoryLoaded(true)}
                  onError={() => setStoryError(true)}
                  style={{
                    ...styles.thumbImg,
                    width: 112,
                    height: 200,
                    display: storyLoaded ? "block" : "none",
                  }}
                />
              </div>
              <span style={styles.thumbLabel}>📥 Story 1080×1920</span>
              <span style={styles.thumbHint}>Kliknij → otwórz</span>
            </a>
          )}
        </div>

        {/* Save hint */}
        <p
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "#9ca3af",
            marginTop: 16,
          }}
        >
          📱 Na telefonie: przytrzymaj obrazek żeby zapisać
        </p>

        {/* Editor links (for zapowiedz — add photo per match) */}
        {editorLinks.length > 0 && (
          <div style={styles.editorSection}>
            <p style={styles.editorTitle}>
              📸 Chcesz dodać zdjęcie do zapowiedzi?
            </p>
            {editorLinks.map((link, i) => (
              <a
                key={i}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.editorLink}
              >
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  {link.label}
                </span>
                <span style={{ fontSize: 11, color: "#2563eb" }}>
                  Otwórz edytor →
                </span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Inline CSS for spinner animation */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    background: "#f5f5f5",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  card: {
    background: "#fff",
    borderRadius: 16,
    padding: "32px 28px",
    maxWidth: 520,
    width: "100%",
    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: "#111",
    margin: "0 0 4px 0",
  },
  subtitle: {
    fontSize: 13,
    color: "#6b7280",
    margin: 0,
  },
  thumbRow: {
    display: "flex",
    gap: 20,
    justifyContent: "center",
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  thumbLink: {
    textAlign: "center",
    textDecoration: "none",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
  },
  thumbContainer: {
    position: "relative",
  },
  thumbImg: {
    objectFit: "cover",
    borderRadius: 10,
    border: "2px solid #059669",
    transition: "transform 0.15s, box-shadow 0.15s",
  },
  thumbPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 10,
    border: "2px dashed #d1d5db",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f9fafb",
  },
  thumbLabel: {
    fontSize: 12,
    fontWeight: 600,
    color: "#059669",
  },
  thumbHint: {
    fontSize: 10,
    color: "#9ca3af",
  },
  spinner: {
    width: 24,
    height: 24,
    border: "3px solid #e5e7eb",
    borderTopColor: "#059669",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  editorSection: {
    marginTop: 24,
    padding: "16px 14px",
    background: "#eff6ff",
    borderRadius: 12,
    border: "1px solid #bfdbfe",
  },
  editorTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: "#1e40af",
    margin: "0 0 10px 0",
  },
  editorLink: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    background: "#fff",
    borderRadius: 8,
    border: "1px solid #dbeafe",
    marginBottom: 6,
    textDecoration: "none",
    color: "#111",
    transition: "background 0.15s",
  },
};
