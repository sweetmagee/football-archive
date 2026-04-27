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

  function parseDateUK(str) {
    if (!str) return null;
    const clean = String(str).replace(/\./g, "/").replace(/-/g, "/").trim();
    const parts = clean.split("/");
    if (parts.length !== 3) return null;

    let [d, m, y] = parts;
    if (y.length === 2) {
      y = Number(y) >= 50 ? `18${y}` : `19${y}`;
    }

    const dt = new Date(`${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
    return Number.isNaN(dt.getTime()) ? null : dt;
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

  function isManagedByThisMatch(match) {
    return (
      String(match.home_manager_id || "").trim() === String(manager.id).trim() ||
      String(match.away_manager_id || "").trim() === String(manager.id).trim()
    );
  }

  function managedTeamId(match) {
    if (String(match.home_manager_id || "").trim() === String(manager.id).trim()) {
      return match.home_team;
    }
    if (String(match.away_manager_id || "").trim() === String(manager.id).trim()) {
      return match.away_team;
    }
    return "";
  }

  function isCountableScore(value) {
    return value !== "?" && !Number.isNaN(Number(value));
  }

  function isFriendly(match) {
    const comp = String(match.competition || "").trim().toLowerCase();
    return comp === "friendly" || comp === "fr" || comp === "friendlies";
  }

  const managerMatches = matches
    .filter(isManagedByThisMatch)
    .sort((a, b) => parseDateUK(a.date) - parseDateUK(b.date));

  const countedMatches = managerMatches.filter(m =>
    isCountableScore(m.home_score) && isCountableScore(m.away_score)
  );

  function buildRecord(matchList) {
    let played = 0;
    let won = 0;
    let drawn = 0;
    let lost = 0;
    let gf = 0;
    let ga = 0;

    matchList.forEach(match => {
      const teamId = managedTeamId(match);
      const isHome = String(match.home_team).trim() === String(teamId).trim();

      const teamGoals = isHome ? Number(match.home_score) : Number(match.away_score);
      const oppGoals = isHome ? Number(match.away_score) : Number(match.home_score);

      played++;
      gf += teamGoals;
      ga += oppGoals;

      if (teamGoals > oppGoals) won++;
      else if (teamGoals < oppGoals) lost++;
      else drawn++;
    });

    return {
      played,
      won,
      drawn,
      lost,
      gf,
      ga,
      gd: gf - ga
    };
  }

  const competitiveMatches = countedMatches.filter(m => !isFriendly(m));
  const friendlyMatches = countedMatches.filter(m => isFriendly(m));

  const comp = buildRecord(competitiveMatches);
  const fr = buildRecord(friendlyMatches);
  const overall = buildRecord(countedMatches);

  const firstMatch = managerMatches[0];
  const lastMatch = managerMatches[managerMatches.length - 1];

  const firstDate = firstMatch ? firstMatch.date : "Unknown";
  const lastDate = lastMatch ? lastMatch.date : "Unknown";

  const managedClub = firstMatch ? teamName(managedTeamId(firstMatch)) : "Unknown";

  const photoFile = manager.photo && String(manager.photo).trim() !== ""
    ? manager.photo
    : "defaultmanager.png";

  const photoHtml = `
    <img
      src="images/managers/${photoFile}"
      alt="${manager.name}"
      onerror="this.onerror=null;this.src='images/managers/defaultmanager.png';"
    >
  `;

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

  function renderManagedMatches(includeFriendlies = false) {
    const tbody = document.getElementById("matchesManagedTable");
    if (!tbody) return;

    const shownMatches = managerMatches.filter(match =>
      includeFriendlies || !isFriendly(match)
    );

    if (!shownMatches.length) {
      tbody.innerHTML = `<tr><td colspan="3">No matches found.</td></tr>`;
      return;
    }

    tbody.innerHTML = shownMatches.map(match => {
      const home = teamName(match.home_team);
      const away = teamName(match.away_team);

      return `
        <tr>
          <td>${match.date}</td>
          <td>
            <a href="match.html?id=${match.id}">
              ${home} ${match.home_score} - ${match.away_score} ${away}
            </a>
          </td>
          <td>${match.competition || ""}</td>
        </tr>
      `;
    }).join("");
  }

  el.innerHTML = `
    <div class="content-box">
      <div class="player-card">
        <div>
          ${photoHtml}
        </div>

        <div class="player-meta">
          <h2>${manager.name}</h2>

          <p><strong>Club:</strong> ${managedClub}</p>
          <p><strong>Date of Birth:</strong> ${manager.dob || "Unknown"}</p>
          <p><strong>First Match:</strong> ${firstDate}</p>
          <p><strong>Last Match:</strong> ${lastDate}</p>
        </div>
      </div>
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
          ${recordRow("Competitive Record", comp)}
          ${recordRow("Friendly Record", fr)}
          ${recordRow("Overall Record", overall)}
        </tbody>
      </table>
    </div>

    <div class="content-box">
      <h3>Biography</h3>
      <p>${manager.bio || "No biography available."}</p>
    </div>

    <div class="content-box">
      <h3>Matches Managed</h3>

      <label class="stats-toggle">
        <input type="checkbox" id="includeFriendliesManaged">
        Include friendlies
      </label>

      <table class="archive-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Match</th>
            <th>Competition</th>
          </tr>
        </thead>
        <tbody id="matchesManagedTable"></tbody>
      </table>
    </div>
  `;

  renderManagedMatches(false);

  const includeFriendliesManaged = document.getElementById("includeFriendliesManaged");

  if (includeFriendliesManaged) {
    includeFriendliesManaged.addEventListener("change", () => {
      renderManagedMatches(includeFriendliesManaged.checked);
    });
  }

}).catch(err => {
  document.getElementById("managerPage").innerHTML =
    `<div class="content-box"><p>Error loading manager page: ${err.message}</p></div>`;
  console.error(err);
});