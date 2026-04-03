// NODE: "Generuj HTML z foto" — webhook workflow
// v3: fixes set scores cutoff, adds Anton font to classic
var d = $input.first().json;

// ── Sponsorzy ────────────────────────────────────────────────────────────────
function fixUrl(url) {
  if (!url) return '';
  var m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return m ? 'https://lh3.googleusercontent.com/d/' + m[1] : url;
}

function buildSponsorsBar(sponsorzy, barH, logoH) {
  if (sponsorzy.length === 0) return '';
  var logos = sponsorzy.map(function(url) {
    return '<div style="display:flex;align-items:center;justify-content:center;padding:0 20px;">'
      + '<img src="' + url + '" style="height:' + logoH + 'px;max-width:160px;object-fit:contain;filter:brightness(0) invert(1);opacity:0.7;" />'
      + '</div>';
  }).join('');
  return '<div style="position:absolute;bottom:0;left:0;right:0;height:' + barH + 'px;'
    + 'background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;'
    + 'border-top:1px solid rgba(255,255,255,0.06);z-index:10;">'
    + logos + '</div>';
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function logoImg(url, name, color, size) {
  if (url && url !== '') {
    return '<img src="' + url + '" style="width:' + size + 'px;height:' + size + 'px;object-fit:contain;" />';
  }
  var letter = (name || '?').charAt(0).toUpperCase();
  return '<div style="width:' + size + 'px;height:' + size + 'px;border-radius:50%;background:' + color + ';display:flex;align-items:center;justify-content:center;"><span style="color:#fff;font-size:' + Math.round(size * 0.45) + 'px;font-weight:800;">' + letter + '</span></div>';
}

var cLiga    = d.color_liga || '#004aad';
var cHome    = d.color_home || '#1a56db';
var cAway    = d.color_away || '#dc2626';
var numSets  = (d.played_sets && d.played_sets.length) || 0;

var logoLigaS = logoImg(d.logo_liga, 'Liga', cLiga, 70);
var logoLigaL = logoImg(d.logo_liga, 'Liga', cLiga, 100);

// ── Fonts ────────────────────────────────────────────────────────────────────
var fontImport = '<style>@import url("https://fonts.googleapis.com/css2?family=Anton&family=Oswald:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800;900&display=swap");</style>';

function buildSetsHtml(fontSize) {
  if (!d.played_sets || d.played_sets.length === 0) return '';
  var parts = d.played_sets.map(function(s) {
    var homeWon = s.home > s.away;
    return '<span style="font-size:' + fontSize + 'px;font-weight:' + (homeWon ? 800 : 400) + ';color:' + (homeWon ? cHome : cHome + '99') + ';">' + s.home + '</span>'
      + '<span style="font-size:' + Math.round(fontSize * 0.7) + 'px;color:rgba(255,255,255,0.3);">:</span>'
      + '<span style="font-size:' + fontSize + 'px;font-weight:' + (homeWon ? 400 : 800) + ';color:' + (homeWon ? cAway + '99' : cAway) + ';">' + s.away + '</span>';
  });
  return '<div style="background:rgba(0,0,0,0.55);border-radius:12px;padding:8px 18px;margin-top:10px;display:inline-flex;align-items:center;gap:4px;">'
    + parts.join('<span style="font-size:' + fontSize + 'px;color:rgba(255,255,255,0.2);margin:0 6px;">|</span>')
    + '</div>';
}

function teamLabel(name, color, teamFontSz, teamPad, teamRadius, teamWidth) {
  var fs = teamFontSz;
  if (name.length > 14) fs = Math.round(teamFontSz * 0.8);
  if (name.length > 18) fs = Math.round(teamFontSz * 0.65);
  return '<div style="margin-top:10px;width:' + teamWidth + 'px;display:flex;justify-content:center;">'
    + '<span style="background:' + color + ';color:#0d1117;font-size:' + fs + 'px;font-weight:700;padding:' + teamPad + ';border-radius:' + teamRadius + 'px;display:inline-block;max-width:' + teamWidth + 'px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'
    + name + '</span></div>';
}

// ══════════════════════════════════════════════════════════════════════════════
// CLASSIC STYLE (with Anton font for watermark)
// ══════════════════════════════════════════════════════════════════════════════

function buildClassicHTML(width, height, photoData) {
  var isStory      = height > width;
  var photoBase64  = photoData.photo_base64;
  var photoPos     = photoData.photo_position || '50% 50%';
  var photoZoom    = photoData.photo_zoom     || '150%';
  var showSets     = photoData.show_sets  || false;
  var sponsorzy    = photoData.sponsorzy  || [];

  var gradOverlay  = isStory
    ? 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.05) 15%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.85) 75%, rgba(0,0,0,0.97) 100%)'
    : 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.1) 25%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0.92) 80%, rgba(0,0,0,0.97) 100%)';

  var logoSize     = isStory ? 100 : 80;
  var logoContW    = isStory ? 130 : 100;
  var logoBorder   = isStory ? 4   : 3;
  var scoreFontSz  = isStory ? 140 : 100;
  var setsFontSz   = isStory ? (numSets >= 5 ? 24 : 32) : (numSets >= 5 ? 20 : 26);
  var teamFontSz   = isStory ? 26  : 20;
  var teamPad      = isStory ? '6px 16px' : '4px 12px';
  var teamRadius   = isStory ? 12  : 10;
  var teamWidth    = isStory ? 250 : 230;
  var gap          = isStory ? 24  : 20;
  var mbTeams      = showSets ? (isStory ? 8 : 6) : (isStory ? 30 : 20);
  var topLiga      = isStory ? 60  : 20;
  var padLiga      = isStory ? 16  : 12;
  var topKolejka   = isStory ? 190 : 100;
  var kFsz         = isStory ? 26  : 20;
  var kPad         = isStory ? '6px 24px' : '4px 20px';
  var kRadius      = isStory ? 16  : 12;
  var logoLigaHTML = isStory ? logoLigaL : logoLigaS;

  var sponsorBarH  = sponsorzy.length > 0 ? (isStory ? 100 : 80) : 0;
  var logoH        = isStory ? 52 : 42;
  var pbContent    = (isStory ? 80 : 40) + sponsorBarH;

  var setsHtml = showSets ? buildSetsHtml(setsFontSz) : '';

  return '<!DOCTYPE html>'
    + '<html><head><meta charset="UTF-8">' + fontImport + '</head>'
    + '<body style="margin:0;padding:0;width:' + width + 'px;height:' + height + 'px;position:relative;overflow:hidden;font-family:Inter,Segoe UI,Arial,sans-serif;">'
    + '<div style="position:absolute;inset:0;background-image:url(\'' + photoBase64 + '\');background-size:cover;background-position:center;filter:blur(24px) brightness(0.45) saturate(1.3);transform:scale(1.12);"></div>'
    + '<div style="position:absolute;inset:0;background-image:url(\'' + photoBase64 + '\');background-size:' + photoZoom + ';background-position:' + photoPos + ';background-repeat:no-repeat;"></div>'
    + '<div style="position:absolute;inset:0;background:' + gradOverlay + ';"></div>'
    + '<div style="position:absolute;inset:0;z-index:2;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:' + pbContent + 'px;">'
    + '<div style="position:absolute;top:' + topLiga + 'px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.7);border-radius:50%;padding:' + padLiga + 'px;display:flex;align-items:center;justify-content:center;">' + logoLigaHTML + '</div>'
    + '<div style="position:absolute;top:' + topKolejka + 'px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.7);padding:' + kPad + ';border-radius:' + kRadius + 'px;white-space:nowrap;">'
    + '<span style="color:rgba(255,255,255,0.9);font-family:Oswald,sans-serif;font-size:' + kFsz + 'px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">' + d.kolejka + '</span></div>'
    + '<div style="display:flex;align-items:center;justify-content:center;gap:' + gap + 'px;margin-bottom:' + mbTeams + 'px;">'
    + '<div style="text-align:center;width:' + teamWidth + 'px;">'
    + '<div style="width:' + logoContW + 'px;height:' + logoContW + 'px;border-radius:50%;background:rgba(0,0,0,0.4);border:' + logoBorder + 'px solid ' + cHome + ';margin:0 auto;display:flex;align-items:center;justify-content:center;overflow:hidden;">' + logoImg(d.logo_home, d.team_home, cHome, logoSize) + '</div>'
    + teamLabel(d.team_home, cHome, teamFontSz, teamPad, teamRadius, teamWidth) + '</div>'
    + '<div style="text-align:center;">'
    + '<div style="font-family:Oswald,sans-serif;font-size:' + scoreFontSz + 'px;font-weight:900;color:#fff;line-height:1;letter-spacing:4px;text-shadow:0 2px 12px rgba(0,0,0,0.6);">' + d.sets_home + ' : ' + d.sets_away + '</div>'
    + setsHtml + '</div>'
    + '<div style="text-align:center;width:' + teamWidth + 'px;">'
    + '<div style="width:' + logoContW + 'px;height:' + logoContW + 'px;border-radius:50%;background:rgba(0,0,0,0.4);border:' + logoBorder + 'px solid ' + cAway + ';margin:0 auto;display:flex;align-items:center;justify-content:center;overflow:hidden;">' + logoImg(d.logo_away, d.team_away, cAway, logoSize) + '</div>'
    + teamLabel(d.team_away, cAway, teamFontSz, teamPad, teamRadius, teamWidth) + '</div></div>'
    + '</div>'
    + buildSponsorsBar(sponsorzy, sponsorBarH, logoH)
    + '</body></html>';
}

