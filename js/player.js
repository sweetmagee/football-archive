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
        grid-template-columns: minmax(260px, 300px) 1fr;
        align-items: start;
        column-gap: 24px;
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
        margin-bottom: 18px;
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
            ${player.position ? `<p><strong>Position:</strong> ${player.position}</p>` : ""}
            ${profile.dob ? `<p class="nowrap"><strong>Date of Birth:</strong> ${profile.dob}</p>` : ""}
            ${profile.birth_place ? `<p><strong>Birth Place:</strong> ${profile.birth_place}</p>` : ""}
            ${profile.other_clubs ? `<p><strong>Other Clubs:</strong> ${profile.other_clubs}</p>` : ""}
          </div>
        </div>

        <div class="player-meta">
          <h2>${player.name}</h2>

          <div class="player-stats-grid">
            ${recordBox("Competitive Record", "competitive", compStats)}
            ${recordBox("Friendly Record", "friendly", frStats)}
            ${recordBox("Total Record", "total", totalStats)}
          </div>

          <div class="player-career-fields">
            <p><strong>Debut:</strong> ${debutText}</p>
            <p><strong>Competitive Debut:</strong> ${competitiveDebutText}</p>
            <p><strong>Last Appearance:</strong> ${lastAppearanceText}</p>
            <p><strong>Last Competitive Appearance:</strong> ${lastCompetitiveAppearanceText}</p>
            ${totalStats.apps > 1 ? `<p><strong>Appearance Span (All matches):</strong> ${appearanceSpanText}</p>` : ""}
            ${totalStats.apps > 1 ? `<p><strong>Longest Gap Between Appearances:</strong> ${longestGapText}</p>` : ""}
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
      <h3>Match Record</h3>

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
        <table class="archive-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Date</th>
              <th>Match</th>
              <th>Competition</th>
              <th>Apps</th>
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

  orderedMatches.forEach(({ app, match }, index) => {
    const num = index + 1;
    rows.innerHTML += `
      <tr class="${milestoneClass(num)}">
        <td>#${String(num).padStart(3, "0")}</td>
        <td>${match.date || ""}</td>
        <td><a href="match.html?id=${match.id}">${matchLine(match)}</a></td>
        <td>${match.competition || ""}</td>
        <td>${Number(app.is_starting) === 1 ? "Start" : "Sub"}</td>
        <td>${Number(app.goals || 0)}</td>
      </tr>
    `;
  });

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

}).catch(err => {
  const el = document.getElementById("player") || document.getElementById("playerPage");
  el.innerHTML = `<div class="content-box"><p>Error loading player page: ${err.message}</p></div>`;
  console.error(err);
});