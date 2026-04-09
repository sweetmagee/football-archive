const id = new URLSearchParams(window.location.search).get('id');

Promise.all([
  fetch('data/matches.json').then(r => r.json()),
  fetch('data/appearances.json').then(r => r.json()),
  fetch('data/players.json').then(r => r.json()),
  fetch('data/teams.json').then(r => r.json())
]).then(([matches, apps, players, teams]) => {
  const match = matches.find(m => String(m.id).trim() === String(id).trim());
  const el = document.getElementById('match');

  if (!match) {
    el.innerHTML = '<p>Match not found.</p>';
    return;
  }

  const homeTeam = teams.find(t => String(t.id).trim() === String(match.home_team).trim());
  const awayTeam = teams.find(t => String(t.id).trim() === String(match.away_team).trim());

  const homeName = homeTeam ? homeTeam.name : match.home_team;
  const awayName = awayTeam ? awayTeam.name : match.away_team;

  el.innerHTML = `
    <h2>${homeName} ${match.home_score}-${match.away_score} ${awayName}</h2>
    <p><strong>Date:</strong> ${match.date || ''}</p>
    <p><strong>Competition:</strong> ${match.competition || ''}</p>
    <p><strong>Round:</strong> ${match.round || ''}</p>
  `;

  const matchApps = apps.filter(a => String(a.match_id).trim() === String(id).trim());

  const homeApps = matchApps.filter(a => String(a.team).trim() === String(match.home_team).trim());
  const awayApps = matchApps.filter(a => String(a.team).trim() === String(match.away_team).trim());

  function playerName(playerId) {
    const p = players.find(x => String(x.id).trim() === String(playerId).trim());
    return p ? p.name : playerId;
  }

  function renderTeamSection(title, teamApps) {
    let html = `<h3>${title}</h3>`;

    const starters = teamApps.filter(a => Number(a.is_starting) === 1);
    const subs = teamApps.filter(a => Number(a.is_starting) !== 1);
    const scorers = teamApps.filter(a => Number(a.goals || 0) > 0);
    const yellows = teamApps.filter(a => Number(a.yellow || 0) > 0);
    const reds = teamApps.filter(a => Number(a.red || 0) > 0);

    html += `<h4>Starting XI</h4>`;
    if (starters.length === 0) {
      html += `<div>None listed</div>`;
    } else {
      starters.forEach(a => {
        html += `
          <div>
            <a href="player.html?id=${a.player_id}">${playerName(a.player_id)}</a>
            ${a.minute_out ? `(${a.minute_out}')` : ''}
          </div>
        `;
      });
    }

    html += `<h4>Substitutes</h4>`;
    if (subs.length === 0) {
      html += `<div>None listed</div>`;
    } else {
      subs.forEach(a => {
        html += `
          <div>
            <a href="player.html?id=${a.player_id}">${playerName(a.player_id)}</a>
            ${a.minute_in ? `(${a.minute_in}')` : ''}
          </div>
        `;
      });
    }

    html += `<h4>Goals</h4>`;
    if (scorers.length === 0) {
      html += `<div>No goals recorded</div>`;
    } else {
      scorers.forEach(a => {
        html += `
          <div>
            <a href="player.html?id=${a.player_id}">${playerName(a.player_id)}</a>
            — ${a.goals}
          </div>
        `;
      });
    }

    html += `<h4>Yellow Cards</h4>`;
    if (yellows.length === 0) {
      html += `<div>None</div>`;
    } else {
      yellows.forEach(a => {
        html += `
          <div>
            <a href="player.html?id=${a.player_id}">${playerName(a.player_id)}</a>
            — ${a.yellow}
          </div>
        `;
      });
    }

    html += `<h4>Red Cards</h4>`;
    if (reds.length === 0) {
      html += `<div>None</div>`;
    } else {
      reds.forEach(a => {
        html += `
          <div>
            <a href="player.html?id=${a.player_id}">${playerName(a.player_id)}</a>
            — ${a.red}
          </div>
        `;
      });
    }

    return html;
  }

  el.innerHTML += renderTeamSection(homeName, homeApps);
  el.innerHTML += renderTeamSection(awayName, awayApps);

  const allEvents = [];

  matchApps.forEach(a => {
    const name = playerName(a.player_id);

    if (Number(a.goals || 0) > 0) {
      for (let i = 0; i < Number(a.goals); i++) {
        allEvents.push({
          minute: Number(a.minute_out || a.minute_in || 0),
          text: `⚽ ${name}`
        });
      }
    }

    if (Number(a.is_starting) !== 1 && Number(a.minute_in || 0) > 0) {
      allEvents.push({
        minute: Number(a.minute_in),
        text: `⬆ ${name}`
      });
    }

    if (Number(a.yellow || 0) > 0) {
      allEvents.push({
        minute: Number(a.minute_out || a.minute_in || 0),
        text: `🟨 ${name}`
      });
    }

    if (Number(a.red || 0) > 0) {
      allEvents.push({
        minute: Number(a.minute_out || a.minute_in || 0),
        text: `🟥 ${name}`
      });
    }
  });

  allEvents.sort((a, b) => a.minute - b.minute);

  el.innerHTML += `<h3>Match Timeline</h3>`;
  if (allEvents.length === 0) {
    el.innerHTML += `<div>No timeline events recorded</div>`;
  } else {
    allEvents.forEach(ev => {
      el.innerHTML += `<div>${ev.minute}' ${ev.text}</div>`;
    });
  }
}).catch(err => {
  document.getElementById('match').innerHTML = `<p>Error loading match page: ${err.message}</p>`;
  console.error(err);
});