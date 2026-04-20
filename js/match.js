const id = new URLSearchParams(window.location.search).get('id');

Promise.all([
  fetch('data/matches.json').then(r => r.json()),
  fetch('data/appearances.json').then(r => r.json()),
  fetch('data/players.json').then(r => r.json()),
  fetch('data/teams.json').then(r => r.json()),
  fetch('data/captains.json').then(r => r.json()).catch(() => []),
  fetch('data/managers.json').then(r => r.json()).catch(() => [])
]).then(([matches, apps, players, teams, captains, managers]) => {
  const match = matches.find(m => String(m.id).trim() === String(id).trim());
  const el = document.getElementById('match');

  if (!match) {
    el.innerHTML = '<div class="content-box"><p>Match not found.</p></div>';
    return;
  }

  const homeTeam = teams.find(t => String(t.id).trim() === String(match.home_team).trim());
  const awayTeam = teams.find(t => String(t.id).trim() === String(match.away_team).trim());

  const homeName = homeTeam ? homeTeam.name : match.home_team;
  const awayName = awayTeam ? awayTeam.name : match.away_team;

  function playerName(playerId) {
    const p = players.find(x => String(x.id).trim() === String(playerId).trim());
    return p ? p.name : playerId;
  }

  function slugifyCompetition(name) {
    return String(name || '')
      .toLowerCase()
      .trim()
      .replace(/&/g, 'and')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function competitionBadgeHtml(competition) {
    if (!competition || String(competition).trim() === '') return '';
    const slug = slugifyCompetition(competition);
    return `<img class="competition-badge" src="images/competitions/${slug}.png" alt="${competition}" title="${competition}" onerror="this.style.display='none'">`;
  }

  function inSeasonRange(item, seasonId) {
    return Number(item.start_season || 0) <= Number(seasonId) &&
           Number(item.end_season || 0) >= Number(seasonId);
  }

  function getCaptain(teamId, seasonId) {
    return captains.find(c =>
      String(c.team_id).trim() === String(teamId).trim() &&
      inSeasonRange(c, seasonId)
    );
  }

  function getManager(teamId, seasonId) {
    return managers.find(m =>
      String(m.team_id).trim() === String(teamId).trim() &&
      inSeasonRange(m, seasonId)
    );
  }

  const homeCaptain = getCaptain(match.home_team, match.season_id);
  const awayCaptain = getCaptain(match.away_team, match.season_id);
  const homeManager = getManager(match.home_team, match.season_id);
  const awayManager = getManager(match.away_team, match.season_id);

  const homeCaptainHtml = homeCaptain
    ? `<a href="player.html?id=${homeCaptain.player_id}">${playerName(homeCaptain.player_id)}</a>`
    : 'Not recorded';

  const awayCaptainHtml = awayCaptain
    ? `<a href="player.html?id=${awayCaptain.player_id}">${playerName(awayCaptain.player_id)}</a>`
    : 'Not recorded';

  const homeManagerHtml = homeManager
    ? `<a href="player.html?id=${homeManager.player_id}">${playerName(homeManager.player_id)}</a>`
    : 'Not recorded';

  const awayManagerHtml = awayManager
    ? `<a href="player.html?id=${awayManager.player_id}">${playerName(awayManager.player_id)}</a>`
    : 'Not recorded';

  const notesHtml = match.notes && String(match.notes).trim() !== ''
    ? `
      <div class="content-box section-block">
        <h3>Notes</h3>
        <p>${match.notes}</p>
      </div>
    `
    : '';

  const homeScoreNum = Number(match.home_score || 0);
  const awayScoreNum = Number(match.away_score || 0);

  let homeResultClass = 'match-team-draw';
  let awayResultClass = 'match-team-draw';

  if (homeScoreNum > awayScoreNum) {
    homeResultClass = 'match-team-winner';
    awayResultClass = 'match-team-loser';
  } else if (awayScoreNum > homeScoreNum) {
    homeResultClass = 'match-team-loser';
    awayResultClass = 'match-team-winner';
  }

  el.innerHTML = `
    <div class="content-box">
      <div class="competition-header">
        ${competitionBadgeHtml(match.competition)}
        <div>
          <div class="match-score-header">
            <div class="match-team-line ${homeResultClass}">
              <span class="team-inline">
                <img class="team-badge-medium" src="images/teams/${match.home_team}.png" alt="" onerror="this.style.display='none'">
                <span>${homeName}</span>
              </span>
              <span class="team-line-score">${match.home_score}</span>
            </div>

            <div class="match-team-line ${awayResultClass}">
              <span class="team-inline">
                <img class="team-badge-medium" src="images/teams/${match.away_team}.png" alt="" onerror="this.style.display='none'">
                <span>${awayName}</span>
              </span>
              <span class="team-line-score">${match.away_score}</span>
            </div>
          </div>

          <p class="stat-line"><strong>Competition:</strong> ${match.competition || ''}</p>
        </div>
      </div>

      <p class="stat-line"><strong>Date:</strong> ${match.date || ''}</p>
      <p class="stat-line"><strong>Kick-off:</strong> ${match.kickoff_time || 'Not recorded'}</p>
      <p class="stat-line"><strong>Round:</strong> ${match.round || ''}</p>
      <p class="stat-line"><strong>Venue:</strong> ${match.venue || 'Not recorded'}</p>
      <p class="stat-line"><strong>Attendance:</strong> ${match.attendance || 'Not recorded'}</p>
      <p class="stat-line"><strong>Referee:</strong> ${match.referee || 'Not recorded'}</p>
    </div>

    <div class="content-box section-block">
      <h3>Captains & Managers</h3>
      <table class="archive-table">
        <thead>
          <tr>
            <th>Team</th>
            <th>Captain</th>
            <th>Manager</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <span class="team-inline">
                <img class="team-badge-small" src="images/teams/${match.home_team}.png" alt="" onerror="this.style.display='none'">
                <a href="team.html?id=${match.home_team}">${homeName}</a>
              </span>
            </td>
            <td>${homeCaptainHtml}</td>
            <td>${homeManagerHtml}</td>
          </tr>
          <tr>
            <td>
              <span class="team-inline">
                <img class="team-badge-small" src="images/teams/${match.away_team}.png" alt="" onerror="this.style.display='none'">
                <a href="team.html?id=${match.away_team}">${awayName}</a>
              </span>
            </td>
            <td>${awayCaptainHtml}</td>
            <td>${awayManagerHtml}</td>
          </tr>
        </tbody>
      </table>
    </div>

    ${notesHtml}
  `;

  const matchApps = apps.filter(a => String(a.match_id).trim() === String(id).trim());
  const homeApps = matchApps.filter(a => String(a.team).trim() === String(match.home_team).trim());
  const awayApps = matchApps.filter(a => String(a.team).trim() === String(match.away_team).trim());

  function renderTeamSection(title, teamApps) {
    let html = `<div class="content-box section-block match-lineup-column"><h3>${title}</h3>`;

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

    html += `</div>`;
    return html;
  }

  const homeHasInfo = homeApps.length > 0;
  const awayHasInfo = awayApps.length > 0;

  if (homeHasInfo || awayHasInfo) {
    let lineupHtml = `<div class="match-lineups-grid">`;

    if (homeHasInfo) {
      lineupHtml += renderTeamSection(homeName, homeApps);
    }

    if (awayHasInfo) {
      lineupHtml += renderTeamSection(awayName, awayApps);
    }

    lineupHtml += `</div>`;

    el.innerHTML += lineupHtml;
  } else {
    el.innerHTML += `
      <div class="content-box section-block">
        <h3>Line-ups</h3>
        <div>No player information recorded for this match.</div>
      </div>
    `;
  }

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

  el.innerHTML += `
    <div class="content-box section-block">
      <h3>Match Timeline</h3>
      <div id="timeline"></div>
    </div>
  `;

  const timelineEl = document.getElementById('timeline');

  if (allEvents.length === 0) {
    timelineEl.innerHTML = `<div>No timeline events recorded</div>`;
  } else {
    allEvents.forEach(ev => {
      timelineEl.innerHTML += `<div class="timeline-event">${ev.minute}' ${ev.text}</div>`;
    });
  }

}).catch(err => {
  document.getElementById('match').innerHTML =
    `<div class="content-box"><p>Error loading match page: ${err.message}</p></div>`;
  console.error(err);
});