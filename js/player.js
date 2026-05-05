const id = new URLSearchParams(window.location.search).get("id");

Promise.all([
  fetch("data/players.json").then(r => r.json()),
  fetch("data/player_profiles.json").then(r => r.json()).catch(() => []),
  fetch("data/matches.json").then(r => r.json()),
  fetch("data/appearances.json").then(r => r.json()),
  fetch("data/teams.json").then(r => r.json()),
  fetch("data/seasons.json").then(r => r.json()).catch(() => [])
]).then(([players, profiles, matches, appearances, teams, seasons]) => {
  const player = players.find(p => String(p.id).trim() === String(id).trim());
  const profile = profiles.find(p => String(p.id).trim() === String(id).trim()) || {};
  const el = document.getElementById("player") || document.getElementById("playerPage");

  if (!player) {
    el.innerHTML = `<div class="content-box"><p>Player not found.</p></div>`;
    return;
  }

  function teamName(teamId) {
    const team = teams.find(t => String(t.id).trim() === String(teamId).trim());
    return team ? team.name : teamId;
  }

  function seasonName(seasonId) {
    const season = seasons.find(s => String(s.id).trim() === String(seasonId).trim());
    return season ? season.name : seasonId;
  }

  function isFriendly(match) {
    const comp = String(match.competition || "").trim().toLowerCase();
    return comp === "friendly" || comp === "fr" || comp === "friendlies";
  }

 function validMatch(match) {
  return (
    match &&
    String(match.abandoned || "").trim().toUpperCase() !== "Y" &&
    match.home_score !== "?" &&
    match.away_score !== "?" &&
    !Number.isNaN(Number(match.home_score)) &&
    !Number.isNaN(Number(match.away_score))
  );
}

  function isT1Home(match) {
    return String(match.home_team).trim() === "t1";
  }

  function isT1Away(match) {
    return String(match.away_team).trim() === "t1";
  }

  function filterByHomeAway(rows, homeOnlyBox, awayOnlyBox) {
    if (homeOnlyBox && homeOnlyBox.checked) {
      return rows.filter(row => isT1Home(row.match));
    }

    if (awayOnlyBox && awayOnlyBox.checked) {
      return rows.filter(row => isT1Away(row.match));
    }

    return rows;
  }

  function setupGameTickboxes(allBox, homeBox, awayBox, render) {
    if (!allBox || !homeBox || !awayBox) return;

    allBox.addEventListener("change", () => {
      if (allBox.checked) {
        homeBox.checked = false;
        awayBox.checked = false;
      } else if (!homeBox.checked && !awayBox.checked) {
        allBox.checked = true;
      }

      render();
    });

    homeBox.addEventListener("change", () => {
      if (homeBox.checked) {
        allBox.checked = false;
        awayBox.checked = false;
      } else if (!awayBox.checked) {
        allBox.checked = true;
      }

      render();
    });

    awayBox.addEventListener("change", () => {
      if (awayBox.checked) {
        allBox.checked = false;
        homeBox.checked = false;
      } else if (!homeBox.checked) {
        allBox.checked = true;
      }

      render();
    });
  }

  function matchResultClass(match) {
    if (!validMatch(match)) return "";

    const margateHome = isT1Home(match);
    const margateAway = isT1Away(match);

    if (!margateHome && !margateAway) return "";

    const margateScore = margateHome ? Number(match.home_score) : Number(match.away_score);
    const opponentScore = margateHome ? Number(match.away_score) : Number(match.home_score);

    if (margateScore > opponentScore) return "player-result-win";
    if (margateScore < opponentScore) return "player-result-defeat";
    return "player-result-draw";
  }

  function parseDate(value) {
    if (!value) return null;
    const parts = String(value).trim().replace(/\./g, "/").replace(/-/g, "/").split("/");
    if (parts.length !== 3) return null;

    let [dd, mm, yyyy] = parts;
    if (yyyy.length === 2) yyyy = Number(yyyy) >= 50 ? `18${yyyy}` : `19${yyyy}`;

    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function formatLongDate(value) {
    const d = parseDate(value);
    if (!d) return "Unknown";

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    function suffix(day) {
      if (day >= 11 && day <= 13) return "th";
      if (day % 10 === 1) return "st";
      if (day % 10 === 2) return "nd";
      if (day % 10 === 3) return "rd";
      return "th";
    }

    const day = d.getDate();
    return `${days[d.getDay()]} ${day}${suffix(day)} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  function formatSpan(firstDateValue, lastDateValue) {
    const first = parseDate(firstDateValue);
    const last = parseDate(lastDateValue);
    if (!first || !last) return "Unknown";

    const days = Math.max(0, Math.round((last - first) / 86400000));

    if (days <= 365) return days === 1 ? "1 day" : `${days} days`;

    const years = Math.floor(days / 365);
    const remainingDays = days % 365;

    return remainingDays
      ? `${years === 1 ? "1 year" : `${years} years`} ${remainingDays === 1 ? "1 day" : `${remainingDays} days`}`
      : years === 1 ? "1 year" : `${years} years`;
  }

  function formatDays(days) {
    return days === 1 ? "1 day" : `${days} days`;
  }

  function ordinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
  }

  function matchLine(match) {
    return `${teamName(match.home_team)} ${match.home_score}-${match.away_score} ${teamName(match.away_team)}`;
  }

  function resolveTeam(teamValue) {
    return teams.find(t =>
      String(t.id).trim() === String(teamValue).trim() ||
      String(t.name).trim() === String(teamValue).trim()
    );
  }

  function teamBadgeSmall(teamValue) {
    const team = resolveTeam(teamValue);
    const teamId = team ? team.id : teamValue;

    return `
      <img
        class="team-badge-small"
        src="images/teams/${teamId}.png"
        alt=""
        onerror="this.onerror=null;this.src='images/teams/defaultbadge.png';"
      >
    `;
  }

  function resultHtml(match) {
    return `
      <a href="match.html?id=${match.id}" class="season-result-link player-result-link">
        <span class="season-result-team season-result-home">
          <span>${teamName(match.home_team)}</span>
          ${teamBadgeSmall(match.home_team)}
        </span>

        <span class="season-result-score">${match.home_score} - ${match.away_score}</span>

        <span class="season-result-team season-result-away">
          ${teamBadgeSmall(match.away_team)}
          <span>${teamName(match.away_team)}</span>
        </span>
      </a>
    `;
  }

  function competitionValue(match) {
    return String(match.competition || "Unknown").trim() || "Unknown";
  }

  function competitionOptionsHtml(rows) {
    const competitions = Array.from(new Set(rows.map(row => competitionValue(row.match))))
      .sort((a, b) => a.localeCompare(b));

    return `
      <option value="all">All Competitions</option>
      ${competitions.map(comp => `<option value="${comp.replace(/"/g, "&quot;")}">${comp}</option>`).join("")}
    `;
  }

  function calcStats(rows) {
    const starts = rows.filter(x => Number(x.app.is_starting) === 1).length;
    const subs = rows.filter(x => Number(x.app.is_starting) !== 1).length;
    const goals = rows.reduce((sum, x) => sum + Number(x.app.goals || 0), 0);

    return {
      starts,
      subs,
      apps: starts + subs,
      goals,
      displayApps: subs > 0 ? `${starts}+${subs}` : `${starts}`
    };
  }

  function playerRowsFor(playerId) {
    return appearances
      .filter(a => String(a.player_id).trim() === String(playerId).trim())
      .map(app => ({
        app,
        match: matches.find(m => String(m.id).trim() === String(app.match_id).trim())
      }))
      .filter(row => row.match && validMatch(row.match));
  }

  
  function positionLabel(shirt) {
    const map = {
      1: "Goalkeeper",
      2: "Right-back",
      3: "Left-back",
      4: "Right-half",
      5: "Centre-half",
      6: "Left-half",
      7: "Outside-right",
      8: "Inside-right",
      9: "Centre-forward",
      10: "Inside-left",
      11: "Outside-left"
    };
    return map[Number(shirt)] || "Unknown";
  }

  function playerPositionSummary(rows) {
    const counts = {};
    let total = 0;

    rows.forEach(r => {
      const pos = positionLabel(r.app.shirt_number);
      counts[pos] = (counts[pos] || 0) + 1;
      total++;
    });

    const list = Object.entries(counts).map(([name,count]) => ({
      name,
      count,
      pct: total ? Math.round((count / total) * 100) : 0
    }))
    .sort((a,b) => b.count - a.count || a.name.localeCompare(b.name));

    if (!list.length) {
      return { primary: player.position || "Unknown", rows: [] };
    }

    let running = 0;
    list.forEach((row,i) => {
      if (i < list.length - 1) {
        row.pct = Math.round((row.count / total) * 100);
        running += row.pct;
      } else {
        row.pct = Math.max(0, 100 - running);
      }
    });

    return { primary: list[0].name, rows: list };
  }

function statSetFor(playerId) {
    const rows = playerRowsFor(playerId);
    return {
      competitive: calcStats(rows.filter(x => !isFriendly(x.match))),
      friendly: calcStats(rows.filter(x => isFriendly(x.match))),
      total: calcStats(rows)
    };
  }

  function rankFor(category, statName, playerId) {
    const ranked = players
      .map(p => {
        const stats = statSetFor(p.id)[category];
        return {
          id: p.id,
          value: statName === "apps" ? stats.apps : stats.goals,
          apps: stats.apps
        };
      })
      .filter(r => r.apps > 0)
      .sort((a, b) => b.value - a.value);

    const current = ranked.find(r => String(r.id).trim() === String(playerId).trim());
    if (!current) return { rank: null, total: ranked.length, isFirst: false, joint: false };

    const betterPlayers = ranked.filter(r => r.value > current.value).length;
    const samePlayers = ranked.filter(r => r.value === current.value).length;
    const rank = betterPlayers + 1;

    return {
      rank,
      total: ranked.length,
      isFirst: rank === 1,
      joint: samePlayers > 1
    };
  }

  function rankText(category, statName, playerId) {
    const r = rankFor(category, statName, playerId);
    if (!r.rank) return "";

    const prefix = r.joint ? "Joint " : "";
    return ` (${prefix}${ordinal(r.rank)} of ${r.total})`;
  }

  function starIfFirst(category, statName, playerId) {
    return rankFor(category, statName, playerId).isFirst
      ? `<span class="gold-star">★</span>`
      : "";
  }

  const appsWithMatch = playerRowsFor(id);
  const positionSummary = playerPositionSummary(appsWithMatch);

  const competitive = appsWithMatch.filter(x => !isFriendly(x.match));
  const friendly = appsWithMatch.filter(x => isFriendly(x.match));
  const total = appsWithMatch;

  const compStats = calcStats(competitive);
  const frStats = calcStats(friendly);
  const totalStats = calcStats(total);

  const orderedMatches = [...appsWithMatch].sort((a, b) => parseDate(a.match.date) - parseDate(b.match.date));
  const orderedCompetitiveMatches = [...competitive].sort((a, b) => parseDate(a.match.date) - parseDate(b.match.date));

  const firstAllMatch = orderedMatches[0]?.match || null;
  const lastAllMatch = orderedMatches[orderedMatches.length - 1]?.match || null;
  const firstCompetitiveMatch = orderedCompetitiveMatches[0]?.match || null;
  const lastCompetitiveMatch = orderedCompetitiveMatches[orderedCompetitiveMatches.length - 1]?.match || null;

  function longestGapBetweenAppearances(rows) {
    if (!rows || rows.length < 2) return 0;
    let biggest = 0;

    for (let i = 1; i < rows.length; i++) {
      const prev = parseDate(rows[i - 1].match.date);
      const current = parseDate(rows[i].match.date);
      if (!prev || !current) continue;

      const gap = Math.round((current - prev) / 86400000);
      if (gap > biggest) biggest = gap;
    }

    return biggest;
  }

  const debutText = firstAllMatch ? formatLongDate(firstAllMatch.date) : "Unknown";
  const competitiveDebutText = firstCompetitiveMatch ? formatLongDate(firstCompetitiveMatch.date) : "No competitive appearances";
  const lastAppearanceText = lastAllMatch ? formatLongDate(lastAllMatch.date) : "Unknown";
  const lastCompetitiveAppearanceText = lastCompetitiveMatch ? formatLongDate(lastCompetitiveMatch.date) : "No competitive appearances";
  const appearanceSpanText = firstAllMatch && lastAllMatch ? formatSpan(firstAllMatch.date, lastAllMatch.date) : "Unknown";
  const longestGapText = formatDays(longestGapBetweenAppearances(orderedMatches));

  const playerPhoto =
    player.photo && String(player.photo).trim() !== ""
      ? String(player.photo).trim()
      : `${player.id}.png`;

  const photoHtml = `
    <img
      src="images/players/${playerPhoto}"
      alt="${player.name}"
      onerror="
        if (!this.dataset.triedId) {
          this.dataset.triedId='1';
          this.src='images/players/${player.id}.png';
        } else if (!this.dataset.triedDefaultPlayer) {
          this.dataset.triedDefaultPlayer='1';
          this.src='images/players/defaultplayer.png';
        } else {
          this.onerror=null;
          this.src='images/players/default.png';
        }
      "
    >
  `;

  function recordBox(title, category, stats) {
    return `
      <div class="player-stat-box">
        <div class="player-stat-title">${title}</div>
        <p>
          <strong>Appearances:</strong>
          ${stats.displayApps}${starIfFirst(category, "apps", id)}${rankText(category, "apps", id)}
        </p>
        <p>
          <strong>Goals:</strong>
          ${stats.goals}${starIfFirst(category, "goals", id)}${rankText(category, "goals", id)}
        </p>
      </div>
    `;
  }

  function seasonSummaryRows() {
    const grouped = {};

    orderedMatches.forEach(row => {
      const sid = String(row.match.season_id || "unknown").trim();
      if (!grouped[sid]) grouped[sid] = [];
      grouped[sid].push(row);
    });

    return Object.entries(grouped)
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
      .map(([seasonId, rows]) => {
        const comp = calcStats(rows.filter(x => !isFriendly(x.match)));
        const fr = calcStats(rows.filter(x => isFriendly(x.match)));
        const tot = calcStats(rows);

        return `
          <tr>
            <td><a href="season.html?id=${seasonId}">${seasonName(seasonId)}</a></td>
            <td>${comp.displayApps}</td>
            <td>${comp.goals}</td>
            <td>${fr.displayApps}</td>
            <td>${fr.goals}</td>
            <td>${tot.displayApps}</td>
            <td>${tot.goals}</td>
          </tr>
        `;
      }).join("");
  }

  function milestoneClass(number) {
    const milestones = [50,100,150,200,250,300,350,400,450,500,550,600,650,700];
    return milestones.includes(number) ? " milestone-row" : "";
  }

  el.innerHTML = `
    <style>
      .player-card {
        grid-template-columns: minmax(195px, 225px) 1fr;
        align-items: start;
        column-gap: 24px;
      }

      .player-card img {
        max-width: 195px;
      }

      .player-photo-meta {
        font-size: 1rem;
        line-height: 1.55;
      }

      .player-photo-meta p {
        font-size: 1rem;
        margin: 0 0 8px;
        white-space: normal;
      }

      .player-photo-meta .nowrap {
        white-space: nowrap;
      }

      .player-meta {
        min-width: 0;
        overflow: hidden;
      }

      .player-stats-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
        margin: 14px 0 18px;
      }

      .player-stat-box {
        padding: 10px 14px;
        min-width: 0;
      }

      .player-stat-box p {
        margin: 7px 0;
      }

      .player-career-fields {
        clear: both;
      }

      .player-career-fields p {
        margin: 0 0 10px;
      }

      .gold-star {
        color: #ffd700;
        font-size: 1.25em;
        font-weight: 900;
        margin-left: 4px;
        text-shadow: 0 0 3px #fff6a6, 0 0 8px #ffd700, 0 0 13px #ffb300;
      }

      
      .position-info-btn {
        margin-left: 8px;
        width: 26px;
        height: 26px;
        border-radius: 50%;
        border: 2px solid #b30000;
        background: radial-gradient(circle at 35% 30%, #ff8a8a, #e00000 60%, #b30000);
        color: #fff;
        font-weight: 700;
        font-style: italic;
        font-size: 18px;
        line-height: 20px;
        padding: 0;
        cursor: pointer;
        box-shadow: inset 0 2px 4px rgba(255,255,255,.35), 0 2px 4px rgba(0,0,0,.25);
      }
      .position-modal {
        position: fixed;
        top: 20%;
        left: 50%;
        transform: translateX(-50%);
        background: #fff;
        border: 1px solid #999;
        padding: 14px;
        z-index: 9999;
        min-width: 320px;
        box-shadow: 0 8px 24px rgba(0,0,0,.25);
      }
      .position-modal h3 { margin-top:0; }
      .position-close {
        position:absolute;
        top:6px;
        right:8px;
        cursor:pointer;
        font-weight:bold;
      }
      .position-row { margin:6px 0; }

      .archive-table tbody tr.player-result-win td {
        background: #e7f4e4 !important;
      }

      .archive-table tbody tr.player-result-defeat td {
        background: #f8e3e3 !important;
      }

      .archive-table tbody tr.player-result-draw td {
        background: #f6edd2 !important;
      }

      .archive-table tbody tr.player-result-win:hover td {
        background: #d9ecd5 !important;
      }

      .archive-table tbody tr.player-result-defeat:hover td {
        background: #f1d4d4 !important;
      }

      .player-match-record-header {
        display: flex;
        align-items: center;
        gap: 14px;
        flex-wrap: wrap;
        margin-bottom: 12px;
      }

      .player-match-record-header h3 {
        margin: 0;
      }

      .player-match-record-header select {
        margin-bottom: 0;
      }

      .player-result-link {
        display: grid;
        grid-template-columns: minmax(160px, 1fr) 70px minmax(160px, 1fr);
        align-items: center;
        column-gap: 12px;
        text-decoration: none;
        width: 100%;
      }

      .season-result-team {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        white-space: nowrap;
      }

      .season-result-home {
        justify-content: flex-end;
        text-align: right;
      }

      .season-result-away {
        justify-content: flex-start;
        text-align: left;
      }

      .season-result-score {
        text-align: center;
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
      }

      .player-start-tick,
      .player-start-cross {
        color: #b30000;
        font-weight: 900;
        font-size: 1.15em;
      }

      .player-match-competition {
        white-space: nowrap;
      }

      .archive-table.player-match-record-table th,
      .archive-table.player-match-record-table td {
        vertical-align: middle;
      }

      .archive-table.player-match-record-table td:nth-child(4) {
        min-width: 420px;
      }

      .archive-table tbody tr.player-result-draw:hover td {
        background: #efe0b9 !important;
      }

@media (max-width: 800px) {
        .player-card {
          grid-template-columns: 1fr;
        }

        .player-stats-grid {
          grid-template-columns: 1fr;
        }
      }
    </style>

    <div class="content-box">
      <div class="player-card">
        <div>
          ${photoHtml}

          <div class="player-photo-meta">
            <p><strong>Primary Position:</strong> ${positionSummary.primary}
               <button id="positionInfoBtn" type="button" class="position-info-btn" title="Click for full positional breakdown" aria-label="Click for full positional breakdown">i</button>
             </p>
            ${profile.dob ? `<p class="nowrap"><strong>Date of Birth:</strong> ${profile.dob}</p>` : ""}
            ${profile.birth_place ? `<p><strong>Birth Place:</strong> ${profile.birth_place}</p>` : ""}
            ${profile.other_clubs ? `<p><strong>Other Clubs:</strong> ${profile.other_clubs}</p>` : ""}
          </div>
        </div>

        <div class="player-meta">
          <h2>${player.name}</h2>

          <div class="player-career-fields">
            <p><strong>Debut:</strong> ${debutText}</p>
            <p><strong>Competitive Debut:</strong> ${competitiveDebutText}</p>
            <p><strong>Last Appearance:</strong> ${lastAppearanceText}</p>
            <p><strong>Last Competitive Appearance:</strong> ${lastCompetitiveAppearanceText}</p>
            ${totalStats.apps > 1 ? `<p><strong>Appearance Span (All matches):</strong> ${appearanceSpanText}</p>` : ""}
            ${totalStats.apps > 1 ? `<p><strong>Longest Gap Between Appearances:</strong> ${longestGapText}</p>` : ""}
          </div>

          <div class="player-stats-grid">
            ${recordBox("Competitive Record", "competitive", compStats)}
            ${recordBox("Friendly Record", "friendly", frStats)}
            ${recordBox("Total Record", "total", totalStats)}
          </div>
        </div>
      </div>
    </div>

    ${profile.bio ? `
      <div class="content-box section-block">
        <h3>Biography</h3>
        <div id="bioText" class="bio-collapsed">
          ${profile.bio}
        </div>
        <button id="bioToggle" class="archive-button">Click for full details</button>
      </div>
    ` : ""}

    <div class="content-box section-block">
      <div class="player-match-record-header">
        <h3>Match Record</h3>
        <select id="playerCompetitionFilter">
          ${competitionOptionsHtml(orderedMatches)}
        </select>
      </div>

      <div id="seasonSummary">
        <table class="archive-table">
          <thead>
            <tr>
              <th>Season</th>
              <th>Comp Apps</th>
              <th>Comp Goals</th>
              <th>Fr Apps</th>
              <th>Fr Goals</th>
              <th>Total Apps</th>
              <th>Total Goals</th>
            </tr>
          </thead>
          <tbody>
            ${seasonSummaryRows() || `<tr><td colspan="7">No match records found.</td></tr>`}
          </tbody>
        </table>
        <button id="showFullRecord" class="archive-button">Click for full record</button>
      </div>

      <div id="fullRecord" style="display:none;">
        <div id="playerMatchFilters" style="display:flex; gap:18px; flex-wrap:wrap; align-items:center; margin-bottom:12px;">
          <label class="stats-toggle">
            <input type="checkbox" id="allGamesPlayer" checked>
            All Games
          </label>

          <label class="stats-toggle">
            <input type="checkbox" id="homeGamesOnlyPlayer">
            Home Games Only
          </label>

          <label class="stats-toggle">
            <input type="checkbox" id="awayGamesOnlyPlayer">
            Away Games Only
          </label>

          <label class="stats-toggle">
            <input type="checkbox" id="competitiveOnlyPlayer">
            Competitive Games Only
          </label>

          <label class="stats-toggle">
            <input type="checkbox" id="friendlyOnlyPlayer">
            Friendly Games Only
          </label>
        </div>

        <table class="archive-table player-match-record-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Competition</th>
              <th>Result</th>
              <th>Start ?</th>
              <th>Goals</th>
            </tr>
          </thead>
          <tbody id="playerMatchRows"></tbody>
        </table>
        <button id="hideFullRecord" class="archive-button">Show season summary</button>
      </div>
    </div>
  `;

  const rows = document.getElementById("playerMatchRows");

  function renderPlayerMatchRows() {
    if (!rows) return;

    const allGames = document.getElementById("allGamesPlayer");
    const homeGamesOnly = document.getElementById("homeGamesOnlyPlayer");
    const awayGamesOnly = document.getElementById("awayGamesOnlyPlayer");
    const competitiveOnly = document.getElementById("competitiveOnlyPlayer");
    const friendlyOnly = document.getElementById("friendlyOnlyPlayer");
    const competitionFilter = document.getElementById("playerCompetitionFilter");

    let filteredRows = [...orderedMatches];

    filteredRows = filterByHomeAway(filteredRows, homeGamesOnly, awayGamesOnly);

    if (competitiveOnly && competitiveOnly.checked) {
      filteredRows = filteredRows.filter(row => !isFriendly(row.match));
    }

    if (friendlyOnly && friendlyOnly.checked) {
      filteredRows = filteredRows.filter(row => isFriendly(row.match));
    }

    if (competitionFilter && competitionFilter.value !== "all") {
      filteredRows = filteredRows.filter(row => competitionValue(row.match) === competitionFilter.value);
    }

    if (!filteredRows.length) {
      rows.innerHTML = `<tr><td colspan="6">No match records found.</td></tr>`;
      return;
    }

    rows.innerHTML = filteredRows.map(({ app, match }, index) => {
      const num = index + 1;
      const resultClass = matchResultClass(match);

      const started = Number(app.is_starting) === 1;
      const startIcon = started
        ? `<span class="player-start-tick" title="Started">✓</span>`
        : `<span class="player-start-cross" title="Did not start">✗</span>`;

      return `
        <tr class="${milestoneClass(num)} ${resultClass}">
          <td>#${String(num).padStart(3, "0")}</td>
          <td>${match.date || ""}</td>
          <td class="player-match-competition">${match.competition || ""}</td>
          <td>${resultHtml(match)}</td>
          <td>${startIcon}</td>
          <td>${Number(app.goals || 0)}</td>
        </tr>
      `;
    }).join("");
  }

  renderPlayerMatchRows();

  const allGamesPlayer = document.getElementById("allGamesPlayer");
  const homeGamesOnlyPlayer = document.getElementById("homeGamesOnlyPlayer");
  const awayGamesOnlyPlayer = document.getElementById("awayGamesOnlyPlayer");
  const competitiveOnlyPlayer = document.getElementById("competitiveOnlyPlayer");
  const friendlyOnlyPlayer = document.getElementById("friendlyOnlyPlayer");

  setupGameTickboxes(allGamesPlayer, homeGamesOnlyPlayer, awayGamesOnlyPlayer, renderPlayerMatchRows);

  const competitionFilterPlayer = document.getElementById("playerCompetitionFilter");

  if (competitionFilterPlayer) {
    competitionFilterPlayer.addEventListener("change", renderPlayerMatchRows);
  }

  if (competitiveOnlyPlayer) {
    competitiveOnlyPlayer.addEventListener("change", () => {
      if (competitiveOnlyPlayer.checked && friendlyOnlyPlayer) {
        friendlyOnlyPlayer.checked = false;
      }
      renderPlayerMatchRows();
    });
  }

  if (friendlyOnlyPlayer) {
    friendlyOnlyPlayer.addEventListener("change", () => {
      if (friendlyOnlyPlayer.checked && competitiveOnlyPlayer) {
        competitiveOnlyPlayer.checked = false;
      }
      renderPlayerMatchRows();
    });
  }

  const bioToggle = document.getElementById("bioToggle");
  const bioText = document.getElementById("bioText");

  if (bioToggle && bioText) {
    bioToggle.addEventListener("click", () => {
      const open = bioText.classList.toggle("bio-expanded");
      bioText.classList.toggle("bio-collapsed", !open);
      bioToggle.textContent = open ? "Close full details" : "Click for full details";
    });
  }

  const showFullRecord = document.getElementById("showFullRecord");
  const hideFullRecord = document.getElementById("hideFullRecord");
  const seasonSummary = document.getElementById("seasonSummary");
  const fullRecord = document.getElementById("fullRecord");

  if (showFullRecord && hideFullRecord && seasonSummary && fullRecord) {
    showFullRecord.addEventListener("click", () => {
      seasonSummary.style.display = "none";
      fullRecord.style.display = "block";
    });

    hideFullRecord.addEventListener("click", () => {
      fullRecord.style.display = "none";
      seasonSummary.style.display = "block";
    });
  }

  const infoBtn = document.getElementById("positionInfoBtn");
  if (infoBtn) {
    infoBtn.addEventListener("click", () => {
      const existing = document.getElementById("positionModal");
      if (existing) existing.remove();

      const modal = document.createElement("div");
      modal.id = "positionModal";
      modal.className = "position-modal";
      modal.innerHTML = `
        <div class="position-close" id="closePositionModal">✕</div>
        <h3>Full Position Details</h3>
        ${positionSummary.rows.map(r => `<div class="position-row"><strong>${r.name}</strong>: ${r.pct}%</div>`).join("")}
      `;
      document.body.appendChild(modal);

      document.getElementById("closePositionModal").addEventListener("click", () => {
        modal.remove();
      });
    });
  }


}).catch(err => {
  const el = document.getElementById("player") || document.getElementById("playerPage");
  el.innerHTML = `<div class="content-box"><p>Error loading player page: ${err.message}</p></div>`;
  console.error(err);
});