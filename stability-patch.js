/* SCC-CI-SCOOPS — Correctif global de stabilité V4.2
   Charge ce fichier APRES app.js et tare-patch.js.

   Correctifs principaux :
   - Erreurs Supabase sur colonnes GENERATED
   - Paiement planteur avec moyen conforme à la base
   - Inventaire stock sans envoi de ecart_kg généré
   - Vente usine sans envoi de CA/bénéfice générés
   - Messages d'erreur plus compréhensibles
   - Blocage des saisies métier quand "Toutes activités" est sélectionné
   - Validation renforcée des montants et références
*/

(function () {
  const GENERATED = {
    collectes: new Set(['poids_net_kg','montant_brut','net_a_payer']),
    inventaires_stock: new Set(['ecart_kg']),
    chargements: new Set(['ecart_kg']),
    ventes_usine: new Set(['chiffre_affaires','benefice_estime'])
  };

  function cleanPayload(table, payload) {
    const blocked = GENERATED[table];
    if (!blocked) return payload;
    const copy = {...payload};
    blocked.forEach(k => delete copy[k]);
    return copy;
  }

  function friendlyError(err) {
    const raw = String(err?.message || err || 'Erreur inconnue');
    const low = raw.toLowerCase();

    if (low.includes('duplicate key') || low.includes('unique constraint')) {
      return "Ce numéro existe déjà. Utilisez une autre référence.";
    }
    if (low.includes('row-level security') || low.includes('violates row-level security')) {
      return "Votre profil n'a pas l'autorisation d'effectuer cette opération.";
    }
    if (low.includes('generated') || low.includes('non-default value')) {
      return "Un champ calculé automatiquement ne doit pas être saisi manuellement.";
    }
    if (low.includes('foreign key')) {
      return "Une donnée liée est invalide ou n'existe plus. Actualisez la page puis réessayez.";
    }
    if (low.includes('check constraint')) {
      return "Une valeur saisie ne respecte pas les règles du logiciel.";
    }
    if (low.includes('network') || low.includes('fetch')) {
      return "Problème de connexion internet. Vérifiez le réseau puis réessayez.";
    }
    return raw;
  }

  // Remplace les fonctions centrales pour nettoyer les champs générés
  // et afficher des erreurs compréhensibles.
  insert = async function(table, payload) {
    const safePayload = cleanPayload(table, payload);
    const {error} = await sb.from(table).insert(safePayload);
    if (error) {
      console.error('INSERT', table, error);
      toast('Erreur : ' + friendlyError(error));
      return false;
    }
    toast('Enregistré avec succès');
    await load();
    render();
    return true;
  };

  update = async function(table, id, payload) {
    const safePayload = cleanPayload(table, payload);
    const {error} = await sb.from(table).update(safePayload).eq('id', id);
    if (error) {
      console.error('UPDATE', table, error);
      toast('Erreur : ' + friendlyError(error));
      return false;
    }
    toast('Mise à jour effectuée');
    await load();
    render();
    return true;
  };

  // Empêche une nouvelle opération d'être enregistrée dans la mauvaise activité.
  const activityRequiredForms = new Set([
    'fPlanteur','fCommis','fLocalite','fTarif','fCollecte','fLot','fStock',
    'fCaisse','fVoyage','fDepense','fTransfert','fVente','fPiece',
    'fObjectifCommis','fInventaire','fChargement','fRapportAnnuel'
  ]);

  if (!window.__sccActivityGuardInstalled) {
    document.addEventListener('submit', function(e) {
      const id = e.target?.id;
      if (id && activityRequiredForms.has(id) && activity === 'ALL') {
        e.preventDefault();
        e.stopImmediatePropagation();
        toast("Sélectionnez d'abord une activité précise en haut de l'écran.");
      }
    }, true);
    window.__sccActivityGuardInstalled = true;
  }

  function positiveNumber(v) {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  function nonNegativeNumber(v) {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  const previousBindForms = bindForms;

  bindForms = function () {
    previousBindForms();

    // ===== INVENTAIRE STOCK =====
    // ecart_kg est GENERATED dans PostgreSQL.
    const inv = $('#fInventaire');
    if (inv) {
      inv.onsubmit = async e => {
        e.preventDefault();
        if (activity === 'ALL') {
          toast("Sélectionnez d'abord une activité précise.");
          return;
        }

        const fd = new FormData(inv);
        const theorique = nonNegativeNumber(fd.get('theorique'));
        const reel = nonNegativeNumber(fd.get('reel'));

        if (theorique === null || reel === null) {
          toast('Les stocks théorique et réel doivent être des nombres positifs ou nuls.');
          return;
        }

        await insert('inventaires_stock', {
          date_inventaire: new Date().toISOString(),
          site: String(fd.get('site') || 'Daloa').trim(),
          stock_theorique_kg: theorique,
          stock_reel_kg: reel,
          statut: fd.get('statut') || 'a_verifier',
          observation: String(fd.get('observation') || '').trim() || null,
          controle_par: session.user.id,
          activite_id: currentActivity(),
          exercice_annee: currentYear()
        });
      };
    }

    // ===== VENTE USINE =====
    // chiffre_affaires et benefice_estime sont GENERATED dans PostgreSQL.
    const vente = $('#fVente');
    if (vente) {
      vente.onsubmit = async e => {
        e.preventDefault();
        if (activity === 'ALL') {
          toast("Sélectionnez d'abord une activité précise.");
          return;
        }

        const fd = new FormData(vente);
        const poids = positiveNumber(fd.get('poids'));
        const prix = positiveNumber(fd.get('prix'));
        const cout = nonNegativeNumber(fd.get('cout') || 0);
        const charges = nonNegativeNumber(fd.get('charges') || 0);

        if (!poids) {
          toast('Le poids facturé doit être supérieur à 0 kg.');
          return;
        }
        if (!prix) {
          toast('Le prix de vente par kg doit être supérieur à 0.');
          return;
        }
        if (cout === null || charges === null) {
          toast('Les coûts et charges ne peuvent pas être négatifs.');
          return;
        }

        await insert('ventes_usine', {
          numero_vente: String(fd.get('numero') || '').trim(),
          chargement_id: fd.get('chargement'),
          usine_id: fd.get('usine'),
          poids_facture_kg: poids,
          prix_vente_kg: prix,
          cout_achat_planteurs: cout,
          autres_charges: charges,
          statut_reglement: 'non_paye',
          activite_id: currentActivity(),
          exercice_annee: currentYear()
        });
      };
    }

    // ===== RÈGLEMENT USINE =====
    const reg = $('#fReglement');
    if (reg) {
      reg.onsubmit = async e => {
        e.preventDefault();
        const fd = new FormData(reg);
        const montant = positiveNumber(fd.get('montant'));
        if (!montant) {
          toast('Le montant du règlement doit être supérieur à 0.');
          return;
        }
        await insert('reglements_usine', {
          vente_id: fd.get('vente'),
          montant,
          moyen_paiement: String(fd.get('moyen') || 'virement').toLowerCase(),
          reference_paiement: String(fd.get('reference') || '').trim() || null,
          date_reglement: new Date().toISOString()
        });
      };
    }

    // ===== ÉCRITURE COMPTABLE =====
    const ecriture = $('#fEcriture');
    if (ecriture) {
      ecriture.onsubmit = async e => {
        e.preventDefault();
        const fd = new FormData(ecriture);
        const debit = nonNegativeNumber(fd.get('debit') || 0);
        const credit = nonNegativeNumber(fd.get('credit') || 0);

        if (debit === null || credit === null) {
          toast('Débit et crédit doivent être positifs ou nuls.');
          return;
        }
        if (debit > 0 && credit > 0) {
          toast('Une ligne ne peut pas être au débit et au crédit en même temps.');
          return;
        }
        if (debit === 0 && credit === 0) {
          toast('Saisissez un montant au débit ou au crédit.');
          return;
        }

        await insert('ecritures_comptables', {
          piece_id: fd.get('piece'),
          compte_id: fd.get('compte'),
          libelle: String(fd.get('libelle') || '').trim() || null,
          debit,
          credit
        });
      };
    }

    // ===== PAIEMENT PLANTEUR =====
    // L'ancien code envoyait "Caisse", alors que la base accepte
    // especes, banque, cheque, virement, mobile_money, autre.
    document.querySelectorAll('[data-pay]').forEach(btn => {
      btn.onclick = async () => {
        const col = (C.collectes || []).find(x => x.id === btn.dataset.pay);
        if (!col) {
          toast('Collecte introuvable.');
          return;
        }

        const dejaPaye = (C.paiements_planteurs || [])
          .filter(p => p.collecte_id === col.id && p.statut === 'valide')
          .reduce((s, p) => s + Number(p.montant || 0), 0);

        const reste = Math.max(0, Number(col.net_a_payer || 0) - dejaPaye);
        if (reste <= 0) {
          toast('Cette collecte est déjà entièrement payée.');
          return;
        }

        const montantTxt = prompt('Montant à payer', String(reste));
        if (montantTxt === null) return;
        const montant = positiveNumber(montantTxt);

        if (!montant) {
          toast('Le montant doit être supérieur à 0.');
          return;
        }
        if (montant > reste) {
          toast('Le montant dépasse le reste à payer.');
          return;
        }

        const choix = prompt(
          'Mode de paiement :\n1 = Espèces\n2 = Banque\n3 = Chèque\n4 = Virement\n5 = Mobile Money\n6 = Autre',
          '1'
        );
        if (choix === null) return;

        const modes = {
          '1': 'especes',
          '2': 'banque',
          '3': 'cheque',
          '4': 'virement',
          '5': 'mobile_money',
          '6': 'autre'
        };
        const moyen = modes[String(choix).trim()];
        if (!moyen) {
          toast('Mode de paiement invalide.');
          return;
        }

        const ok = await insert('paiements_planteurs', {
          numero_paiement: 'PAY-' + Date.now(),
          collecte_id: col.id,
          planteur_id: col.planteur_id,
          montant,
          moyen_paiement: moyen,
          statut: 'valide',
          activite_id: col.activite_id,
          exercice_annee: col.exercice_annee,
          caissier_id: session.user.id
        });

        // Le statut de la collecte est maintenant synchronisé par la base.
        if (ok) {
          toast('Paiement enregistré.');
        }
      };
    });
  };

  // Aide visuelle globale sur les formulaires qui dépendent d'une activité.
  const previousRender = render;
  render = function () {
    previousRender();

    if (activity === 'ALL') {
      const form = document.querySelector(
        '#fPlanteur,#fCommis,#fLocalite,#fTarif,#fCollecte,#fLot,#fStock,#fCaisse,#fVoyage,#fDepense,#fTransfert,#fVente,#fPiece,#fObjectifCommis,#fInventaire,#fChargement'
      );
      if (form && !form.querySelector('.scc-activity-warning')) {
        const note = document.createElement('div');
        note.className = 'section-note span2 scc-activity-warning';
        note.innerHTML = '<strong>Choisissez une activité précise</strong> en haut avant d’enregistrer une nouvelle opération.';
        form.prepend(note);
      }
    }
  };

  // Premier rafraîchissement de l'écran pour activer le correctif.
  if (session && profile && !$('#appView')?.classList.contains('hidden')) {
    render();
  }
})();
