const id = new URLSearchParams(window.location.search).get("id");

Promise.all([
  fetch("data/managers.json").then(r => r.json()),
  fetch("data/matches.json").then(r => r.json()),
  fetch("data/teams.json").then(r => r.json())
]).then(([managers, matches, teams]) => {
  const manager = managers.find(m => String(m.id).trim() === String(id).trim());
  const el = document.getElementById("managerPage");

  if (!manager) {
    el.innerHTML = `<div class="content-box"><p>Manager not found.</p></div>`;
    return;
  }

  function normalise(value) {
    return String(value || "").trim();
  }

  function parseDateUK(str) {
    if (!str) return null;

    const clean = String(str).replace(/\./g, "/").replace(/-/g, "/").trim();
    const parts = clean.split("/");

    if (parts.length !== 3) return null;

    let [d, m, y] = parts;
    if (!d || !m || !y) return null;

    if (y.length === 2) {
      y = Number(y) >= 50 ? `18${y}` : `19${y}`;
    }

    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  function hasKnownDate(match) {
    return !!parseDateUK(match && match.date);
  }

  function ordinal(n) {
    const suffixes = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return `${n}${suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]}`;
  }

  function formatLongDate(value) {
    const d = parseDateUK(value);
    if (!d) return "Unknown";

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    return `${days[d.getDay()]} ${ordinal(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  function matchSortDate(match) {
    const note = normalise(match.notes).toLowerCase();

    if (note.includes("date of match unknown")) {
      return new Date(9999, 11, 31);
    }

    return parseDateUK(match.date) || new Date(9999, 11, 30);
  }

  function resolveTeam(teamValue) {
    return teams.find(t =>
      normalise(t.id) === normalise(teamValue) ||
      normalise(t.name) === normalise(teamValue)
    );
  }

  function teamName(teamValue) {
    const team = resolveTeam(teamValue);
    return team ? team.name : teamValue;
  }

  function teamBadgeHtml(teamValue) {
    const team = resolveTeam(teamValue);
    const badgeId = team ? team.id : teamValue;

    return `
      <img class="team-badge-small"
           src="images/teams/${badgeId}.png"
           alt=""
           onerror="this.onerror=null;this.src='images/teams/defaultbadge.png';">
    `;
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
      normalise(match.home_score) === "?" ||
      normalise(match.away_score) === "?" ||
      Number.isNaN(Number(match.home_score)) ||
      Number.isNaN(Number(match.away_score))
    );
  }

  function isCountableMatch(match) {
    return match && !isAbandoned(match) && !hasUnknownResult(match);
  }

  function isManagedByThisMatch(match) {
    return (
      normalise(match.home_manager_id) === normalise(manager.id) ||
      normalise(match.away_manager_id) === normalise(manager.id)
    );
  }

  function managedTeamId(match) {
    if (normalise(match.home_manager_id) === normalise(manager.id)) {
      return match.home_team;
    }

    if (normalise(match.away_manager_id) === normalise(manager.id)) {
      return match.away_team;
    }

    return "";
  }

  function resultHtml(match) {
    return `
      <a href="match.html?id=${match.id}" class="manager-result-link">
        <span class="manager-result-team manager-result-home">
          <span>${teamName(match.home_team)}</span>
          ${teamBadgeHtml(match.home_team)}
        </span>

        <span class="manager-result-score">${match.home_score} - ${match.away_score}</span>

        <span class="manager-result-team manager-result-away">
          ${teamBadgeHtml(match.away_team)}
          <span>${teamName(match.away_team)}</span>
        </span>
      </a>
    `;
  }

  function formatSpan(start, end) {
    if (!start || !end) return "Unknown";

    const diff = end - start;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    const years = Math.floor(days / 365);
    const remainingDays = days % 365;

    if (years > 0) {
      return `${years} year${years !== 1 ? "s" : ""} ${remainingDays} day${remainingDays !== 1 ? "s" : ""}`;
    }

    return `${days} day${days !== 1 ? "s" : ""}`;
  }

  const managerMatches = matches
    .filter(isManagedByThisMatch)
    .sort((a, b) => matchSortDate(a) - matchSortDate(b));

  const countedMatches = managerMatches.filter(isCountableMatch);

  const knownDateMatches = managerMatches.filter(hasKnownDate);
  const firstMatch = knownDateMatches[0] || managerMatches[0];
  const lastMatch = knownDateMatches[knownDateMatches.length - 1] || managerMatches[managerMatches.length - 1];

  const firstDate = firstMatch ? formatLongDate(firstMatch.date) : "Unknown";
  const lastDate = lastMatch ? formatLongDate(lastMatch.date) : "Unknown";
  const managementSpan = formatSpan(parseDateUK(firstMatch && firstMatch.date), parseDateUK(lastMatch && lastMatch.date));
  const managedClub = firstMatch ? teamName(managedTeamId(firstMatch)) : "Unknown";

  const photoFile = manager.photo && normalise(manager.photo) !== ""
    ? manager.photo
    : "defaultmanager.png";

  const photoHtml = `
    <img
      src="images/managers/${photoFile}"
      alt="${manager.name}"
      onerror="this.onerror=null;this.src='images/managers/defaultmanager.png';"
    >
  `;

  function buildRecord(matchList) {
    let played = 0;
    let won = 0;
    let drawn = 0;
    let lost = 0;
    let gf = 0;
    let ga = 0;

    matchList.forEach(match => {
      const teamId = managedTeamId(match);
      const isHome = normalise(match.home_team) === normalise(teamId);

      const teamGoals = isHome ? Number(match.home_score) : Number(match.away_score);
      const oppGoals = isHome ? Number(match.away_score) : Number(match.home_score);

      played++;
      gf += teamGoals;
      ga += oppGoals;

      if (teamGoals > oppGoals) won++;
      else if (teamGoals < oppGoals) lost++;
      else drawn++;
    });

    return { played, won, drawn, lost, gf, ga, gd: gf - ga };
  }

  function recordRow(title, r) {
    return `
      <tr>
        <td>${title}</td>
        <td>${r.played}</td>
        <td>${r.won}</td>
        <td>${r.drawn}</td>
        <td>${r.lost}</td>
        <td>${r.gf}</td>
        <td>${r.ga}</td>
        <td>${r.gd}</td>
      </tr>
    `;
  }

  const competitiveRecord = buildRecord(countedMatches.filter(m => !isFriendly(m)));
  const friendlyRecord = buildRecord(countedMatches.filter(m => isFriendly(m)));
  const overallRecord = buildRecord(countedMatches);

  const hasUnknownMatches = managerMatches.some(hasUnknownResult);
  const hasAbandonedMatches = managerMatches.some(isAbandoned);

  function renderManagedMatches() {
    const tbody = document.getElementById("matchesManagedTable");
    if (!tbody) return;

    let shownMatches = [...managerMatches];

    const competitiveOnly = document.getElementById("competitiveOnlyManaged");
    const friendlyOnly = document.getElementById("friendlyOnlyManaged");
    const excludeUnknown = document.getElementById("excludeUnknownManaged");
    const excludeAbandoned = document.getElementById("excludeAbandonedManaged");

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

    shownMatches.sort((a, b) => matchSortDate(a) - matchSortDate(b));

    if (!shownMatches.length) {
      tbody.innerHTML = `<tr><td colspan="4">No matches found.</td></tr>`;
      return;
    }

    tbody.innerHTML = shownMatches.map((match, index) => {
      const abandonedText = isAbandoned(match) ? " - Abandoned" : "";

      return `
        <tr>
          <td class="manager-match-number">#${String(index + 1).padStart(3, "0")}</td>
          <td>${match.date || ""}</td>
          <td>${match.competition || ""}${match.round ? ` - ${match.round}` : ""}${abandonedText}</td>
          <td>${resultHtml(match)}</td>
        </tr>
      `;
    }).join("");
  }

  el.innerHTML = `
    <style>
      .manager-matches-table th,
      .manager-matches-table td {
        vertical-align: middle;
        white-space: nowrap;
      }

      .manager-matches-table th:nth-child(1),
      .manager-matches-table td:nth-child(1),
      .manager-matches-table th:nth-child(2),
      .manager-matches-table td:nth-child(2) {
        width: 1%;
        white-space: nowrap;
      }

      .manager-match-number {
        font-weight: normal;
        font-family: inherit;
        font-size: inherit;
        line-height: inherit;
      }

      .manager-result-link {
        display: grid;
        grid-template-columns: minmax(160px, 1fr) 70px minmax(160px, 1fr);
        align-items: center;
        column-gap: 12px;
        text-decoration: none;
        width: 100%;
      }

      .manager-result-team {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        white-space: nowrap;
      }

      .manager-result-home {
        justify-content: flex-end;
        text-align: right;
      }

      .manager-result-away {
        justify-content: flex-start;
        text-align: left;
      }

      .manager-result-score {
        text-align: center;
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
      }

      @media (max-width: 900px) {
        .manager-matches-table {
          display: block;
          width: 100%;
          max-width: 100%;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        .manager-matches-table th,
        .manager-matches-table td {
          white-space: normal;
          font-size: 0.92rem;
          padding: 6px 7px;
        }

        .manager-matches-table th:nth-child(1),
        .manager-matches-table td:nth-child(1),
        .manager-matches-table th:nth-child(2),
        .manager-matches-table td:nth-child(2) {
          width: auto;
          white-space: nowrap;
        }

        .manager-matches-table th:nth-child(4),
        .manager-matches-table td:nth-child(4) {
          min-width: 190px;
        }

        .manager-result-link {
          display: grid;
          grid-template-columns: 1fr;
          row-gap: 3px;
          width: 100%;
        }

        .manager-result-team {
          white-space: normal;
          gap: 5px;
        }

        .manager-result-home,
        .manager-result-away {
          justify-content: flex-start;
          text-align: left;
        }

        .manager-result-score {
          text-align: left;
          font-weight: 700;
        }

        .manager-result-home img {
          order: -1;
        }

        .player-card {
          grid-template-columns: 1fr;
        }

        .player-card img {
          width: 180px;
          max-width: 180px;
        }

        .player-meta h2 {
          font-size: 2rem;
          line-height: 1.15;
        }
      }
    </style>

    <div class="content-box">
      <div class="player-card">
        <div>${photoHtml}</div>

        <div class="player-meta">
          <h2>${manager.name}</h2>
          <p><strong>Club:</strong> ${managedClub}</p>
          <p><strong>Date of Birth:</strong> ${manager.dob || "Unknown"}</p>
          <p><strong>First Match:</strong> ${firstDate}</p>
          <p><strong>Last Match:</strong> ${lastDate}</p>
          <p><strong>Management Span (All matches):</strong> ${managementSpan}</p>
        </div>
      </div>
    </div>

    <div class="content-box">
      <h3>Biography</h3>
      <p>${manager.bio || "No biography available."}</p>
    </div>

    <div class="content-box">
      <h3>Managerial Record</h3>

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
          ${recordRow("Competitive Record", competitiveRecord)}
          ${recordRow("Friendly Record", friendlyRecord)}
          ${recordRow("Overall Record", overallRecord)}
        </tbody>
      </table>
    </div>

    <div class="content-box">
      <h3>Matches Managed</h3>

      <div id="managerMatchFilters" style="display:flex; gap:18px; align-items:center; flex-wrap:wrap; margin-bottom:12px;">
        <label class="stats-toggle">
          <input type="checkbox" id="competitiveOnlyManaged">
          Competitive Games Only
        </label>

        <label class="stats-toggle">
          <input type="checkbox" id="friendlyOnlyManaged">
          Friendly Games Only
        </label>

        ${hasUnknownMatches ? `
          <label class="stats-toggle">
            <input type="checkbox" id="excludeUnknownManaged">
            Exclude Unknown Results
          </label>
        ` : ""}

        ${hasAbandonedMatches ? `
          <label class="stats-toggle">
            <input type="checkbox" id="excludeAbandonedManaged">
            Exclude Abandoned Games
          </label>
        ` : ""}
      </div>

      <table class="archive-table manager-matches-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Competition</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody id="matchesManagedTable"></tbody>
      </table>
    </div>
  `;

  const competitiveOnly = document.getElementById("competitiveOnlyManaged");
  const friendlyOnly = document.getElementById("friendlyOnlyManaged");
  const excludeUnknown = document.getElementById("excludeUnknownManaged");
  const excludeAbandoned = document.getElementById("excludeAbandonedManaged");

  if (competitiveOnly) {
    competitiveOnly.addEventListener("change", () => {
      if (competitiveOnly.checked && friendlyOnly) {
        friendlyOnly.checked = false;
      }
      renderManagedMatches();
    });
  }

  if (friendlyOnly) {
    friendlyOnly.addEventListener("change", () => {
      if (friendlyOnly.checked && competitiveOnly) {
        competitiveOnly.checked = false;
      }
      renderManagedMatches();
    });
  }

  if (excludeUnknown) {
    excludeUnknown.addEventListener("change", renderManagedMatches);
  }

  if (excludeAbandoned) {
    excludeAbandoned.addEventListener("change", renderManagedMatches);
  }

  renderManagedMatches();

}).catch(err => {
  document.getElementById("managerPage").innerHTML =
    `<div class="content-box"><p>Error loading manager page: ${err.message}</p></div>`;
  console.error(err);
});
