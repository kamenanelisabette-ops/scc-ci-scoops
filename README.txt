SCC-CI-SCOOPS — V4 ERP PRO
===========================

Cette version transforme le prototype précédent en ERP coopératif plus structuré.

PRINCIPALES AMELIORATIONS
- Tableau de bord exécutif consolidé
- Circuit opérationnel visible : collecte > paiement > stock > transport > vente > encaissement
- KPIs direction : volume collecté, CA, engagements planteurs, résultat opérationnel
- Performance par activité et par commis
- Centre d'alertes et incidents
- Recherche globale (planteur, collecte, voyage, vente, membre)
- Actions rapides depuis la barre supérieure
- Navigation professionnelle par domaine métier
- Gestion des rôles et menus par responsabilité
- Création d'utilisateurs depuis le logiciel
- Changement de rôle, activation/désactivation et mot de passe par l'admin
- Objectifs et suivi de performance des commis
- Lots avec affectation réelle des collectes
- Inventaires physiques avec calcul d'écart
- Transport suivi étape par étape jusqu'au déchargement
- Préparation des chargements
- Rapports consolidés par activité
- Archivage des rapports annuels
- Centre de conformité documentaire
- Interface responsive ordinateur / tablette / téléphone

ROLES
- admin : accès complet + gestion utilisateurs
- direction : accès complet métier
- secretariat : producteurs, collecte, localités, lots, membres et gouvernance
- caisse : collecte, paiements, caisse et échéances
- comptabilite : trésorerie, ventes, dépenses, comptabilité, clôtures et audit
- commis : producteurs, localités, collecte, lots et rapports
- stock_transport : lots, stock, voyages, flotte, usines et documents

SECURITE
La clé service_role n'est jamais placée dans le navigateur.
Les actions administratives sur les comptes passent par les Edge Functions Supabase protégées :
- create-user
- manage-user

CONNEXION
Ouvrir index.html via un hébergement web statique ou déployer le dossier sur Netlify/Vercel.
Pour un usage multi-utilisateurs en production, utiliser HTTPS et conserver Supabase comme backend central.
