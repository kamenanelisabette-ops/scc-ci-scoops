/* SCC-CI-SCOOPS V5.2 — SINGLE ENTRY AUTOMATION */
(function(){
  function n52(v){const x=Number(v);return Number.isFinite(x)?x:0}
  function note52(txt){return `<div class="auto-note"><span class="auto-dot"></span><div><strong>Automatique</strong><span>${txt}</span></div></div>`}

  // ===== COLLECTE : une seule saisie, stock créé automatiquement =====
  collectes=function(){
    const act=(A||[]).find(a=>a.id===currentActivity());
    const taux=Number(act?.taux_tare_percent||0);
    const rows=filt('collectes',C.collectes||[]).slice().sort((a,b)=>new Date(b.date_collecte)-new Date(a.date_collecte)).map(x=>{
      const pl=(C.planteurs||[]).find(p=>p.id===x.planteur_id);
      const pa=(C.parcelles||[]).find(p=>p.id===x.parcelle_id);
      const st=(C.sites_stock||[]).find(s=>s.id===x.site_stock_id);
      return `<tr>
        <td>${esc(x.numero_recu)}</td>
        <td>${new Date(x.date_collecte).toLocaleDateString('fr-FR')}</td>
        <td>${esc(pl?.nom||'—')}</td>
        <td>${esc(pa?.code_parcelle||'—')}</td>
        <td>${kg(x.poids_brut_kg)}</td>
        <td>${kg(x.tare_kg)}</td>
        <td><strong>${kg(x.poids_net_kg)}</strong></td>
        <td>${esc(st?.nom||'—')}</td>
        <td>${money(x.net_a_payer)}</td>
        <td>${esc(x.statut_paiement)}</td>
      </tr>`;
    }).join('');

    const f=`<form id="fCollecte">
      ${note52('Après validation, le poids net entre automatiquement en stock. Aucun second mouvement de stock à saisir.')}
      <label>N° reçu<input name="recu" required></label>
      <label>Date<input name="date" type="datetime-local" required></label>
      <label>Planteur<select id="collectePlanteur" name="planteur" required>${opt(filt('planteurs',C.planteurs||[]),x=>x.code_planteur+' • '+x.nom)}</select></label>
      <label>Parcelle<select id="collecteParcelle" name="parcelle"><option value="">— Parcelle non précisée —</option></select></label>
      <label>Commis<select name="commis" required>${opt(filt('commis',C.commis||[]),x=>x.nom)}</select></label>
      <label>Localité<select name="localite" required>${opt(filt('localites',C.localites||[]),x=>x.nom)}</select></label>
      <label>Tarif<select name="tarif" required>${opt(filt('tarifs_bord_champ',C.tarifs_bord_champ||[]).filter(x=>x.actif),x=>money(x.prix_kg)+'/kg')}</select></label>
      <label>Site de stockage<select name="site"><option value="">— Non précisé —</option>${opt((C.sites_stock||[]).filter(x=>x.actif),x=>x.code+' • '+x.nom)}</select></label>
      <label>Poids brut kg<input id="collecteBrut" name="brut" type="number" step="0.01" min="0.01" required></label>
      <label>Taux de tare %<input id="collecteTauxTare" type="number" step="0.01" value="${taux}" readonly></label>
      <label>Tare calculée kg<input id="collecteTare" name="tare" type="number" step="0.01" value="0" readonly></label>
      <label>Poids net kg<input id="collecteNet" type="number" step="0.01" value="0" readonly></label>
      <button class="btn primary wide">Valider la collecte</button>
    </form>`;
    return simpleList('Collectes & pesées',
      ['Reçu','Date','Planteur','Parcelle','Brut','Tare','Net','Stock','Net à payer','Paiement'],rows,f);
  };

  // ===== CAISSE : sessions corrigées et opérations automatiques distinguées =====
  caisse=function(){
    const mv=filt('mouvements_caisse',C.mouvements_caisse||[]);
    const entree=mv.filter(x=>x.sens==='entree').reduce((s,x)=>s+n52(x.montant),0);
    const sortie=mv.filter(x=>x.sens==='sortie').reduce((s,x)=>s+n52(x.montant),0);
    const rows=mv.slice().sort((a,b)=>new Date(b.date_mouvement)-new Date(a.date_mouvement)).map(x=>`<tr>
      <td>${esc(x.numero_piece)}</td><td>${esc(x.sens)}</td><td>${esc(x.categorie)}</td>
      <td>${esc(x.libelle)}</td><td>${money(x.montant)}</td>
      <td>${String(x.reference_externe||'').startsWith('AUTO:')?'<span class="pill green">Automatique</span>':'Manuel'}</td>
      <td>${esc(x.statut||'')}</td>
    </tr>`).join('');

    const sessions=filt('sessions_caisse',C.sessions_caisse||[]).slice().sort((a,b)=>new Date(b.date_ouverture||b.created_at)-new Date(a.date_ouverture||a.created_at));
    const open=sessions.find(x=>String(x.statut||'').toLowerCase()==='ouverte');
    const sr=sessions.map(x=>`<tr>
      <td>${x.date_ouverture?new Date(x.date_ouverture).toLocaleString('fr-FR'):'—'}</td>
      <td>${money(x.montant_ouverture)}</td><td>${x.solde_theorique==null?'—':money(x.solde_theorique)}</td>
      <td>${x.solde_reel==null?'—':money(x.solde_reel)}</td>
      <td>${x.ecart==null?'—':money(x.ecart)}</td><td>${esc(x.statut||'—')}</td>
    </tr>`).join('');

    const sessionAction=canRole('direction','caisse')?(
      open?`<div class="v51-action-card">${note52('Les paiements planteurs, avances et dépenses alimentent automatiquement cette session lorsqu’elle est ouverte.')}<strong>Caisse ouverte</strong><button class="btn primary" id="closeCashSession">Clôturer la caisse</button></div>`:
      `<form id="fSessionCaisse" class="form-grid">${note52('Ouvrez une seule session. Les opérations liées viendront automatiquement dedans.')}<label>Caisse<select name="caisse" required>${opt(C.caisses||[],x=>x.code+' • '+x.nom)}</select></label><label>Solde initial<input name="solde" type="number" min="0" value="0" required></label><button class="btn primary wide">Ouvrir la caisse</button></form>`
    ):'<div class="section-note">Consultation uniquement.</div>';

    const manual=formPanel('Mouvement exceptionnel','fCaisse',`
      ${note52('À utiliser uniquement pour une opération qui ne vient ni d’un paiement planteur, ni d’une avance, ni d’une dépense.')}
      <label>N° pièce<input name="piece" required></label>
      <label>Sens><select name="sens"><option value="entree">Entrée</option><option value="sortie">Sortie</option></select></label>
      <label>Catégorie<input name="categorie" required placeholder="Opération exceptionnelle"></label>
      <label>Libellé<input name="libelle" required></label>
      <label>Montant<input name="montant" type="number" min="0" required></label>
      <label>Mode<select name="mode"><option value="especes">Espèces</option><option value="banque">Banque</option><option value="mobile_money">Mobile Money</option></select></label>
      <button class="btn primary wide">Enregistrer l’exception</button>
    `,canRole('direction','caisse'));

    return roleInfo()+banner()+`<div class="grid kpis">
      ${kpi('Entrées',money(entree),'caisse')}
      ${kpi('Sorties',money(sortie),'caisse')}
      ${kpi('Solde théorique',money(entree-sortie),'hors solde initial')}
      ${kpi('Opérations auto',mv.filter(x=>String(x.reference_externe||'').startsWith('AUTO:')).length,'sans double saisie')}
    </div>
    <div class="grid two">${panel('Mouvements de caisse',rows?table(['Pièce','Sens','Catégorie','Libellé','Montant','Origine','Statut'],rows):'')}${manual}</div>
    <div class="grid two" style="margin-top:16px">${panel('Sessions de caisse',sr?table(['Ouverture','Initial','Théorique','Réel','Écart','Statut'],sr):'')}${panel('Ouverture / clôture',sessionAction)}</div>`;
  };

  // ===== STOCK : automatique, saisie manuelle seulement pour ajustement =====
  stock=function(){
    const m=filt('mouvements_stock',C.mouvements_stock||[]);
    const inv=filt('inventaires_stock',C.inventaires_stock||[]);
    const rows=m.slice().sort((a,b)=>new Date(b.date_mouvement)-new Date(a.date_mouvement)).map(x=>`<tr>
      <td>${new Date(x.date_mouvement||x.created_at).toLocaleDateString('fr-FR')}</td>
      <td>${esc(x.type_mouvement)}</td><td>${kg(x.poids_kg)}</td>
      <td>${esc((C.sites_stock||[]).find(s=>s.id===x.site_id)?.nom||'—')}</td>
      <td>${esc(x.source_type||'manuel')}</td>
      <td>${x.source_type==='collecte'?'<span class="pill green">Auto</span>':'Manuel'}</td>
      <td>${esc(x.commentaire||'')}</td>
    </tr>`).join('');
    const theorique=m.reduce((s,x)=>s+(String(x.type_mouvement).toLowerCase()==='sortie'?-1:1)*n52(x.poids_kg),0);

    const adjust=formPanel('Ajustement exceptionnel','fStock',`
      ${note52('Les collectes créent automatiquement les entrées de stock. Ne les ressaisissez pas ici.')}
      <label>Type<select name="type"><option value="ajustement">Ajustement</option><option value="sortie">Sortie exceptionnelle</option></select></label>
      <label>Site<select name="site"><option value="">—</option>${opt((C.sites_stock||[]).filter(x=>x.actif),x=>x.code+' • '+x.nom)}</select></label>
      <label>Poids kg<input name="poids" type="number" step="0.01" required></label>
      <label>Motif<input name="commentaire" required></label>
      <button class="btn primary wide">Enregistrer l’ajustement</button>
    `,canRole('direction','stock_transport'));

    const ir=inv.slice().sort((a,b)=>new Date(b.date_inventaire)-new Date(a.date_inventaire)).map(x=>`<tr>
      <td>${new Date(x.date_inventaire).toLocaleDateString('fr-FR')}</td><td>${esc(x.site)}</td>
      <td>${kg(x.stock_theorique_kg)}</td><td>${kg(x.stock_reel_kg)}</td>
      <td>${kg(x.ecart_kg)}</td><td>${esc(x.statut)}</td>
    </tr>`).join('');

    return roleInfo()+banner()+`<div class="grid kpis">${kpi('Stock théorique',kg(theorique),'calcul automatique')}${kpi('Mouvements',m.length,'historique')}${kpi('Entrées auto',m.filter(x=>x.source_type==='collecte').length,'depuis collectes')}${kpi('Inventaires',inv.length,'contrôles')}</div>
      <div class="grid two">${panel('Mouvements stock',rows?table(['Date','Type','Poids','Site','Source','Mode','Commentaire'],rows):'')}${adjust}</div>
      <div style="margin-top:16px">${panel('Inventaires physiques',ir?table(['Date','Site','Théorique','Réel','Écart','Statut'],ir):'')}</div>`;
  };

  const previousBind52=bindForms;
  bindForms=function(){
    previousBind52();

    // Parcelles filtrées selon planteur
    const pl=$('#collectePlanteur'), pa=$('#collecteParcelle');
    const refreshParcelles=()=>{
      if(!pl||!pa)return;
      const list=(C.parcelles||[]).filter(x=>x.planteur_id===pl.value && x.actif);
      pa.innerHTML='<option value="">— Parcelle non précisée —</option>'+list.map(x=>`<option value="${x.id}">${esc(x.code_parcelle)} • ${n52(x.superficie_ha)} ha</option>`).join('');
    };
    if(pl&&pa){pl.addEventListener('change',refreshParcelles);refreshParcelles()}

    const brut=$('#collecteBrut'),tare=$('#collecteTare'),net=$('#collecteNet'),rate=$('#collecteTauxTare');
    if(brut&&tare&&net&&rate){
      const calc=()=>{const b=n52(brut.value),r=n52(rate.value),t=+(b*r/100).toFixed(2);tare.value=t;net.value=+(b-t).toFixed(2)};
      brut.addEventListener('input',calc);calc();
    }

    const fc=$('#fCollecte');
    if(fc)fc.onsubmit=async e=>{
      e.preventDefault();
      const fd=new FormData(fc),tarif=(C.tarifs_bord_champ||[]).find(x=>x.id===fd.get('tarif'));
      const b=n52(fd.get('brut')),r=Number((A||[]).find(a=>a.id===currentActivity())?.taux_tare_percent||0),t=+(b*r/100).toFixed(2);
      if(b<=0){toast('Le poids brut doit être supérieur à 0');return}
      await insert('collectes',{
        numero_recu:String(fd.get('recu')||'').trim(),date_collecte:new Date(fd.get('date')).toISOString(),
        planteur_id:fd.get('planteur'),parcelle_id:fd.get('parcelle')||null,
        commis_id:fd.get('commis'),localite_id:fd.get('localite'),tarif_id:fd.get('tarif'),
        site_stock_id:fd.get('site')||null,poids_brut_kg:b,tare_kg:t,prix_kg:n52(tarif?.prix_kg),
        retenue_avance:0,statut_paiement:'a_payer',activite_id:currentActivity(),
        exercice_annee:currentYear(),saisi_par:session.user.id
      });
    };

    // Override stock manual to include site
    const fs=$('#fStock');
    if(fs)fs.onsubmit=async e=>{
      e.preventDefault();const fd=new FormData(fs);
      await insert('mouvements_stock',{
        activite_id:currentActivity(),exercice_annee:currentYear(),
        type_mouvement:fd.get('type'),poids_kg:n52(fd.get('poids')),
        commentaire:fd.get('commentaire')||null,site_id:fd.get('site')||null,
        source_type:'ajustement_manuel',created_by:session.user.id
      });
    };

    // Sessions avec les vrais noms de colonnes Supabase
    const fsc=$('#fSessionCaisse');
    if(fsc)fsc.onsubmit=async e=>{
      e.preventDefault();const fd=new FormData(fsc);
      await insert('sessions_caisse',{
        caisse_id:fd.get('caisse'),caissier_id:session.user.id,
        exercice_annee:currentYear(),date_ouverture:new Date().toISOString(),
        montant_ouverture:n52(fd.get('solde')),statut:'ouverte'
      });
    };

    const close=$('#closeCashSession');
    if(close)close.onclick=async()=>{
      const s=(C.sessions_caisse||[]).find(x=>String(x.statut||'').toLowerCase()==='ouverte');if(!s)return;
      const val=prompt('Montant physique compté en caisse');if(val===null)return;
      const reel=n52(val);
      const mv=(C.mouvements_caisse||[]).filter(x=>x.session_caisse_id===s.id&&x.statut!=='annule');
      const inSum=mv.filter(x=>x.sens==='entree').reduce((z,x)=>z+n52(x.montant),0);
      const outSum=mv.filter(x=>x.sens==='sortie').reduce((z,x)=>z+n52(x.montant),0);
      const theo=n52(s.montant_ouverture)+inSum-outSum;
      const ecart=reel-theo;
      let justification=null;
      if(Math.abs(ecart)>0.01)justification=prompt('Justification de l’écart')||null;
      await update('sessions_caisse',s.id,{
        date_cloture:new Date().toISOString(),solde_theorique:theo,solde_reel:reel,
        ecart,justification_ecart:justification,statut:'fermee'
      });
    };
  };
})();
