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

  const mainTeamId = String(id).trim();
  const isMargatePage = mainTeamId === "t1";

  let includedTeamIds = [mainTeamId];

  function normalise(value) {
    return String(value || "").trim();
  }

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
    const comp = normalise(match.competition).toLowerCase();
    return comp === "friendly" || comp === "fr" || comp === "friendlies";
  }

  function seasonName(seasonId) {
    const season = seasons.find(s => normalise(s.id) === normalise(seasonId));
    return season ? season.name : seasonId;
  }

  function teamName(teamId) {
    const t = teams.find(x => normalise(x.id) === normalise(teamId));
    return t ? t.name : teamId;
  }

  function playerName(playerId) {
    const p = players.find(x => normalise(x.id) === normalise(playerId));
    return p ? p.name : playerId;
  }

  function teamBadgeHtml(teamId, sizeClass = "team-badge-small") {
    return `<img class="${sizeClass}" src="images/teams/${teamId}.png" alt="" onerror="this.onerror=null;this.src='images/teams/defaultbadge.png';">`;
  }

  function parseDate(value) {
    if (!value) return null;
    const parts = normalise(value).replace(/\./g, "/").replace(/-/g, "/").split("/");
    if (parts.length !== 3) return null;

    let [dd, mm, yyyy] = parts;
    if (yyyy.length === 2) yyyy = Number(yyyy) >= 50 ? `18${yyyy}` : `19${yyyy}`;

    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function teamIsIncluded(teamId) {
    return includedTeamIds.includes(normalise(teamId));
  }

  function matchInScope(match) {
    if (!isCountableMatch(match)) return false;

    const home = normalise(match.home_team);
    const away = normalise(match.away_team);

    if (isMargatePage) {
      return teamIsIncluded(home) || teamIsIncluded(away);
    }

    return (
      (home === "t1" && teamIsIncluded(away)) ||
      (away === "t1" && teamIsIncluded(home))
    );
  }

  function getOpponentId(match) {
    const home = normalise(match.home_team);
    const away = normalise(match.away_team);

    if (isMargatePage) {
      if (teamIsIncluded(home)) return away;
      return home;
    }

    if (home === "t1") return away;
    if (away === "t1") return home;
    if (teamIsIncluded(home)) return away;
    return home;
  }

  function getDisplayTeamIds() {
    return [...includedTeamIds];
  }

  function getTeamMatches() {
    return matches.filter(matchInScope);
  }

  function getGoalsForAgainst(match) {
    const home = normalise(match.home_team);
    const away = normalise(match.away_team);

    if (isMargatePage) {
      const includedHome = teamIsIncluded(home);
      const includedAway = teamIsIncluded(away);

      if (includedHome && !includedAway) {
        return {
          goalsFor: Number(match.home_score || 0),
          goalsAgainst: Number(match.away_score || 0)
        };
      }

      if (includedAway && !includedHome) {
        return {
          goalsFor: Number(match.away_score || 0),
          goalsAgainst: Number(match.home_score || 0)
        };
      }
    }

    const margateHome = home === "t1";
    return {
      goalsFor: margateHome ? Number(match.home_score || 0) : Number(match.away_score || 0),
      goalsAgainst: margateHome ? Number(match.away_score || 0) : Number(match.home_score || 0)
    };
  }

  function getRecord(matchList) {
    let P = 0;
    let W = 0;
    let D = 0;
    let L = 0;
    let GF = 0;
    let GA = 0;

    matchList.forEach(m => {
      const result = getGoalsForAgainst(m);
      const goalsFor = result.goalsFor;
      const goalsAgainst = result.goalsAgainst;

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
      GD: GF - GA
    };
  }

  function recordRows(matchList) {
    const competitive = getRecord(matchList.filter(m => !isFriendly(m)));
    const friendly = getRecord(matchList.filter(m => isFriendly(m)));
    const overall = getRecord(matchList);

    return [
      { label: "Competitive Record", ...competitive },
      { label: "Friendly Record", ...friendly },
      { label: "Overall Record", ...overall }
    ];
  }

  function recordTableHtml(matchList) {
    return `
      <table class="archive-table">
        <thead>
          <tr>
            <th>Record</th>
            <th>P</th>
            <th>W</th>
            <th>D</th>
            <th>L</th>
            <th>GF</th>
            <th>GA</th>
            <th>GD</th>
          </tr>
        </thead>
        <tbody>
          ${recordRows(matchList).map(row => `
            <tr>
              <td>${row.label}</td>
              <td>${row.P}</td>
              <td>${row.W}</td>
              <td>${row.D}</td>
              <td>${row.L}</td>
              <td>${row.GF}</td>
              <td>${row.GA}</td>
              <td>${row.GD}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    `;
  }

  function includedTeamsText() {
    return getDisplayTeamIds().map(teamName).join(" + ");
  }

  function combineDropdownsHtml() {
    const availableTeams = teams
      .filter(t => normalise(t.id) !== mainTeamId)
      .sort((a, b) => normalise(a.name).localeCompare(normalise(b.name)));

    return `
      <div class="combine-team-controls" style="margin:10px 0 14px;">
        <div id="combinePromptWrap">
          <label class="stats-toggle">
            <input type="checkbox" id="combineTeamsToggle">
            Combine With Other Club(s)?
          </label>
        </div>

        <button id="resetCombinedTeams" class="archive-button" style="display:none; margin-bottom:10px;">
          Reset
        </button>

        <div id="combineDropdownWrap" style="display:none; flex-wrap:wrap; gap:8px; align-items:center;">
          ${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `
            <div class="combine-team-row" data-row="${i}" style="display:none; margin:0 8px 8px 0;">
              <select class="also-include-team" data-index="${i}">
                <option value="">Also Include</option>
                ${availableTeams.map(t => `
                  <option value="${t.id}">${t.name}</option>
                `).join("")}
              </select>

              ${i < 7 ? `
                <label class="stats-toggle add-another-wrap" data-add-for="${i}" style="display:none; margin-left:8px;">
                  <input type="checkbox" class="add-another-team" data-next="${i + 1}">
                  Add Another?
                </label>
              ` : ""}
            </div>
          `).join("")}
        </div>
      </div>
    `;
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

  function getPlayerStats(playerId, includeFriendlies = false) {
    const activeTeamSet = new Set(includedTeamIds);

    const rows = appearances.filter(a => {
      if (normalise(a.player_id) !== normalise(playerId)) return false;
      if (!activeTeamSet.has(normalise(a.team))) return false;

      const match = matches.find(m => normalise(m.id) === normalise(a.match_id));
      if (!isCountableMatch(match)) return false;
      if (!matchInScope(match)) return false;
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

  function rankingRows(rows, statKey) {
    let previousValue = null;
    let previousRank = 0;

    return rows.map((row, index) => {
      if (row[statKey] !== previousValue) {
        previousRank = index + 1;
        previousValue = row[statKey];
      }

      return {
        ...row,
        rank: previousRank
      };
    });
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

    const rankedRows = rankingRows(rows, "apps");
    const tbody = document.getElementById("topAppearancesTable");

    if (!tbody) return;

    if (!rankedRows.length) {
      tbody.innerHTML = `<tr><td colspan="3">No appearance data available.</td></tr>`;
      return;
    }

    tbody.innerHTML = rankedRows.map(row => `
      <tr>
        <td>${row.rank}</td>
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

    const rankedRows = rankingRows(rows, "goals");
    const tbody = document.getElementById("topGoalsTable");

    if (!tbody) return;

    if (!rankedRows.length) {
      tbody.innerHTML = `<tr><td colspan="3">No goals data available.</td></tr>`;
      return;
    }

    tbody.innerHTML = rankedRows.map(row => `
      <tr>
        <td>${row.rank}</td>
        <td><a href="player.html?id=${row.id}">${row.name}</a></td>
        <td>${row.goals}</td>
      </tr>
    `).join("");
  }

  function renderSeasonSummary() {
    const tbody = document.getElementById("seasonSummaryTable");
    if (!tbody) return;

    const teamMatches = getTeamMatches();
    const grouped = {};

    teamMatches.forEach(m => {
      const sid = normalise(m.season_id) || "unknown";
      if (!grouped[sid]) grouped[sid] = [];
      grouped[sid].push(m);
    });

    const rows = Object.entries(grouped)
      .sort((a, b) => normalise(a[0]).localeCompare(normalise(b[0])))
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
          </tr>
        `;
      }).join("");

    tbody.innerHTML = rows || `<tr><td colspan="8">No season records found.</td></tr>`;
  }

  function opponentOptions() {
    const teamMatches = getTeamMatches();
    const opponentIds = [...new Set(teamMatches.map(getOpponentId))]
      .filter(Boolean)
      .filter(oppId => !teamIsIncluded(oppId))
      .sort((a, b) => teamName(a).localeCompare(teamName(b)));

    return opponentIds.map(oppId => `
      <option value="${oppId}">${teamName(oppId)}</option>
    `).join("");
  }

  function renderOpponentFilterOptions() {
    const opponentFilter = document.getElementById("opponentFilter");
    if (!opponentFilter) return;

    const currentValue = opponentFilter.value;
    opponentFilter.innerHTML = `
      <option value="">All opponents</option>
      ${opponentOptions()}
    `;

    if ([...opponentFilter.options].some(option => option.value === currentValue)) {
      opponentFilter.value = currentValue;
    }
  }

  function renderMatches() {
    const opponentFilter = document.getElementById("opponentFilter");
    const matchesWrap = document.getElementById("teamMatches");
    if (!matchesWrap) return;

    const selectedOpponent = opponentFilter ? opponentFilter.value : "";
    const teamMatches = getTeamMatches();

    const filteredMatches = selectedOpponent
      ? teamMatches.filter(m => getOpponentId(m) === selectedOpponent)
      : teamMatches;

    const grouped = {};

    filteredMatches.forEach(m => {
      const sid = normalise(m.season_id) || "unknown";
      if (!grouped[sid]) grouped[sid] = [];
      grouped[sid].push(m);
    });

    if (!filteredMatches.length) {
      matchesWrap.innerHTML = `<div>No matches found.</div>`;
      return;
    }

    matchesWrap.innerHTML = Object.entries(grouped)
      .sort((a, b) => normalise(a[0]).localeCompare(normalise(b[0])))
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

  function renderHeaderRecord() {
    const recordWrap = document.getElementById("teamRecordWrap");
    const includedTeamsWrap = document.getElementById("includedTeamsText");

    if (recordWrap) {
      recordWrap.innerHTML = recordTableHtml(getTeamMatches());
    }

    if (includedTeamsWrap) {
      includedTeamsWrap.textContent = includedTeamsText();
    }
  }

  function refreshPageData() {
    renderHeaderRecord();
    renderSeasonSummary();
    renderOpponentFilterOptions();
    renderMatches();

    if (isMargatePage) {
      const appsToggle = document.getElementById("includeFriendliesApps");
      const goalsToggle = document.getElementById("includeFriendliesGoals");

      renderTopAppearances(appsToggle ? appsToggle.checked : false);
      renderTopGoalscorers(goalsToggle ? goalsToggle.checked : false);
    }
  }

  function updateIncludedTeamsFromDropdowns() {
    const selected = [mainTeamId];

    document.querySelectorAll(".also-include-team").forEach(dropdown => {
      const row = dropdown.closest(".combine-team-row");
      const value = normalise(dropdown.value);

      if (row && row.style.display !== "none" && value && !selected.includes(value)) {
        selected.push(value);
      }
    });

    includedTeamIds = selected;
    refreshPageData();
  }

  function resetCombinedTeams() {
    includedTeamIds = [mainTeamId];

    const combineToggle = document.getElementById("combineTeamsToggle");
    const promptWrap = document.getElementById("combinePromptWrap");
    const resetButton = document.getElementById("resetCombinedTeams");
    const dropdownWrap = document.getElementById("combineDropdownWrap");

    if (combineToggle) combineToggle.checked = false;
    if (promptWrap) promptWrap.style.display = "block";
    if (resetButton) resetButton.style.display = "none";
    if (dropdownWrap) dropdownWrap.style.display = "none";

    document.querySelectorAll(".combine-team-row").forEach(row => {
      row.style.display = "none";
    });

    document.querySelectorAll(".also-include-team").forEach(dropdown => {
      dropdown.value = "";
    });

    document.querySelectorAll(".add-another-team").forEach(checkbox => {
      checkbox.checked = false;
    });

    document.querySelectorAll(".add-another-wrap").forEach(wrap => {
      wrap.style.display = "none";
    });

    refreshPageData();
  }

  function showCombineRow(index) {
    const row = document.querySelector(`.combine-team-row[data-row="${index}"]`);
    if (row) row.style.display = "block";
  }

  function updateAddAnotherVisibility(index) {
    const dropdown = document.querySelector(`.also-include-team[data-index="${index}"]`);
    const addWrap = document.querySelector(`.add-another-wrap[data-add-for="${index}"]`);

    if (!dropdown || !addWrap) return;

    addWrap.style.display = dropdown.value ? "inline-block" : "none";

    if (!dropdown.value) {
      const addCheckbox = addWrap.querySelector(".add-another-team");
      if (addCheckbox) addCheckbox.checked = false;
    }
  }

  el.innerHTML = `
    <div class="content-box">
      <div class="team-header">
        <img class="team-badge-large" src="images/teams/${team.id}.png" alt="${team.name}" onerror="this.onerror=null;this.src='images/teams/defaultbadge.png';">
        <div class="team-header-text">
          <h2>${team.name}</h2>
          ${combineDropdownsHtml()}
          <p class="player-count"><strong>Showing:</strong> <span id="includedTeamsText">${includedTeamsText()}</span></p>
          <div id="teamRecordWrap"></div>
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
      </select>

      <div id="teamMatches"></div>
    </div>
  `;

  const combineToggle = document.getElementById("combineTeamsToggle");
  const resetButton = document.getElementById("resetCombinedTeams");
  const promptWrap = document.getElementById("combinePromptWrap");
  const dropdownWrap = document.getElementById("combineDropdownWrap");

  if (combineToggle) {
    combineToggle.addEventListener("change", () => {
      if (combineToggle.checked) {
        if (promptWrap) promptWrap.style.display = "none";
        if (resetButton) resetButton.style.display = "inline-block";
        if (dropdownWrap) dropdownWrap.style.display = "flex";
        showCombineRow(0);
      } else {
        resetCombinedTeams();
      }
    });
  }

  if (resetButton) {
    resetButton.addEventListener("click", resetCombinedTeams);
  }

  document.querySelectorAll(".also-include-team").forEach(select => {
    select.addEventListener("change", () => {
      const index = Number(select.dataset.index);
      updateAddAnotherVisibility(index);
      updateIncludedTeamsFromDropdowns();
    });
  });

  document.querySelectorAll(".add-another-team").forEach(checkbox => {
    checkbox.addEventListener("change", () => {
      const nextIndex = Number(checkbox.dataset.next);

      if (checkbox.checked) {
        showCombineRow(nextIndex);
      } else {
        for (let i = nextIndex; i < 8; i++) {
          const row = document.querySelector(`.combine-team-row[data-row="${i}"]`);
          const dropdown = document.querySelector(`.also-include-team[data-index="${i}"]`);
          const addWrap = document.querySelector(`.add-another-wrap[data-add-for="${i}"]`);
          const addCheckbox = document.querySelector(`.add-another-team[data-next="${i + 1}"]`);

          if (row) row.style.display = "none";
          if (dropdown) dropdown.value = "";
          if (addWrap) addWrap.style.display = "none";
          if (addCheckbox) addCheckbox.checked = false;
        }

        updateIncludedTeamsFromDropdowns();
      }
    });
  });

  const opponentFilter = document.getElementById("opponentFilter");
  if (opponentFilter) {
    opponentFilter.addEventListener("change", renderMatches);
  }

  if (isMargatePage) {
    const appsToggle = document.getElementById("includeFriendliesApps");
    const goalsToggle = document.getElementById("includeFriendliesGoals");

    if (appsToggle) {
      appsToggle.addEventListener("change", () => renderTopAppearances(appsToggle.checked));
    }

    if (goalsToggle) {
      goalsToggle.addEventListener("change", () => renderTopGoalscorers(goalsToggle.checked));
    }
  }

  refreshPageData();

}).catch(err => {
  document.getElementById("teamPage").innerHTML =
    `<div class="content-box"><p>Error loading team page: ${err.message}</p></div>`;
  console.error(err);
});
