const params = new URLSearchParams(window.location.search);
const seasonId = params.get("id");

Promise.all([
  fetch("data/matches.json").then(r => r.json()),
  fetch("data/teams.json").then(r => r.json()),
  fetch("data/seasons.json").then(r => r.json()),
  fetch("data/appearances.json").then(r => r.json()),
  fetch("data/players.json").then(r => r.json()),
  fetch("data/managers.json").then(r => r.json()).catch(() => [])
]).then(([matches, teams, seasons, appearances, players, managers]) => {
  const season = seasons.find(s => String(s.id).trim() === String(seasonId).trim());

  const titleEl = document.getElementById("seasonTitle");
  const tableBody = document.getElementById("tableBody");
  const matchesEl = document.getElementById("matches");
  const appearancesEl = document.getElementById("appearances");
  const seasonManagersTable = document.getElementById("seasonManagersTable");
  const managerHeading = document.getElementById("managerHeading");
  const overallRecordTable = document.getElementById("overallRecordTable");

  const competitiveOnlyMatches = document.getElementById("competitiveOnlyMatches");
  const friendlyOnlyMatches = document.getElementById("friendlyOnlyMatches");
  const excludeUnknownResults = document.getElementById("excludeUnknownResults");
  const excludeUnknownResultsLabel = document.getElementById("excludeUnknownResultsLabel");
  const excludeAbandonedGames = document.getElementById("excludeAbandonedGames");
  const excludeAbandonedGamesLabel = document.getElementById("excludeAbandonedGamesLabel");

  if (!season) {
    titleEl.textContent = "Season not found";
    return;
  }

  const friendlyOnlySeason = String(season.name).trim() === "1896/97";

  function isAbandoned(match) {
    return String(match.abandoned || "").trim().toUpperCase() === "Y";
  }

  function hasUnknownResult(match) {
    return (
      match.home_score === "?" ||
      match.away_score === "?" ||
      Number.isNaN(Number(match.home_score)) ||
      Number.isNaN(Number(match.away_score))
    );
  }

  function isCountableMatch(match) {
    return match && !isAbandoned(match) && !hasUnknownResult(match);
  }

  function isFriendly(match) {
    const comp = String(match.competition || "").trim().toLowerCase();
    return comp === "friendly" || comp === "friendlies" || comp === "fr" || comp.includes("friendly");
  }

  function parseUkDate(value) {
    if (!value) return null;
    const cleaned = String(value).trim().replace(/-/g, "/").replace(/\./g, "/");
    const parts = cleaned.split("/");
    if (parts.length !== 3) return null;

    let [d, m, y] = parts.map(x => x.trim());
    if (!d || !m || !y) return null;

    if (y.length === 2) y = Number(y) >= 50 ? `18${y}` : `19${y}`;

    const dt = new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  function slugifyCompetition(name) {
    return String(name || "")
      .toLowerCase()
      .trim()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function competitionBadgeHtml(competition, size = "18") {
    if (!competition || String(competition).trim() === "") return "";
    const slug = slugifyCompetition(competition);

    return `
      <img
        src="images/competitions/${slug}.png"
        alt="${competition}"
        title="${competition}"
        style="width:${size}px;height:${size}px;object-fit:contain;vertical-align:middle;"
        onerror="this.style.display='none'"
      >
    `;
  }

  function resolveTeam(teamValue) {
    return teams.find(t =>
      String(t.id).trim() === String(teamValue).trim() ||
      String(t.name).trim() === String(teamValue).trim()
    );
  }

  function teamName(teamValue) {
    const team = resolveTeam(teamValue);
    return team ? team.name : teamValue;
  }

  function teamLink(teamValue) {
    const team = resolveTeam(teamValue);
    if (!team) return teamName(teamValue);

    return `
      <span class="team-inline">
        <img
          class="team-badge-small"
          src="images/teams/${team.id}.png"
          alt=""
          onerror="this.onerror=null;this.src='images/teams/defaultbadge.png';"
        >
        <a href="team.html?id=${encodeURIComponent(team.id)}">${team.name}</a>
      </span>
    `;
  }

  function playerName(playerId) {
    const p = players.find(x => String(x.id).trim() === String(playerId).trim());
    return p ? p.name : playerId;
  }

  function formatApps(starts, subs) {
    return subs > 0 ? `${starts}+${subs}` : `${starts}`;
  }

  function formatManager(manager) {
    if (!manager) return "Unknown";
    if (manager.id) return `<a href="manager.html?id=${manager.id}">${manager.name || manager.id}</a>`;
    return manager.name || "Unknown";
  }

  const seasonMatches = matches.filter(m =>
    String(m.season_id).trim() === String(seasonId).trim()
  );

  const countableSeasonMatches = seasonMatches.filter(isCountableMatch);

  titleEl.textContent = `${season.name} ${teamName("t1")}`;

  const leagueMatches = countableSeasonMatches.filter(m =>
    !m.competition ||
    String(m.competition).trim().toLowerCase() === "league"
  );

  const seasonHasUnknownResults = seasonMatches.some(hasUnknownResult);
  const seasonHasAbandonedGames = seasonMatches.some(isAbandoned);

  if (excludeUnknownResultsLabel && seasonHasUnknownResults) {
    excludeUnknownResultsLabel.style.display = "inline-flex";
  }

  if (excludeAbandonedGamesLabel && seasonHasAbandonedGames) {
    excludeAbandonedGamesLabel.style.display = "inline-flex";
  }

  function buildOverallRecord(matchList) {
    let P = 0, W = 0, D = 0, L = 0, GF = 0, GA = 0;

    matchList.forEach(m => {
      const isHome = String(m.home_team).trim() === "t1";
      const goalsFor = isHome ? Number(m.home_score) : Number(m.away_score);
      const goalsAgainst = isHome ? Number(m.away_score) : Number(m.home_score);

      P++;
      GF += goalsFor;
      GA += goalsAgainst;

      if (goalsFor > goalsAgainst) W++;
      else if (goalsFor < goalsAgainst) L++;
      else D++;
    });

    return { P, W, D, L, GF, GA, GD: GF - GA };
  }

  function recordRow(label, record) {
    return `
      <tr>
        <td>${label}</td>
        <td>${record.P}</td>
        <td>${record.W}</td>
        <td>${record.D}</td>
        <td>${record.L}</td>
        <td>${record.GF}</td>
        <td>${record.GA}</td>
        <td>${record.GD}</td>
      </tr>
    `;
  }

  function renderOverallRecord(matchList) {
    if (!overallRecordTable) return;

    const competitive = buildOverallRecord(matchList.filter(m => !isFriendly(m)));
    const friendly = buildOverallRecord(matchList.filter(m => isFriendly(m)));
    const overall = buildOverallRecord(matchList);

    overallRecordTable.innerHTML = `
      ${recordRow("Competitive Record", competitive)}
      ${recordRow("Friendly Record", friendly)}
      ${recordRow("Overall Record", overall)}
    `;
  }

  function buildTable(matchList) {
    const table = {};

    matchList.forEach(m => {
      const home = String(m.home_team).trim();
      const away = String(m.away_team).trim();

      const hs = Number(m.home_score || 0);
      const as = Number(m.away_score || 0);

      if (!table[home]) table[home] = { teamId: home, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, PTS: 0 };
      if (!table[away]) table[away] = { teamId: away, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, PTS: 0 };

      table[home].P++;
      table[away].P++;

      table[home].GF += hs;
      table[home].GA += as;

      table[away].GF += as;
      table[away].GA += hs;

      if (hs > as) {
        table[home].W++;
        table[away].L++;
        table[home].PTS += 3;
      } else if (as > hs) {
        table[away].W++;
        table[home].L++;
        table[away].PTS += 3;
      } else {
        table[home].D++;
        table[away].D++;
        table[home].PTS++;
        table[away].PTS++;
      }

      table[home].GD = table[home].GF - table[home].GA;
      table[away].GD = table[away].GF - table[away].GA;
    });

    return Object.values(table).sort((a, b) =>
      b.PTS - a.PTS ||
      b.GD - a.GD ||
      b.GF - a.GF ||
      teamName(a.teamId).localeCompare(teamName(b.teamId))
    );
  }

  function renderTable(rows) {
    if (!tableBody) return;

    tableBody.innerHTML = "";

    if (!rows.length) {
      tableBody.innerHTML = `<tr><td colspan="10">No league matches found for this season.</td></tr>`;
      return;
    }

    rows.forEach((row, i) => {
      tableBody.innerHTML += `
        <tr ${i === 0 ? 'class="top-row"' : ""}>
          <td>${i + 1}</td>
          <td>${teamLink(row.teamId)}</td>
          <td>${row.P}</td>
          <td>${row.W}</td>
          <td>${row.D}</td>
          <td>${row.L}</td>
          <td>${row.GF}</td>
          <td>${row.GA}</td>
          <td>${row.GD}</td>
          <td><strong>${row.PTS}</strong></td>
        </tr>
      `;
    });
  }

  function renderMatches() {
    if (!matchesEl) return;

    matchesEl.innerHTML = "";

    let shownMatches = [...seasonMatches];

    if (competitiveOnlyMatches && competitiveOnlyMatches.checked) {
      shownMatches = shownMatches.filter(m => !isFriendly(m));
    }

    if (friendlyOnlyMatches && friendlyOnlyMatches.checked) {
      shownMatches = shownMatches.filter(m => isFriendly(m));
    }

    if (excludeUnknownResults && excludeUnknownResults.checked) {
      shownMatches = shownMatches.filter(m => !hasUnknownResult(m));
    }

    if (excludeAbandonedGames && excludeAbandonedGames.checked) {
      shownMatches = shownMatches.filter(m => !isAbandoned(m));
    }

    const sorted = shownMatches.sort((a, b) => {
      const da = parseUkDate(a.date);
      const db = parseUkDate(b.date);
      return da - db;
    });

    if (!sorted.length) {
      matchesEl.innerHTML = `<div>No matches found.</div>`;
      return;
    }

    sorted.forEach((m, index) => {
      const matchNumber = `#${String(index + 1).padStart(3, "0")}`;
      const home = resolveTeam(m.home_team);
      const away = resolveTeam(m.away_team);

      matchesEl.innerHTML += `
        <div class="match-row">
          <div class="match-scoreline" style="display:block;">
            <a href="match.html?id=${m.id}" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <strong>${matchNumber}</strong>
              <span>${m.date}</span>

              <span class="team-inline">
                <img class="team-badge-small"
                     src="images/teams/${home ? home.id : m.home_team}.png"
                     alt=""
                     onerror="this.onerror=null;this.src='images/teams/defaultbadge.png';">
                <span>${teamName(m.home_team)}</span>
              </span>

              <span class="score-separator">${m.home_score}-${m.away_score}</span>

              <span class="team-inline">
                <img class="team-badge-small"
                     src="images/teams/${away ? away.id : m.away_team}.png"
                     alt=""
                     onerror="this.onerror=null;this.src='images/teams/defaultbadge.png';">
                <span>${teamName(m.away_team)}</span>
              </span>

              <span class="match-meta">
                ${competitionBadgeHtml(m.competition)}
                ${m.competition || ""}
                ${isAbandoned(m) ? " - Abandoned" : ""}
              </span>
            </a>
          </div>
        </div>
      `;
    });
  }

  function getSeasonStatsMode() {
    const selected = document.querySelector('input[name="seasonStatsFilter"]:checked');
    return selected ? selected.value : "competitive";
  }

  function matchIdsForStatsMode() {
    const mode = getSeasonStatsMode();

    return new Set(
      countableSeasonMatches
        .filter(m => {
          if (mode === "competitive") return !isFriendly(m);
          if (mode === "friendly") return isFriendly(m);
          return true;
        })
        .map(m => String(m.id).trim())
    );
  }

  function splitIntoColumns(rows, columnCount, maxPerColumn) {
    const limited = rows.slice(0, columnCount * maxPerColumn);
    const columns = [];

    for (let i = 0; i < columnCount; i++) {
      columns.push(limited.slice(i * maxPerColumn, (i + 1) * maxPerColumn));
    }

    return columns;
  }

  function addRanks(rows, valueKey) {
    let lastValue = null;
    let lastRank = 0;

    return rows.map((row, index) => {
      if (row[valueKey] !== lastValue) {
        lastRank = index + 1;
        lastValue = row[valueKey];
      }

      return { ...row, rank: lastRank };
    });
  }

  function renderSeasonStats() {
    const ids = matchIdsForStatsMode();
    const appearancesOnly = document.getElementById("appearancesOnly");
    const goalscorersOnly = document.getElementById("goalscorersOnly");

    const showAppsOnly = appearancesOnly && appearancesOnly.checked;
    const showGoalsOnly = goalscorersOnly && goalscorersOnly.checked;

    const map = {};

    appearances.forEach(a => {
      const matchId = String(a.match_id).trim();
      if (!ids.has(matchId)) return;
      if (String(a.team || "").trim() !== "t1") return;

      const playerId = String(a.player_id).trim();

      if (!map[playerId]) {
        map[playerId] = { starts: 0, subs: 0, goals: 0 };
      }

      if (Number(a.is_starting) === 1) map[playerId].starts++;
      else map[playerId].subs++;

      map[playerId].goals += Number(a.goals || 0);
    });

    let rows = Object.entries(map)
      .map(([playerId, s]) => ({
        playerId,
        name: playerName(playerId),
        starts: s.starts,
        subs: s.subs,
        apps: s.starts + s.subs,
        appsDisplay: formatApps(s.starts, s.subs),
        goals: s.goals
      }))
      .filter(r => r.apps > 0);

    if (showGoalsOnly) {
      rows = rows.filter(r => r.goals > 0);
    }

    rows.sort((a, b) => {
      if (showGoalsOnly) {
        return b.goals - a.goals || b.apps - a.apps || a.name.localeCompare(b.name);
      }

      return b.apps - a.apps || b.starts - a.starts || b.goals - a.goals || a.name.localeCompare(b.name);
    });

    const rankedRows = addRanks(rows, showGoalsOnly ? "goals" : "apps");
    const columns = splitIntoColumns(rankedRows, 3, 20);

    const statsHeading = Array.from(document.querySelectorAll(".content-box h3")).find(el => el.textContent.includes("Appearances"));
    if (statsHeading) {
      const usedCount = rankedRows.length;
      statsHeading.innerHTML = `Appearances &amp; Goalscorers (${usedCount} player${usedCount === 1 ? "" : "s"} used)`;
    }

    if (!rankedRows.length) {
      appearancesEl.innerHTML = `<div>No records found.</div>`;
      return;
    }

    appearancesEl.innerHTML = columns
      .filter(column => column.length > 0)
      .map(column => `
        <div class="season-stats-column">
          <div class="season-stats-row season-stats-header">
            <span>Rank</span>
            <span>Player</span>
            <span>App</span>
            <span>Gls</span>
          </div>

          ${column.map(row => `
            <div class="season-stats-row">
              <span>${row.rank}.</span>
              <span><a href="player.html?id=${row.playerId}">${row.name}</a></span>
              <span>${showGoalsOnly ? "" : row.appsDisplay}</span>
              <span>${showAppsOnly ? "" : row.goals}</span>
            </div>
          `).join("")}
        </div>
      `).join("");
  }

  function renderManagers() {
    const t1Matches = seasonMatches
      .filter(m => String(m.home_team).trim() === "t1" || String(m.away_team).trim() === "t1")
      .sort((a, b) => parseUkDate(a.date) - parseUkDate(b.date));

    const managerMap = new Map();

    t1Matches.forEach(m => {
      const managerId =
        String(m.home_team).trim() === "t1"
          ? String(m.home_manager_id || "").trim()
          : String(m.away_manager_id || "").trim();

      if (!managerId) return;

      const existing = managerMap.get(managerId);

      if (existing) {
        existing.matches.push(m);
      } else {
        const manager = managers.find(x => String(x.id).trim() === managerId);
        managerMap.set(managerId, {
          manager: manager || { id: managerId, name: managerId },
          matches: [m]
        });
      }
    });

    const managerRows = Array.from(managerMap.values())
      .map(entry => {
        const sortedMatches = [...entry.matches].sort((a, b) => parseUkDate(a.date) - parseUkDate(b.date));
        const firstDate = sortedMatches[0]?.date || "";
        const lastDate = sortedMatches[sortedMatches.length - 1]?.date || "";
        const firstDateSort = parseUkDate(firstDate);

        return { manager: entry.manager, firstDate, lastDate, firstDateSort };
      })
      .sort((a, b) => {
        const da = a.firstDateSort ? a.firstDateSort.getTime() : Infinity;
        const db = b.firstDateSort ? b.firstDateSort.getTime() : Infinity;
        return da - db;
      });

    managerHeading.textContent = managerRows.length > 1 ? "Managers" : "Manager";

    if (!managerRows.length) {
      seasonManagersTable.innerHTML = `<tr><td>Unknown</td><td>Unknown</td></tr>`;
      return;
    }

    seasonManagersTable.innerHTML = managerRows.map(row => `
      <tr>
        <td>${formatManager(row.manager)}</td>
        <td>${managerRows.length === 1 ? "All matches" : `${row.firstDate} to ${row.lastDate}`}</td>
      </tr>
    `).join("");
  }

  if (friendlyOnlySeason) {
    const friendlyRadio = document.querySelector('input[name="seasonStatsFilter"][value="friendly"]');
    if (friendlyRadio) friendlyRadio.checked = true;
  }

  renderManagers();
  renderOverallRecord(countableSeasonMatches);
  renderTable(buildTable(leagueMatches));
  renderMatches();
  renderSeasonStats();

  if (competitiveOnlyMatches) {
    competitiveOnlyMatches.addEventListener("change", () => {
      if (competitiveOnlyMatches.checked && friendlyOnlyMatches) friendlyOnlyMatches.checked = false;
      renderMatches();
    });
  }

  if (friendlyOnlyMatches) {
    friendlyOnlyMatches.addEventListener("change", () => {
      if (friendlyOnlyMatches.checked && competitiveOnlyMatches) competitiveOnlyMatches.checked = false;
      renderMatches();
    });
  }

  if (excludeUnknownResults) excludeUnknownResults.addEventListener("change", renderMatches);
  if (excludeAbandonedGames) excludeAbandonedGames.addEventListener("change", renderMatches);

  document.querySelectorAll('input[name="seasonStatsFilter"]').forEach(input => {
    input.addEventListener("change", renderSeasonStats);
  });

  const appearancesOnly = document.getElementById("appearancesOnly");
  const goalscorersOnly = document.getElementById("goalscorersOnly");

  if (appearancesOnly) {
    appearancesOnly.addEventListener("change", () => {
      if (appearancesOnly.checked && goalscorersOnly) goalscorersOnly.checked = false;
      renderSeasonStats();
    });
  }

  if (goalscorersOnly) {
    goalscorersOnly.addEventListener("change", () => {
      if (goalscorersOnly.checked && appearancesOnly) appearancesOnly.checked = false;
      renderSeasonStats();
    });
  }

}).catch(err => {
  const titleEl = document.getElementById("seasonTitle");
  if (titleEl) titleEl.textContent = "Error loading season";
  console.error(err);
});
