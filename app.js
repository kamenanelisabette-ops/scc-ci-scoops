const SUPABASE_URL = 'https://hgqqzhuektnnpxgaegyo.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ANVBLUiL0o0jYqDk_4PcEQ_CFdWL9ss';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});

const $ = s => document.querySelector(s);
const fmtMoney = n => new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XOF',maximumFractionDigits:0}).format(Number(n||0));
const fmtKg = n => `${new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}).format(Number(n||0))} kg`;
const fmtDate = v => v ? new Date(v).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'}) : '—';
const todayISO = () => new Date().toISOString().slice(0,10);
let session = null, profile = null, currentPage = 'dashboard';
let cache = { planteurs:[], localites:[], tarifs:[], commis:[], collectes:[], paiements:[], camions:[], usines:[], chargements:[], ventes:[], depenses:[] };

const roleMenus = {
  admin:['dashboard','planteurs','tarifs','collectes','caisse','transport','ventes','rapports'],
  direction:['dashboard','planteurs','tarifs','collectes','caisse','transport','ventes','rapports'],
  secretariat:['dashboard','planteurs','tarifs','collectes','rapports'],
  caisse:['dashboard','caisse','rapports'],
  comptabilite:['dashboard','caisse','transport','ventes','rapports'],
  commis:['dashboard','collectes'],
  stock_transport:['dashboard','transport','rapports']
};
const menuMeta = {
  dashboard:['Tableau de bord','Vue générale'],
  planteurs:['Planteurs','Répertoire des planteurs'],
  tarifs:['Localités & tarifs','Prix bord champ par localité'],
  collectes:['Collectes & pesées','Pesées planteurs et performance commis'],
  caisse:['Caisse','Paiements des planteurs'],
  transport:['Camions & usine','Chargements et écarts de poids'],
  ventes:['Ventes usine','Règlements, créances et bénéfices'],
  rapports:['Rapports','Semaine, mois et année']
};

function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),2600); }
function esc(v){ return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c])); }
function nav(){
  const allowed=roleMenus[profile?.role]||[];
  $('#nav').innerHTML=allowed.map(k=>`<button class="nav-btn ${currentPage===k?'active':''}" data-page="${k}">${menuMeta[k][0]}</button>`).join('');
  $('#nav').querySelectorAll('button').forEach(b=>b.onclick=()=>{currentPage=b.dataset.page; render(); $('#sidebar').classList.remove('open');});
}
function setHeader(page){ $('#pageTitle').textContent=menuMeta[page]?.[0]||''; $('#pageSubtitle').textContent=menuMeta[page]?.[1]||''; }
async function loadProfile(){
  const {data,error}=await supabaseClient.from('profiles').select('*').eq('id',session.user.id).single();
  if(error) throw new Error('Profil introuvable ou accès refusé.');
  profile=data;
}
async function loadAll(){
  const q = async (table, select='*')=>{ const {data,error}=await supabaseClient.from(table).select(select); return error?[]:(data||[]); };
  const [planteurs,localites,tarifs,commis,collectes,paiements,camions,usines,chargements,ventes,depenses] = await Promise.all([
    q('planteurs','*'),q('localites','*'),q('tarifs_bord_champ','*'),q('commis','*'),q('collectes','*'),q('paiements_planteurs','*'),q('camions','*'),q('usines','*'),q('chargements','*'),q('ventes_usine','*'),q('depenses','*')
  ]);
  Object.assign(cache,{planteurs,localites,tarifs,commis,collectes,paiements,camions,usines,chargements,ventes,depenses});
}
async function refresh(){ $('#syncBadge').textContent='● Synchronisation'; $('#syncBadge').className='badge warn'; await loadAll(); $('#syncBadge').textContent='● En ligne'; $('#syncBadge').className='badge ok'; }
function localiteName(id){return cache.localites.find(x=>x.id===id)?.nom||'—'}
function planteurName(id){const p=cache.planteurs.find(x=>x.id===id); return p?`${p.nom||''} ${p.prenoms||''}`.trim():'—'}
function commisName(id){const p=cache.commis.find(x=>x.id===id); return p?`${p.nom||''} ${p.prenoms||''}`.trim():'—'}
function camionName(id){return cache.camions.find(x=>x.id===id)?.immatriculation||'—'}
function usineName(id){return cache.usines.find(x=>x.id===id)?.nom||'—'}
function inMonth(v){if(!v)return false; const d=new Date(v), n=new Date(); return d.getFullYear()===n.getFullYear()&&d.getMonth()===n.getMonth();}
function inYear(v){if(!v)return false; return new Date(v).getFullYear()===new Date().getFullYear();}

