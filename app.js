
let players=[];

fetch("data/players.json").then(r=>r.json()).then(data=>{
  players=data;
  render(players);
});

function render(list){
  const el=document.getElementById('playerList');
  el.innerHTML='';
  list.slice(0,50).forEach(p=>{
    el.innerHTML+=`<div><a href="player.html?id=${p.id}">${p.name}</a> (${p.position})</div>`;
  });
}

document.getElementById('search').addEventListener('input',e=>{
  const q=e.target.value.toLowerCase();
  render(players.filter(p=>p.name.toLowerCase().includes(q)));
});
