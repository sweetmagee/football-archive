(function () {
  const featuredEl = document.getElementById("featuredPlayer");
  const randomBtn = document.getElementById("randomPlayerBtn");

  if (!featuredEl) return;

  function normalise(value) {
    return String(value || "").trim();
  }

  async function fetchJson(path, fallback) {
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) throw new Error(`${path} returned ${response.status}`);
      return await response.json();
    } catch (error) {
      console.warn(`Could not load ${path}`, error);
      return fallback;
    }
  }

  function hasRealPhoto(player) {
    const photo = normalise(player.photo).toLowerCase();
    return photo && photo !== "default.png" && photo !== "default.jpg";
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

    return map[Number(shirt)] || "Unknown";
  }

  function escapeHtml(value) {
    return normalise(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  Promise.all([
    fetchJson("data/players.json", []),
    fetchJson("data/appearances.json", []),
    fetchJson("data/matches.json", []),
    fetchJson("data/seasons.json", [])
  ]).then(([players, appearances, matches, seasons]) => {
    const appsByPlayer = new Map();

    appearances.forEach(app => {
      const playerId = normalise(app.player_id);
      if (!playerId) return;
      if (!appsByPlayer.has(playerId)) appsByPlayer.set(playerId, []);
      appsByPlayer.get(playerId).push(app);
    });

    const matchById = new Map(matches.map(match => [normalise(match.id), match]));
    const seasonById = new Map(seasons.map(season => [normalise(season.id), season]));

    function playerAppearances(playerId) {
      return appsByPlayer.get(normalise(playerId)) || [];
    }

    function hasMeaningfulData(player) {
      return playerAppearances(player.id).length > 0;
    }

    function getPrimaryPosition(playerId) {
      const counts = {};

      playerAppearances(playerId).forEach(row => {
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
      const seasonIds = [...new Set(
        playerAppearances(playerId)
          .map(app => matchById.get(normalise(app.match_id)))
          .filter(Boolean)
          .map(match => normalise(match.season_id))
      )];

      const ordered = seasonIds
        .map(id => seasonById.get(id))
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

    function renderRandomPlayer(excludeId = null) {
      let eligiblePlayers = players.filter(hasMeaningfulData);

      // Prefer real photos, but do not fail if none are available.
      const withPhotos = eligiblePlayers.filter(hasRealPhoto);
      if (withPhotos.length) eligiblePlayers = withPhotos;

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
      const bio = normalise(player.bio);

      featuredEl.dataset.currentPlayerId = player.id;

      featuredEl.innerHTML = `
        <div class="featured-player-card">
          <div class="featured-player-image">
            <img src="images/players/${escapeHtml(photo)}"
                 alt="${escapeHtml(player.name)}"
                 onerror="this.onerror=null;this.src='images/players/default.png'">
          </div>

          <div class="featured-player-text">
            <h3><a href="player.html?id=${encodeURIComponent(player.id)}">${escapeHtml(player.name)}</a></h3>
            <p><strong>Primary Position:</strong> ${escapeHtml(primaryPosition)}</p>
            <p><strong>Seasons:</strong> ${escapeHtml(seasonsPlayed)}</p>
            <p><strong>Total Appearances:</strong> ${stats.totalApps}</p>
            <p><strong>Total Goals:</strong> ${stats.goals}</p>
            ${bio ? `<p>${escapeHtml(bio)}</p>` : ""}
          </div>
        </div>
      `;
    }

    renderRandomPlayer();

    if (randomBtn) {
      randomBtn.addEventListener("click", () => {
        renderRandomPlayer(featuredEl.dataset.currentPlayerId || null);
      });
    }
  }).catch(error => {
    console.error("Random player error:", error);
    featuredEl.innerHTML = `<p>Error loading random player.</p>`;
  });
})();
