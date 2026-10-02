SCC-CI-SCOOPS V3 PRO

Version autonome reconstruite à partir du correctif V2.1 et de la structure réelle Supabase.

Fichiers :
- index.html
- styles.css
- app.js

La configuration Supabase est déjà intégrée avec la clé publishable publique.
Aucune clé service_role n'est exposée.

Modules présents : tableau de bord, alertes, planteurs, commis, localités/tarifs, collectes/pesées, lots, stock/inventaire, caisse, banques/transferts, créances/dettes, transport/voyages, flotte/maintenance, usines, ventes/règlements, dépenses, comptabilité, clôtures/reports, membres/parts sociales, gouvernance/AG, utilisateurs/rôles, documents/conformité, rapports, audit, paramètres.

Pour déployer : déposer les 3 fichiers à la racine d'un hébergement statique (Vercel, Netlify, GitHub Pages avec HTTPS).

V3.2 - Création des utilisateurs
- Le menu Personnel / utilisateurs permet désormais à un administrateur de créer un compte complet.
- La création passe par la Supabase Edge Function sécurisée `create-user`.
- La clé service_role n'est jamais exposée dans le navigateur.
- Le compte Auth et la ligne `profiles` sont créés ensemble.
- Rôles disponibles : admin, direction, secretariat, caisse, comptabilite, commis, stock_transport.
- Le compte est activé immédiatement et un journal d'audit est créé.
