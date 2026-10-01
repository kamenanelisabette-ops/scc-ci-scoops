const SUPABASE_URL='https://hgqqzhuektnnpxgaegyo.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_ANVBLUiL0o0jYqDk_4PcEQ_CFdWL9ss';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=s=>document.querySelector(s);
const money=n=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XOF',maximumFractionDigits:0}).format(Number(n||0));
const kg=n=>`${new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}).format(Number(n||0))} kg`;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const fixText=s=>String(s??'').replaceAll('Graines d’hÃ©vÃ©a',"Graines d’hévéa").replaceAll("Graines d'hÃ©vÃ©a","Graines d'hévéa").replaceAll('hÃ©vÃ©a','hévéa');
let session=null,profile=null,page='dashboard',activity='ALL',year='ALL',A=[],Y=[],C={};

const menus=[
 ['Pilotage',[['dashboard','Tableau de bord'],['alertes','Alertes & contrôle']]],
 ['Production',[['planteurs','Planteurs / producteurs'],['commis','Commis & performance'],['localites','Localités & tarifs'],['collectes','Collectes & pesées'],['lots','Lots & traçabilité'],['stock','Stock']]],
 ['Trésorerie',[['caisse','Caisse'],['banques','Banques & transferts'],['echeances','Créances & dettes']]],
 ['Logistique',[['transport','Transport & voyages'],['flotte','Flotte & maintenance'],['usines','Usines / clients']]],
 ['Commercial',[['ventes','Ventes'],['depenses','Dépenses']]],
 ['Comptabilité',[['compta','Comptabilité'],['budget','Budget & analytique'],['clotures','Clôtures']]],
 ['Coopérative',[['membres','Membres & parts sociales'],['gouvernance','Gouvernance & AG'],['personnel','Personnel'],['documents','Documents & conformité']]],
 ['Contrôle',[['rapports','Rapports'],['audit','Audit'],['utilisateurs','Utilisateurs & rôles'],['parametres','Paramètres']]]
];
const labels=Object.fromEntries(menus.flatMap(x=>x[1]));
const dateField={collectes:'date_collecte',paiements_planteurs:'date_paiement',chargements:'date_depart',ventes_usine:'date_vente',depenses:'date_depense',mouvements_caisse:'date_mouvement',voyages:'date_depart',mouvements_stock:'date_mouvement',echeances:'created_at',alertes:'created_at',lots:'date_ouverture'};

function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500)}
function activityName(){return activity==='ALL'?'Toutes activités':fixText(A.find(x=>x.id===activity)?.nom||'Activité')}
function yearName(){return year==='ALL'?'Toutes années':Y.find(x=>String(x.annee)===String(year))?.libelle||String(year)}
function inYear(row,table){if(year==='ALL')return true;if(row.exercice_annee!=null)return String(row.exercice_annee)===String(year);const f=dateField[table];if(!f||!row[f])return true;return new Date(row[f]).getFullYear()===Number(year)}
function filt(table,rows){return (rows||[]).filter(x=>(activity==='ALL'||x.activite_id===activity)&&inYear(x,table))}
async function q(t){const r=await sb.from(t).select('*');return r.error?[]:(r.data||[])}

