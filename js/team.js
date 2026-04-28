
const id = new URLSearchParams(window.location.search).get('id');

Promise.all([
  fetch('data/teams.json').then(r => r.json()),
  fetch('data/players.json').then(r => r.json()),
  fetch('data/matches.json').then(r => r.json()),
  fetch('data/seasons.json').then(r => r.json()),
  fetch('data/appearances.json').then(r => r.json())
]).then(([teams, players, matches, seasons, appearances]) => {

  const team = teams.find(t => String(t.id).trim() === String(id).trim());
  const el = document.getElementById('teamPage');

  if (!team) {
    el.innerHTML = '<div class="content-box"><p>Team not found.</p></div>';
    return;
  }

  const isMargatePage = String(id).trim() === 't1';

  function isFriendly(match) {
    const comp = String(match.competition || '').trim().toLowerCase();
    return comp === 'friendly' || comp.includes('friendly');
  }

  function isAbandoned(match) {
    return String(match.abandoned || '').trim().toUpperCase() === 'Y';
  }

  function isCountableMatch(match) {
    return match && !isAbandoned(match) &&
      match.home_score !== '?' && match.away_score !== '?' &&
      !Number.isNaN(Number(match.home_score)) &&
      !Number.isNaN(Number(match.away_score));
  }

  function teamName(teamId) {
    const t = teams.find(x => String(x.id).trim() === String(teamId).trim());
    return t ? t.name : teamId;
  }

  function teamBadgeHtml(teamId) {
    return `<img class="team-badge-small" src="images/teams/${teamId}.png" alt="" onerror="this.onerror=null;this.src='images/teams/defaultbadge.png';">`;
  }

  const teamMatches = matches.filter(m => {
    if (!isCountableMatch(m)) return false;
    if (isMargatePage) {
      return String(m.home_team).trim() === id || String(m.away_team).trim() === id;
    }
    return (
      (String(m.home_team).trim() === 't1' && String(m.away_team).trim() === id) ||
      (String(m.away_team).trim() === 't1' && String(m.home_team).trim() === id)
    );
  });

  function getRecord(matchList) {
    let P=0,W=0,D=0,L=0,GF=0,GA=0;
    matchList.forEach(m => {
      let gf, ga;
      if (isMargatePage) {
        const home = String(m.home_team).trim() === id;
        gf = home ? Number(m.home_score) : Number(m.away_score);
        ga = home ? Number(m.away_score) : Number(m.home_score);
      } else {
        const margateHome = String(m.home_team).trim() === 't1';
        gf = margateHome ? Number(m.home_score) : Number(m.away_score);
        ga = margateHome ? Number(m.away_score) : Number(m.home_score);
      }
      P++; GF+=gf; GA+=ga;
      if (gf>ga) W++; else if (gf<ga) L++; else D++;
    });
    return {P,W,D,L,GF,GA,GD:GF-GA};
  }

  function recordTableHtml(matchList) {
    const competitive = getRecord(matchList.filter(m => !isFriendly(m)));
    const friendly = getRecord(matchList.filter(m => isFriendly(m)));
    const overall = getRecord(matchList);

    const row = (label,r) => `
      <tr>
        <td>${label}</td><td>${r.P}</td><td>${r.W}</td><td>${r.D}</td><td>${r.L}</td>
        <td>${r.GF}</td><td>${r.GA}</td><td>${r.GD}</td>
      </tr>`;

    return `
      <table class="archive-table">
        <thead>
          <tr>
            <th>Record</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th><th>GD</th>
          </tr>
        </thead>
        <tbody>
          ${row('Competitive Record', competitive)}
          ${row('Friendly Record', friendly)}
          ${row('Overall Record', overall)}
        </tbody>
      </table>`;
  }

  el.innerHTML = `
    <div class="content-box">
      <div class="team-header">
        <img class="team-badge-large" src="images/teams/${team.id}.png" alt="${team.name}"
             onerror="this.onerror=null;this.src='images/teams/defaultbadge.png';">
        <div class="team-header-text" style="width:100%;">
          <h2>${team.name}</h2>
          ${recordTableHtml(teamMatches)}
        </div>
      </div>
    </div>

    <div class="content-box section-block">
      <h3>Matches</h3>
      <div id="teamMatches"></div>
    </div>
  `;

  const wrap = document.getElementById('teamMatches');

  if (!teamMatches.length) {
    wrap.innerHTML = '<div>No matches found.</div>';
    return;
  }

  teamMatches.forEach((m, i) => {
    wrap.innerHTML += `
      <div class="match-row">
        <a href="match.html?id=${m.id}" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <strong>#${String(i+1).padStart(3,'0')}</strong>
          <span>${m.date || ''}</span>
          <span class="team-inline">${teamBadgeHtml(m.home_team)}<span>${teamName(m.home_team)}</span></span>
          <span class="score-separator">${m.home_score}-${m.away_score}</span>
          <span class="team-inline">${teamBadgeHtml(m.away_team)}<span>${teamName(m.away_team)}</span></span>
          <span class="match-meta">${m.competition || ''}</span>
        </a>
      </div>`;
  });

}).catch(err => {
  document.getElementById('teamPage').innerHTML =
    `<div class="content-box"><p>Error loading team page: ${err.message}</p></div>`;
});