// ══════════════════════════════════════════════════════════════════════════════
// SPLIT PANEL STYLE
// ══════════════════════════════════════════════════════════════════════════════

function buildSplitPanelHTML(width, height, photoData) {
  var isStory      = height > width;
  var photoBase64  = photoData.photo_base64;
  var photoPos     = photoData.photo_position || '50% 50%';
  var photoZoom    = photoData.photo_zoom     || '150%';
  var sponsorzy    = photoData.sponsorzy  || [];

  var sponsorBarH  = sponsorzy.length > 0 ? (isStory ? 100 : 80) : 0;
  var logoH        = isStory ? 52 : 42;

  var logoHome = logoImg(d.logo_home, d.team_home, cHome, isStory ? 80 : 52);
  var logoAway = logoImg(d.logo_away, d.team_away, cAway, isStory ? 80 : 52);
  var logoLiga = logoImg(d.logo_liga, 'Liga', cLiga, isStory ? 48 : 36);

  // Set scores rows (for post vertical layout)
  var setsRows = '';
  if (d.played_sets && d.played_sets.length > 0) {
    setsRows = d.played_sets.map(function(s, i) {
      var homeWon = s.home > s.away;
      return '<div style="display:flex;align-items:center;margin-bottom:2px;">'
        + '<span style="width:20px;font-size:11px;color:rgba(255,255,255,0.2);">' + (i + 1) + '</span>'
        + '<span style="font-family:Oswald,sans-serif;font-size:20px;font-weight:' + (homeWon ? '700' : '400') + ';color:' + (homeWon ? cHome : 'rgba(255,255,255,0.25)') + ';width:36px;text-align:right;">' + s.home + '</span>'
        + '<span style="font-size:14px;color:rgba(255,255,255,0.15);margin:0 6px;">–</span>'
        + '<span style="font-family:Oswald,sans-serif;font-size:20px;font-weight:' + (homeWon ? '400' : '700') + ';color:' + (homeWon ? 'rgba(255,255,255,0.25)' : cAway) + ';width:36px;">' + s.away + '</span>'
        + '</div>';
    }).join('');
  }

  if (isStory) {
    // ── STORY: photo top 55%, dark panel bottom 45% ────────────────────────
    var splitPx = Math.round(height * 0.55);
    return '<!DOCTYPE html>'
      + '<html><head><meta charset="UTF-8">' + fontImport + '</head>'
      + '<body style="margin:0;padding:0;width:' + width + 'px;height:' + height + 'px;position:relative;overflow:hidden;font-family:Inter,Segoe UI,sans-serif;background:#0a0a0a;">'
      + '<div style="position:absolute;top:0;left:0;width:100%;height:' + (splitPx + 100) + 'px;background-image:url(\'' + photoBase64 + '\');background-size:cover;background-position:center;filter:blur(20px) brightness(0.3);transform:scale(1.15);"></div>'
      + '<div style="position:absolute;top:0;left:0;width:100%;height:' + splitPx + 'px;background-image:url(\'' + photoBase64 + '\');background-size:' + photoZoom + ';background-position:' + photoPos + ';background-repeat:no-repeat;"></div>'
      + '<div style="position:absolute;top:' + (splitPx - 200) + 'px;left:0;width:100%;height:200px;background:linear-gradient(180deg,transparent,#0a0a0a);"></div>'
      + '<div style="position:absolute;top:' + splitPx + 'px;left:0;width:100%;height:4px;background:linear-gradient(90deg,' + cHome + ',' + cLiga + ',' + cAway + ');opacity:0.5;z-index:3;"></div>'
      + '<div style="position:absolute;top:40px;left:40px;display:flex;align-items:center;gap:16px;z-index:4;">'
      + '<div style="width:48px;height:48px;border-radius:50%;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;overflow:hidden;">' + logoLiga + '</div>'
      + '<span style="color:rgba(255,255,255,0.6);font-family:Oswald,sans-serif;font-size:22px;font-weight:600;text-transform:uppercase;letter-spacing:3px;">' + d.kolejka + '</span>'
      + '</div>'
      + '<div style="position:absolute;bottom:' + sponsorBarH + 'px;left:0;width:100%;height:' + (height - splitPx - sponsorBarH) + 'px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;z-index:2;">'
      + '<div style="display:flex;align-items:center;justify-content:center;gap:36px;">'
      + '<div style="text-align:center;"><div style="width:100px;height:100px;border-radius:50%;border:3px solid ' + cHome + ';background:rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:center;margin:0 auto;overflow:hidden;">' + logoHome + '</div>'
      + '<div style="color:#fff;font-family:Oswald,sans-serif;font-size:24px;font-weight:700;margin-top:10px;text-transform:uppercase;">' + d.team_home + '</div></div>'
      + '<div style="font-family:Oswald,sans-serif;font-size:120px;font-weight:700;color:#fff;line-height:1;letter-spacing:6px;">' + d.sets_home + ' : ' + d.sets_away + '</div>'
      + '<div style="text-align:center;"><div style="width:100px;height:100px;border-radius:50%;border:3px solid ' + cAway + ';background:rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:center;margin:0 auto;overflow:hidden;">' + logoAway + '</div>'
      + '<div style="color:#fff;font-family:Oswald,sans-serif;font-size:24px;font-weight:700;margin-top:10px;text-transform:uppercase;">' + d.team_away + '</div></div>'
      + '</div>'
      + '<div style="display:flex;gap:8px;">'
      + (d.played_sets || []).map(function(s, i) {
          var homeWon = s.home > s.away;
          return (i > 0 ? '<span style="color:rgba(255,255,255,0.15);font-size:20px;">|</span>' : '')
            + '<span style="font-family:Oswald,sans-serif;font-size:24px;font-weight:' + (homeWon ? 700 : 400) + ';color:' + (homeWon ? cHome : 'rgba(255,255,255,0.3)') + ';">' + s.home + '</span>'
            + '<span style="font-size:16px;color:rgba(255,255,255,0.2);">:</span>'
            + '<span style="font-family:Oswald,sans-serif;font-size:24px;font-weight:' + (homeWon ? 400 : 700) + ';color:' + (homeWon ? 'rgba(255,255,255,0.3)' : cAway) + ';">' + s.away + '</span>';
        }).join('')
      + '</div>'
      + '</div>'
      + buildSponsorsBar(sponsorzy, sponsorBarH, logoH)
      + '</body></html>';

  } else {
    // ── POST: left panel 42%, photo right 58% ──────────────────────────────
    var panelW = Math.round(width * 0.42);

    // Auto-shrink team names
    var homeNameFs = d.team_home.length > 14 ? 18 : 22;
    var awayNameFs = d.team_away.length > 14 ? 18 : 22;

    // Bottom padding must clear sponsor bar
    var panelPadBottom = 28 + sponsorBarH;

    return '<!DOCTYPE html>'
      + '<html><head><meta charset="UTF-8">' + fontImport + '</head>'
      + '<body style="margin:0;padding:0;width:' + width + 'px;height:' + height + 'px;position:relative;overflow:hidden;font-family:Inter,Segoe UI,sans-serif;background:#0a0a0a;">'
      // Photo (right side)
      + '<div style="position:absolute;top:0;right:0;width:' + (width - panelW + 60) + 'px;height:100%;background-image:url(\'' + photoBase64 + '\');background-size:cover;background-position:center;filter:blur(20px) brightness(0.3) saturate(1.2);transform:scale(1.15);"></div>'
      + '<div style="position:absolute;top:0;right:0;width:' + (width - panelW) + 'px;height:100%;background-image:url(\'' + photoBase64 + '\');background-size:' + photoZoom + ';background-position:' + photoPos + ';background-repeat:no-repeat;"></div>'
      + '<div style="position:absolute;top:0;left:' + panelW + 'px;width:200px;height:100%;background:linear-gradient(90deg,#0a0a0a,transparent);"></div>'
      + '<div style="position:absolute;bottom:0;right:0;width:' + (width - panelW) + 'px;height:40%;background:linear-gradient(180deg,transparent 0%,rgba(10,10,10,0.7) 70%,#0a0a0a 100%);"></div>'
      // Accent lines
      + '<div style="position:absolute;top:0;left:0;width:' + panelW + 'px;height:4px;background:linear-gradient(90deg,' + cHome + ',' + cLiga + ');z-index:6;"></div>'
      + '<div style="position:absolute;bottom:0;left:0;width:' + panelW + 'px;height:4px;background:linear-gradient(90deg,' + cAway + ',' + cLiga + ');z-index:6;"></div>'
      + '<div style="position:absolute;top:0;left:' + panelW + 'px;width:3px;height:100%;background:linear-gradient(180deg,' + cHome + ',' + cLiga + ',' + cAway + ');opacity:0.5;z-index:6;"></div>'
      // Watermark on photo side
      + '<div style="position:absolute;bottom:' + (80 + sponsorBarH) + 'px;right:40px;z-index:4;font-family:Anton,sans-serif;font-size:120px;font-weight:400;color:rgba(255,255,255,0.08);line-height:1.05;text-align:right;text-transform:uppercase;letter-spacing:2px;">WYNIK<br>MECZU</div>'
      // Left panel — padding-bottom accounts for sponsor bar
      + '<div style="position:absolute;top:0;left:0;width:' + panelW + 'px;height:100%;background:linear-gradient(180deg,#111,#0a0a0a);z-index:5;display:flex;flex-direction:column;justify-content:space-between;padding:40px 32px ' + panelPadBottom + 'px 40px;">'
      // Top: Liga + Kolejka
      + '<div>'
      + '<div style="display:flex;align-items:center;gap:12px;">'
      + '<div style="width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;overflow:hidden;">' + logoLiga + '</div>'
      + '<span style="font-family:Oswald,sans-serif;font-size:16px;font-weight:500;color:rgba(255,255,255,0.45);text-transform:uppercase;letter-spacing:3px;">' + d.kolejka + '</span>'
      + '</div>'
      + '<div style="font-family:Anton,sans-serif;font-size:44px;font-weight:400;color:rgba(255,255,255,0.12);text-transform:uppercase;letter-spacing:3px;line-height:0.95;margin-top:6px;">WYNIK<br>MECZU</div>'
      + '</div>'
      // Middle: Teams + Score (kompaktowe)
      + '<div style="display:flex;flex-direction:column;gap:6px;">'
      // Home team
      + '<div style="display:flex;align-items:center;gap:12px;">'
      + '<div style="width:52px;height:52px;border-radius:50%;border:2px solid ' + cHome + ';background:rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;">' + logoHome + '</div>'
      + '<span style="font-family:Oswald,sans-serif;font-size:' + homeNameFs + 'px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:1px;">' + d.team_home + '</span>'
      + '</div>'
      + '<div style="margin-left:64px;font-family:Oswald,sans-serif;font-size:80px;font-weight:700;color:' + cHome + ';line-height:1;">' + d.sets_home + '</div>'
      // Divider
      + '<div style="width:50px;height:2px;background:rgba(255,255,255,0.1);margin:2px 0 2px 64px;"></div>'
      // Away score
      + '<div style="margin-left:64px;font-family:Oswald,sans-serif;font-size:80px;font-weight:700;color:' + cAway + ';line-height:1;">' + d.sets_away + '</div>'
      // Away team
      + '<div style="display:flex;align-items:center;gap:12px;">'
      + '<div style="width:52px;height:52px;border-radius:50%;border:2px solid ' + cAway + ';background:rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:center;flex-shrink:0;overflow:hidden;">' + logoAway + '</div>'
      + '<span style="font-family:Oswald,sans-serif;font-size:' + awayNameFs + 'px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:1px;">' + d.team_away + '</span>'
      + '</div>'
      + '</div>'
      // Bottom: Set scores
      + '<div style="margin-left:64px;">'
      + '<div style="font-size:10px;font-weight:600;color:rgba(255,255,255,0.25);text-transform:uppercase;letter-spacing:2px;margin-bottom:6px;">Wyniki setów</div>'
      + setsRows
      + '</div>'
      + '</div>'
      // Sponsor bar
      + buildSponsorsBar(sponsorzy, sponsorBarH, logoH)
      + '</body></html>';
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTER
// ══════════════════════════════════════════════════════════════════════════════

function buildHTML(width, height, photoData) {
  var style = photoData.style || 'classic';
  if (style === 'split_panel') {
    return buildSplitPanelHTML(width, height, photoData);
  }
  return buildClassicHTML(width, height, photoData);
}

var htmlPost  = d.post  ? buildHTML(1080, 1080, d.post)  : null;
var htmlStory = d.story ? buildHTML(1080, 1920, d.story) : null;

return [{
  json: {
    match_id:   d.match_id,
    row_number: d.row_number,
    html_post:  htmlPost,
    html_story: htmlStory,
    has_post:   !!htmlPost,
    has_story:  !!htmlStory
  }
}];
