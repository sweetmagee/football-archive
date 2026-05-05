(function () {
  function fetchJson(path, fallback) {
    return fetch(path)
      .then(response => {
        if (!response.ok) throw new Error(`${path}: ${response.status}`);
        return response.json();
      })
      .catch(error => {
        console.warn(`Optional/homepage data failed to load: ${path}`, error);
        return fallback;
      });
  }

  Promise.all([
    fetchJson("data/players.json", []),
    fetchJson("data/appearances.json", []),
    fetchJson("data/matches.json", []),
    fetchJson("data/seasons.json", [])
  ]).then(([players, appearances, matches, seasons]) => {
    const latestEl = document.getElementById("latestAdditions");
    const featuredEl = document.getElementById("featuredPlayer");
    const randomBtn = document.getElementById("randomPlayerBtn");

    if (!featuredEl) return;

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
      return player && normalise(player.id) && playerAppearances(player.id).length > 0;
    }

    function positionLabel(shirt) {
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

      return map[Number(shirt)] || normalise(shirt) || "Unknown";
    }

    function getPrimaryPosition(playerId) {
      const rows = playerAppearances(playerId);
      const counts = {};

      rows.forEach(row => {
        const pos = positionLabel(row.shirt_number);
        counts[pos] = (counts[pos] || 0) + 1;
      });

      const sorted = Object.entries(counts)
        .map(([position, count]) => ({ position, count }))
        .sort((a, b) => b.count - a.count || a.position.localeCompare(b.position));

      return sorted.length ? sorted[0].position : "Unknown";
    }

    function getPlayerStats(playerId) {
      const rows = playerAppearances(playerId);
      const starts = rows.filter(a => Number(a.is_starting) === 1).length;
      const subs = rows.filter(a => Number(a.is_starting) !== 1).length;
      const goals = rows.reduce((sum, a) => sum + Number(a.goals || 0), 0);

      return {
        totalApps: starts + subs,
        goals
      };
    }

    function getPlayerSeasons(playerId) {
      const rows = playerAppearances(playerId)
        .map(a => matches.find(m => normalise(m.id) === normalise(a.match_id)))
        .filter(Boolean);

      const seasonIds = [...new Set(rows.map(m => normalise(m.season_id)).filter(Boolean))];

      const ordered = seasonIds
        .map(id => seasons.find(s => normalise(s.id) === id))
        .filter(Boolean)
        .sort((a, b) =>
          Number(a.start_year || 0) - Number(b.start_year || 0) ||
          normalise(a.name).localeCompare(normalise(b.name))
        );

      if (!ordered.length) return "Unknown";

      const first = ordered[0].name;
      const last = ordered[ordered.length - 1].name;

      return first === last ? first : `${first} to ${last}`;
    }

    function formatDateAdded(value) {
      if (!value) return "";
      const d = new Date(value);
      if (Number.isNaN(d.getTime())) return value;

      return d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    }

    function renderRandomPlayer(excludeId = null) {
      let eligiblePlayers = players.filter(hasMeaningfulData);

      if (!eligiblePlayers.length) {
        eligiblePlayers = players.filter(p => normalise(p.id));
      }

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
      const primaryPosition = getPrimaryPosition(player.id);
      const seasonsPlayed = getPlayerSeasons(player.id);
      const photo = hasRealPhoto(player) ? normalise(player.photo) : "default.png";

      featuredEl.dataset.currentPlayerId = player.id;

      featuredEl.innerHTML = `
        <div class="featured-player-card">
          <div class="featured-player-image">
            <img src="images/players/${photo}"
                 alt="${player.name || "Random player"}"
                 onerror="this.onerror=null;this.src='images/players/default.png'">
          </div>

          <div class="featured-player-text">
            <h3>
              <a href="player.html?id=${player.id}">${player.name || player.id}</a>
            </h3>

            <p><strong>Primary Position:</strong> ${primaryPosition}</p>
            <p><strong>Seasons:</strong> ${seasonsPlayed}</p>
            <p><strong>Total Appearances:</strong> ${stats.totalApps}</p>
            <p><strong>Total Goals:</strong> ${stats.goals}</p>

            ${player.bio ? `<p>${player.bio}</p>` : ""}
          </div>
        </div>
      `;
    }

    const latestPlayers = [...players]
      .filter(p => p.date_added && normalise(p.date_added) !== "")
      .sort((a, b) => new Date(b.date_added) - new Date(a.date_added))
      .slice(0, 5);

    if (latestEl) {
      latestEl.innerHTML = latestPlayers.length ? `
        <ul class="home-list">
          ${latestPlayers.map(p => `
            <li>
              <a href="player.html?id=${p.id}">${p.name}</a>
              ${p.date_added ? `<span class="date-added">(${formatDateAdded(p.date_added)})</span>` : ""}
            </li>
          `).join("")}
        </ul>
      ` : `<p>No recent additions available.</p>`;
    }

    renderRandomPlayer();

    if (randomBtn) {
      randomBtn.addEventListener("click", () => {
        const currentId = featuredEl.dataset.currentPlayerId || null;
        renderRandomPlayer(currentId);
      });
    }
  }).catch(err => {
    console.error("Random player error:", err);
    const featuredEl = document.getElementById("featuredPlayer");
    if (featuredEl) featuredEl.innerHTML = `<p>Error loading random player.</p>`;
  });
})();
