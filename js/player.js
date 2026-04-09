
const id=new URLSearchParams(location.search).get('id');

Promise.all([
fetch('data/players.json').then(r=>r.json()),
fetch('data/appearances.json').then(r=>r.json()),
fetch('data/matches.json').then(r=>r.json())
]).then(([players,apps,matches])=>{
const p=players.find(x=>x.id===id);
const el=document.getElementById('player');

el.innerHTML=`<h2>${p.name}</h2><img src="images/players/${p.photo}" onerror="this.src='images/players/default.jpg'"><p>${p.bio}</p>`;

const pa=apps.filter(a=>a.player_id===id);

el.innerHTML+="<h3>Matches</h3>";
pa.forEach(a=>{
  const m=matches.find(x=>x.id===a.match_id);
  el.innerHTML+=`<div><a href="match.html?id=${m.id}">${m.date} ${m.home_team} ${m.home_score}-${m.away_score} ${m.away_team}</a></div>`;
});
});

const pa = apps.filter(a => a.player_id === id);

// ✅ ADD IT HERE
const seasonStats = {};

pa.forEach(a => {
  const match = matches.find(m => m.id === a.match_id);

  if (!seasonStats[match.season_id]) {
    seasonStats[match.season_id] = { apps: 0, goals: 0 };
  }

  seasonStats[match.season_id].apps += 1;
  seasonStats[match.season_id].goals += Number(a.goals);
});

el.innerHTML += `
  <div>
    <a href="player-season.html?player=${id}&season=${seasonId}">
      ${season.name}
    </a>
    — Apps: ${stats.apps}, Goals: ${stats.goals}
  </div>
`;

<img src="images/players/${p.photo}" 
     onerror="this.src='images/players/default.jpg'">

