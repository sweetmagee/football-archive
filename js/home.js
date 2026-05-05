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

  function normalise(value) {
    return String(value || "").trim();
  }

  function hasRealPhoto(player) {
    const photo = normalise(player.photo).toLowerCase();
    return photo && photo !== "default.png" && photo !== "default.jpg";
  }

  function playerAppearances(playerId) {
    return appearances.filter(a => normalise(a.player_id) === normalise(playerId));
  }

  function hasMeaningfulData(player) {
    return (
      hasRealPhoto(player) &&
      playerAppearances(player.id).length > 0
    );
  }

  function getPlayerStats(playerId) {
    const rows = playerAppearances(playerId);
    const goals = rows.reduce((sum, a) => sum + Number(a.goals || 0), 0);
    return { totalApps: rows.length, goals };
  }

  function renderRandomPlayer(excludeId = null) {
    const eligiblePlayers = players.filter(hasMeaningfulData);

    if (!eligiblePlayers.length) {
      featuredEl.innerHTML = `<p>No eligible random players available.</p>`;
      return;
    }

    let pool = eligiblePlayers;

    if (excludeId && eligiblePlayers.length > 1) {
      pool = eligiblePlayers.filter(p => normalise(p.id) !== normalise(excludeId));
    }

    const player = pool[Math.floor(Math.random() * pool.length)];
    const stats = getPlayerStats(player.id);

    featuredEl.dataset.currentPlayerId = player.id;

    featuredEl.innerHTML = `
      <div class="featured-player-card">
        <div class="featured-player-image">
          <img src="images/players/${player.photo}"
               alt="${player.name}"
               onerror="this.src='images/players/default.png'">
        </div>

        <div class="featured-player-text">
          <h3>
            <a href="player.html?id=${player.id}">
              ${player.name}
            </a>
          </h3>

          <p><strong>Total Appearances:</strong> ${stats.totalApps}</p>
          <p><strong>Total Goals:</strong> ${stats.goals}</p>
        </div>
      </div>
    `;
  }

  renderRandomPlayer();

  if (randomBtn) {
    randomBtn.addEventListener("click", () => {
      const currentId = featuredEl.dataset.currentPlayerId || null;
      renderRandomPlayer(currentId);
    });
  }

}).catch(err => {
  console.error(err);
  const featuredEl = document.getElementById("featuredPlayer");
  if (featuredEl) featuredEl.innerHTML = `<p>Error loading random player.</p>`;
});
