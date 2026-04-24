const id = new URLSearchParams(window.location.search).get("id");

Promise.all([
  fetch("data/players.json").then(r => r.json()),
  fetch("data/matches.json").then(r => r.json()),
  fetch("data/appearances.json").then(r => r.json()),
  fetch("data/teams.json").then(r => r.json())
]).then(([players, matches, appearances, teams]) => {
  const player = players.find(p => String(p.id).trim() === String(id).trim());
  const el = document.getElementById("player") || document.getElementById("playerPage");

  if (!player) {
    el.innerHTML = `<div class="content-box"><p>Player not found.</p></div>`;
    return;
  }

  function teamName(teamId) {
    const team = teams.find(t => String(t.id).trim() === String(teamId).trim());
    return team ? team.name : teamId;
  }

  function isFriendly(match) {
    const comp = String(match.competition || "").trim().toLowerCase();
    return comp === "friendly" || comp === "fr";
  }

  function validMatch(match) {
    return (
      match &&
      match.home_score !== "?" &&
      match.away_score !== "?" &&
      !Number.isNaN(Number(match.home_score)) &&
      !Number.isNaN(Number(match.away_score))
    );
  }

  const apps = appearances.filter(a =>
    String(a.player_id).trim() === String(id).trim()
  );

  const appsWithMatch = apps
    .map(a => ({
      app: a,
      match: matches.find(m => String(m.id).trim() === String(a.match_id).trim())
    }))
    .filter(x => x.match && validMatch(x.match));

  function calcStats(list) {
    const starts = list.filter(x => Number(x.app.is_starting) === 1).length;
    const subs = list.filter(x => Number(x.app.is_starting) !== 1).length;
    const goals = list.reduce((sum, x) => sum + Number(x.app.goals || 0), 0);

    return {
      starts,
      subs,
      goals,
      apps: starts + subs,
      displayApps: subs > 0 ? `${starts}+${subs}` : `${starts}`
    };
  }

  const competitive = appsWithMatch.filter(x => !isFriendly(x.match));
  const friendlies = appsWithMatch.filter(x => isFriendly(x.match));
  const total = appsWithMatch;

  const compStats = calcStats(competitive);
  const frStats = calcStats(friendlies);
  const totalStats = calcStats(total);

  const orderedMatches = [...appsWithMatch].sort((a, b) => {
    const pa = String(a.match.date || "").split("/");
    const pb = String(b.match.date || "").split("/");

    const da = new Date(pa[2], Number(pa[1]) - 1, pa[0]);
    const db = new Date(pb[2], Number(pb[1]) - 1, pb[0]);

    return da - db;
  });

  function matchLine(match) {
    const home = teamName(match.home_team);
    const away = teamName(match.away_team);

    return `${home} ${match.home_score}-${match.away_score} ${away}`;
  }

  el.innerHTML = `
    <div class="content-box">
      <div class="player-card">
        <img
          src="images/players/${player.id}.png"
          alt="${player.name}"
          onerror="this.onerror=null;this.src='images/players/defaultplayer.png';"
        >

        <div class="player-meta">
          <h2>${player.name}</h2>

          ${player.position ? `<p><strong>Position:</strong> ${player.position}</p>` : ""}
          ${player.dob ? `<p><strong>Date of Birth:</strong> ${player.dob}</p>` : ""}
          ${player.birth_place ? `<p><strong>Birth Place:</strong> ${player.birth_place}</p>` : ""}
          ${player.team ? `<p><strong>Club:</strong> <a href="team.html?id=${player.team}">${teamName(player.team)}</a></p>` : ""}
          ${player.other_clubs ? `<p><strong>Other Clubs:</strong> ${player.other_clubs}</p>` : ""}
        </div>
      </div>

      <div class="player-stats-grid">
        <div class="player-stat-box">
          <div class="player-stat-title">Competitive Record</div>
          <p><strong>Appearances:</strong> ${compStats.displayApps}</p>
          <p><strong>Goals:</strong> ${compStats.goals}</p>
        </div>

        <div class="player-stat-box">
          <div class="player-stat-title">Friendly Record</div>
          <p><strong>Appearances:</strong> ${frStats.displayApps}</p>
          <p><strong>Goals:</strong> ${frStats.goals}</p>
        </div>

        <div class="player-stat-box">
          <div class="player-stat-title">Total Record</div>
          <p><strong>Appearances:</strong> ${totalStats.displayApps}</p>
          <p><strong>Goals:</strong> ${totalStats.goals}</p>
        </div>
      </div>

      ${player.bio ? `
        <div class="section-block">
          <h3>Biography</h3>
          <p>${player.bio}</p>
        </div>
      ` : ""}
    </div>

    <div class="content-box section-block">
      <h3>Match Record</h3>
      <table class="archive-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Match</th>
            <th>Competition</th>
            <th>Apps</th>
            <th>Goals</th>
          </tr>
        </thead>
        <tbody id="matchRows"></tbody>
      </table>
    </div>
  `;

  const rows = document.getElementById("matchRows");

  if (orderedMatches.length === 0) {
    rows.innerHTML = `
      <tr>
        <td colspan="5">No match records found.</td>
      </tr>
    `;
    return;
  }

  orderedMatches.forEach(({ app, match }) => {
    rows.innerHTML += `
      <tr>
        <td>${match.date || ""}</td>
        <td>
          <a href="match.html?id=${match.id}">
            ${matchLine(match)}
          </a>
        </td>
        <td>${match.competition || ""}</td>
        <td>${Number(app.is_starting) === 1 ? "Start" : "Sub"}</td>
        <td>${app.goals || 0}</td>
      </tr>
    `;
  });

}).catch(err => {
  (document.getElementById("player") || document.getElementById("playerPage")).innerHTML =
    `<div class="content-box"><p>Error loading player page: ${err.message}</p></div>`;
  console.error(err);
});