function dashboard(){
  const collM=cache.collectes.filter(x=>inMonth(x.date_collecte));
  const poids=collM.reduce((s,x)=>s+Number(x.poids_net_kg||0),0);
  const achats=collM.reduce((s,x)=>s+Number(x.net_a_payer||0),0);
  const payes=cache.paiements.filter(x=>inMonth(x.date_paiement)&&x.statut!=='annule').reduce((s,x)=>s+Number(x.montant||0),0);
  const ventes=cache.ventes.filter(x=>inMonth(x.date_vente));
  const ca=ventes.reduce((s,x)=>s+Number(x.chiffre_affaires||0),0);
  const benef=ventes.reduce((s,x)=>s+Number(x.benefice_estime||0),0);
  const ecart=cache.chargements.filter(x=>inMonth(x.date_arrivee)).reduce((s,x)=>s+Number(x.ecart_kg||0),0);
  const creance=ventes.reduce((s,v)=>{ const paid=0; return s+(v.statut_reglement==='paye'?0:Number(v.chiffre_affaires||0)-paid);},0);
  const commisPerf={}; collM.forEach(x=>commisPerf[x.commis_id]=(commisPerf[x.commis_id]||0)+Number(x.poids_net_kg||0));
  const topCommis=Object.entries(commisPerf).sort((a,b)=>b[1]-a[1])[0];
  return `<div class="grid kpi-grid">
    ${kpi('Collecté ce mois',fmtKg(poids),'Tonnage net')}
    ${kpi('À payer planteurs',fmtMoney(Math.max(achats-payes,0)),'Solde estimé')}
    ${kpi('Ventes usine',fmtMoney(ca),'Chiffre d’affaires du mois')}
    ${kpi('Bénéfice estimé',fmtMoney(benef),'Avant ajustements comptables')}
  </div>
  <div class="grid split" style="margin-top:16px">
    <div class="panel"><div class="panel-head"><h3>Contrôle opérationnel</h3></div><div class="panel-body">
      ${metric('Écart transport du mois',fmtKg(ecart),Math.abs(ecart)>0?'danger-text':'ok-text')}
      ${metric('Collectes enregistrées',collM.length)}
      ${metric('Paiements enregistrés ce mois',cache.paiements.filter(x=>inMonth(x.date_paiement)).length)}
      ${metric('Chargements du mois',cache.chargements.filter(x=>inMonth(x.date_depart)).length)}
      ${metric('Commis le plus actif',topCommis?`${esc(commisName(topCommis[0]))} — ${fmtKg(topCommis[1])}`:'—')}
    </div></div>
    <div class="panel"><div class="panel-head"><h3>Situation financière</h3></div><div class="panel-body">
      ${metric('Achats planteurs du mois',fmtMoney(achats))}
      ${metric('Payé aux planteurs',fmtMoney(payes))}
      ${metric('Créances usine estimées',fmtMoney(creance))}
      ${metric('Dépenses du mois',fmtMoney(cache.depenses.filter(x=>inMonth(x.date_depense)).reduce((s,x)=>s+Number(x.montant||0),0)))}
    </div></div>
  </div>`;
}
function kpi(label,value,sub){return `<div class="kpi"><div class="label">${label}</div><div class="value">${value}</div><div class="sub">${sub}</div></div>`}
function metric(a,b,cls=''){return `<div class="metric-row"><span>${a}</span><strong class="${cls}">${b}</strong></div>`}

