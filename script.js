async function init(){
 const data=await fetch('data.json').then(r=>r.json());
 const app=document.getElementById('app');
 for(const t of data.tournaments){
  const d=document.createElement('details');
  const n=t.results.nakamura.length;
  const p=t.results.nepo.length;
  d.innerHTML=`<summary>${t.name} (${t.tier})</summary>
  <table>
  <tr><th>Показатель</th><th>Накамура</th><th>Непомнящий</th></tr>
  <tr><td>Участий</td><td>${n}</td><td>${p}</td></tr>
  </table>
  <pre>${JSON.stringify(t.results,null,2)}</pre>`;
  app.appendChild(d);
 }
}
init();