async function init(){
 const data=await fetch('data.json').then(r=>r.json());
 const app=document.getElementById('app');
 app.innerHTML=`<h2>${data.title}</h2><p>Players: ${data.players.join(' vs ')}</p>`;
}
init();
