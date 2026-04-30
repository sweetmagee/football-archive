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
    const note = String(match.notes || "").trim().toLowerCase();

    if (note.includes("date of match unknown")) {
      return new Date(9999, 11, 31);
    }

    return parseDateUK(match.date) || new Date(9999, 11, 30);
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

  const managerMatches = matches
    .filter(isManagedByThisMatch)
    .sort((a, b) => parseDateUK(a.date) - parseDateUK(b.date));

  const countedMatches = managerMatches.filter(m =>
    !isAbandoned(m) &&
    isCountableScore(m.home_score) &&
    isCountableScore(m.away_score)
  );

  let played = 0;
  let won = 0;
  let drawn = 0;
  let lost = 0;
  let gf = 0;
  let ga = 0;

  countedMatches.forEach(match => {
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

      <div class="player-stats-grid">
        <div class="player-stat-box">
          <div class="player-stat-title">Matches</div>
          <p><strong>${played}</strong></p>
        </div>

        <div class="player-stat-box">
          <div class="player-stat-title">Record</div>
          <p>W ${won}</p>
          <p>D ${drawn}</p>
          <p>L ${lost}</p>
        </div>

        <div class="player-stat-box">
          <div class="player-stat-title">Goals</div>
          <p>For ${gf}</p>
          <p>Against ${ga}</p>
        </div>
      </div>
    </div>

    <div class="content-box">
      <h3>Biography</h3>
      <p>${manager.bio || "No biography available."}</p>
    </div>

    <div class="content-box">
      <h3>Matches Managed</h3>

      <table class="archive-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Match</th>
            <th>Competition</th>
          </tr>
        </thead>
        <tbody>
          ${managerMatches.map(match => {
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
          }).join("")}
        </tbody>
      </table>
    </div>
  `;
}).catch(err => {
  document.getElementById("managerPage").innerHTML =
    `<div class="content-box"><p>Error loading manager page: ${err.message}</p></div>`;
  console.error(err);
});