/* SCC-CI-SCOOPS V5.3 — COMPTABILITE AUTO + RH */
(function(){
  const HR_TABLES=[
    'personnel','presences_personnel','conges_personnel',
    'avances_personnel','paies_personnel','paiements_salaires',
    'parametres_comptables'
  ];
  HR_TABLES.forEach(t=>{if(!loadTables.includes(t))loadTables.push(t)});

  function n53(v){const x=Number(v);return Number.isFinite(x)?x:0}
  function pill53(t,c=''){return `<span class="pill ${c}">${esc(t||'—')}</span>`}
  function auto53(t){return `<div class="auto-note"><span class="auto-dot"></span><div><strong>Automatique</strong><span>${t}</span></div></div>`}

  // ===== COMPTABILITE =====
  compta=function(){
    const pieces=(C.pieces_comptables||[]).slice().sort((a,b)=>new Date(b.date_piece)-new Date(a.date_piece));
    const e=(C.ecritures_comptables||[]);
    const debit=e.reduce((s,x)=>s+n53(x.debit),0),credit=e.reduce((s,x)=>s+n53(x.credit),0);

    const pr=pieces.slice(0,100).map(p=>{
      const j=(C.journaux_comptables||[]).find(x=>x.id===p.journal_id);
      const lines=e.filter(x=>x.piece_id===p.id);
      const d=lines.reduce((s,x)=>s+n53(x.debit),0),c=lines.reduce((s,x)=>s+n53(x.credit),0);
      return `<tr>
        <td>${esc(p.numero_piece)}</td>
        <td>${esc(p.date_piece||'—')}</td>
        <td>${esc(j?.code||'—')}</td>
        <td>${esc(p.libelle)}</td>
        <td>${esc(p.reference_source||'—')}</td>
        <td>${money(d)}</td>
        <td>${money(c)}</td>
        <td>${p.source_table?pill53('Auto','green'):'Manuel'}</td>
        <td>${esc(p.statut||'—')}</td>
      </tr>`;
    }).join('');

    const comptes=(C.comptes_comptables||[]).map(x=>`<tr><td>${esc(x.numero)}</td><td>${esc(x.intitule)}</td><td>${esc(x.classe||'')}</td><td>${esc(x.type_compte||'')}</td></tr>`).join('');

    const maps=(C.parametres_comptables||[]).map(x=>`<tr>
      <td>${esc(x.code_operation)}</td><td>${esc(x.journal_code)}</td>
      <td>${esc(x.compte_debit)}</td><td>${esc(x.compte_credit)}</td>
      <td>${esc(x.libelle)}</td><td>${x.actif?pill53('Actif','green'):pill53('Inactif')}</td>
    </tr>`).join('');

    return roleInfo()+banner()+
      auto53('Les opérations métiers génèrent automatiquement les pièces et écritures débit/crédit. La saisie comptable manuelle devient exceptionnelle.')+
      `<div class="grid kpis">
        ${kpi('Pièces',pieces.length,'générées')}
        ${kpi('Débit',money(debit),'total')}
        ${kpi('Crédit',money(credit),'total')}
        ${kpi('Écart',money(debit-credit),Math.abs(debit-credit)<0.01?'Équilibré':'À contrôler')}
      </div>
      <div class="grid two">
        ${panel('Journal comptable',pr?table(['Pièce','Date','Journal','Libellé','Référence','Débit','Crédit','Origine','Statut'],pr):'')}
        ${panel('Plan de comptes',comptes?table(['Compte','Intitulé','Classe','Type'],comptes):'')}
      </div>
      <div style="margin-top:16px">${panel('Règles de comptabilisation automatique',maps?table(['Opération','Journal','Débit','Crédit','Libellé','Statut'],maps):'')}</div>`;
  };

  // ===== PERSONNEL =====
  personnel=function(){
    const staff=(C.personnel||[]).slice().sort((a,b)=>String(a.nom).localeCompare(String(b.nom),'fr'));
    const paies=C.paies_personnel||[], pres=C.presences_personnel||[], conges=C.conges_personnel||[], av=C.avances_personnel||[];
    const sr=staff.map(x=>`<tr>
      <td><strong>${esc(x.matricule)}</strong></td>
      <td>${esc((x.nom||'')+' '+(x.prenoms||''))}</td>
      <td>${esc(x.fonction||'—')}</td>
      <td>${esc(x.service||'—')}</td>
      <td>${esc(x.telephone||'—')}</td>
      <td>${money(x.salaire_base)}</td>
      <td>${esc(x.type_contrat||'—')}</td>
      <td>${x.statut==='actif'?pill53('Actif','green'):pill53(x.statut)}</td>
    </tr>`).join('');

    const f=formPanel('Ajouter un employé','fPersonnel',`
      <label>Matricule<input name="matricule" required placeholder="EMP-0001"></label>
      <label>Nom<input name="nom" required></label>
      <label>Prénoms<input name="prenoms"></label>
      <label>Téléphone<input name="telephone"></label>
      <label>Email<input name="email" type="email"></label>
      <label>Fonction<input name="fonction" required></label>
      <label>Service<input name="service"></label>
      <label>Type contrat<select name="contrat"><option value="CDI">CDI</option><option value="CDD">CDD</option><option value="journalier">Journalier</option><option value="prestataire">Prestataire</option></select></label>
      <label>Date embauche<input name="embauche" type="date" required></label>
      <label>Salaire base<input name="salaire" type="number" min="0" required></label>
      <label>Mode paiement<select name="mode"><option value="banque">Banque</option><option value="especes">Espèces</option><option value="mobile_money">Mobile Money</option></select></label>
      <label>Banque<input name="banque"></label>
      <label>N° compte masqué<input name="compte"></label>
      <label>N° CNPS<input name="cnps"></label>
      <button class="btn primary wide">Enregistrer l’employé</button>
    `,canRole('direction','comptabilite'));

    const today=new Date().toISOString().slice(0,10);
    const presForm=formPanel('Présence du jour','fPresence',`
      <label>Employé<select name="personnel" required>${opt(staff.filter(x=>x.statut==='actif'),x=>x.matricule+' • '+x.nom)}</select></label>
      <label>Date<input name="date" type="date" value="${today}" required></label>
      <label>Statut<select name="statut"><option value="present">Présent</option><option value="absent">Absent</option><option value="retard">Retard</option><option value="permission">Permission</option></select></label>
      <label>Arrivée<input name="arrivee" type="time"></label>
      <label>Départ<input name="depart" type="time"></label>
      <label>Observation<input name="observation"></label>
      <button class="btn primary wide">Enregistrer la présence</button>
    `,canRole('direction','comptabilite'));

    return roleInfo()+banner()+`<div class="grid kpis">
      ${kpi('Employés',staff.length,'effectif')}
      ${kpi('Actifs',staff.filter(x=>x.statut==='actif').length,'en poste')}
      ${kpi('Présences',pres.length,'historique')}
      ${kpi('Congés ouverts',conges.filter(x=>!['rejete','termine'].includes(String(x.statut))).length,'suivi')}
    </div>
    <div class="grid two">${panel('Personnel',sr?table(['Matricule','Nom','Fonction','Service','Téléphone','Salaire','Contrat','Statut'],sr):'')}${f}</div>
    <div class="grid two" style="margin-top:16px">${presForm}${paie()}</div>`;
  };

  function paie(){
    const staff=C.personnel||[], paies=(C.paies_personnel||[]).slice().sort((a,b)=>b.exercice_annee-a.exercice_annee||b.mois-a.mois);
    const rows=paies.map(x=>{
      const p=staff.find(y=>y.id===x.personnel_id);
      return `<tr>
        <td>${esc(x.numero_paie)}</td><td>${esc(p?.nom||'—')}</td>
        <td>${String(x.mois).padStart(2,'0')}/${x.exercice_annee}</td>
        <td>${money(x.salaire_brut)}</td><td>${money(x.retenues)}</td>
        <td>${money(x.remboursement_avance)}</td><td><strong>${money(x.net_a_payer)}</strong></td>
        <td>${esc(x.statut)}</td>
        <td>${x.statut==='brouillon'?`<button class="btn secondary sm" data-validate-payroll="${x.id}">Valider</button>`:''}
            ${['valide','partiel'].includes(x.statut)?`<button class="btn primary sm" data-pay-salary="${x.id}">Payer</button>`:''}</td>
      </tr>`;
    }).join('');

    const form=`<div class="panel"><div class="panel-head"><h3>Nouvelle paie</h3></div><div class="panel-body">
      ${auto53('Le brut et le net sont calculés automatiquement. La validation génère l’écriture comptable. Le paiement génère ensuite la trésorerie et la comptabilité du règlement.')}
      <form id="fPaie" class="form-grid">
        <label>N° paie<input name="numero" required placeholder="PAIE-2026-10-001"></label>
        <label>Employé<select name="personnel" required>${opt(staff.filter(x=>x.statut==='actif'),x=>x.matricule+' • '+x.nom)}</select></label>
        <label>Année<input name="annee" type="number" value="${currentYear()}" required></label>
        <label>Mois<input name="mois" type="number" min="1" max="12" value="${new Date().getMonth()+1}" required></label>
        <label>Prime<input name="prime" type="number" min="0" value="0"></label>
        <label>Heures supp (montant)<input name="hs" type="number" min="0" value="0"></label>
        <label>Retenues<input name="retenues" type="number" min="0" value="0"></label>
        <label>Remboursement avance<input name="remboursement" type="number" min="0" value="0"></label>
        <button class="btn primary wide">Créer le bulletin</button>
      </form>
      ${rows?table(['N°','Employé','Période','Brut','Retenues','Avance','Net','Statut','Action'],rows):''}
    </div></div>`;
    return form;
  }

  // ===== MODULE CONGES / AVANCES RH =====
  gouvernance = (function(oldGov){
    return oldGov;
  })(gouvernance);

  const oldBind53=bindForms;
  bindForms=function(){
    oldBind53();

    bind('fPersonnel',fd=>insert('personnel',{
      matricule:String(fd.get('matricule')||'').trim(),
      nom:String(fd.get('nom')||'').trim(),
      prenoms:fd.get('prenoms')||null,telephone:fd.get('telephone')||null,email:fd.get('email')||null,
      fonction:String(fd.get('fonction')||'').trim(),service:fd.get('service')||null,
      type_contrat:fd.get('contrat')||null,date_embauche:fd.get('embauche'),
      salaire_base:n53(fd.get('salaire')),mode_paiement:fd.get('mode')||'banque',
      banque:fd.get('banque')||null,numero_compte_masque:fd.get('compte')||null,
      numero_cnps:fd.get('cnps')||null,statut:'actif',created_by:session.user.id
    }));

    bind('fPresence',fd=>insert('presences_personnel',{
      personnel_id:fd.get('personnel'),date_jour:fd.get('date'),statut:fd.get('statut'),
      heure_arrivee:fd.get('arrivee')||null,heure_depart:fd.get('depart')||null,
      observation:fd.get('observation')||null,saisi_par:session.user.id
    }));

    bind('fPaie',fd=>{
      const p=(C.personnel||[]).find(x=>x.id===fd.get('personnel'));
      if(!p){toast('Employé introuvable');return}
      return insert('paies_personnel',{
        numero_paie:String(fd.get('numero')||'').trim(),
        personnel_id:p.id,exercice_annee:n53(fd.get('annee')),mois:n53(fd.get('mois')),
        salaire_base:n53(p.salaire_base),primes:n53(fd.get('prime')),heures_supp:n53(fd.get('hs')),
        retenues:n53(fd.get('retenues')),remboursement_avance:n53(fd.get('remboursement')),
        statut:'brouillon'
      });
    });

    document.querySelectorAll('[data-validate-payroll]').forEach(btn=>btn.onclick=()=>update('paies_personnel',btn.dataset.validatePayroll,{
      statut:'valide',date_validation:new Date().toISOString(),valide_par:session.user.id
    }));

    document.querySelectorAll('[data-pay-salary]').forEach(btn=>btn.onclick=async()=>{
      const paie=(C.paies_personnel||[]).find(x=>x.id===btn.dataset.paySalary);
      if(!paie)return;
      const emp=(C.personnel||[]).find(x=>x.id===paie.personnel_id);
      const paid=(C.paiements_salaires||[]).filter(x=>x.paie_id===paie.id).reduce((s,x)=>s+n53(x.montant),0);
      const reste=Math.max(0,n53(paie.net_a_payer)-paid);
      if(reste<=0){toast('Salaire déjà payé');return}
      const val=prompt('Montant à payer',String(reste)); if(val===null)return;
      const montant=n53(val); if(montant<=0||montant>reste){toast('Montant invalide');return}
      const mode=prompt('Mode : especes / banque / virement / mobile_money',emp?.mode_paiement||'banque');
      if(mode===null)return;
      await insert('paiements_salaires',{
        paie_id:paie.id,montant,moyen_paiement:String(mode).trim().toLowerCase(),
        reference_paiement:null,paye_par:session.user.id
      });
    });
  };

  // Rendu consolidé
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
