const id = new URLSearchParams(window.location.search).get("id");

Promise.all([
  fetch("data/teams.json").then(r => r.json()),
  fetch("data/players.json").then(r => r.json()),
  fetch("data/matches.json").then(r => r.json()),
  fetch("data/seasons.json").then(r => r.json()),
  fetch("data/appearances.json").then(r => r.json())
]).then(([teams, players, matches, seasons, appearances]) => {
  const team = teams.find(t => String(t.id).trim() === String(id).trim());
  const el = document.getElementById("teamPage");

  if (!team) {
    el.innerHTML = `<div class="content-box"><p>Team not found.</p></div>`;
    return;
  }

  const isMargatePage = String(id).trim() === "t1";

  function isCountableMatch(match) {
    return (
      match &&
      match.home_score !== "?" &&
      match.away_score !== "?" &&
      !Number.isNaN(Number(match.home_score)) &&
      !Number.isNaN(Number(match.away_score))
    );
  }

  function isFriendly(match) {
    const comp = String(match.competition || "").trim().toLowerCase();
    return comp === "friendly" || comp === "fr" || comp === "friendlies";
  }

  function seasonName(seasonId) {
    const season = seasons.find(s => String(s.id).trim() === String(seasonId).trim());
    return season ? season.name : seasonId;
  }

  function teamName(teamId) {
    const t = teams.find(x => String(x.id).trim() === String(teamId).trim());
    return t ? t.name : teamId;
  }

  function playerName(playerId) {
    const p = players.find(x => String(x.id).trim() === String(playerId).trim());
    return p ? p.name : playerId;
  }

  function teamBadgeHtml(teamId, sizeClass = "team-badge-small") {
    return `<img class="${sizeClass}" src="images/teams/${teamId}.png" alt="" onerror="this.onerror=null;this.src='images/teams/defaultbadge.png';">`;
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

  function matchLine(m) {
    return `
      <div class="match-row" data-opponent="${getOpponentId(m)}">
        <div class="match-date">${m.date || ""}</div>
        <div class="match-scoreline">
          <a href="match.html?id=${m.id}">
            <span class="team-inline">
              ${teamBadgeHtml(m.home_team)}
              <span>${teamName(m.home_team)}</span>
            </span>

            <span class="score-separator">${m.home_score}-${m.away_score}</span>

            <span class="team-inline">
              ${teamBadgeHtml(m.away_team)}
              <span>${teamName(m.away_team)}</span>
            </span>
          </a>
        </div>
        <div class="match-meta">${m.competition || ""}${m.round ? ` - ${m.round}` : ""}</div>
      </div>
    `;
  }

  function getOpponentId(match) {
    if (String(match.home_team).trim() === "t1") return String(match.away_team).trim();
    if (String(match.away_team).trim() === "t1") return String(match.home_team).trim();

    if (String(match.home_team).trim() === String(id).trim()) return String(match.away_team).trim();
    return String(match.home_team).trim();
  }

  let teamMatches;

  if (isMargatePage) {
    teamMatches = matches.filter(m =>
      (
        String(m.home_team).trim() === String(id).trim() ||
        String(m.away_team).trim() === String(id).trim()
      ) &&
      isCountableMatch(m)
    );
  } else {
    teamMatches = matches.filter(m =>
      (
        (String(m.home_team).trim() === "t1" && String(m.away_team).trim() === String(id).trim()) ||
        (String(m.away_team).trim() === "t1" && String(m.home_team).trim() === String(id).trim())
      ) &&
      isCountableMatch(m)
    );
  }

  function getRecord(matchList) {
    let P = 0;
    let W = 0;
    let D = 0;
    let L = 0;
    let GF = 0;
    let GA = 0;

    matchList.forEach(m => {
      let goalsFor = 0;
      let goalsAgainst = 0;

      if (isMargatePage) {
        const isHome = String(m.home_team).trim() === String(id).trim();
        goalsFor = isHome ? Number(m.home_score || 0) : Number(m.away_score || 0);
        goalsAgainst = isHome ? Number(m.away_score || 0) : Number(m.home_score || 0);
      } else {
        const margateHome = String(m.home_team).trim() === "t1";
        goalsFor = margateHome ? Number(m.home_score || 0) : Number(m.away_score || 0);
        goalsAgainst = margateHome ? Number(m.away_score || 0) : Number(m.home_score || 0);
      }

      P++;
      GF += goalsFor;
      GA += goalsAgainst;

      if (goalsFor > goalsAgainst) W++;
      else if (goalsFor < goalsAgainst) L++;
      else D++;
    });

    return {
      P,
      W,
      D,
      L,
      GF,
      GA,
      GD: GF - GA,
      PTS: (W * 3) + D
    };
  }

  function recordTable(title, record) {
    return `
      <div class="player-stat-box">
        <div class="player-stat-title">${title}</div>
        <p><strong>P:</strong> ${record.P}</p>
        <p><strong>W:</strong> ${record.W}</p>
        <p><strong>D:</strong> ${record.D}</p>
        <p><strong>L:</strong> ${record.L}</p>
        <p><strong>GF:</strong> ${record.GF}</p>
        <p><strong>GA:</strong> ${record.GA}</p>
        <p><strong>GD:</strong> ${record.GD}</p>
        <p><strong>Pts:</strong> ${record.PTS}</p>
      </div>
    `;
  }

  const competitiveMatches = teamMatches.filter(m => !isFriendly(m));
  const friendlyMatches = teamMatches.filter(m => isFriendly(m));

  const competitiveRecord = getRecord(competitiveMatches);
  const friendlyRecord = getRecord(friendlyMatches);
  const totalRecord = getRecord(teamMatches);

  function getPlayerStats(playerId, includeFriendlies = false) {
    const rows = appearances.filter(a => {
      if (String(a.player_id).trim() !== String(playerId).trim()) return false;
      if (String(a.team).trim() !== "t1") return false;

      const match = matches.find(m => String(m.id).trim() === String(a.match_id).trim());
      if (!isCountableMatch(match)) return false;
      if (!includeFriendlies && isFriendly(match)) return false;

      return true;
    });

    const starts = rows.filter(a => Number(a.is_starting) === 1).length;
    const subs = rows.filter(a => Number(a.is_starting) !== 1).length;
    const goals = rows.reduce((sum, a) => sum + Number(a.goals || 0), 0);

    return {
      starts,
      subs,
      apps: starts + subs,
      goals,
      appsDisplay: subs > 0 ? `${starts}+${subs}` : `${starts}`
    };
  }

  function renderTopAppearances(includeFriendlies) {
    const rows = players
      .map(p => {
        const stats = getPlayerStats(p.id, includeFriendlies);
        return {
          id: p.id,
          name: p.name,
          starts: stats.starts,
          subs: stats.subs,
          apps: stats.apps,
          appsDisplay: stats.appsDisplay,
          goals: stats.goals
        };
      })
      .filter(r => r.apps > 0)
      .sort((a, b) =>
        b.apps - a.apps ||
        b.starts - a.starts ||
        b.goals - a.goals ||
        a.name.localeCompare(b.name)
      )
      .slice(0, 50);

    const tbody = document.getElementById("topAppearancesTable");

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="3">No appearance data available.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map((row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td><a href="player.html?id=${row.id}">${row.name}</a></td>
        <td>${row.appsDisplay}</td>
      </tr>
    `).join("");
  }

  function renderTopGoalscorers(includeFriendlies) {
    const rows = players
      .map(p => {
        const stats = getPlayerStats(p.id, includeFriendlies);
        return {
          id: p.id,
          name: p.name,
          starts: stats.starts,
          subs: stats.subs,
          apps: stats.apps,
          goals: stats.goals
        };
      })
      .filter(r => r.goals > 0)
      .sort((a, b) =>
        b.goals - a.goals ||
        b.apps - a.apps ||
        a.name.localeCompare(b.name)
      )
      .slice(0, 50);

    const tbody = document.getElementById("topGoalsTable");

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="3">No goals data available.</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map((row, index) => `
      <tr>
        <td>${index + 1}</td>
        <td><a href="player.html?id=${row.id}">${row.name}</a></td>
        <td>${row.goals}</td>
      </tr>
    `).join("");
  }

  function renderSeasonSummary() {
    const tbody = document.getElementById("seasonSummaryTable");
    const grouped = {};

    teamMatches.forEach(m => {
      const sid = String(m.season_id || "").trim() || "unknown";
      if (!grouped[sid]) grouped[sid] = [];
      grouped[sid].push(m);
    });

    const rows = Object.entries(grouped)
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
      .map(([seasonId, matchList]) => {
        const record = getRecord(matchList);

        return `
          <tr>
            <td><a href="season.html?id=${seasonId}">${seasonName(seasonId)}</a></td>
            <td>${record.P}</td>
            <td>${record.W}</td>
            <td>${record.D}</td>
            <td>${record.L}</td>
            <td>${record.GF}</td>
            <td>${record.GA}</td>
            <td>${record.GD}</td>
            <td>${record.PTS}</td>
          </tr>
        `;
      }).join("");

    tbody.innerHTML = rows || `<tr><td colspan="9">No season records found.</td></tr>`;
  }

  function renderMatches() {
    const opponentFilter = document.getElementById("opponentFilter");
    const matchesWrap = document.getElementById("teamMatches");

    const selectedOpponent = opponentFilter ? opponentFilter.value : "";

    const filteredMatches = selectedOpponent
      ? teamMatches.filter(m => getOpponentId(m) === selectedOpponent)
      : teamMatches;

    const grouped = {};

    filteredMatches.forEach(m => {
      const sid = String(m.season_id || "").trim() || "unknown";
      if (!grouped[sid]) grouped[sid] = [];
      grouped[sid].push(m);
    });

    if (!filteredMatches.length) {
      matchesWrap.innerHTML = `<div>No matches found.</div>`;
      return;
    }

    matchesWrap.innerHTML = Object.entries(grouped)
      .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
      .map(([seasonId, seasonMatches]) => {
        seasonMatches.sort((a, b) => parseDate(a.date) - parseDate(b.date));

        return `
          <h4>${seasonName(seasonId)}</h4>
          <div class="match-list">
            ${seasonMatches.map(matchLine).join("")}
          </div>
        `;
      }).join("");
  }

  function opponentOptions() {
    const opponentIds = [...new Set(teamMatches.map(getOpponentId))]
      .filter(Boolean)
      .sort((a, b) => teamName(a).localeCompare(teamName(b)));

    return opponentIds.map(oppId => `
      <option value="${oppId}">${teamName(oppId)}</option>
    `).join("");
  }

  el.innerHTML = `
    <div class="content-box">
      <div class="team-header">
        <img class="team-badge-large" src="images/teams/${team.id}.png" alt="${team.name}" onerror="this.onerror=null;this.src='images/teams/defaultbadge.png';">
        <div class="team-header-text">
          <h2>${team.name}</h2>

          <div class="player-stats-grid">
            ${recordTable("Competitive Record", competitiveRecord)}
            ${recordTable("Friendly Record", friendlyRecord)}
            ${recordTable("Total Record", totalRecord)}
          </div>
        </div>
      </div>
    </div>

    <div class="content-box section-block">
      <h3>Season-by-Season Summary</h3>
      <table class="archive-table">
        <thead>
          <tr>
            <th>Season</th>
            <th>P</th>
            <th>W</th>
            <th>D</th>
            <th>L</th>
            <th>GF</th>
            <th>GA</th>
            <th>GD</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody id="seasonSummaryTable"></tbody>
      </table>
    </div>

    ${isMargatePage ? `
      <div class="content-box section-block">
        <h3>Top 50 Appearances</h3>

        <label class="stats-toggle">
          <input type="checkbox" id="includeFriendliesApps">
          Include friendlies
        </label>

        <table class="archive-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Apps</th>
            </tr>
          </thead>
          <tbody id="topAppearancesTable"></tbody>
        </table>
      </div>

      <div class="content-box section-block">
        <h3>Top 50 Goalscorers</h3>

        <label class="stats-toggle">
          <input type="checkbox" id="includeFriendliesGoals">
          Include friendlies
        </label>

        <table class="archive-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Player</th>
              <th>Goals</th>
            </tr>
          </thead>
          <tbody id="topGoalsTable"></tbody>
        </table>
      </div>
    ` : ""}

    <div class="content-box section-block">
      <h3>Matches</h3>

      <label for="opponentFilter"><strong>Filter by opponent:</strong></label>
      <select id="opponentFilter">
        <option value="">All opponents</option>
        ${opponentOptions()}
      </select>

      <div id="teamMatches"></div>
    </div>
  `;

  renderSeasonSummary();
  renderMatches();

  const opponentFilter = document.getElementById("opponentFilter");
  if (opponentFilter) {
    opponentFilter.addEventListener("change", renderMatches);
  }

  if (isMargatePage) {
    const appsToggle = document.getElementById("includeFriendliesApps");
    const goalsToggle = document.getElementById("includeFriendliesGoals");

    renderTopAppearances(false);
    renderTopGoalscorers(false);

    appsToggle.addEventListener("change", () => {
      renderTopAppearances(appsToggle.checked);
    });

    goalsToggle.addEventListener("change", () => {
      renderTopGoalscorers(goalsToggle.checked);
    });
  }

}).catch(err => {
  document.getElementById("teamPage").innerHTML =
    `<div class="content-box"><p>Error loading team page: ${err.message}</p></div>`;
  console.error(err);
});