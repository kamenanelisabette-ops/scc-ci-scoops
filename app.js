
const SUPABASE_URL='https://hgqqzhuektnnpxgaegyo.supabase.co';
const SUPABASE_PUBLISHABLE_KEY='sb_publishable_ANVBLUiL0o0jYqDk_4PcEQ_CFdWL9ss';
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const $=s=>document.querySelector(s);
const money=n=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'XOF',maximumFractionDigits:0}).format(Number(n||0));
const kg=n=>`${new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}).format(Number(n||0))} kg`;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
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

function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2300)}
function activityName(){return activity==='ALL'?'Toutes activités':A.find(x=>x.id===activity)?.nom||'Activité'}
function yearName(){return year==='ALL'?'Toutes années':Y.find(x=>String(x.annee)===String(year))?.libelle||String(year)}
function inYear(row,table){if(year==='ALL')return true;const f=dateField[table];if(row.exercice_annee!=null)return String(row.exercice_annee)===String(year);if(!f||!row[f])return true;return new Date(row[f]).getFullYear()===Number(year)}
function filt(table,rows){return (rows||[]).filter(x=>(activity==='ALL'||x.activite_id===activity)&&inYear(x,table))}
async function q(t){const r=await sb.from(t).select('*');return r.error?[]:(r.data||[])}