async function load(){
 $('#syncBadge').textContent='● Synchronisation';$('#syncBadge').className='badge warn';
 const names=['activites','exercices','planteurs','localites','tarifs_bord_champ','commis','collectes','paiements_planteurs','camions','usines','chargements','ventes_usine','depenses','mouvements_caisse','sessions_caisse','voyages','mouvements_stock','alertes','echeances','lots','commis_objectifs','membres_cooperative'];
 const vals=await Promise.all(names.map(q));C=Object.fromEntries(names.map((n,i)=>[n,vals[i]]));A=C.activites||[];Y=(C.exercices||[]).sort((a,b)=>b.annee-a.annee);
 $('#syncBadge').textContent='● En ligne';$('#syncBadge').className='badge ok';
}
function nav(){
 $('#nav').innerHTML=menus.map(([s,items])=>`<div class="nav-section">${s}</div>${items.map(([k,v])=>`<button class="nav-btn ${page===k?'active':''}" data-page="${k}">${v}</button>`).join('')}`).join('');
 document.querySelectorAll('.nav-btn').forEach(b=>b.onclick=()=>{page=b.dataset.page;render();$('#sidebar').classList.remove('open')});
}
function kpi(l,v,s=''){return `<div class="kpi"><div class="label">${l}</div><div class="value">${v}</div><div class="sub">${s}</div></div>`}
function metric(a,b){return `<div class="metric"><span>${a}</span><strong>${b}</strong></div>`}
function panel(t,b,a=''){return `<div class="panel"><div class="panel-head"><h3>${t}</h3>${a}</div><div class="panel-body">${b}</div></div>`}
function table(h,r){return `<div class="table-wrap"><table class="table"><thead><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${r||`<tr><td colspan="${h.length}" class="muted">Aucune donnée</td></tr>`}</tbody></table></div>`}
function yearBanner(){return `<div class="year-banner"><div><strong>Période : ${esc(yearName())}</strong><div class="muted">${esc(activityName())}</div></div><span class="pill green">Saisie active</span></div>`}
function currentYear(){return year==='ALL'?new Date().getFullYear():Number(year)}
function currentActivity(){return activity==='ALL'?(A[0]?.id||null):activity}
function opts(rows,labelFn){return (rows||[]).map(x=>`<option value="${x.id}">${esc(labelFn(x))}</option>`).join('')}
async function insert(table,payload){const {error}=await sb.from(table).insert(payload);if(error){toast('Erreur : '+error.message);return false}toast('Enregistré avec succès');await load();render();return true}

function dashboard(){
 const col=filt('collectes',C.collectes),v=filt('ventes_usine',C.ventes_usine),d=filt('depenses',C.depenses),st=filt('mouvements_stock',C.mouvements_stock);
 const poids=col.reduce((s,x)=>s+Number(x.poids_net_kg||0),0),achat=col.reduce((s,x)=>s+Number(x.net_a_payer||0),0),ca=v.reduce((s,x)=>s+Number(x.chiffre_affaires||0),0),charges=d.reduce((s,x)=>s+Number(x.montant||0),0),stock=st.reduce((s,x)=>s+(x.type_mouvement==='sortie'?-1:1)*Number(x.poids_kg||0),0);
 return yearBanner()+`<div class="grid kpis">${kpi('Collecté',kg(poids),activityName())}${kpi('Stock',kg(stock),'Stock théorique')}${kpi('Chiffre d’affaires',money(ca),yearName())}${kpi('Résultat opérationnel',money(ca-achat-charges),'CA - achats - dépenses')}</div>`;
}

