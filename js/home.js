Promise.all([
  fetch("data/players.json").then(r => r.json()),
  fetch("data/appearances.json").then(r => r.json()),
  fetch("data/teams.json").then(r => r.json()),
  fetch("data/matches.json").then(r => r.json()),
  fetch("data/seasons.json").then(r => r.json())
]).then(([players, appearances, teams, matches, seasons]) => {

  const latestEl = document.getElementById("latestAdditions");
  const featuredEl = document.getElementById("featuredPlayer");
  const randomBtn = document.getElementById("randomPlayerBtn");

  function normalise(v) {
    return String(v || "").trim();
  }

  function getPlayerStats(playerId) {
    const pa = appearances.filter(a => normalise(a.player_id) === normalise(playerId));

    const starts = pa.filter(a => Number(a.is_starting) === 1).length;
    const subs = pa.filter(a => Number(a.is_starting) !== 1).length;
    const goals = pa.reduce((sum, a) => sum + Number(a.goals || 0), 0);

    return {
      totalApps: starts + subs,
      goals
    };
  }

  function getPrimaryPosition(playerId) {
    const pa = appearances.filter(a => normalise(a.player_id) === normalise(playerId));

    const counts = {};

    pa.forEach(a => {
      const shirt = Number(a.shirt_number || 0);
      counts[shirt] = (counts[shirt] || 0) + 1;
    });

    const sorted = Object.entries(counts)
      .sort((a, b) => b[1] - a[1]);

    const shirt = sorted.length ? Number(sorted[0][0]) : null;

    const map = {
      1: "Goalkeeper",
      2: "Right-back",
      3: "Left-back",
      4: "Right-half",
      5: "Centre-half",
      6: "Left-half",
      7: "Outside-right",
      8: "Inside-right",
      9: "Centre-forward",
      10: "Inside-left",
      11: "Outside-left"
    };

    return map[shirt] || "Unknown";
  }

  function getPlayerSeasons(playerId) {
    const pa = appearances
      .filter(a => normalise(a.player_id) === normalise(playerId))
      .map(a => matches.find(m => normalise(m.id) === normalise(a.match_id)))
      .filter(Boolean);

    const seasonIds = [...new Set(pa.map(m => normalise(m.season_id)))];

    const ordered = seasonIds
      .map(id => seasons.find(s => normalise(s.id) === id))
      .filter(Boolean)
      .sort((a, b) => Number(a.start_year) - Number(b.start_year));

    if (!ordered.length) return "";

    return `${ordered[0].name} to ${ordered[ordered.length - 1].name}`;
  }

  function renderRandomPlayer(excludeId = null) {
    if (!players.length) {
      featuredEl.innerHTML = `<p>No players available.</p>`;
      return;
    }

    let pool = players;
    if (excludeId && players.length > 1) {
      pool = players.filter(p => normalise(p.id) !== normalise(excludeId));
    }

    const player = pool[Math.floor(Math.random() * pool.length)];
    const stats = getPlayerStats(player.id);
    const position = getPrimaryPosition(player.id);
    const seasonsPlayed = getPlayerSeasons(player.id);

    const photo = player.photo && player.photo.trim()
      ? player.photo.trim()
      : "default.png";

    featuredEl.dataset.currentPlayerId = player.id;

    featuredEl.innerHTML = `
      <div class="featured-player-card">
        <div class="featured-player-image">
          <img src="images/players/${photo}"
               alt="${player.name}"
               onerror="this.src='images/players/default.png'">
        </div>

        <div class="featured-player-text">
          <h3>
            <a href="player.html?id=${player.id}">
              ${player.name}
            </a>
          </h3>

          <p><strong>Primary Position:</strong> ${position}</p>
          <p><strong>Seasons:</strong> ${seasonsPlayed || "Unknown"}</p>
          <p><strong>Total Appearances:</strong> ${stats.totalApps}</p>
          <p><strong>Total Goals:</strong> ${stats.goals}</p>

          ${player.bio ? `<p>${player.bio}</p>` : ""}
        </div>
      </div>
    `;
  }

  // Latest Additions (unchanged)
  const latestPlayers = [...players]
    .filter(p => p.date_added)
    .sort((a, b) => new Date(b.date_added) - new Date(a.date_added))
    .slice(0, 5);

  latestEl.innerHTML = latestPlayers.length
    ? `<ul class="home-list">
        ${latestPlayers.map(p => `
          <li>
            <a href="player.html?id=${p.id}">${p.name}</a>
          </li>
        `).join("")}
      </ul>`
    : `<p>No recent additions available.</p>`;

  renderRandomPlayer();

  if (randomBtn) {
    randomBtn.addEventListener("click", () => {
      const current = featuredEl.dataset.currentPlayerId;
      renderRandomPlayer(current);
    });
  }

}).catch(err => {
  console.error(err);
});