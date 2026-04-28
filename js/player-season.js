const params = new URLSearchParams(window.location.search);

const playerId = params.get("player");
const seasonId = params.get("season");

Promise.all([
  fetch("data/players.json").then(r => r.json()),
  fetch("data/appearances.json").then(r => r.json()),
  fetch("data/matches.json").then(r => r.json()),
  fetch("data/seasons.json").then(r => r.json()),
  fetch("data/teams.json").then(r => r.json())
]).then(([players, apps, matches, seasons, teams]) => {
  const player = players.find(p => String(p.id).trim() === String(playerId).trim());
  const season = seasons.find(s => String(s.id).trim() === String(seasonId).trim());

  const titleEl = document.getElementById("title");
  const statsEl = document.getElementById("stats");
  const matchesEl = document.getElementById("matches");

  if (!player || !season) {
    titleEl.textContent = "Player season not found";
    statsEl.innerHTML = "<p>Missing player or season data.</p>";
    return;
  }

  function isCountableMatch(match) {
    return (
      match &&
      String(match.abandoned || "").trim().toUpperCase() !== "Y" &&
      match.home_score !== "?" &&
      match.away_score !== "?" &&
      !Number.isNaN(Number(match.home_score)) &&
      !Number.isNaN(Number(match.away_score))
    );
  }

  function isFriendlyCompetition(competition) {
    const value = String(competition || "").trim().toLowerCase();
    return value === "fr" || value === "friendly" || value === "friendlies";
  }

  function teamName(teamValue) {
    const team = teams.find(t =>
      String(t.id).trim() === String(teamValue).trim() ||
      String(t.name).trim() === String(teamValue).trim()
    );
    return team ? team.name : teamValue;
  }

  function buildStatBlock(appRows) {
    const starts = appRows.filter(a => Number(a.is_starting) === 1).length;
    const subs = appRows.filter(a => Number(a.is_starting) !== 1).length;
    const goals = appRows.reduce((sum, a) => sum + Number(a.goals || 0), 0);

    return {
      starts,
      subs,
      goals,
      appsDisplay: subs > 0 ? `${starts}+${subs}` : `${starts}`
    };
  }

  titleEl.textContent = `${player.name} — ${season.name}`;

  const seasonMatches = matches.filter(m =>
    String(m.season_id).trim() === String(seasonId).trim() &&
    isCountableMatch(m)
  );

  const seasonMatchIds = new Set(seasonMatches.map(m => String(m.id).trim()));

  const playerApps = apps.filter(a =>
    String(a.player_id).trim() === String(playerId).trim() &&
    seasonMatchIds.has(String(a.match_id).trim())
  );

  const competitiveApps = playerApps.filter(a => {
    const match = matches.find(m => String(m.id).trim() === String(a.match_id).trim());
    return match && !isFriendlyCompetition(match.competition);
  });

  const friendlyApps = playerApps.filter(a => {
    const match = matches.find(m => String(m.id).trim() === String(a.match_id).trim());
    return match && isFriendlyCompetition(match.competition);
  });

  const competitiveStats = buildStatBlock(competitiveApps);
  const friendlyStats = buildStatBlock(friendlyApps);
  const totalStats = buildStatBlock(playerApps);

  const totalMinutes = playerApps.reduce((sum, a) => {
    const isStarting = Number(a.is_starting) === 1;
    const minuteIn = Number(a.minute_in || 0);
    const minuteOutRaw = Number(a.minute_out || 0);

    if (isStarting) {
      const minuteOut = minuteOutRaw > 0 ? minuteOutRaw : 90;
      return sum + Math.max(0, minuteOut);
    }

    if (minuteIn > 0) {
      const minuteOut = minuteOutRaw > 0 ? minuteOutRaw : 90;
      return sum + Math.max(0, minuteOut - minuteIn);
    }

    return sum;
  }, 0);

  const totalYellows = playerApps.reduce((sum, a) => sum + Number(a.yellow || 0), 0);
  const totalReds = playerApps.reduce((sum, a) => sum + Number(a.red || 0), 0);

  statsEl.innerHTML = `
    <div class="player-stats-grid">
      <div class="player-stat-box">
        <div class="player-stat-title">Competitive</div>
        <p>Appearances: <strong>${competitiveStats.appsDisplay}</strong></p>
        <p>Goals: <strong>${competitiveStats.goals}</strong></p>
      </div>

      <div class="player-stat-box">
        <div class="player-stat-title">Friendly</div>
        <p>Appearances: <strong>${friendlyStats.appsDisplay}</strong></p>
        <p>Goals: <strong>${friendlyStats.goals}</strong></p>
      </div>

      <div class="player-stat-box">
        <div class="player-stat-title">Total</div>
        <p>Appearances: <strong>${totalStats.appsDisplay}</strong></p>
        <p>Goals: <strong>${totalStats.goals}</strong></p>
      </div>
    </div>

    <p><strong>Minutes:</strong> ${totalMinutes}</p>
    <p><strong>Yellow cards:</strong> ${totalYellows}</p>
    <p><strong>Red cards:</strong> ${totalReds}</p>
  `;

  if (playerApps.length === 0) {
    matchesEl.innerHTML = "<div>No matches recorded for this player in this season.</div>";
    return;
  }

  const rows = playerApps
    .map(a => {
      const m = matches.find(x => String(x.id).trim() === String(a.match_id).trim());
      if (!m || !isCountableMatch(m)) return null;

      const appearanceType = Number(a.is_starting) === 1 ? "Start" : "Sub";

      let minuteInfo = "";
      if (Number(a.is_starting) === 1) {
        if (Number(a.minute_out || 0) > 0 && Number(a.minute_out || 0) < 90) {
          minuteInfo = ` (off ${a.minute_out}')`;
        }
      } else {
        if (Number(a.minute_in || 0) > 0) {
          minuteInfo = ` (on ${a.minute_in}')`;
        }
      }

      return {
        date: m.date || "",
        id: m.id,
        competition: m.competition || "",
        matchText: `${teamName(m.home_team)} ${m.home_score}-${m.away_score} ${teamName(m.away_team)}`,
        appearanceType,
        minuteInfo,
        goals: Number(a.goals || 0)
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const da = new Date(a.date.split("/").reverse().join("-"));
      const db = new Date(b.date.split("/").reverse().join("-"));
      return da - db;
    });

  matchesEl.innerHTML = rows.map(row => `
    <div>
      <a href="match.html?id=${row.id}">
        ${row.date} ${row.matchText}
      </a>
      — ${row.competition}
      — ${row.appearanceType}${row.minuteInfo}
      ${row.goals > 0 ? ` — Goals: ${row.goals}` : ""}
    </div>
  `).join("");
}).catch(err => {
  document.getElementById("title").textContent = "Error loading player season";
  document.getElementById("stats").innerHTML = `<p>${err.message}</p>`;
  console.error(err);
});