function planteursPage(){
 const rows=(C.planteurs||[]).map(p=>`<tr><td>${esc(p.code_planteur||'')}</td><td>${esc((p.nom||'')+' '+(p.prenoms||''))}</td><td>${esc(p.telephone||'')}</td><td>${esc(C.localites.find(l=>l.id===p.localite_id)?.nom||'—')}</td></tr>`).join('');
 return yearBanner()+`<div class="grid two">${panel('Planteurs',table(['Code','Nom','Téléphone','Localité'],rows))}${panel('Nouveau planteur',`
 <form id="fPlanteur">
 <label>Code<input name="code_planteur" required placeholder="PL-0001"></label>
 <label>Nom<input name="nom" required></label><label>Prénoms<input name="prenoms"></label>
 <label>Téléphone<input name="telephone"></label>
 <label>Localité<select name="localite_id"><option value="">—</option>${opts(C.localites,x=>x.nom)}</select></label>
 <label>Village / campement<input name="village_campement"></label>
 <button class="btn primary wide">Enregistrer le planteur</button></form>` )}</div>`;
}
function commisPage(){
 const rows=(C.commis||[]).map(c=>`<tr><td>${esc((c.nom||'')+' '+(c.prenoms||''))}</td><td>${esc(c.telephone||'')}</td><td>${filt('collectes',C.collectes).filter(x=>x.commis_id===c.id).length}</td></tr>`).join('');
 return yearBanner()+`<div class="grid two">${panel('Commis',table(['Nom','Téléphone','Collectes'],rows))}${panel('Nouveau commis',`
 <form id="fCommis"><label>Code<input name="code_commis" placeholder="COM-001"></label><label>Nom<input name="nom" required></label><label>Prénoms<input name="prenoms"></label><label>Téléphone<input name="telephone"></label><button class="btn primary wide">Enregistrer le commis</button></form>`)}</div>`;
}
function localitesPage(){
 const lr=(C.localites||[]).map(l=>`<tr><td>${esc(l.nom)}</td><td>${esc(l.zone||'')}</td></tr>`).join('');
 const tr=(C.tarifs_bord_champ||[]).map(t=>`<tr><td>${esc(C.localites.find(l=>l.id===t.localite_id)?.nom||'—')}</td><td>${money(t.prix_kg)}/kg</td><td>${esc(t.date_debut||'')}</td></tr>`).join('');
 return yearBanner()+`<div class="grid two">${panel('Localités',table(['Localité','Zone'],lr))}${panel('Ajouter une localité',`<form id="fLocalite"><label>Nom<input name="nom" required></label><label>Zone<input name="zone"></label><button class="btn primary wide">Enregistrer</button></form>`)}</div>
 <div style="margin-top:16px" class="grid two">${panel('Tarifs',table(['Localité','Prix','Début'],tr))}${panel('Nouveau tarif',`<form id="fTarif"><label>Code<input name="code_tarif" required placeholder="TAR-001"></label><label>Localité<select name="localite_id" required>${opts(C.localites,x=>x.nom)}</select></label><label>Prix/kg<input name="prix_kg" type="number" step="0.01" required></label><label>Date début<input name="date_debut" type="date" required></label><button class="btn primary wide">Créer le tarif</button></form>`)}</div>`;
}
function collectesPage(){
 const rows=filt('collectes',C.collectes).slice().sort((a,b)=>new Date(b.date_collecte)-new Date(a.date_collecte)).map(c=>`<tr><td>${esc(c.numero_recu)}</td><td>${esc(C.planteurs.find(p=>p.id===c.planteur_id)?.nom||'—')}</td><td>${kg(c.poids_net_kg)}</td><td>${money(c.net_a_payer)}</td></tr>`).join('');
 return yearBanner()+`<div class="grid two">${panel('Collectes',table(['Reçu','Planteur','Poids','Net à payer'],rows))}${panel('Nouvelle pesée',`<form id="fCollecte">
 <label>N° reçu<input name="numero_recu" required placeholder="REC-2026-0001"></label>
 <label>Date / heure<input name="date_collecte" type="datetime-local" required></label>
 <label>Planteur<select name="planteur_id" required>${opts(C.planteurs,x=>(x.code_planteur||'')+' — '+(x.nom||''))}</select></label>
 <label>Commis<select name="commis_id" required>${opts(C.commis,x=>(x.nom||'')+' '+(x.prenoms||''))}</select></label>
 <label>Localité<select name="localite_id" required>${opts(C.localites,x=>x.nom)}</select></label>
 <label>Poids brut kg<input name="poids_brut_kg" type="number" step="0.01" required></label>
 <label>Tare kg<input name="tare_kg" type="number" step="0.01" value="0"></label>
 <label>Prix/kg<input name="prix_kg" type="number" step="0.01" required></label>
 <button class="btn primary wide">Enregistrer la pesée</button></form>`)}</div>`;
}
function caissePage(){
 const m=filt('mouvements_caisse',C.mouvements_caisse);
 const rows=m.slice().sort((a,b)=>new Date(b.date_mouvement)-new Date(a.date_mouvement)).map(x=>`<tr><td>${esc(x.numero_piece)}</td><td>${esc(x.sens)}</td><td>${esc(x.categorie)}</td><td>${money(x.montant)}</td></tr>`).join('');
 return yearBanner()+`<div class="grid two">${panel('Mouvements de caisse',table(['Pièce','Sens','Catégorie','Montant'],rows))}${panel('Nouveau mouvement',`<form id="fCaisse">
 <label>N° pièce<input name="numero_piece" required placeholder="CAI-2026-0001"></label>
 <label>Sens<select name="sens"><option value="entree">Entrée</option><option value="sortie">Sortie</option></select></label>
 <label>Catégorie<input name="categorie" required placeholder="Paiement planteur, avance, carburant..."></label>
 <label>Libellé<input name="libelle" required></label>
 <label>Montant<input name="montant" type="number" required></label>
 <label>Mode de paiement<select name="mode_paiement"><option>especes</option><option>banque</option><option>mobile_money</option></select></label>
 <button class="btn primary wide">Enregistrer le mouvement</button></form>`)}</div>`;
}
function transportPage(){
 const rows=filt('voyages',C.voyages).map(v=>`<tr><td>${esc(v.numero_voyage)}</td><td>${esc(v.statut)}</td><td>${kg(v.poids_depart_kg)}</td><td>${kg(v.poids_arrivee_kg)}</td><td>${kg(v.ecart_kg)}</td></tr>`).join('');
 return yearBanner()+`<div class="grid two">${panel('Voyages',table(['Voyage','Statut','Départ','Usine','Écart'],rows))}${panel('Nouveau voyage',`<form id="fVoyage">
 <label>N° voyage<input name="numero_voyage" required placeholder="VOY-2026-0001"></label>
 <label>Camion<select name="camion_id"><option value="">—</option>${opts(C.camions,x=>x.immatriculation||'Camion')}</select></label>
 <label>Usine<select name="usine_id"><option value="">—</option>${opts(C.usines,x=>x.nom||'Usine')}</select></label>
 <label>Chauffeur<input name="chauffeur_nom"></label><label>Téléphone chauffeur<input name="chauffeur_telephone"></label>
 <label>Origine<input name="origine"></label><label>Destination<input name="destination"></label>
 <label>Poids départ kg<input name="poids_depart_kg" type="number" step="0.01"></label>
 <button class="btn primary wide">Créer le voyage</button></form>`)}</div>`;
}
function stockPage(){
 const rows=filt('mouvements_stock',C.mouvements_stock).map(x=>`<tr><td>${esc(x.type_mouvement)}</td><td>${kg(x.poids_kg)}</td><td>${esc(x.commentaire||'')}</td></tr>`).join('');
 return yearBanner()+`<div class="grid two">${panel('Mouvements stock',table(['Type','Poids','Commentaire'],rows))}${panel('Nouveau mouvement stock',`<form id="fStock"><label>Type<select name="type_mouvement"><option value="entree">Entrée</option><option value="sortie">Sortie</option><option value="ajustement">Ajustement</option></select></label><label>Poids kg<input name="poids_kg" type="number" step="0.01" required></label><label>Commentaire<input name="commentaire"></label><button class="btn primary wide">Enregistrer</button></form>`)}</div>`;
}
function membresPage(){
 const rows=(C.membres_cooperative||[]).map(x=>`<tr><td>${esc(x.code_membre)}</td><td>${esc((x.nom||'')+' '+(x.prenoms||''))}</td><td>${esc(x.telephone||'')}</td><td>${esc(x.statut||'')}</td></tr>`).join('');
 return yearBanner()+`<div class="grid two">${panel('Membres',table(['Code','Nom','Téléphone','Statut'],rows))}${panel('Nouveau membre',`<form id="fMembre"><label>Code<input name="code_membre" required></label><label>Nom<input name="nom" required></label><label>Prénoms<input name="prenoms"></label><label>Téléphone<input name="telephone"></label><button class="btn primary wide">Enregistrer</button></form>`)}</div>`;
}
function reports(){return yearBanner()+panel('Rapports',`<div class="grid two"><div class="quick"><strong>Rapport collecte</strong><span class="muted">Par activité, année, localité, planteur et commis.</span></div><div class="quick"><strong>Rapport caisse</strong><span class="muted">Entrées, sorties, clôture et écarts.</span></div><div class="quick"><strong>Rapport stock</strong><span class="muted">Entrées, sorties, inventaire et pertes.</span></div><div class="quick"><strong>Rapport transport</strong><span class="muted">Départ, arrivée, déchargement et écarts.</span></div></div><div class="report-actions" style="margin-top:14px"><button class="btn secondary" onclick="window.print()">Imprimer / PDF</button></div>`)}
function generic(name,desc){return yearBanner()+panel(name,`<p class="muted">${desc}</p><p>Ce module est déjà prévu dans la V2.1.</p>`)}

