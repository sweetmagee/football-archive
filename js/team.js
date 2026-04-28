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

  function matchIsForThisTeam(match) {
    const home = normalise(match.home_team);
    const away = normalise(match.away_team);

    if (isMargatePage) {
      return home === teamId || away === teamId;
    }

    return (
      (home === "t1" && away === teamId) ||
      (away === "t1" && home === teamId)
    );
  }

  const allTeamMatches = matches.filter(matchIsForThisTeam);
  const countableTeamMatches = allTeamMatches.filter(isCountableMatch);

  function getGoalsForAgainst(match) {
    const home = normalise(match.home_team);
    const away = normalise(match.away_team);

    if (isMargatePage) {
      const isHome = home === teamId;

      return {
        goalsFor: isHome ? Number(match.home_score) : Number(match.away_score),
        goalsAgainst: isHome ? Number(match.away_score) : Number(match.home_score)
      };
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

  function seasonSummaryRows() {
    const grouped = {};

    countableTeamMatches.forEach(match => {
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

  function renderMatches() {
    const matchesWrap = document.getElementById("teamMatches");
    if (!matchesWrap) return;

    let shownMatches = [...allTeamMatches];

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

  const hasUnknownMatches = allTeamMatches.some(hasUnknownResult);
  const hasAbandonedMatches = allTeamMatches.some(isAbandoned);

  el.innerHTML = `
    <div class="content-box">
      <div class="team-header">
        <img class="team-badge-large"
             src="images/teams/${team.id}.png"
             alt="${team.name}"
             onerror="this.onerror=null;this.src='images/teams/defaultbadge.png';">

        <div class="team-header-text" style="width:100%;">
          <h2>${team.name}</h2>
          ${recordTableHtml(countableTeamMatches)}
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
        <tbody>
          ${seasonSummaryRows() || `<tr><td colspan="8">No season records found.</td></tr>`}
        </tbody>
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

        ${hasUnknownMatches ? `
          <label class="stats-toggle">
            <input type="checkbox" id="excludeUnknownResults">
            Exclude Unknown Results
          </label>
        ` : ""}

        ${hasAbandonedMatches ? `
          <label class="stats-toggle">
            <input type="checkbox" id="excludeAbandonedGames">
            Exclude Abandoned Games
          </label>
        ` : ""}
      </div>

      <div id="teamMatches"></div>
    </div>
  `;

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

  renderMatches();

}).catch(err => {
  document.getElementById("teamPage").innerHTML =
    `<div class="content-box"><p>Error loading team page: ${err.message}</p></div>`;
  console.error(err);
});