function planteursPage(){
 const rows=cache.planteurs.map(p=>`<tr><td>${esc(p.code_planteur)}</td><td>${esc(`${p.nom||''} ${p.prenoms||''}`.trim())}</td><td>${esc(p.telephone||'')}</td><td>${esc(localiteName(p.localite_id))}</td><td>${p.actif?'<span class="pill green">Actif</span>':'<span class="pill">Inactif</span>'}</td></tr>`).join('');
 return `<div class="grid split"><div class="panel"><div class="panel-head"><h3>Répertoire planteurs</h3><div class="actions"><button class="btn secondary" onclick="refreshAndRender()">Actualiser</button></div></div><div class="panel-body"><div class="table-wrap"><table class="table"><thead><tr><th>Code</th><th>Planteur</th><th>Téléphone</th><th>Localité</th><th>Statut</th></tr></thead><tbody>${rows||'<tr><td colspan="5" class="empty">Aucun planteur</td></tr>'}</tbody></table></div></div></div>
 <div class="panel"><div class="panel-head"><h3>Nouveau planteur</h3></div><div class="panel-body"><form id="planteurForm" class="form-grid"><label>Code<input name="code_planteur" required placeholder="PL-0001"></label><label>Nom<input name="nom" required></label><label>Prénoms<input name="prenoms"></label><label>Téléphone<input name="telephone"></label><label>Localité<select name="localite_id"><option value="">—</option>${cache.localites.map(l=>`<option value="${l.id}">${esc(l.nom)}</option>`).join('')}</select></label><label>Village / campement<input name="village_campement"></label><div class="full"><button class="btn primary">Enregistrer</button></div></form></div></div></div>`;
}

function tarifsPage(){
 const rows=cache.tarifs.sort((a,b)=>new Date(b.date_debut)-new Date(a.date_debut)).map(t=>`<tr><td>${esc(t.code_tarif||'')}</td><td>${esc(localiteName(t.localite_id))}</td><td>${fmtMoney(t.prix_kg)}/kg</td><td>${esc(t.date_debut)}</td><td>${esc(t.date_fin||'—')}</td><td>${t.actif?'<span class="pill green">Actif</span>':'<span class="pill">Clos</span>'}</td></tr>`).join('');
 return `<div class="grid split"><div class="panel"><div class="panel-head"><h3>Tarifs bord champ</h3></div><div class="panel-body"><div class="table-wrap"><table class="table"><thead><tr><th>Code</th><th>Localité</th><th>Prix</th><th>Début</th><th>Fin</th><th>Statut</th></tr></thead><tbody>${rows||'<tr><td colspan="6" class="empty">Aucun tarif</td></tr>'}</tbody></table></div></div></div>
 <div class="panel"><div class="panel-head"><h3>Nouvelle localité / tarif</h3></div><div class="panel-body"><form id="localiteForm" class="form-grid"><label>Nouvelle localité<input name="nom" required placeholder="Nom du village/localité"></label><label>Zone<input name="zone" placeholder="Daloa"></label><div class="full"><button class="btn secondary">Créer localité</button></div></form><hr style="border:0;border-top:1px solid var(--border);margin:20px 0"><form id="tarifForm" class="form-grid"><label>Code tarif<input name="code_tarif" required placeholder="TAR-2026-001"></label><label>Localité<select name="localite_id" required><option value="">Choisir</option>${cache.localites.map(l=>`<option value="${l.id}">${esc(l.nom)}</option>`).join('')}</select></label><label>Prix/kg<input name="prix_kg" type="number" step="0.01" required></label><label>Date début<input name="date_debut" type="date" value="${todayISO()}" required></label><label>Date fin<input name="date_fin" type="date"></label><div class="full"><button class="btn primary">Créer tarif</button></div></form></div></div></div>`;
}