function bindForms(){
 const f=(id,cb)=>{const el=$('#'+id);if(el)el.onsubmit=async e=>{e.preventDefault();await cb(new FormData(el))}};
 f('fPlanteur',fd=>insert('planteurs',{code_planteur:fd.get('code_planteur'),nom:fd.get('nom'),prenoms:fd.get('prenoms'),telephone:fd.get('telephone'),localite_id:fd.get('localite_id')||null,village_campement:fd.get('village_campement')||null,activite_id:currentActivity(),exercice_annee:currentYear(),actif:true}));
 f('fCommis',fd=>insert('commis',{code_commis:fd.get('code_commis')||null,nom:fd.get('nom'),prenoms:fd.get('prenoms'),telephone:fd.get('telephone'),activite_id:currentActivity(),exercice_annee:currentYear(),actif:true}));
 f('fLocalite',fd=>insert('localites',{nom:fd.get('nom'),zone:fd.get('zone')||null,activite_id:currentActivity(),exercice_annee:currentYear(),actif:true}));
 f('fTarif',fd=>insert('tarifs_bord_champ',{code_tarif:fd.get('code_tarif'),localite_id:fd.get('localite_id'),prix_kg:Number(fd.get('prix_kg')),date_debut:fd.get('date_debut'),activite_id:currentActivity(),exercice_annee:currentYear(),actif:true}));
 f('fCollecte',fd=>{const brut=Number(fd.get('poids_brut_kg')),tare=Number(fd.get('tare_kg')||0),prix=Number(fd.get('prix_kg')),net=brut-tare;return insert('collectes',{numero_recu:fd.get('numero_recu'),date_collecte:fd.get('date_collecte'),planteur_id:fd.get('planteur_id'),commis_id:fd.get('commis_id'),localite_id:fd.get('localite_id'),poids_brut_kg:brut,tare_kg:tare,poids_net_kg:net,prix_kg:prix,montant_brut:net*prix,net_a_payer:net*prix,statut_paiement:'a_payer',activite_id:currentActivity(),exercice_annee:currentYear()})});
 f('fCaisse',fd=>insert('mouvements_caisse',{numero_piece:fd.get('numero_piece'),activite_id:currentActivity(),exercice_annee:currentYear(),sens:fd.get('sens'),categorie:fd.get('categorie'),libelle:fd.get('libelle'),montant:Number(fd.get('montant')),mode_paiement:fd.get('mode_paiement'),created_by:session.user.id}));
 f('fVoyage',fd=>insert('voyages',{numero_voyage:fd.get('numero_voyage'),activite_id:currentActivity(),exercice_annee:currentYear(),camion_id:fd.get('camion_id')||null,usine_id:fd.get('usine_id')||null,chauffeur_nom:fd.get('chauffeur_nom')||null,chauffeur_telephone:fd.get('chauffeur_telephone')||null,origine:fd.get('origine')||null,destination:fd.get('destination')||null,poids_depart_kg:Number(fd.get('poids_depart_kg')||0),statut:'preparation',created_by:session.user.id}));
 f('fStock',fd=>insert('mouvements_stock',{activite_id:currentActivity(),exercice_annee:currentYear(),type_mouvement:fd.get('type_mouvement'),poids_kg:Number(fd.get('poids_kg')),commentaire:fd.get('commentaire')||null,created_by:session.user.id}));
 f('fMembre',fd=>insert('membres_cooperative',{code_membre:fd.get('code_membre'),nom:fd.get('nom'),prenoms:fd.get('prenoms'),telephone:fd.get('telephone')}));
}

