/* SCC-CI-SCOOPS V5.1 — ERP Coopérative PRO */
(function(){
  const NEW_TABLES=[
    'parcelles','controles_qualite','avances_planteurs','remboursements_avances',
    'sites_stock','rapprochements_bancaires','documents_cooperative'
  ];
  NEW_TABLES.forEach(t=>{if(!loadTables.includes(t))loadTables.push(t)});

  const production=menus.find(x=>x[0]==='Production');
  if(production && !production[1].some(x=>x[0]==='parcelles')){
    production[1].splice(1,0,['parcelles','Parcelles & traçabilité']);
    production[1].push(['qualite','Contrôle qualité']);
  }
  const tresorerie=menus.find(x=>x[0]==='Trésorerie');
  if(tresorerie && !tresorerie[1].some(x=>x[0]==='avances')){
    tresorerie[1].push(['avances','Avances planteurs']);
  }
  Object.assign(labels,{
    parcelles:'Parcelles & traçabilité',
    qualite:'Contrôle qualité',
    avances:'Avances planteurs'
  });

  if(ROLE_PAGES.secretariat && Array.isArray(ROLE_PAGES.secretariat)){
    ['parcelles','qualite','avances'].forEach(x=>{if(!ROLE_PAGES.secretariat.includes(x))ROLE_PAGES.secretariat.push(x)});
  }
  if(ROLE_PAGES.caisse && Array.isArray(ROLE_PAGES.caisse)){
    ['avances'].forEach(x=>{if(!ROLE_PAGES.caisse.includes(x))ROLE_PAGES.caisse.push(x)});
  }
  if(ROLE_PAGES.comptabilite && Array.isArray(ROLE_PAGES.comptabilite)){
    ['parcelles','qualite','avances'].forEach(x=>{if(!ROLE_PAGES.comptabilite.includes(x))ROLE_PAGES.comptabilite.push(x)});
  }
  if(ROLE_PAGES.commis && Array.isArray(ROLE_PAGES.commis)){
    ['parcelles','qualite'].forEach(x=>{if(!ROLE_PAGES.commis.includes(x))ROLE_PAGES.commis.push(x)});
  }
  if(ROLE_PAGES.stock_transport && Array.isArray(ROLE_PAGES.stock_transport)){
    ['parcelles','qualite'].forEach(x=>{if(!ROLE_PAGES.stock_transport.includes(x))ROLE_PAGES.stock_transport.push(x)});
  }

  function emptyV51(txt='Aucune donnée enregistrée'){
    return `<div class="v51-empty"><div class="v51-empty-icon">◎</div><strong>${esc(txt)}</strong><span>Les nouvelles opérations apparaîtront ici.</span></div>`;
  }
  function badgeV51(txt,cls=''){return `<span class="pill ${cls}">${esc(txt||'—')}</span>`}
  function n(v){const x=Number(v);return Number.isFinite(x)?x:0}

  parcelles=function(){
    const rows=filt('parcelles',C.parcelles||[]).map(x=>{
      const p=(C.planteurs||[]).find(y=>y.id===x.planteur_id);
      const l=(C.localites||[]).find(y=>y.id===x.localite_id);
      return `<tr>
        <td><strong>${esc(x.code_parcelle)}</strong></td>
        <td>${esc(((p?.nom||'')+' '+(p?.prenoms||'')).trim()||'—')}</td>
        <td>${esc(l?.nom||x.village_campement||'—')}</td>
        <td>${n(x.superficie_ha).toLocaleString('fr-FR')} ha</td>
        <td>${x.latitude!=null&&x.longitude!=null?`${x.latitude}, ${x.longitude}`:'—'}</td>
        <td>${esc(x.certification||'—')}</td>
        <td>${x.actif?badgeV51('Active','green'):badgeV51('Inactive')}</td>
      </tr>`;
    }).join('');
    const totalHa=filt('parcelles',C.parcelles||[]).reduce((s,x)=>s+n(x.superficie_ha),0);
    const form=formPanel('Enregistrer une parcelle','fParcelle',`
      <label>Code parcelle<input name="code" required placeholder="PAR-0001"></label>
      <label>Planteur<select name="planteur" required>${opt(filt('planteurs',C.planteurs||[]),x=>x.code_planteur+' • '+x.nom)}</select></label>
      <label>Localité<select name="localite"><option value="">—</option>${opt(filt('localites',C.localites||[]),x=>x.nom)}</select></label>
      <label>Village / campement<input name="village"></label>
      <label>Superficie ha<input name="superficie" type="number" step="0.01" min="0" required></label>
      <label>Statut foncier<input name="foncier" placeholder="Propriété, location..."></label>
      <label>Latitude<input name="latitude" type="number" step="0.0000001"></label>
      <label>Longitude<input name="longitude" type="number" step="0.0000001"></label>
      <label>Certification<input name="certification" placeholder="Aucune / certification"></label>
      <label class="span2">Observation<textarea name="observation"></textarea></label>
      <button class="btn primary wide">Enregistrer la parcelle</button>
    `,canRole('direction','secretariat','commis'));
    return roleInfo()+banner()+`<div class="grid kpis">
      ${kpi('Parcelles',filt('parcelles',C.parcelles||[]).length,'enregistrées')}
      ${kpi('Superficie',totalHa.toLocaleString('fr-FR')+' ha','surface totale')}
      ${kpi('Avec GPS',filt('parcelles',C.parcelles||[]).filter(x=>x.latitude!=null&&x.longitude!=null).length,'géolocalisées')}
      ${kpi('Actives',filt('parcelles',C.parcelles||[]).filter(x=>x.actif).length,'en production')}
    </div><div class="grid two">${panel('Registre des parcelles',rows?table(['Code','Planteur','Zone','Superficie','GPS','Certification','Statut'],rows):emptyV51())}${form}</div>`;
  };

  qualite=function(){
    const q=filt('controles_qualite',C.controles_qualite||[]).slice().sort((a,b)=>new Date(b.date_controle)-new Date(a.date_controle));
    const rows=q.map(x=>{
      const col=(C.collectes||[]).find(c=>c.id===x.collecte_id);
      return `<tr>
        <td>${new Date(x.date_controle).toLocaleDateString('fr-FR')}</td>
        <td>${esc(col?.numero_recu||x.type_controle||'—')}</td>
        <td>${esc(x.grade_qualite||'—')}</td>
        <td>${x.taux_humidite==null?'—':n(x.taux_humidite)+' %'}</td>
        <td>${x.taux_impurete==null?'—':n(x.taux_impurete)+' %'}</td>
        <td>${kg(x.poids_rejete_kg)}</td>
        <td>${x.conforme?badgeV51('Conforme','green'):badgeV51('Non conforme','red')}</td>
      </tr>`;
    }).join('');
    const form=formPanel('Nouveau contrôle qualité','fQualite',`
      <label>Collecte<select name="collecte"><option value="">—</option>${opt(filt('collectes',C.collectes||[]),x=>x.numero_recu+' • '+kg(x.poids_net_kg))}</select></label>
      <label>Grade / qualité<input name="grade" placeholder="A, B, Standard..."></label>
      <label>Humidité %<input name="humidite" type="number" min="0" max="100" step="0.01"></label>
      <label>Impuretés %<input name="impurete" type="number" min="0" max="100" step="0.01"></label>
      <label>Poids rejeté kg<input name="rejete" type="number" min="0" step="0.01" value="0"></label>
      <label>Conformité<select name="conforme"><option value="1">Conforme</option><option value="0">Non conforme</option></select></label>
      <label class="span2">Motif / observation<textarea name="observation"></textarea></label>
      <button class="btn primary wide">Valider le contrôle</button>
    `,canRole('direction','secretariat','commis','stock_transport'));
    return roleInfo()+banner()+`<div class="grid kpis">
      ${kpi('Contrôles',q.length,'effectués')}
      ${kpi('Conformes',q.filter(x=>x.conforme).length,'validés')}
      ${kpi('Non conformes',q.filter(x=>!x.conforme).length,'à traiter')}
      ${kpi('Poids rejeté',kg(q.reduce((s,x)=>s+n(x.poids_rejete_kg),0)),'cumul')}
    </div><div class="grid two">${panel('Historique qualité',rows?table(['Date','Collecte','Grade','Humidité','Impuretés','Rejet','Statut'],rows):emptyV51())}${form}</div>`;
  };

  avances=function(){
    const av=filt('avances_planteurs',C.avances_planteurs||[]).slice().sort((a,b)=>new Date(b.date_avance)-new Date(a.date_avance));
    const rb=C.remboursements_avances||[];
    const rows=av.map(x=>{
      const p=(C.planteurs||[]).find(y=>y.id===x.planteur_id);
      const paid=rb.filter(r=>r.avance_id===x.id).reduce((s,r)=>s+n(r.montant),0);
      const reste=Math.max(0,n(x.montant)-paid);
      return `<tr>
        <td>${esc(x.numero_avance)}</td>
        <td>${esc(p?.nom||'—')}</td>
        <td>${new Date(x.date_avance).toLocaleDateString('fr-FR')}</td>
        <td>${money(x.montant)}</td>
        <td>${money(paid)}</td>
        <td><strong>${money(reste)}</strong></td>
        <td>${reste<=0?badgeV51('Soldée','green'):badgeV51(x.statut||'Ouverte')}</td>
        <td>${reste>0&&canRole('direction','caisse','comptabilite')?`<button class="btn secondary sm" data-rembourse="${x.id}">Rembourser</button>`:'—'}</td>
      </tr>`;
    }).join('');
    const resteTotal=av.reduce((s,x)=>{
      const paid=rb.filter(r=>r.avance_id===x.id).reduce((z,r)=>z+n(r.montant),0);
      return s+Math.max(0,n(x.montant)-paid);
    },0);
    const form=formPanel('Nouvelle avance planteur','fAvance',`
      <label>N° avance<input name="numero" required placeholder="AV-0001"></label>
      <label>Planteur<select name="planteur" required>${opt(filt('planteurs',C.planteurs||[]),x=>x.code_planteur+' • '+x.nom)}</select></label>
      <label>Montant<input name="montant" type="number" min="1" required></label>
      <label>Moyen<select name="moyen"><option value="especes">Espèces</option><option value="banque">Banque</option><option value="virement">Virement</option><option value="mobile_money">Mobile Money</option></select></label>
      <label>Référence<input name="reference"></label>
      <label>Motif<input name="motif"></label>
      <button class="btn primary wide">Enregistrer l’avance</button>
    `,canRole('direction','caisse','comptabilite'));
    return roleInfo()+banner()+`<div class="grid kpis">
      ${kpi('Avances',money(av.reduce((s,x)=>s+n(x.montant),0)),'accordées')}
      ${kpi('Remboursé',money(rb.reduce((s,x)=>s+n(x.montant),0)),'encaissé')}
      ${kpi('Reste à récupérer',money(resteTotal),'encours')}
      ${kpi('Dossiers ouverts',av.filter(x=>{const p=rb.filter(r=>r.avance_id===x.id).reduce((s,r)=>s+n(r.montant),0);return p<n(x.montant)}).length,'planteurs')}
    </div><div class="grid two">${panel('Suivi des avances',rows?table(['N°','Planteur','Date','Avance','Remboursé','Reste','Statut','Action'],rows):emptyV51())}${form}</div>`;
  };

  const oldCaisseV51=caisse;
  caisse=function(){
    const sessions=filt('sessions_caisse',C.sessions_caisse||[]).slice().sort((a,b)=>new Date(b.ouverture_le||b.created_at)-new Date(a.ouverture_le||a.created_at));
    const open=sessions.find(x=>String(x.statut||'').toLowerCase()==='ouverte');
    const sessionRows=sessions.slice(0,20).map(x=>`<tr>
      <td>${x.ouverture_le?new Date(x.ouverture_le).toLocaleString('fr-FR'):'—'}</td>
      <td>${money(x.solde_ouverture)}</td><td>${money(x.solde_theorique)}</td>
      <td>${x.solde_physique==null?'—':money(x.solde_physique)}</td>
      <td>${x.ecart==null?'—':money(x.ecart)}</td><td>${esc(x.statut||'—')}</td>
    </tr>`).join('');
    const action=canRole('direction','caisse')?(
      open?`<div class="v51-action-card"><strong>Caisse ouverte</strong><span>Session en cours.</span><button class="btn primary" id="closeCashSession">Clôturer la caisse</button></div>`:
      `<form id="fSessionCaisse" class="form-grid"><label>Caisse<select name="caisse" required>${opt(C.caisses||[],x=>x.code+' • '+x.nom)}</select></label><label>Solde initial<input name="solde" type="number" min="0" value="0" required></label><button class="btn primary wide">Ouvrir la caisse</button></form>`
    ):`<div class="section-note">Votre rôle peut consulter les sessions sans les ouvrir ni les clôturer.</div>`;
    return oldCaisseV51()+`<div class="grid two" style="margin-top:16px">${panel('Sessions de caisse',sessionRows?table(['Ouverture','Solde initial','Théorique','Physique','Écart','Statut'],sessionRows):emptyV51())}${panel('Ouverture / clôture',action)}</div>`;
  };

  const oldBanquesV51=banques;
  banques=function(){
    const rr=C.rapprochements_bancaires||[];
    const rows=rr.slice().sort((a,b)=>new Date(b.date_rapprochement)-new Date(a.date_rapprochement)).map(x=>`<tr>
      <td>${esc(C.comptes_bancaires.find(b=>b.id===x.compte_bancaire_id)?.banque||'—')}</td>
      <td>${esc(x.date_rapprochement)}</td><td>${money(x.solde_releve)}</td><td>${money(x.solde_logiciel)}</td>
      <td>${badgeV51(money(x.ecart),Math.abs(n(x.ecart))>0?'red':'green')}</td><td>${esc(x.statut)}</td>
    </tr>`).join('');
    const f=formPanel('Nouveau rapprochement','fRapprochement',`
      <label>Compte<select name="compte" required>${opt(C.comptes_bancaires||[],x=>x.banque+' • '+x.libelle_compte)}</select></label>
      <label>Date<input name="date" type="date" required></label>
      <label>Solde relevé<input name="releve" type="number" step="0.01" required></label>
      <label>Solde logiciel<input name="logiciel" type="number" step="0.01" required></label>
      <label class="span2">Observation<textarea name="observation"></textarea></label>
      <button class="btn primary wide">Enregistrer le rapprochement</button>
    `,canRole('direction','comptabilite'));
    return oldBanquesV51()+`<div class="grid two" style="margin-top:16px">${panel('Rapprochements bancaires',rows?table(['Banque','Date','Relevé','Logiciel','Écart','Statut'],rows):emptyV51())}${f}</div>`;
  };

  const oldStockV51=stock;
  stock=function(){
    const sites=C.sites_stock||[];
    const rows=sites.map(x=>`<tr><td>${esc(x.code)}</td><td><strong>${esc(x.nom)}</strong></td><td>${esc(x.type_site||'magasin')}</td><td>${x.capacite_kg?kg(x.capacite_kg):'—'}</td><td>${esc(x.responsable||'—')}</td><td>${x.actif?badgeV51('Actif','green'):badgeV51('Inactif')}</td></tr>`).join('');
    const f=formPanel('Nouveau site de stock','fSiteStock',`
      <label>Code<input name="code" required placeholder="MAG-DAL-01"></label>
      <label>Nom<input name="nom" required></label>
      <label>Type<select name="type"><option value="magasin">Magasin</option><option value="depot">Dépôt</option><option value="point_collecte">Point de collecte</option></select></label>
      <label>Capacité kg<input name="capacite" type="number" min="0"></label>
      <label>Responsable<input name="responsable"></label>
      <label>Localité<select name="localite"><option value="">—</option>${opt(C.localites||[],x=>x.nom)}</select></label>
      <button class="btn primary wide">Créer le site</button>
    `,canRole('direction','stock_transport'));
    return oldStockV51()+`<div class="grid two" style="margin-top:16px">${panel('Sites & magasins',rows?table(['Code','Site','Type','Capacité','Responsable','Statut'],rows):emptyV51())}${f}</div>`;
  };

  const oldDocumentsV51=documents;
  documents=function(){
    const d=filt('documents_cooperative',C.documents_cooperative||[]).slice().sort((a,b)=>new Date(b.date_document)-new Date(a.date_document));
    const rows=d.map(x=>`<tr><td>${esc(x.date_document||'—')}</td><td>${esc(x.categorie)}</td><td><strong>${esc(x.titre)}</strong></td><td>${esc(x.reference_type||'—')}</td><td>${esc(x.confidentialite||'interne')}</td><td>${x.fichier_url?`<a href="${esc(x.fichier_url)}" target="_blank" rel="noopener">Ouvrir</a>`:'—'}</td></tr>`).join('');
    const f=formPanel('Référencer un document','fDocumentCoop',`
      <label>Catégorie<input name="categorie" required placeholder="Facture, PV, ticket..."></label>
      <label>Titre<input name="titre" required></label>
      <label>Date<input name="date" type="date" required></label>
      <label>Confidentialité<select name="confidentialite"><option value="interne">Interne</option><option value="direction">Direction</option><option value="public">Public</option></select></label>
      <label class="span2">Lien du fichier<input name="url" type="url" placeholder="https://..."></label>
      <label>Type de référence<input name="reference_type" placeholder="collecte, vente, AG..."></label>
      <label>Observation<input name="observation"></label>
      <button class="btn primary wide">Ajouter au registre</button>
    `,canRole('direction','secretariat','comptabilite','stock_transport'));
    return oldDocumentsV51()+`<div class="grid two" style="margin-top:16px">${panel('Registre documentaire',rows?table(['Date','Catégorie','Titre','Référence','Accès','Fichier'],rows):emptyV51())}${f}</div>`;
  };

  const oldDashV51=dashboard;
  dashboard=function(){
    const parc=C.parcelles||[], qual=C.controles_qualite||[], av=C.avances_planteurs||[], rb=C.remboursements_avances||[];
    const avRest=av.reduce((s,x)=>s+Math.max(0,n(x.montant)-rb.filter(r=>r.avance_id===x.id).reduce((z,r)=>z+n(r.montant),0)),0);
    return oldDashV51()+`<div class="v51-section-title"><span>Contrôle coopératif</span><strong>Vue opérationnelle avancée</strong></div><div class="grid kpis">
      ${kpi('Parcelles',parc.length,'traçabilité terrain')}
      ${kpi('Contrôles qualité',qual.length,'conformité')}
      ${kpi('Avances en cours',money(avRest),'planteurs')}
      ${kpi('Sites de stock',(C.sites_stock||[]).length,'magasins / dépôts')}
    </div>`;
  };

  const oldBindV51=bindForms;
  bindForms=function(){
    oldBindV51();

    bind('fParcelle',fd=>insert('parcelles',{
      code_parcelle:String(fd.get('code')||'').trim(),planteur_id:fd.get('planteur'),
      activite_id:currentActivity(),localite_id:fd.get('localite')||null,
      village_campement:fd.get('village')||null,superficie_ha:n(fd.get('superficie')),
      latitude:fd.get('latitude')?n(fd.get('latitude')):null,
      longitude:fd.get('longitude')?n(fd.get('longitude')):null,
      statut_foncier:fd.get('foncier')||null,certification:fd.get('certification')||null,
      observation:fd.get('observation')||null,actif:true,created_by:session.user.id
    }));

    bind('fQualite',fd=>insert('controles_qualite',{
      collecte_id:fd.get('collecte')||null,activite_id:currentActivity(),exercice_annee:currentYear(),
      type_controle:'collecte',grade_qualite:fd.get('grade')||null,
      taux_humidite:fd.get('humidite')?n(fd.get('humidite')):null,
      taux_impurete:fd.get('impurete')?n(fd.get('impurete')):null,
      poids_rejete_kg:n(fd.get('rejete')),conforme:fd.get('conforme')==='1',
      motif_rejet:fd.get('conforme')==='0'?(fd.get('observation')||null):null,
      observation:fd.get('observation')||null,controle_par:session.user.id
    }));

    bind('fAvance',fd=>insert('avances_planteurs',{
      numero_avance:String(fd.get('numero')||'').trim(),planteur_id:fd.get('planteur'),
      activite_id:currentActivity(),exercice_annee:currentYear(),montant:n(fd.get('montant')),
      motif:fd.get('motif')||null,moyen_paiement:fd.get('moyen'),
      reference_paiement:fd.get('reference')||null,statut:'ouverte',created_by:session.user.id
    }));

    document.querySelectorAll('[data-rembourse]').forEach(btn=>btn.onclick=async()=>{
      const avance=(C.avances_planteurs||[]).find(x=>x.id===btn.dataset.rembourse); if(!avance)return;
      const already=(C.remboursements_avances||[]).filter(x=>x.avance_id===avance.id).reduce((s,x)=>s+n(x.montant),0);
      const reste=Math.max(0,n(avance.montant)-already); const val=prompt('Montant du remboursement',String(reste));
      if(val===null)return; const montant=n(val); if(montant<=0||montant>reste){toast('Montant invalide');return}
      await insert('remboursements_avances',{avance_id:avance.id,montant,created_by:session.user.id});
    });

    bind('fSiteStock',fd=>insert('sites_stock',{
      code:String(fd.get('code')||'').trim(),nom:String(fd.get('nom')||'').trim(),
      localite_id:fd.get('localite')||null,type_site:fd.get('type')||'magasin',
      capacite_kg:fd.get('capacite')?n(fd.get('capacite')):null,
      responsable:fd.get('responsable')||null,actif:true
    }));

    bind('fRapprochement',fd=>{
      const rel=n(fd.get('releve')),log=n(fd.get('logiciel')),ec=rel-log;
      return insert('rapprochements_bancaires',{
        compte_bancaire_id:fd.get('compte'),exercice_annee:currentYear(),
        date_rapprochement:fd.get('date'),solde_releve:rel,solde_logiciel:log,ecart:ec,
        observation:fd.get('observation')||null,statut:Math.abs(ec)<0.01?'rapproche':'a_verifier',
        rapproche_par:session.user.id
      });
    });

    bind('fDocumentCoop',fd=>insert('documents_cooperative',{
      categorie:String(fd.get('categorie')||'').trim(),titre:String(fd.get('titre')||'').trim(),
      fichier_url:fd.get('url')||null,reference_type:fd.get('reference_type')||null,
      activite_id:activity==='ALL'?null:currentActivity(),exercice_annee:currentYear(),
      date_document:fd.get('date'),confidentialite:fd.get('confidentialite')||'interne',
      observation:fd.get('observation')||null,ajoute_par:session.user.id
    }));

    bind('fSessionCaisse',fd=>insert('sessions_caisse',{
      caisse_id:fd.get('caisse'),exercice_annee:currentYear(),ouverture_le:new Date().toISOString(),
      solde_ouverture:n(fd.get('solde')),statut:'ouverte',ouvert_par:session.user.id
    }));

    const close=$('#closeCashSession');
    if(close)close.onclick=async()=>{
      const s=(C.sessions_caisse||[]).find(x=>String(x.statut||'').toLowerCase()==='ouverte'); if(!s)return;
      const val=prompt('Montant physique compté en caisse'); if(val===null)return;
      const physique=n(val), mv=(C.mouvements_caisse||[]).filter(x=>x.session_caisse_id===s.id);
      const entrees=mv.filter(x=>x.sens==='entree').reduce((z,x)=>z+n(x.montant),0);
      const sorties=mv.filter(x=>x.sens==='sortie').reduce((z,x)=>z+n(x.montant),0);
      const theo=n(s.solde_ouverture)+entrees-sorties;
      await update('sessions_caisse',s.id,{fermeture_le:new Date().toISOString(),solde_theorique:theo,solde_physique:physique,ecart:physique-theo,statut:'fermee',ferme_par:session.user.id});
    };
  };

  render=function(){
    nav();
    $('#pageTitle').textContent=labels[page]||'SCC-CI-SCOOPS';
    $('#pageSubtitle').textContent=`${activityName()} • ${yearName()}`;
    const map={
      dashboard,alertes,planteurs,parcelles,commis,localites,collectes,lots,stock,qualite,
      caisse,banques,echeances,avances,transport,flotte,usines,ventes,depenses,compta,
      clotures,membres,gouvernance,personnel,documents,rapports,audit,parametres
    };
    $('#content').innerHTML=(map[page]||dashboard)();
    bindForms();
  };
})();