function collectesPage(){
 const rows=[...cache.collectes].sort((a,b)=>new Date(b.date_collecte)-new Date(a.date_collecte)).slice(0,100).map(c=>`<tr><td>${esc(c.numero_recu)}</td><td>${fmtDate(c.date_collecte)}</td><td>${esc(planteurName(c.planteur_id))}</td><td>${esc(commisName(c.commis_id))}</td><td>${esc(localiteName(c.localite_id))}</td><td>${fmtKg(c.poids_net_kg)}</td><td>${fmtMoney(c.prix_kg)}/kg</td><td>${fmtMoney(c.net_a_payer)}</td><td>${pill(c.statut_paiement)}</td></tr>`).join('');
 return `<div class="panel"><div class="panel-head"><h3>Dernières pesées</h3></div><div class="panel-body"><div class="table-wrap"><table class="table"><thead><tr><th>Reçu</th><th>Date</th><th>Planteur</th><th>Commis</th><th>Localité</th><th>Poids net</th><th>Prix</th><th>Net à payer</th><th>Statut</th></tr></thead><tbody>${rows||'<tr><td colspan="9" class="empty">Aucune collecte</td></tr>'}</tbody></table></div></div></div>
 <div class="panel" style="margin-top:16px"><div class="panel-head"><h3>Nouvelle collecte / pesée</h3></div><div class="panel-body"><form id="collecteForm" class="form-grid"><label>N° reçu<input name="numero_recu" required placeholder="REC-2026-0001"></label><label>Date/heure<input name="date_collecte" type="datetime-local" required></label><label>Planteur<select name="planteur_id" required><option value="">Choisir</option>${cache.planteurs.map(p=>`<option value="${p.id}">${esc(p.code_planteur)} — ${esc(`${p.nom||''} ${p.prenoms||''}`)}</option>`).join('')}</select></label><label>Commis<select name="commis_id" required><option value="">Choisir</option>${cache.commis.map(c=>`<option value="${c.id}">${esc(`${c.nom||''} ${c.prenoms||''}`)}</option>`).join('')}</select></label><label>Localité<select id="collecteLocalite" name="localite_id" required><option value="">Choisir</option>${cache.localites.map(l=>`<option value="${l.id}">${esc(l.nom)}</option>`).join('')}</select></label><label>Tarif<select id="collecteTarif" name="tarif_id" required><option value="">Choisir localité</option></select></label><label>Poids brut (kg)<input name="poids_brut_kg" type="number" step="0.01" required></label><label>Tare (kg)<input name="tare_kg" type="number" step="0.01" value="0"></label><label>Prix/kg<input id="collectePrix" name="prix_kg" type="number" step="0.01" readonly required></label><label>Retenue / avance<input name="retenue_avance" type="number" step="0.01" value="0"></label><label>N° lot<input name="numero_lot"></label><label>Observation<input name="observation"></label><div class="full"><button class="btn primary">Enregistrer la pesée</button></div></form></div></div>`;
}
function pill(s){const map={paye:'green',valide:'green',decharge:'green',cloture:'green',a_payer:'orange',partiel:'orange',non_paye:'orange',litige:'red',annule:'red',bloque:'red'};return `<span class="pill ${map[s]||''}">${esc(s||'—')}</span>`}

function caissePage(){
 const unpaid=cache.collectes.filter(c=>['a_payer','partiel'].includes(c.statut_paiement));
 const rows=unpaid.map(c=>`<tr><td>${esc(c.numero_recu)}</td><td>${esc(planteurName(c.planteur_id))}</td><td>${fmtKg(c.poids_net_kg)}</td><td>${fmtMoney(c.net_a_payer)}</td><td>${pill(c.statut_paiement)}</td></tr>`).join('');
 return `<div class="grid split"><div class="panel"><div class="panel-head"><h3>Collectes à payer</h3></div><div class="panel-body"><div class="table-wrap"><table class="table"><thead><tr><th>Reçu</th><th>Planteur</th><th>Poids</th><th>Montant</th><th>Statut</th></tr></thead><tbody>${rows||'<tr><td colspan="5" class="empty">Aucun paiement en attente</td></tr>'}</tbody></table></div></div></div>
 <div class="panel"><div class="panel-head"><h3>Enregistrer un paiement</h3></div><div class="panel-body"><form id="paiementForm" class="form-grid"><label>Collecte<select id="payCollecte" name="collecte_id" required><option value="">Choisir</option>${unpaid.map(c=>`<option value="${c.id}" data-planteur="${c.planteur_id}" data-montant="${c.net_a_payer}">${esc(c.numero_recu)} — ${esc(planteurName(c.planteur_id))}</option>`).join('')}</select></label><label>N° paiement<input name="numero_paiement" required placeholder="PAY-2026-0001"></label><label>Montant<input id="payMontant" name="montant" type="number" step="0.01" required></label><label>Mode<select name="moyen_paiement" required><option value="especes">Espèces</option><option value="banque">Banque</option><option value="virement">Virement</option><option value="cheque">Chèque</option><option value="mobile_money">Mobile Money</option></select></label><label>Référence<input name="reference_paiement"></label><input id="payPlanteur" name="planteur_id" type="hidden"><div class="full"><button class="btn primary">Valider paiement</button></div></form></div></div></div>`;
}