async function load(){
 $('#syncBadge').textContent='● Synchronisation';$('#syncBadge').className='badge warn';
 const names=['activites','exercices','planteurs','localites','tarifs_bord_champ','commis','collectes','paiements_planteurs','camions','usines','chargements','ventes_usine','depenses','mouvements_caisse','sessions_caisse','voyages','mouvements_stock','alertes','echeances','lots','commis_objectifs','pieces_comptables','ecritures_comptables','membres_cooperative'];
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
function table(h,r){return `<div class="table-wrap"><table class="table"><thead><tr>${h.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${r||`<tr><td colspan="${h.length}" class="muted">Aucune donnée pour ce filtre</td></tr>`}</tbody></table></div>`}
function yearBanner(){return `<div class="year-banner"><div><strong>Période : ${esc(yearName())}</strong><div class="muted">${esc(activityName())}</div></div><span class="pill green">Données séparées par année</span></div>`}

function dashboard(){
 const col=filt('collectes',C.collectes),v=filt('ventes_usine',C.ventes_usine),d=filt('depenses',C.depenses),m=filt('mouvements_caisse',C.mouvements_caisse),st=filt('mouvements_stock',C.mouvements_stock),e=filt('echeances',C.echeances);
 const poids=col.reduce((s,x)=>s+Number(x.poids_net_kg||0),0),achat=col.reduce((s,x)=>s+Number(x.net_a_payer||0),0),ca=v.reduce((s,x)=>s+Number(x.chiffre_affaires||0),0),charges=d.reduce((s,x)=>s+Number(x.montant||0),0);
 const stock=st.reduce((s,x)=>s+(x.type_mouvement==='sortie'?-1:1)*Number(x.poids_kg||0),0),solde=m.reduce((s,x)=>s+(x.sens==='entree'?1:-1)*Number(x.montant||0),0);
 const cre=e.filter(x=>x.type_echeance==='creance').reduce((s,x)=>s+Math.max(0,Number(x.montant_initial||0)-Number(x.montant_regle||0)),0),det=e.filter(x=>x.type_echeance==='dette').reduce((s,x)=>s+Math.max(0,Number(x.montant_initial||0)-Number(x.montant_regle||0)),0);
 return yearBanner()+`<div class="grid kpis">${kpi('Collecté',kg(poids),activityName())}${kpi('Stock théorique',kg(stock),'Stock filtré')}${kpi('Chiffre d’affaires',money(ca),yearName())}${kpi('Résultat opérationnel',money(ca-achat-charges),'CA - achats - dépenses')}</div>
 <div class="grid two" style="margin-top:16px">${panel('Trésorerie',metric('Solde mouvements caisse',money(solde))+metric('Créances',money(cre))+metric('Dettes',money(det))+metric('Dépenses',money(charges)))}${panel('Contrôle Direction',metric('Collectes',col.length)+metric('Voyages',filt('voyages',C.voyages).length)+metric('Alertes ouvertes',filt('alertes',C.alertes).filter(x=>!x.resolu).length)+metric('Exercice',yearName()))}</div>
 <div class="section-title">Accès rapide</div><div class="quick-grid">${['collectes','caisse','commis','transport','compta','stock','rapports','alertes'].map(k=>`<button class="quick" onclick="go('${k}')"><strong>${labels[k]}</strong><span class="muted">Ouvrir le module</span></button>`).join('')}</div>`;
}
function reports(){
 const actions=`<div class="report-actions"><button class="btn secondary" onclick="window.print()">Imprimer / PDF</button><button class="btn secondary" onclick="toast('Export Excel à connecter au module de production')">Excel</button></div>`;
 return yearBanner()+panel('Rapports de l’exercice',`<div class="grid two">
 <div class="quick"><strong>Collecte</strong><span class="muted">Jour, semaine, mois, année, localité, planteur, commis, activité.</span></div>
 <div class="quick"><strong>Caisse</strong><span class="muted">Ouverture, entrées, sorties, clôture, écarts, paiements planteurs.</span></div>
 <div class="quick"><strong>Stock</strong><span class="muted">Entrées, sorties, inventaires, pertes, ajustements, report d'ouverture.</span></div>
 <div class="quick"><strong>Transport</strong><span class="muted">Départ → arrivée → pesée → déchargement → écarts.</span></div>
 <div class="quick"><strong>Ventes / créances</strong><span class="muted">Facturé, encaissé, reste à recevoir, prix moyen, marge.</span></div>
 <div class="quick"><strong>Comptabilité</strong><span class="muted">Journaux, grand livre, balance, résultat, bilan, trésorerie.</span></div>
 <div class="quick"><strong>Commis</strong><span class="muted">Tonnage, objectifs, rendement, primes, anomalies.</span></div>
 <div class="quick"><strong>Direction</strong><span class="muted">Rapport global consolidé + comparaison entre années.</span></div>
 </div>`,actions)+`<div style="margin-top:16px">${panel('Comparatif pluriannuel',`<p class="muted">Le sélecteur d’année permet d’isoler chaque exercice. La vue “Toutes années” sert aux comparaisons historiques et à la Direction.</p>${metric('Exercices disponibles',Y.map(x=>x.annee).join(' • ')||'À créer')}`)}</div>`;
}
function generic(name,desc,features){return yearBanner()+panel(name,`<p class="muted">${desc}</p><div class="grid two">${features.map(([a,b])=>`<div class="quick"><strong>${a}</strong><span class="muted">${b}</span></div>`).join('')}</div>`)}
function commisPage(){const rows=filt('collectes',C.collectes);const out=(C.commis||[]).map(c=>{let cc=rows.filter(x=>x.commis_id===c.id),w=cc.reduce((s,x)=>s+Number(x.poids_net_kg||0),0);return `<tr><td>${esc((c.nom||'')+' '+(c.prenoms||''))}</td><td>${cc.length}</td><td>${kg(w)}</td></tr>`}).join('');return yearBanner()+panel('Performance des commis',table(['Commis','Collectes','Tonnage'],out))+generic('Gestion des commis','Pilotage terrain par activité et exercice.',[['Objectifs','Par mois, campagne et année'],['Primes','Règles de prime et rendement'],['Affectations','Localités et zones'],['Incidents','Anomalies et suivi terrain']]);}
function transportPage(){const rows=filt('voyages',C.voyages).map(x=>`<tr><td>${esc(x.numero_voyage)}</td><td>${esc(x.statut)}</td><td>${kg(x.poids_depart_kg)}</td><td>${kg(x.poids_arrivee_kg)}</td><td>${kg(x.ecart_kg)}</td></tr>`).join('');return yearBanner()+panel('Suivi départ → déchargement',table(['Voyage','Statut','Départ','Usine','Écart'],rows))+generic('Transport & traçabilité','Suivi complet par exercice.',[['Étapes','Préparation → chargé → parti → arrivé → pesé → déchargé → validé'],['Coûts','Carburant, péage, manutention, transport'],['Justificatifs','Tickets usine et photos'],['Alertes','Écart de poids anormal']]);}
function caissePage(){const m=filt('mouvements_caisse',C.mouvements_caisse),sol=m.reduce((s,x)=>s+(x.sens==='entree'?1:-1)*Number(x.montant||0),0);return yearBanner()+`<div class="grid kpis">${kpi('Solde mouvements',money(sol))}${kpi('Entrées',money(m.filter(x=>x.sens==='entree').reduce((s,x)=>s+Number(x.montant||0),0)))}${kpi('Sorties',money(m.filter(x=>x.sens==='sortie').reduce((s,x)=>s+Number(x.montant||0),0)))}${kpi('Mouvements',m.length)}</div>`+generic('Caisse professionnelle','Caisse indépendante par période et traçable.',[['Ouverture','Solde initial par jour'],['Clôture','Solde théorique / réel / écart'],['Paiements','Partiels, groupés, avances, retenues'],['Reports','Solde de clôture → ouverture exercice suivant']]);}
function render(){
 nav();$('#pageTitle').textContent=labels[page]||'SCC-CI-SCOOPS';$('#pageSubtitle').textContent=`${activityName()} • ${yearName()}`;
 let html='';
 if(page==='dashboard')html=dashboard();else if(page==='rapports')html=reports();else if(page==='commis')html=commisPage();else if(page==='transport')html=transportPage();else if(page==='caisse')html=caissePage();
 else{
 const defs={
 planteurs:['Planteurs / producteurs','Fiches, historique, paiements, avances, parcelles et activité.'],
 localites:['Localités & tarifs','Prix bord champ datés, historiques et spécifiques à l’activité.'],
 collectes:['Collectes & pesées','Pesées, reçus, planteur, commis, lot, qualité et année.'],
 lots:['Lots & traçabilité','Regroupement de collectes, coût d’achat et suivi jusqu’au voyage.'],
 stock:['Stock','Entrées, sorties, inventaires, ajustements et reports d’ouverture.'],
 banques:['Banques & transferts','Comptes, versements, retraits, rapprochement et reports annuels.'],
 echeances:['Créances & dettes','Usines, planteurs, fournisseurs et échéances par exercice.'],
 flotte:['Flotte & maintenance','Camions, carburant, entretien, assurance, visite technique.'],
 usines:['Usines / clients','Contrats, ventes, créances, qualité et historique.'],
 ventes:['Ventes','Poids vendu, prix/kg, facture, règlement, créance et marge.'],
 depenses:['Dépenses','Charges par catégorie, activité, période, voyage et responsable.'],
 compta:['Comptabilité','Plan comptable, journaux, partie double, balance, grand livre, bilan et résultat.'],
 budget:['Budget & analytique','Prévision vs réalisé et rentabilité par activité, localité, commis et voyage.'],
 clotures:['Clôtures','Clôture mensuelle et annuelle, verrouillage des périodes et reports à nouveau.'],
 membres:['Membres & parts sociales','Adhésions, parts sociales, historique et situation par membre.'],
 gouvernance:['Gouvernance & AG','Assemblée générale, résolutions, mandats et procès-verbaux.'],
 personnel:['Personnel','Présence, paie, primes, congés et affectations.'],
 documents:['Documents & conformité','Contrats, tickets, assurances, agréments et échéances.'],
 audit:['Audit','Qui a créé, modifié, validé, annulé et quand.'],
 utilisateurs:['Utilisateurs & rôles','Droits par service et séparation des responsabilités.'],
 parametres:['Paramètres','Activités, exercices, numérotation, seuils et règles métier.'],
 alertes:['Alertes & contrôle','Écarts, doubles paiements, stock incohérent, créances en retard et documents expirés.']
 };
 const d=defs[page]||['Module','Fonctionnalité professionnelle'];
 html=generic(d[0],d[1],[['Multi-activité','Caoutchouc / Graines d’hévéa / Palmier à huile'],['Multi-années','Exercices totalement séparés'],['Traçabilité','Historique et audit'],['Rapports','PDF / Excel / impression']]);
 }
 $('#content').innerHTML=html;
}
window.go=k=>{page=k;render()};

async function enter(){
 const r=await sb.from('profiles').select('*').eq('id',session.user.id).single();if(r.error){toast('Profil introuvable ou accès refusé');return}
 profile=r.data;await load();
 $('#loginView').classList.add('hidden');$('#appView').classList.remove('hidden');
 $('#roleLabel').textContent=profile.role||'utilisateur';$('#userName').textContent=profile.nom_complet||profile.nom||'Utilisateur';$('#userEmail').textContent=session.user.email;
 $('#activitySelect').innerHTML=`<option value="ALL">Toutes activités</option>`+A.map(a=>`<option value="${a.id}">${esc(a.nom)}</option>`).join('');
 const current=new Date().getFullYear();$('#yearSelect').innerHTML=`<option value="ALL">Toutes années</option>`+(Y.length?Y.map(y=>`<option value="${y.annee}" ${y.annee===current?'selected':''}>${esc(y.libelle||y.annee)}</option>`).join(''):`<option value="${current}" selected>${current}</option>`);
 year=Y.some(y=>y.annee===current)?String(current):'ALL';
 $('#activitySelect').onchange=e=>{activity=e.target.value;render()};$('#yearSelect').onchange=e=>{year=e.target.value;render()};render();
}
$('#loginForm').onsubmit=async e=>{e.preventDefault();$('#loginStatus').textContent='Connexion...';const {data,error}=await sb.auth.signInWithPassword({email:$('#loginEmail').value,password:$('#loginPassword').value});if(error){$('#loginStatus').textContent=error.message;return}session=data.session;$('#loginStatus').textContent='';await enter()};
$('#logoutBtn').onclick=async()=>{await sb.auth.signOut();location.reload()};
$('#menuBtn').onclick=()=>$('#sidebar').classList.toggle('open');
(async()=>{$('#todayLabel').textContent=new Date().toLocaleDateString('fr-FR',{dateStyle:'long'});const {data:{session:s}}=await sb.auth.getSession();if(s){session=s;await enter()}})();
