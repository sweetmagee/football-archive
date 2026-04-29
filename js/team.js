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

  const teamId = String(id).trim();
  const isMargatePage = teamId === "t1";
  let includedTeamIds = [teamId];

  function normalise(value) {
    return String(value || "").trim();
  }

  function isFriendly(match) {
    const comp = normalise(match.competition).toLowerCase();
    return comp === "friendly" || comp === "friendlies" || comp === "fr" || comp.includes("friendly");
  }

  function isAbandoned(match) {
    return normalise(match.abandoned).toUpperCase() === "Y";
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

  function teamName(teamValue) {
    const t = teams.find(x =>
      normalise(x.id) === normalise(teamValue) ||
      normalise(x.name) === normalise(teamValue)
    );
    return t ? t.name : teamValue;
  }

  function seasonName(seasonId) {
    const season = seasons.find(s => normalise(s.id) === normalise(seasonId));
    return season ? season.name : seasonId;
  }

  function teamBadgeHtml(teamValue, sizeClass = "team-badge-small") {
    const t = teams.find(x => normalise(x.id) === normalise(teamValue));
    const badgeId = t ? t.id : teamValue;

    return `
      <img class="${sizeClass}"
           src="images/teams/${badgeId}.png"
           alt=""
           onerror="this.onerror=null;this.src='images/teams/defaultbadge.png';">
    `;
  }

  function parseDate(value) {
    if (!value) return null;

    const parts = normalise(value)
      .replace(/\./g, "/")
      .replace(/-/g, "/")
      .split("/");

    if (parts.length !== 3) return null;

    let [dd, mm, yyyy] = parts;

    if (yyyy.length === 2) {
      yyyy = Number(yyyy) >= 50 ? `18${yyyy}` : `19${yyyy}`;
    }

    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function teamIsIncluded(teamValue) {
    return includedTeamIds.includes(normalise(teamValue));
  }

  function matchIsForThisTeam(match) {
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

  function getAllTeamMatches() {
    return matches.filter(matchIsForThisTeam);
  }

  function getCountableTeamMatches() {
    return getAllTeamMatches().filter(isCountableMatch);
  }

  function getGoalsForAgainst(match) {
    const home = normalise(match.home_team);
    const away = normalise(match.away_team);

    if (isMargatePage) {
      const includedHome = teamIsIncluded(home);
      const includedAway = teamIsIncluded(away);

      if (includedHome && !includedAway) {
        return {
          goalsFor: Number(match.home_score),
          goalsAgainst: Number(match.away_score)
        };
      }

      if (includedAway && !includedHome) {
        return {
          goalsFor: Number(match.away_score),
          goalsAgainst: Number(match.home_score)
        };
      }
    }

    const margateHome = home === "t1";

    return {
      goalsFor: margateHome ? Number(match.home_score) : Number(match.away_score),
      goalsAgainst: margateHome ? Number(match.away_score) : Number(match.home_score)
    };
  }

  function getRecord(matchList) {
    let P = 0;
    let W = 0;
    let D = 0;
    let L = 0;
    let GF = 0;
    let GA = 0;

    matchList.forEach(match => {
      const result = getGoalsForAgainst(match);
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

  function recordTableHtml(matchList) {
    const competitive = getRecord(matchList.filter(m => !isFriendly(m)));
    const friendly = getRecord(matchList.filter(m => isFriendly(m)));
    const overall = getRecord(matchList);

    function row(label, record) {
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
          ${row("Competitive Record", competitive)}
          ${row("Friendly Record", friendly)}
          ${row("Overall Record", overall)}
        </tbody>
      </table>
    `;
  }

  function includedTeamsText() {
    return includedTeamIds.map(teamName).join(" + ");
  }

  function combineDropdownsHtml() {
    const availableTeams = teams
      .filter(t => normalise(t.id) !== teamId)
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

        <p class="player-count"><strong>Showing:</strong> <span id="includedTeamsText">${includedTeamsText()}</span></p>
      </div>
    `;
  }

  function seasonSummaryRows() {
    const grouped = {};

    getCountableTeamMatches().forEach(match => {
      const sid = normalise(match.season_id) || "unknown";
      if (!grouped[sid]) grouped[sid] = [];
      grouped[sid].push(match);
    });

    return Object.entries(grouped)
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
  }

  function matchLine(match, index) {
    const matchNumber = `#${String(index + 1).padStart(3, "0")}`;
    const abandonedText = isAbandoned(match) ? " - Abandoned" : "";

    return `
      <div class="match-row">
        <div class="match-scoreline" style="display:block;">
          <a href="match.html?id=${match.id}" style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <strong>${matchNumber}</strong>
            <span>${match.date || ""}</span>

            <span class="team-inline">
              ${teamBadgeHtml(match.home_team)}
              <span>${teamName(match.home_team)}</span>
            </span>

            <span class="score-separator">${match.home_score}-${match.away_score}</span>

            <span class="team-inline">
              ${teamBadgeHtml(match.away_team)}
              <span>${teamName(match.away_team)}</span>
            </span>

            <span class="match-meta">
              ${match.competition || ""}${match.round ? ` - ${match.round}` : ""}${abandonedText}
            </span>
          </a>
        </div>
      </div>
    `;
  }

  function renderHeaderRecord() {
    const recordWrap = document.getElementById("teamRecordWrap");
    const includedText = document.getElementById("includedTeamsText");

    if (recordWrap) {
      recordWrap.innerHTML = recordTableHtml(getCountableTeamMatches());
    }

    if (includedText) {
      includedText.textContent = includedTeamsText();
    }
  }

  function renderSeasonSummary() {
    const tbody = document.getElementById("seasonSummaryTable");
    if (!tbody) return;

    tbody.innerHTML = seasonSummaryRows() || `<tr><td colspan="8">No season records found.</td></tr>`;
  }

  function renderMatches() {
    const matchesWrap = document.getElementById("teamMatches");
    if (!matchesWrap) return;

    let shownMatches = [...getAllTeamMatches()];

    const competitiveOnly = document.getElementById("competitiveOnlyMatches");
    const friendlyOnly = document.getElementById("friendlyOnlyMatches");
    const excludeUnknown = document.getElementById("excludeUnknownResults");
    const excludeAbandoned = document.getElementById("excludeAbandonedGames");

    if (competitiveOnly && competitiveOnly.checked) {
      shownMatches = shownMatches.filter(m => !isFriendly(m));
    }

    if (friendlyOnly && friendlyOnly.checked) {
      shownMatches = shownMatches.filter(m => isFriendly(m));
    }

    if (excludeUnknown && excludeUnknown.checked) {
      shownMatches = shownMatches.filter(m => !hasUnknownResult(m));
    }

    if (excludeAbandoned && excludeAbandoned.checked) {
      shownMatches = shownMatches.filter(m => !isAbandoned(m));
    }

    const grouped = {};

    shownMatches.forEach(match => {
      const sid = normalise(match.season_id) || "unknown";
      if (!grouped[sid]) grouped[sid] = [];
      grouped[sid].push(match);
    });

    if (!shownMatches.length) {
      matchesWrap.innerHTML = `<div>No matches found.</div>`;
      return;
    }

    matchesWrap.innerHTML = Object.entries(grouped)
      .sort((a, b) => normalise(a[0]).localeCompare(normalise(b[0])))
      .map(([seasonId, matchList]) => {
        matchList.sort((a, b) => parseDate(a.date) - parseDate(b.date));

        return `
          <h4>${seasonName(seasonId)}</h4>
          <div class="match-list">
            ${matchList.map((match, index) => matchLine(match, index)).join("")}
          </div>
        `;
      }).join("");
  }

  function refreshPageData() {
    renderHeaderRecord();
    renderSeasonSummary();
    renderMatches();
    updateConditionalFilterVisibility();
  }

  function updateConditionalFilterVisibility() {
    const allTeamMatches = getAllTeamMatches();

    const unknownLabel = document.getElementById("excludeUnknownResultsLabel");
    const abandonedLabel = document.getElementById("excludeAbandonedGamesLabel");

    if (unknownLabel) {
      unknownLabel.style.display = allTeamMatches.some(hasUnknownResult) ? "inline-flex" : "none";
    }

    if (abandonedLabel) {
      abandonedLabel.style.display = allTeamMatches.some(isAbandoned) ? "inline-flex" : "none";
    }
  }

  function updateIncludedTeamsFromDropdowns() {
    const selected = [teamId];

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
    includedTeamIds = [teamId];

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
        <img class="team-badge-large" style="border:0!important;outline:0!important;box-shadow:none!important;background:transparent!important;padding:0!important;border-radius:0!important;"
             src="images/teams/${team.id}.png"
             alt="${team.name}"
             onerror="this.onerror=null;this.src='images/teams/defaultbadge.png';">

        <div class="team-header-text" style="width:100%;">
          <h2>${team.name}</h2>
          ${combineDropdownsHtml()}
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

    <div class="content-box section-block">
      <h3>Matches</h3>

      <div id="matchFilters" style="display:flex; gap:18px; align-items:center; flex-wrap:wrap; margin-bottom:12px;">
        <label class="stats-toggle">
          <input type="checkbox" id="competitiveOnlyMatches">
          Competitive Games Only
        </label>

        <label class="stats-toggle">
          <input type="checkbox" id="friendlyOnlyMatches">
          Friendly Games Only
        </label>

        <label class="stats-toggle" id="excludeUnknownResultsLabel" style="display:none;">
          <input type="checkbox" id="excludeUnknownResults">
          Exclude Unknown Results
        </label>

        <label class="stats-toggle" id="excludeAbandonedGamesLabel" style="display:none;">
          <input type="checkbox" id="excludeAbandonedGames">
          Exclude Abandoned Games
        </label>
      </div>

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

  const competitiveOnly = document.getElementById("competitiveOnlyMatches");
  const friendlyOnly = document.getElementById("friendlyOnlyMatches");
  const excludeUnknown = document.getElementById("excludeUnknownResults");
  const excludeAbandoned = document.getElementById("excludeAbandonedGames");

  if (competitiveOnly) {
    competitiveOnly.addEventListener("change", () => {
      if (competitiveOnly.checked && friendlyOnly) {
        friendlyOnly.checked = false;
      }
      renderMatches();
    });
  }

  if (friendlyOnly) {
    friendlyOnly.addEventListener("change", () => {
      if (friendlyOnly.checked && competitiveOnly) {
        competitiveOnly.checked = false;
      }
      renderMatches();
    });
  }

  if (excludeUnknown) {
    excludeUnknown.addEventListener("change", renderMatches);
  }

  if (excludeAbandoned) {
    excludeAbandoned.addEventListener("change", renderMatches);
  }

  refreshPageData();

}).catch(err => {
  document.getElementById("teamPage").innerHTML =
    `<div class="content-box"><p>Error loading team page: ${err.message}</p></div>`;
  console.error(err);
});