function transportPage(){
 const rows=[...cache.chargements].sort((a,b)=>new Date(b.date_depart||0)-new Date(a.date_depart||0)).map(c=>`<tr><td>${esc(c.numero_chargement)}</td><td>${esc(camionName(c.camion_id))}</td><td>${esc(usineName(c.usine_id))}</td><td>${fmtKg(c.poids_depart_site_kg)}</td><td>${fmtKg(c.poids_arrivee_usine_kg)}</td><td class="${Number(c.ecart_kg)<0?'danger-text':'ok-text'}">${fmtKg(c.ecart_kg)}</td><td>${pill(c.statut)}</td></tr>`).join('');
 return `<div class="panel"><div class="panel-head"><h3>Chargements & écarts</h3></div><div class="panel-body"><div class="table-wrap"><table class="table"><thead><tr><th>Chargement</th><th>Camion</th><th>Usine</th><th>Départ</th><th>Arrivée</th><th>Écart</th><th>Statut</th></tr></thead><tbody>${rows||'<tr><td colspan="7" class="empty">Aucun chargement</td></tr>'}</tbody></table></div></div></div>
 <div class="grid split" style="margin-top:16px"><div class="panel"><div class="panel-head"><h3>Nouveau camion</h3></div><div class="panel-body"><form id="camionForm" class="form-grid"><label>Immatriculation<input name="immatriculation" required></label><label>Chauffeur<input name="chauffeur"></label><label>Téléphone chauffeur<input name="telephone_chauffeur"></label><label>Capacité kg<input name="capacite_kg" type="number" step="0.01"></label><div class="full"><button class="btn secondary">Ajouter camion</button></div></form><hr style="border:0;border-top:1px solid var(--border);margin:20px 0"><form id="usineForm" class="form-grid"><label>Nom usine<input name="nom" required></label><label>Localisation<input name="localisation"></label><div class="full"><button class="btn secondary">Ajouter usine</button></div></form></div></div>
 <div class="panel"><div class="panel-head"><h3>Nouveau chargement</h3></div><div class="panel-body"><form id="chargementForm" class="form-grid"><label>N° chargement<input name="numero_chargement" required></label><label>Camion<select name="camion_id" required><option value="">Choisir</option>${cache.camions.map(c=>`<option value="${c.id}">${esc(c.immatriculation)}</option>`).join('')}</select></label><label>Usine<select name="usine_id"><option value="">Choisir</option>${cache.usines.map(u=>`<option value="${u.id}">${esc(u.nom)}</option>`).join('')}</select></label><label>Date départ<input name="date_depart" type="datetime-local"></label><label>Poids départ site kg<input name="poids_depart_site_kg" type="number" step="0.01"></label><label>Date arrivée<input name="date_arrivee" type="datetime-local"></label><label>Poids usine kg<input name="poids_arrivee_usine_kg" type="number" step="0.01"></label><label>N° ticket usine<input name="numero_ticket_usine"></label><label>Statut<select name="statut"><option value="prepare">Préparé</option><option value="en_route">En route</option><option value="decharge">Déchargé</option><option value="cloture">Clôturé</option></select></label><div class="full"><button class="btn primary">Enregistrer chargement</button></div></form></div></div></div>`;
}

function ventesPage(){
 const rows=[...cache.ventes].sort((a,b)=>new Date(b.date_vente)-new Date(a.date_vente)).map(v=>`<tr><td>${esc(v.numero_vente)}</td><td>${esc(usineName(v.usine_id))}</td><td>${fmtKg(v.poids_facture_kg)}</td><td>${fmtMoney(v.prix_vente_kg)}/kg</td><td>${fmtMoney(v.chiffre_affaires)}</td><td>${fmtMoney(v.benefice_estime)}</td><td>${pill(v.statut_reglement)}</td></tr>`).join('');
 return `<div class="panel"><div class="panel-head"><h3>Ventes usine</h3></div><div class="panel-body"><div class="table-wrap"><table class="table"><thead><tr><th>Vente</th><th>Usine</th><th>Poids facturé</th><th>Prix/kg</th><th>CA</th><th>Bénéfice</th><th>Règlement</th></tr></thead><tbody>${rows||'<tr><td colspan="7" class="empty">Aucune vente</td></tr>'}</tbody></table></div></div></div>
 <div class="panel" style="margin-top:16px"><div class="panel-head"><h3>Nouvelle vente</h3></div><div class="panel-body"><form id="venteForm" class="form-grid"><label>N° vente<input name="numero_vente" required></label><label>Chargement<select id="venteChargement" name="chargement_id" required><option value="">Choisir</option>${cache.chargements.filter(c=>c.usine_id).map(c=>`<option value="${c.id}" data-usine="${c.usine_id}" data-poids="${c.poids_arrivee_usine_kg||''}">${esc(c.numero_chargement)} — ${esc(camionName(c.camion_id))}</option>`).join('')}</select></label><input id="venteUsine" name="usine_id" type="hidden"><label>Poids facturé kg<input id="ventePoids" name="poids_facture_kg" type="number" step="0.01" required></label><label>Prix vente/kg<input name="prix_vente_kg" type="number" step="0.01" required></label><label>Coût achats planteurs<input name="cout_achat_planteurs" type="number" step="0.01" value="0"></label><label>Autres charges<input name="autres_charges" type="number" step="0.01" value="0"></label><label>Statut règlement<select name="statut_reglement"><option value="non_paye">Non payé</option><option value="partiel">Partiel</option><option value="paye">Payé</option><option value="litige">Litige</option></select></label><label>N° facture<input name="numero_facture"></label><div class="full"><button class="btn primary">Enregistrer vente</button></div></form></div></div>`;
}

