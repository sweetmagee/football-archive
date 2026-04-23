const id = new URLSearchParams(window.location.search).get("id");

Promise.all([
  fetch("data/matches.json").then(r => r.json()),
  fetch("data/appearances.json").then(r => r.json()),
  fetch("data/players.json").then(r => r.json()),
  fetch("data/teams.json").then(r => r.json()),
  fetch("data/managers.json").then(r => r.json()).catch(() => [])
]).then(([matches, apps, players, teams, managers]) => {
  const el = document.getElementById("match");
  const index = matches.findIndex(m => String(m.id).trim() === String(id).trim());

  if (index === -1) {
    el.innerHTML = `<div class="content-box"><p>Match not found.</p></div>`;
    return;
  }

  const match = matches[index];
  const prevMatch = index > 0 ? matches[index - 1] : null;
  const nextMatch = index < matches.length - 1 ? matches[index + 1] : null;

  function navHtml() {
    return `
      <div class="match-nav">
        <div class="match-nav-left">
          ${prevMatch ? `<a href="match.html?id=${prevMatch.id}">← Previous</a>` : ``}
        </div>
        <div class="match-nav-right">
          ${nextMatch ? `<a href="match.html?id=${nextMatch.id}">Next →</a>` : ``}
        </div>
      </div>
    `;
  }

  function resolveTeam(teamValue) {
    return teams.find(t =>
      String(t.id).trim() === String(teamValue).trim() ||
      String(t.name).trim() === String(teamValue).trim()
    );
  }

  function getPlayer(playerId) {
    return players.find(p => String(p.id).trim() === String(playerId).trim());
  }

  function playerName(playerId) {
    const p = getPlayer(playerId);
    return p ? p.name : playerId;
  }

  function splitName(fullName) {
    const parts = String(fullName || "").trim().split(/\s+/);
    const last = parts.pop() || "";
    const first = parts.join(" ");
    return { first, last };
  }

  function scorerName(playerId, allIds) {
    const p = getPlayer(playerId);
    if (!p) return playerId;

    const { first, last } = splitName(p.name);

    const sameSurname = allIds
      .map(id => getPlayer(id))
      .filter(Boolean)
      .filter(x => splitName(x.name).last.toLowerCase() === last.toLowerCase());

    if (sameSurname.length > 1 && first) {
      return `${first.charAt(0)}.${last}`;
    }

    return last;
  }

  function joinScorers(arr) {
    if (arr.length === 1) return arr[0];
    if (arr.length === 2) return `${arr[0]} & ${arr[1]}`;
    return `${arr.slice(0, -1).join(", ")} & ${arr[arr.length - 1]}`;
  }

  function margateScorers() {
    const teamApps = apps.filter(a =>
      String(a.match_id) === String(match.id) &&
      String(a.team) === "t1"
    );

    const scorers = teamApps.filter(a => Number(a.goals || 0) > 0);
    if (!scorers.length) return "";

    const allIds = teamApps.map(a => a.player_id);

    const rows = scorers.map(a => ({
      name: scorerName(a.player_id, allIds),
      surname: splitName(playerName(a.player_id)).last,
      goals: Number(a.goals || 0)
    }));

    rows.sort((a, b) =>
      b.goals - a.goals ||
      a.surname.localeCompare(b.surname)
    );

    const out = rows.map(r =>
      r.goals > 1 ? `${r.name} (${r.goals})` : r.name
    );

    return ` <span class="margate-scorers">(${joinScorers(out)})</span>`;
  }

  const home = resolveTeam(match.home_team);
  const away = resolveTeam(match.away_team);

  const homeName = home ? home.name : match.home_team;
  const awayName = away ? away.name : match.away_team;

  const scorers = margateScorers();

  const homeLine =
    match.home_team === "t1"
      ? `${homeName} ${match.home_score}${scorers}`
      : `${homeName} ${match.home_score}`;

  const awayLine =
    match.away_team === "t1"
      ? `${awayName} ${match.away_score}${scorers}`
      : `${awayName} ${match.away_score}`;

  const managerId =
    match.home_team === "t1"
      ? match.home_manager_id
      : match.away_team === "t1"
        ? match.away_manager_id
        : "";

  const manager = managers.find(m => String(m.id) === String(managerId));

  el.innerHTML = `
    ${navHtml()}

    <div class="content-box">
      <div class="match-score-header">
        <div class="match-team-line">
          <span class="match-line-text">${homeLine}</span>
        </div>
        <div class="match-team-line">
          <span class="match-line-text">${awayLine}</span>
        </div>
      </div>

      ${match.notes ? `<p class="stat-line"><strong>Notes:</strong> ${match.notes}</p>` : ""}
      ${manager ? `<p class="stat-line"><strong>Manager:</strong> <a href="manager.html?id=${manager.id}">${manager.name}</a></p>` : ""}
      <p class="stat-line"><strong>Competition:</strong> ${match.competition || ""}</p>
      <p class="stat-line"><strong>Date:</strong> ${match.date || ""}</p>
      <p class="stat-line"><strong>Venue:</strong> ${match.venue || "Not recorded"}</p>
      <p class="stat-line"><strong>Attendance:</strong> ${match.attendance || "Unknown"}</p>
    </div>

    ${navHtml()}
  `;
});