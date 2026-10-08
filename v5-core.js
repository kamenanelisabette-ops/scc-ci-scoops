/* SCC-CI-SCOOPS V5 — UX + modules manquants */
(function(){
  const v5Can=(...roles)=>!!profile && (profile.role==='admin'||roles.includes(profile.role));
  const safeDateV5=v=>{try{return v?new Date(v).toLocaleDateString('fr-FR'):'—'}catch{return '—'}};
  const v5Status=(txt,type='')=>`<span class="pill ${type}">${esc(txt||'—')}</span>`;

  function v5Empty(msg='Aucune donnée enregistrée'){
    return `<div class="v5-empty">${esc(msg)}</div>`;
  }

  // Alertes + incidents avec vraies actions
  alertes=function(){
    const a=(C.alertes||[]).slice().sort((x,y)=>new Date(y.created_at)-new Date(x.created_at));
    const incidents=(C.incidents||[]).slice().sort((x,y)=>new Date(y.date_incident)-new Date(x.date_incident));
    const open=a.filter(x=>!x.resolu).length;
    const critical=incidents.filter(x=>['elevee','critique'].includes(String(x.gravite||'').toLowerCase()) && !['resolu','classe'].includes(String(x.statut||'').toLowerCase())).length;
    const ar=a.map(x=>`<tr>
      <td>${safeDateV5(x.created_at)}</td>
      <td>${v5Status(x.niveau||'info',x.niveau==='critique'?'red':'')}</td>
      <td><strong>${esc(x.titre)}</strong><div class="muted">${esc(x.message||'')}</div></td>
      <td>${x.resolu?v5Status('Résolu','green'):`<button class="btn secondary sm" data-resolve-alert="${x.id}">Marquer résolu</button>`}</td>
    </tr>`).join('');
    const ir=incidents.map(x=>`<tr>
      <td>${safeDateV5(x.date_incident)}</td><td>${esc(x.type_incident)}</td>
      <td>${v5Status(x.gravite,x.gravite==='critique'?'red':'')}</td>
      <td>${esc(x.description)}</td><td>${esc(x.statut)}</td>
    </tr>`).join('');
    const f=v5Can('direction')?formPanel('Créer une alerte','fAlerte',`
      <label>Type<input name="type" required placeholder="Stock, transport, paiement..."></label>
      <label>Niveau<select name="niveau"><option value="info">Information</option><option value="attention">Attention</option><option value="critique">Critique</option></select></label>
      <label class="span2">Titre<input name="titre" required></label>
      <label class="span2">Message<textarea name="message" required></textarea></label>
      <button class="btn primary wide">Créer l’alerte</button>
    `,true):'';
    return roleInfo()+banner()+`<div class="grid kpis">
      ${kpi('Alertes ouvertes',open,'à traiter')}
      ${kpi('Incidents critiques',critical,'priorité')}
      ${kpi('Alertes résolues',a.filter(x=>x.resolu).length,'historique')}
      ${kpi('Incidents',incidents.length,'total')}
    </div><div class="grid two">
      ${panel('Centre d’alertes',ar?table(['Date','Niveau','Alerte','Action'],ar):v5Empty())}
      ${f||panel('Gestion',v5Empty('Consultation uniquement pour votre rôle'))}
    </div><div style="margin-top:16px">${panel('Incidents',ir?table(['Date','Type','Gravité','Description','Statut'],ir):v5Empty())}</div>`;
  };

  // Créances & dettes avec formulaire manquant
  echeances=function(){
    const rows=filt('echeances',C.echeances||[]).slice().sort((a,b)=>new Date(a.date_echeance||'2999-01-01')-new Date(b.date_echeance||'2999-01-01'));
    const total=rows.reduce((s,x)=>s+Math.max(0,Number(x.montant_initial||0)-Number(x.montant_regle||0)),0);
    const overdue=rows.filter(x=>x.date_echeance && new Date(x.date_echeance)<new Date() && !['reglee','soldee','cloturee'].includes(String(x.statut||'').toLowerCase())).length;
    const tr=rows.map(x=>`<tr>
      <td>${esc(x.type_echeance||'—')}</td>
      <td>${esc(x.source_type||'—')}</td>
      <td>${money(x.montant_initial)}</td>
      <td>${money(x.montant_regle)}</td>
      <td><strong>${money(Math.max(0,Number(x.montant_initial||0)-Number(x.montant_regle||0)))}</strong></td>
      <td>${esc(x.date_echeance||'—')}</td>
      <td>${esc(x.statut||'ouverte')}</td>
    </tr>`).join('');
    const f=formPanel('Nouvelle créance / dette','fEcheance',`
      <label>Type<select name="type"><option value="creance">Créance</option><option value="dette">Dette</option></select></label>
      <label>Origine<input name="source" placeholder="Usine, fournisseur, avance..."></label>
      <label>Montant initial<input name="montant" type="number" min="0" required></label>
      <label>Déjà réglé<input name="regle" type="number" min="0" value="0"></label>
      <label>Date échéance<input name="date" type="date"></label>
      <label>Statut<select name="statut"><option value="ouverte">Ouverte</option><option value="partielle">Partielle</option><option value="reglee">Réglée</option></select></label>
      <button class="btn primary wide">Enregistrer</button>
    `,v5Can('direction','comptabilite','caisse'));
    return roleInfo()+banner()+`<div class="grid kpis">
      ${kpi('Reste à suivre',money(total),'créances + dettes')}
      ${kpi('Échéances',rows.length,'dossiers')}
      ${kpi('En retard',overdue,'à relancer')}
      ${kpi('Réglées',rows.filter(x=>['reglee','soldee'].includes(String(x.statut||'').toLowerCase())).length,'clôturées')}
    </div><div class="grid two">${panel('Suivi des échéances',tr?table(['Type','Origine','Initial','Réglé','Reste','Échéance','Statut'],tr):v5Empty())}${f}</div>`;
  };

  // Documents : présentation plus claire
  documents=function(){
    const docsDep=(C.depenses||[]).filter(x=>x.justificatif_url).length;
    const tickets=(C.voyages||[]).filter(x=>x.ticket_pesee_url).length;
    const pvs=(C.assemblees||[]).filter(x=>x.pv_url).length;
    return roleInfo()+banner()+`<div class="v5-health-grid">
      <div class="v5-health"><span>Justificatifs dépenses</span><strong>${docsDep}</strong></div>
      <div class="v5-health"><span>Tickets de pesée</span><strong>${tickets}</strong></div>
      <div class="v5-health"><span>PV d’assemblée</span><strong>${pvs}</strong></div>
      <div class="v5-health"><span>Documents référencés</span><strong>${docsDep+tickets+pvs}</strong></div>
    </div>${panel('Centre documentaire',`
      <div class="grid three">
        <div class="quick"><strong>Dépenses</strong><span class="muted">Pièces justificatives liées aux décaissements.</span></div>
        <div class="quick"><strong>Transport</strong><span class="muted">Tickets usine et justificatifs de pesée.</span></div>
        <div class="quick"><strong>Gouvernance</strong><span class="muted">PV et documents liés aux assemblées.</span></div>
      </div>
      <div class="section-note" style="margin-top:16px">Les documents sont rattachés aux opérations correspondantes afin de conserver la traçabilité.</div>
    `)}`;
  };

  // Paramètres améliorés + état du système
  parametres=function(){
    const canEdit=['admin','direction'].includes(profile?.role);
    const ar=(A||[]).map(x=>`<tr>
      <td><strong>${esc(x.nom)}</strong><div class="muted">${esc(x.code)}</div></td>
      <td>${esc(x.unite_principale||'kg')}</td>
      <td><div style="display:flex;gap:8px;align-items:center">
        <input style="max-width:110px" data-tare-input="${x.id}" type="number" min="0" max="100" step="0.01" value="${Number(x.taux_tare_percent||0)}" ${canEdit?'':'disabled'}>
        <span>%</span></div></td>
      <td>${x.actif?v5Status('Actif','green'):v5Status('Inactif')}</td>
      <td>${canEdit?`<button class="btn primary sm" data-save-tare="${x.id}">Enregistrer</button>`:'Lecture seule'}</td>
    </tr>`).join('');
    const ca=(C.caisses||[]).map(x=>`<tr><td>${esc(x.code)}</td><td>${esc(x.nom)}</td><td>${x.actif?v5Status('Active','green'):v5Status('Inactive')}</td></tr>`).join('');
    return roleInfo()+banner()+`<div class="v5-health-grid">
      <div class="v5-health"><span>Base de données</span><strong>En ligne</strong></div>
      <div class="v5-health"><span>Activités</span><strong>${(A||[]).length}</strong></div>
      <div class="v5-health"><span>Exercices</span><strong>${(Y||[]).length}</strong></div>
      <div class="v5-health"><span>Utilisateur</span><strong>${esc(profile?.role||'—')}</strong></div>
    </div><div class="grid two">
      ${panel('Tare par activité',`<div class="section-note">Le taux est appliqué automatiquement aux pesées. Caoutchouc est configuré à 3 % actuellement.</div>${table(['Activité','Unité','Tare','Statut','Action'],ar)}`)}
      ${panel('Caisses',ca?table(['Code','Nom','Statut'],ca):v5Empty())}
    </div>`;
  };

  const previousBindV5=bindForms;
  bindForms=function(){
    previousBindV5();

    bind('fAlerte',fd=>insert('alertes',{
      activite_id:activity==='ALL'?null:currentActivity(),
      exercice_annee:currentYear(),
      type_alerte:String(fd.get('type')||'autre').trim(),
      titre:String(fd.get('titre')||'').trim(),
      message:String(fd.get('message')||'').trim(),
      niveau:fd.get('niveau')||'info',
      lu:false,resolu:false
    }));

    bind('fEcheance',fd=>{
      const montant=Number(fd.get('montant')||0),regle=Number(fd.get('regle')||0);
      if(montant<0||regle<0||regle>montant){toast('Vérifiez les montants de l’échéance');return false}
      return insert('echeances',{
        activite_id:activity==='ALL'?null:currentActivity(),
        exercice_annee:currentYear(),
        type_echeance:fd.get('type'),
        source_type:String(fd.get('source')||'manuel').trim()||'manuel',
        montant_initial:montant,
        montant_regle:regle,
        date_echeance:fd.get('date')||null,
        statut:fd.get('statut')||'ouverte'
      });
    });

    document.querySelectorAll('[data-resolve-alert]').forEach(btn=>btn.onclick=()=>update('alertes',btn.dataset.resolveAlert,{resolu:true,lu:true}));
  };

  // Signature V5 visible
  const oldEnter=enter;
  enter=async function(){
    await oldEnter();
    const foot=document.querySelector('.side-foot small');
    if(foot) foot.textContent='Version 5.0 ERP PRO';
  };
})();
