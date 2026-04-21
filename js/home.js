Promise.all([
  fetch("data/players.json").then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status} loading players.json`);
    return r.json();
  }),
  fetch("data/appearances.json").then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status} loading appearances.json`);
    return r.json();
  }),
  fetch("data/teams.json").then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status} loading teams.json`);
    return r.json();
  })
]).then(([players, appearances, teams]) => {
  const latestEl = document.getElementById("latestAdditions");
  const featuredEl = document.getElementById("featuredPlayer");

  function teamName(teamId) {
    const team = teams.find(t => String(t.id).trim() === String(teamId).trim());
    return team ? team.name : teamId;
  }

  function getPlayerStats(playerId) {
    const pa = appearances.filter(a => String(a.player_id).trim() === String(playerId).trim());

    const starts = pa.filter(a => Number(a.is_starting) === 1).length;
    const subs = pa.filter(a => Number(a.is_starting) !== 1).length;
    const goals = pa.reduce((sum, a) => sum + Number(a.goals || 0), 0);

    return {
      starts,
      subs,
      goals,
      totalApps: starts + subs,
      appsDisplay: subs > 0 ? `${starts}+${subs}` : `${starts}`
    };
  }

  // Latest Additions = last 5 in players.json
  const latestPlayers = [...players].slice(-5).reverse();

  if (!latestPlayers.length) {
    latestEl.innerHTML = `<p>No players available.</p>`;
  } else {
    latestEl.innerHTML = `
      <ul class="home-list">
        ${latestPlayers.map(p => `
          <li>
            <a href="player.html?id=${p.id}">${p.name}</a>
            ${p.position ? ` — ${p.position}` : ""}
          </li>
        `).join("")}
      </ul>
    `;
  }

  // RANDOM PLAYER
  if (!players.length) {
    featuredEl.innerHTML = `<p>No players available.</p>`;
    return;
  }

  const randomIndex = Math.floor(Math.random() * players.length);
  const featured = players[randomIndex];

  const stats = getPlayerStats(featured.id);

  const photo = featured.photo && featured.photo.trim() !== ""
    ? featured.photo.trim()
    : "default.png";

  featuredEl.innerHTML = `
    <div class="featured-player-card">
      <div class="featured-player-image">
        <img src="images/players/${photo}"
             alt="${featured.name}"
             onerror="this.src='images/players/default.png'">
      </div>

      <div class="featured-player-text">
        <h3>
          <a href="player.html?id=${featured.id}">
            ${featured.name}
          </a>
        </h3>

        <p><strong>Position:</strong> ${featured.position || "Not recorded"}</p>
        <p><strong>Team:</strong> ${teamName(featured.team || "")}</p>
        <p><strong>Appearances:</strong> ${stats.appsDisplay}</p>
        <p><strong>Goals:</strong> ${stats.goals}</p>

        ${featured.bio ? `<p>${featured.bio}</p>` : ""}
      </div>
    </div>
  `;

}).catch(err => {
  console.error(err);

  const latestEl = document.getElementById("latestAdditions");
  const featuredEl = document.getElementById("featuredPlayer");

  if (latestEl) latestEl.innerHTML = `<p>Error loading latest additions.</p>`;
  if (featuredEl) featuredEl.innerHTML = `<p>Error loading random player.</p>`;
});