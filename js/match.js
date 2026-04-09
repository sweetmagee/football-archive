
const id=new URLSearchParams(location.search).get('id');

Promise.all([
fetch('data/matches.json').then(r=>r.json()),
fetch('data/appearances.json').then(r=>r.json()),
fetch('data/players.json').then(r=>r.json())
]).then(([matches,apps,players])=>{
const m=matches.find(x=>x.id===id);
const el=document.getElementById('match');

el.innerHTML=`<h2>${m.home_team} ${m.home_score}-${m.away_score} ${m.away_team}</h2>`;

const matchApps=apps.filter(a=>a.match_id===id);

el.innerHTML+="<h3>Lineups</h3>";

matchApps.filter(a=>a.is_starting==1).forEach(a=>{
  const p=players.find(x=>x.id===a.player_id);
  el.innerHTML+=`<div>${p.name}</div>`;
});

el.innerHTML+="<h3>Subs</h3>";
matchApps.filter(a=>a.is_starting==0).forEach(a=>{
  const p=players.find(x=>x.id===a.player_id);
  el.innerHTML+=`<div>${p.name} (${a.minute_in}')</div>`;
});

el.innerHTML+="<h3>Goals</h3>";
matchApps.filter(a=>a.goals>0).forEach(a=>{
  const p=players.find(x=>x.id===a.player_id);
  el.innerHTML+=`<div>${p.name} (${a.goals})</div>`;
});

});