function rapportsPage(){
 const periods=[['Semaine',7],['Mois',31],['Année',366]];
 const cards=periods.map(([label,days])=>{const cut=new Date(Date.now()-days*86400000);const col=cache.collectes.filter(x=>new Date(x.date_collecte)>=cut);const ven=cache.ventes.filter(x=>new Date(x.date_vente)>=cut);return `<div class="kpi"><div class="label">${label}</div><div class="value">${fmtKg(col.reduce((s,x)=>s+Number(x.poids_net_kg||0),0))}</div><div class="sub">CA ${fmtMoney(ven.reduce((s,x)=>s+Number(x.chiffre_affaires||0),0))} • Bénéfice ${fmtMoney(ven.reduce((s,x)=>s+Number(x.benefice_estime||0),0))}</div></div>`}).join('');
 const locality={}; cache.collectes.filter(x=>inYear(x.date_collecte)).forEach(x=>{const k=localiteName(x.localite_id); locality[k]=(locality[k]||0)+Number(x.poids_net_kg||0)});
 const locRows=Object.entries(locality).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${fmtKg(v)}</td></tr>`).join('');
 return `<div class="grid kpi-grid">${cards}</div><div class="grid split" style="margin-top:16px"><div class="panel"><div class="panel-head"><h3>Collecte annuelle par localité</h3></div><div class="panel-body"><table class="table"><thead><tr><th>Localité</th><th>Poids</th></tr></thead><tbody>${locRows||'<tr><td colspan="2" class="empty">Aucune donnée</td></tr>'}</tbody></table></div></div><div class="panel"><div class="panel-head"><h3>Contrôles</h3></div><div class="panel-body">${metric('Planteurs actifs',cache.planteurs.filter(x=>x.actif).length)}${metric('Commis actifs',cache.commis.filter(x=>x.actif).length)}${metric('Camions actifs',cache.camions.filter(x=>x.actif).length)}${metric('Usines actives',cache.usines.filter(x=>x.actif).length)}</div></div></div>`;
}

async function render(){
 nav(); setHeader(currentPage); const allowed=roleMenus[profile?.role]||[]; if(!allowed.includes(currentPage)) currentPage=allowed[0]||'dashboard';
 const fn={dashboard,planteurs:planteursPage,tarifs:tarifsPage,collectes:collectesPage,caisse:caissePage,transport:transportPage,ventes:ventesPage,rapports:rapportsPage}[currentPage];
 $('#content').innerHTML=fn?fn():dashboard(); bindPageEvents();
}

function formDataObj(form){const fd=new FormData(form), o={}; for(const [k,v] of fd.entries()){ if(v==='') o[k]=null; else o[k]=v; } return o;}
async function insert(table,payload){const {error}=await supabaseClient.from(table).insert(payload); if(error) throw error; toast('Enregistrement réussi'); await refresh(); render();}
function bindPageEvents(){
 const f=(id,cb)=>{const el=$(id); if(el) el.onsubmit=async e=>{e.preventDefault(); try{await cb(formDataObj(el));}catch(err){toast(err.message||'Erreur');}}};
 f('#planteurForm',o=>insert('planteurs',o));
 f('#localiteForm',o=>insert('localites',{...o,actif:true}));
 f('#tarifForm',o=>insert('tarifs_bord_champ',{...o,prix_kg:Number(o.prix_kg),actif:true,valide_par:session.user.id}));
 f('#camionForm',o=>insert('camions',{...o,capacite_kg:o.capacite_kg?Number(o.capacite_kg):null,actif:true}));
 f('#usineForm',o=>insert('usines',{...o,actif:true}));
 f('#chargementForm',o=>insert('chargements',{...o,poids_depart_site_kg:o.poids_depart_site_kg?Number(o.poids_depart_site_kg):null,poids_arrivee_usine_kg:o.poids_arrivee_usine_kg?Number(o.poids_arrivee_usine_kg):null}));
 f('#collecteForm',o=>insert('collectes',{...o,poids_brut_kg:Number(o.poids_brut_kg),tare_kg:Number(o.tare_kg||0),prix_kg:Number(o.prix_kg),retenue_avance:Number(o.retenue_avance||0),saisi_par:session.user.id,statut_paiement:'a_payer'}));
 f('#paiementForm',async o=>{await insert('paiements_planteurs',{...o,montant:Number(o.montant),caissier_id:session.user.id,statut:'valide'});});
 f('#venteForm',o=>insert('ventes_usine',{...o,poids_facture_kg:Number(o.poids_facture_kg),prix_vente_kg:Number(o.prix_vente_kg),cout_achat_planteurs:Number(o.cout_achat_planteurs||0),autres_charges:Number(o.autres_charges||0)}));
 const loc=$('#collecteLocalite'), tarif=$('#collecteTarif'), prix=$('#collectePrix'); if(loc&&tarif){loc.onchange=()=>{const ts=cache.tarifs.filter(t=>t.localite_id===loc.value&&t.actif);tarif.innerHTML='<option value="">Choisir</option>'+ts.map(t=>`<option value="${t.id}" data-prix="${t.prix_kg}">${esc(t.code_tarif||'Tarif')} — ${fmtMoney(t.prix_kg)}/kg</option>`).join('');prix.value='';};tarif.onchange=()=>{prix.value=tarif.selectedOptions[0]?.dataset.prix||'';};}
 const pc=$('#payCollecte'); if(pc){pc.onchange=()=>{const op=pc.selectedOptions[0];$('#payPlanteur').value=op?.dataset.planteur||'';$('#payMontant').value=op?.dataset.montant||'';};}
 const vc=$('#venteChargement'); if(vc){vc.onchange=()=>{const op=vc.selectedOptions[0];$('#venteUsine').value=op?.dataset.usine||'';$('#ventePoids').value=op?.dataset.poids||'';};}
 const dc=$('input[name="date_collecte"]'); if(dc&&!dc.value){const d=new Date(); d.setMinutes(d.getMinutes()-d.getTimezoneOffset()); dc.value=d.toISOString().slice(0,16);}
}
window.refreshAndRender=async()=>{await refresh(); render();};

$('#loginForm').onsubmit=async e=>{e.preventDefault(); $('#loginStatus').textContent='Connexion…'; const email=$('#loginEmail').value.trim();const password=$('#loginPassword').value; const {data,error}=await supabaseClient.auth.signInWithPassword({email,password}); if(error){$('#loginStatus').textContent=error.message; return;} session=data.session; await boot();};
$('#logoutBtn').onclick=async()=>{await supabaseClient.auth.signOut(); location.reload();};
$('#menuBtn').onclick=()=>$('#sidebar').classList.toggle('open');
window.addEventListener('online',()=>{$('#syncBadge').textContent='● En ligne';$('#syncBadge').className='badge ok'});window.addEventListener('offline',()=>{$('#syncBadge').textContent='● Hors ligne';$('#syncBadge').className='badge warn'});

async function boot(){
 try{await loadProfile(); await loadAll(); $('#loginView').classList.add('hidden'); $('#appView').classList.remove('hidden'); $('#userName').textContent=profile.nom_complet||session.user.email; $('#userEmail').textContent=session.user.email; $('#roleLabel').textContent=profile.role; $('#todayLabel').textContent=new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}); render();}catch(e){$('#loginStatus').textContent=e.message; await supabaseClient.auth.signOut();}
}
(async()=>{const {data}=await supabaseClient.auth.getSession();session=data.session;if(session)await boot();})();
