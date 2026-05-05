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
  const seasonTopNav = document.getElementById("seasonTopNav");
  const seasonBottomNav = document.getElementById("seasonBottomNav");
  const seasonCompetitionFilter = document.getElementById("seasonCompetitionFilter");

  const recordAllGames = document.getElementById("recordAllGames");
  const recordHomeGamesOnly = document.getElementById("recordHomeGamesOnly");
  const recordAwayGamesOnly = document.getElementById("recordAwayGamesOnly");

  const allGamesMatches = document.getElementById("allGamesMatches");
  const homeGamesOnlyMatches = document.getElementById("homeGamesOnlyMatches");
  const awayGamesOnlyMatches = document.getElementById("awayGamesOnlyMatches");

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

  const seasonStyle = document.createElement("style");
  seasonStyle.textContent = `
    .season-matches-wide {
      width: 120%;
      max-width: 120%;
      margin-left: -10%;
    }

    .season-matches-table {
      width: 100%;
      table-layout: auto;
    }

    .season-matches-table th,
    .season-matches-table td {
      vertical-align: middle;
      white-space: nowrap;
    }

    .season-matches-table th:nth-child(1),
    .season-matches-table td:nth-child(1),
    .season-matches-table th:nth-child(2),
    .season-matches-table td:nth-child(2) {
      width: 1%;
      white-space: nowrap;
    }

    .season-matches-table th:nth-child(5),
    .season-matches-table td:nth-child(5) {
      white-space: normal;
      text-align: left;
    }

    .season-match-number {
      font-weight: normal;
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
    }

    .season-match-scorers {
      text-align: left !important;
    }

    .season-result-link {
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

    .season-match-competition img {
      margin-right: 4px;
    }

    .season-matches-heading {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .season-matches-heading h2 {
      margin: 0;
    }

    .season-matches-heading select {
      margin-bottom: 0;
    }


    .season-matches-table tbody tr.season-result-win td {
      background: #e7f4e4 !important;
    }

    .season-matches-table tbody tr.season-result-defeat td {
      background: #f8e3e3 !important;
    }

    .season-matches-table tbody tr.season-result-draw td {
      background: #f6edd2 !important;
    }

    .season-matches-table tbody tr.season-result-win:hover td {
      background: #d9ecd5 !important;
    }

    .season-matches-table tbody tr.season-result-defeat:hover td {
      background: #f1d4d4 !important;
    }

    .season-matches-table tbody tr.season-result-draw:hover td {
      background: #efe0b9 !important;
    }

    @media (max-width: 900px) {
      .season-matches-wide {
        width: 100%;
        max-width: 100%;
        margin-left: 0;
      }

      .season-matches-table th,
      .season-matches-table td {
        white-space: normal;
      }

      .season-result-link {
        grid-template-columns: 1fr;
        row-gap: 4px;
      }

      .season-result-home,
      .season-result-away {
        justify-content: flex-start;
        text-align: left;
      }

      .season-result-score {
        text-align: left;
      }
    }
  `;
  document.head.appendChild(seasonStyle);

  const friendlyOnlySeason = String(season.name).trim() === "1896/97";

  const sortedSeasons = [...seasons].sort((a, b) =>
    Number(a.start_year || 0) - Number(b.start_year || 0) ||
    Number(a.end_year || 0) - Number(b.end_year || 0) ||
    String(a.name || "").localeCompare(String(b.name || ""))
  );

  const seasonIndex = sortedSeasons.findIndex(s => String(s.id).trim() === String(season.id).trim());
  const previousSeason = seasonIndex > 0 ? sortedSeasons[seasonIndex - 1] : null;
  const nextSeason = seasonIndex >= 0 && seasonIndex < sortedSeasons.length - 1 ? sortedSeasons[seasonIndex + 1] : null;

  function seasonNavHtml() {
    return `
      <div class="match-nav">
        <div class="match-nav-left">
          ${previousSeason ? `<a href="season.html?id=${previousSeason.id}">← Previous</a>` : ``}
        </div>
        <div class="match-nav-right">
          ${nextSeason ? `<a href="season.html?id=${nextSeason.id}">Next →</a>` : ``}
        </div>
      </div>
    `;
  }

  function renderSeasonNav() {
    const html = seasonNavHtml();
    if (seasonTopNav) seasonTopNav.innerHTML = html;
    if (seasonBottomNav) seasonBottomNav.innerHTML = html;
  }

  function competitionValue(match) {
    return String(match.competition || "Unknown").trim() || "Unknown";
  }

  function populateCompetitionFilter() {
    if (!seasonCompetitionFilter) return;

    const currentValue = seasonCompetitionFilter.value || "all";
    const competitions = Array.from(new Set(seasonMatches.map(competitionValue)))
      .sort((a, b) => a.localeCompare(b));

    seasonCompetitionFilter.innerHTML = `
      <option value="all">All Competitions</option>
      ${competitions.map(comp => `<option value="${String(comp).replace(/"/g, "&quot;")}">${comp}</option>`).join("")}
    `;

    if (competitions.includes(currentValue)) {
      seasonCompetitionFilter.value = currentValue;
    }
  }

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

  function isT1Home(match) {
    return String(match.home_team).trim() === "t1";
  }

  function isT1Away(match) {
    return String(match.away_team).trim() === "t1";
  }

  function filterByHomeAway(matchList, homeOnlyBox, awayOnlyBox) {
    if (homeOnlyBox && homeOnlyBox.checked) {
      return matchList.filter(isT1Home);
    }

    if (awayOnlyBox && awayOnlyBox.checked) {
      return matchList.filter(isT1Away);
    }

    return matchList;
  }

  function setupGameTickboxes(allBox, homeBox, awayBox, onChange) {
    if (!allBox || !homeBox || !awayBox) return;

    allBox.addEventListener("change", () => {
      if (allBox.checked) {
        homeBox.checked = false;
        awayBox.checked = false;
      } else if (!homeBox.checked && !awayBox.checked) {
        allBox.checked = true;
      }

      onChange();
    });

    homeBox.addEventListener("change", () => {
      if (homeBox.checked) {
        allBox.checked = false;
        awayBox.checked = false;
      } else if (!awayBox.checked) {
        allBox.checked = true;
      }

      onChange();
    });

    awayBox.addEventListener("change", () => {
      if (awayBox.checked) {
        allBox.checked = false;
        homeBox.checked = false;
      } else if (!homeBox.checked) {
        allBox.checked = true;
      }

      onChange();
    });
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

    const filteredMatchList = filterByHomeAway(matchList, recordHomeGamesOnly, recordAwayGamesOnly);

    const competitive = buildOverallRecord(filteredMatchList.filter(m => !isFriendly(m)));
    const friendly = buildOverallRecord(filteredMatchList.filter(m => isFriendly(m)));
    const overall = buildOverallRecord(filteredMatchList);

    overallRecordTable.innerHTML = `
      ${recordRow("Competitive Record", competitive)}
      ${recordRow("Friendly Record", friendly)}
      ${recordRow("Match Record", overall)}
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


  function shortScorerName(playerId, allIds) {
    const p = players.find(x => String(x.id).trim() === String(playerId).trim());
    if (!p) return playerId;

    const parts = String(p.name || "").trim().split(/\s+/);
    const last = parts.pop() || p.name;
    const first = parts.join(" ");

    const sameSurname = allIds
      .map(pid => players.find(x => String(x.id).trim() === String(pid).trim()))
      .filter(Boolean)
      .filter(x => {
        const bits = String(x.name || "").trim().split(/\s+/);
        const xLast = bits.pop() || "";
        return xLast.toLowerCase() === last.toLowerCase();
      });

    return sameSurname.length > 1 && first ? `${first.charAt(0)}.${last}` : last;
  }

  function joinScorerNames(items) {
    if (items.length === 0) return "";
    if (items.length === 1) return items[0];
    if (items.length === 2) return `${items[0]} & ${items[1]}`;
    return `${items.slice(0, -1).join(", ")} & ${items[items.length - 1]}`;
  }

  function margateGoalsFor(match) {
    if (String(match.home_team).trim() === "t1") return Number(match.home_score);
    if (String(match.away_team).trim() === "t1") return Number(match.away_score);
    return 0;
  }

  function matchScorersText(match) {
    const margateScore = margateGoalsFor(match);
    if (Number.isNaN(margateScore) || margateScore <= 0) return "";

    const teamApps = appearances.filter(a =>
      String(a.match_id).trim() === String(match.id).trim() &&
      String(a.team || "").trim() === "t1"
    );

    const allIds = teamApps.map(a => a.player_id);

    const rows = teamApps
      .filter(a => Number(a.goals || 0) > 0)
      .map(a => ({
        name: shortScorerName(a.player_id, allIds),
        surname: shortScorerName(a.player_id, allIds).replace(/^.*\./, ""),
        goals: Number(a.goals || 0),
        unknown: false
      }));

    const knownGoals = rows.reduce((sum, r) => sum + r.goals, 0);
    const unknownGoals = margateScore - knownGoals;

    if (unknownGoals > 0) {
      rows.push({
        name: "Unknown",
        surname: "Unknown",
        goals: unknownGoals,
        unknown: true
      });
    }

    rows.sort((a, b) => {
      if (a.unknown && !b.unknown) return 1;
      if (!a.unknown && b.unknown) return -1;
      return (
        b.goals - a.goals ||
        a.surname.localeCompare(b.surname) ||
        a.name.localeCompare(b.name)
      );
    });

    const out = rows.map(r => r.goals > 1 ? `${r.name} (${r.goals})` : r.name);
    return joinScorerNames(out);
  }

  function resultHtml(match) {
    const home = resolveTeam(match.home_team);
    const away = resolveTeam(match.away_team);

    return `
      <a href="match.html?id=${match.id}" class="season-result-link">
        <span class="season-result-team season-result-home">
          <span>${teamName(match.home_team)}</span>
          <img class="team-badge-small"
               src="images/teams/${home ? home.id : match.home_team}.png"
               alt=""
               onerror="this.onerror=null;this.src='images/teams/defaultbadge.png';">
        </span>

        <span class="season-result-score">${match.home_score} - ${match.away_score}</span>

        <span class="season-result-team season-result-away">
          <img class="team-badge-small"
               src="images/teams/${away ? away.id : match.away_team}.png"
               alt=""
               onerror="this.onerror=null;this.src='images/teams/defaultbadge.png';">
          <span>${teamName(match.away_team)}</span>
        </span>
      </a>
    `;
  }

  function matchSortDate(match) {
    const note = String(match.notes || "").toLowerCase();
    if (note.includes("date of match unknown")) {
      return new Date(9999, 11, 31);
    }

    const d = parseUkDate(match.date);
    return d || new Date(9999, 11, 30);
  }



  function margateResultClass(match) {
    if (!isCountableMatch(match)) return "";

    const homeScore = Number(match.home_score);
    const awayScore = Number(match.away_score);
    const margateHome = String(match.home_team).trim() === "t1";
    const margateAway = String(match.away_team).trim() === "t1";

    if (!margateHome && !margateAway) return "";

    const margateScore = margateHome ? homeScore : awayScore;
    const opponentScore = margateHome ? awayScore : homeScore;

    if (margateScore > opponentScore) return "season-result-win";
    if (margateScore < opponentScore) return "season-result-defeat";
    return "season-result-draw";
  }

  function renderMatches() {
    if (!matchesEl) return;

    matchesEl.innerHTML = "";

    let shownMatches = [...seasonMatches];

    shownMatches = filterByHomeAway(shownMatches, homeGamesOnlyMatches, awayGamesOnlyMatches);

    if (competitiveOnlyMatches && competitiveOnlyMatches.checked) {
      shownMatches = shownMatches.filter(m => !isFriendly(m));
    }

    if (friendlyOnlyMatches && friendlyOnlyMatches.checked) {
      shownMatches = shownMatches.filter(m => isFriendly(m));
    }

    if (seasonCompetitionFilter && seasonCompetitionFilter.value !== "all") {
      shownMatches = shownMatches.filter(m => competitionValue(m) === seasonCompetitionFilter.value);
    }

    if (excludeUnknownResults && excludeUnknownResults.checked) {
      shownMatches = shownMatches.filter(m => !hasUnknownResult(m));
    }

    if (excludeAbandonedGames && excludeAbandonedGames.checked) {
      shownMatches = shownMatches.filter(m => !isAbandoned(m));
    }

    const sorted = shownMatches.sort((a, b) => matchSortDate(a) - matchSortDate(b));

    if (!sorted.length) {
      matchesEl.innerHTML = `<div>No matches found.</div>`;
      return;
    }

    matchesEl.innerHTML = `
      <table class="archive-table season-matches-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Competition</th>
            <th>Result</th>
            <th>Goalscorers</th>
            <th>Att</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map((m, index) => {
            const matchNumber = `#${String(index + 1).padStart(3, "0")}`;
            const abandonedText = isAbandoned(m) ? " - Abandoned" : "";
            const comp = `${competitionBadgeHtml(m.competition)} ${m.competition || ""}${m.round ? ` - ${m.round}` : ""}${abandonedText}`;
            const scorers = matchScorersText(m);

            const resultClass = margateResultClass(m);

            return `
              <tr class="${resultClass}">
                <td class="season-match-number">${matchNumber}</td>
                <td>${m.date || ""}</td>
                <td class="season-match-competition">${comp}</td>
                <td>${resultHtml(m)}</td>
                <td class="season-match-scorers">${scorers || ""}</td>
                <td>${m.attendance || ""}</td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;
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

    const usedCount = rankedRows.length;
    const statsPlayerCount = document.getElementById("seasonStatsPlayerCount");
    const statsHeading = document.getElementById("seasonStatsHeading");

    if (statsPlayerCount) {
      statsPlayerCount.textContent =
        `(${usedCount} player${usedCount === 1 ? "" : "s"} used)`;
    } else if (statsHeading) {
      statsHeading.textContent =
        `Appearances & Goalscorers (${usedCount} player${usedCount === 1 ? "" : "s"} used)`;
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

  renderSeasonNav();
  populateCompetitionFilter();

  renderManagers();
  renderOverallRecord(countableSeasonMatches);
  renderTable(buildTable(leagueMatches));
  renderMatches();
  renderSeasonStats();

  setupGameTickboxes(recordAllGames, recordHomeGamesOnly, recordAwayGamesOnly, () => {
    renderOverallRecord(countableSeasonMatches);
  });

  setupGameTickboxes(allGamesMatches, homeGamesOnlyMatches, awayGamesOnlyMatches, renderMatches);

  if (seasonCompetitionFilter) {
    seasonCompetitionFilter.addEventListener("change", renderMatches);
  }

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