function render(){
 nav();$('#pageTitle').textContent=labels[page]||'SCC-CI-SCOOPS';$('#pageSubtitle').textContent=`${activityName()} • ${yearName()}`;
 let html='';
 if(page==='dashboard')html=dashboard();
 else if(page==='planteurs')html=planteursPage();
 else if(page==='commis')html=commisPage();
 else if(page==='localites')html=localitesPage();
 else if(page==='collectes')html=collectesPage();
 else if(page==='caisse')html=caissePage();
 else if(page==='transport')html=transportPage();
 else if(page==='stock')html=stockPage();
 else if(page==='membres')html=membresPage();
 else if(page==='rapports')html=reports();
 else html=generic(labels[page]||'Module','Fonctionnalité professionnelle de SCC-CI-SCOOPS.');
 $('#content').innerHTML=html;bindForms();
}
window.go=k=>{page=k;render()};

async function enter(){
 const r=await sb.from('profiles').select('*').eq('id',session.user.id).single();if(r.error){toast('Profil introuvable ou accès refusé');return}
 profile=r.data;await load();
 $('#loginView').classList.add('hidden');$('#appView').classList.remove('hidden');
 $('#roleLabel').textContent=profile.role||'utilisateur';$('#userName').textContent=profile.nom_complet||profile.nom||'Utilisateur';$('#userEmail').textContent=session.user.email;
 $('#activitySelect').innerHTML=`<option value="ALL">Toutes activités</option>`+A.map(a=>`<option value="${a.id}">${esc(fixText(a.nom))}</option>`).join('');
 const current=new Date().getFullYear();$('#yearSelect').innerHTML=`<option value="ALL">Toutes années</option>`+(Y.length?Y.map(y=>`<option value="${y.annee}" ${y.annee===current?'selected':''}>${esc(y.libelle||y.annee)}</option>`).join(''):`<option value="${current}" selected>${current}</option>`);
 year=Y.some(y=>y.annee===current)?String(current):'ALL';
 $('#activitySelect').onchange=e=>{activity=e.target.value;render()};$('#yearSelect').onchange=e=>{year=e.target.value;render()};render();
}
$('#loginForm').onsubmit=async e=>{e.preventDefault();$('#loginStatus').textContent='Connexion...';const {data,error}=await sb.auth.signInWithPassword({email:$('#loginEmail').value,password:$('#loginPassword').value});if(error){$('#loginStatus').textContent=error.message;return}session=data.session;$('#loginStatus').textContent='';await enter()};
$('#logoutBtn').onclick=async()=>{await sb.auth.signOut();location.reload()};
$('#menuBtn').onclick=()=>$('#sidebar').classList.toggle('open');
(async()=>{$('#todayLabel').textContent=new Date().toLocaleDateString('fr-FR',{dateStyle:'long'});const {data:{session:s}}=await sb.auth.getSession();if(s){session=s;await enter()}})();
