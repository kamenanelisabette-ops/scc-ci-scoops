/* SCC-CI-SCOOPS — Correctif Collecte + Tare
   Correction importante :
   poids_net_kg, montant_brut et net_a_payer sont des colonnes GENERATED dans Supabase.
   Elles ne doivent jamais être envoyées lors d'un INSERT.
*/

(function () {
  function tarePctForCurrentActivity() {
    const act = (A || []).find(a => a.id === currentActivity());
    return Number(act?.taux_tare_percent || 0);
  }

  collectes = function () {
    const act = (A || []).find(a => a.id === currentActivity());
    const taux = Number(act?.taux_tare_percent || 0);

    const rows = filt('collectes', C.collectes)
      .sort((a, b) => new Date(b.date_collecte) - new Date(a.date_collecte))
      .map(x => `<tr>
        <td>${esc(x.numero_recu)}</td>
        <td>${new Date(x.date_collecte).toLocaleDateString('fr-FR')}</td>
        <td>${esc(C.planteurs.find(p => p.id === x.planteur_id)?.nom || '—')}</td>
        <td>${kg(x.poids_brut_kg)}</td>
        <td>${kg(x.tare_kg)}</td>
        <td><strong>${kg(x.poids_net_kg)}</strong></td>
        <td>${money(x.net_a_payer)}</td>
        <td>${esc(x.statut_paiement)}</td>
      </tr>`).join('');

    const f = `<form id="fCollecte">
      <div class="section-note span2">
        Tare automatique pour <strong>${esc(act?.nom || activityName())}</strong> :
        <strong>${taux.toLocaleString('fr-FR')} %</strong>.
        Modifiable dans <strong>Paramètres → Tare par activité</strong>.
      </div>

      <label>N° reçu<input name="recu" required></label>
      <label>Date<input name="date" type="datetime-local" required></label>

      <label>Planteur
        <select name="planteur" required>
          ${opt(filt('planteurs', C.planteurs), x => x.code_planteur + ' • ' + x.nom)}
        </select>
      </label>

      <label>Commis
        <select name="commis" required>
          ${opt(filt('commis', C.commis), x => x.nom)}
        </select>
      </label>

      <label>Localité
        <select name="localite" required>
          ${opt(filt('localites', C.localites), x => x.nom)}
        </select>
      </label>

      <label>Tarif
        <select name="tarif" required>
          ${opt(
            filt('tarifs_bord_champ', C.tarifs_bord_champ).filter(x => x.actif),
            x => money(x.prix_kg) + '/kg'
          )}
        </select>
      </label>

      <label>Poids brut kg
        <input id="collecteBrut" name="brut" type="number" step="0.01" min="0.01" required>
      </label>

      <label>Taux de tare %
        <input id="collecteTauxTare" type="number" step="0.01" value="${taux}" readonly>
      </label>

      <label>Tare calculée kg
        <input id="collecteTare" name="tare" type="number" step="0.01" value="0" readonly>
      </label>

      <label>Poids net kg
        <input id="collecteNet" type="number" step="0.01" value="0" readonly>
      </label>

      <button class="btn primary wide">Valider la pesée</button>
    </form>`;

    return simpleList(
      'Collectes & pesées',
      ['Reçu', 'Date', 'Planteur', 'Brut', 'Tare', 'Net', 'Net à payer', 'Paiement'],
      rows,
      f
    );
  };

  parametres = function () {
    const canEdit = ['admin', 'direction'].includes(profile?.role);

    const ar = (A || []).map(x => `<tr>
      <td><strong>${esc(x.nom)}</strong><div class="muted">${esc(x.code)}</div></td>
      <td>${esc(x.unite_principale || 'kg')}</td>
      <td>
        <div style="display:flex;gap:8px;align-items:center">
          <input
            class="role-select"
            style="max-width:110px"
            data-tare-input="${x.id}"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value="${Number(x.taux_tare_percent || 0)}"
            ${canEdit ? '' : 'disabled'}
          >
          <span>%</span>
        </div>
      </td>
      <td>${x.actif ? 'Actif' : 'Inactif'}</td>
      <td>${canEdit
        ? `<button class="btn primary sm" data-save-tare="${x.id}">Enregistrer</button>`
        : 'Lecture seule'}
      </td>
    </tr>`).join('');

    const ca = (C.caisses || []).map(x => `<tr>
      <td>${esc(x.code)}</td>
      <td>${esc(x.nom)}</td>
      <td>${x.actif ? 'Actif' : 'Inactif'}</td>
    </tr>`).join('');

    return banner() + `<div class="grid two">
      ${panel(
        'Tare par activité',
        `<div class="section-note">
          Définissez ici le pourcentage de tare appliqué automatiquement à chaque pesée.
          Exemple : Hévéa / Caoutchouc = <strong>3 %</strong>.
        </div>
        ${table(['Activité', 'Unité', 'Taux de tare', 'Statut', 'Action'], ar)}`
      )}
      ${panel('Caisses', table(['Code', 'Nom', 'Statut'], ca))}
    </div>`;
  };

  function bindTareSettings() {
    const brut = $('#collecteBrut');
    const tare = $('#collecteTare');
    const net = $('#collecteNet');
    const rate = $('#collecteTauxTare');

    if (brut && tare && net && rate) {
      const recalc = () => {
        const b = Number(brut.value || 0);
        const r = Number(rate.value || 0);
        const t = +(b * r / 100).toFixed(2);
        const n = +(b - t).toFixed(2);
        tare.value = t;
        net.value = n;
      };
      brut.addEventListener('input', recalc);
      recalc();
    }

    document.querySelectorAll('[data-save-tare]').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.saveTare;
        const input = document.querySelector('[data-tare-input="' + id + '"]');
        const val = Number(input?.value);

        if (!Number.isFinite(val) || val < 0 || val > 100) {
          toast('Le taux de tare doit être compris entre 0 et 100 %');
          return;
        }

        await update('activites', id, { taux_tare_percent: val });
      };
    });
  }

  const previousBindForms = bindForms;

  bindForms = function () {
    previousBindForms();
    bindTareSettings();

    const fc = $('#fCollecte');

    if (fc) {
      fc.onsubmit = async e => {
        e.preventDefault();

        const fd = new FormData(fc);
        const tar = C.tarifs_bord_champ.find(x => x.id === fd.get('tarif'));
        const brut = Number(fd.get('brut') || 0);
        const taux = tarePctForCurrentActivity();
        const tare = +(brut * taux / 100).toFixed(2);
        const prix = Number(tar?.prix_kg || 0);

        if (!brut || brut <= 0) {
          toast('Le poids brut doit être supérieur à 0 kg');
          return;
        }

        if (tare > brut) {
          toast('La tare ne peut pas dépasser le poids brut');
          return;
        }

        if (!prix && prix !== 0) {
          toast('Tarif invalide');
          return;
        }

        // IMPORTANT :
        // Ne pas envoyer poids_net_kg, montant_brut, net_a_payer.
        // Supabase les calcule automatiquement.
        await insert('collectes', {
          numero_recu: String(fd.get('recu') || '').trim(),
          date_collecte: new Date(fd.get('date')).toISOString(),
          planteur_id: fd.get('planteur'),
          commis_id: fd.get('commis'),
          localite_id: fd.get('localite'),
          tarif_id: fd.get('tarif'),
          poids_brut_kg: brut,
          tare_kg: tare,
          prix_kg: prix,
          retenue_avance: 0,
          statut_paiement: 'a_payer',
          activite_id: currentActivity(),
          exercice_annee: currentYear(),
          saisi_par: session.user.id
        });
      };
    }
  };
})();
