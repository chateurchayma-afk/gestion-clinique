# Sprint Backlog - Gestion Clinique (MediChat)

## Contexte
Ce backlog propose 4 sprints pour livrer l'application "gestion-clinique" (backend Spring Boot + frontend Angular) avec modules patient, medecin, admin, rendez-vous, auth, et notifications.

## Hypotheses
- Duree sprint: 2 semaines
- Environ 8-12 items / sprint
- Definition of Done: code merge, tests passes, validation fonctionnelle, documentation courte

---

# Sprint 1 - Fondations & Auth
**Objectif:** mettre en place base technique, auth, profils, navigation.

## User Stories
1. En tant qu'utilisateur, je peux creer un compte patient.
2. En tant que medecin, je peux creer un compte medecin avec validations.
3. En tant qu'admin, je peux me connecter et voir le dashboard.
4. En tant qu'utilisateur, je peux me connecter/deconnecter.
5. En tant qu'utilisateur, je peux reinitialiser mon mot de passe.

## Tasks
- Backend: endpoints auth (register/login/logout/forgot/reset)
- Backend: entites User/Patient/Medecin + relations de base
- Backend: validation email, password rules
- Frontend: ecrans login/register/forgot/reset
- Frontend: guards routes (admin, medecin, patient)
- Frontend: stockage session + interceptor auth
- UI: layout general + navigation
- Tests: auth endpoints + guards

## Deliverables
- Module Auth complet (frontend + backend)
- Redirections selon roles
- Documentation rapide des endpoints auth

---

# Sprint 2 - Rendez-vous Patient
**Objectif:** permettre au patient de rechercher un medecin et reserver un RDV.

## User Stories
1. En tant que patient, je peux voir la liste des medecins.
2. En tant que patient, je peux voir le profil d'un medecin.
3. En tant que patient, je peux choisir une date/heure et reserver un RDV.
4. En tant que patient, je peux consulter mes rendez-vous.
5. En tant que patient, je peux annuler un RDV.

## Tasks
- Backend: liste medecins valides et disponibles
- Backend: endpoint creer RDV patient
- Backend: endpoint liste RDV patient
- Backend: annulation RDV patient
- Frontend: page liste medecins + details
- Frontend: page creation RDV patient
- Frontend: page mes RDV + annulation
- Validation: controle date/heure et disponibilite
- Tests: RDV patient (creer, lister, annuler)

## Deliverables
- Reservation RDV patient fonctionnelle
- Validations metier activees
- Tests de base pour RDV patient

---

# Sprint 3 - RDV Medecin & Planning
**Objectif:** fournir au medecin la gestion directe de RDV et son planning.

## User Stories
1. En tant que medecin, je peux voir mon planning.
2. En tant que medecin, je peux creer un RDV pour un patient.
3. En tant que medecin, je peux voir les details des RDV.
4. En tant que medecin, je peux filtrer par periode.

## Tasks
- Backend: endpoint planning medecin (periode, filtre statut)
- Backend: creation RDV par medecin (statut confirme)
- Frontend: page planning medecin
- Frontend: page creation RDV par medecin
- UI: affichage tableau / calendrier
- Tests: planning + creation RDV medecin

## Deliverables
- Planning medecin fonctionnel
- Creation RDV par medecin operationnelle

---

# Sprint 4 - Admin & Gouvernance
**Objectif:** donner a l'admin la gestion globale des RDV et des comptes.

## User Stories
1. En tant qu'admin, je peux voir tous les RDV.
2. En tant qu'admin, je peux confirmer/annuler un RDV.
3. En tant qu'admin, je peux voir les medecins en attente.
4. En tant qu'admin, je peux valider/refuser un medecin.
5. En tant qu'admin, je peux consulter statistiques de base.

## Tasks
- Backend: liste RDV gestion + filtre statut
- Backend: update statut RDV
- Backend: validation medecins
- Frontend: page admin RDV list + actions
- Frontend: page admin validation medecins
- UI: feedback (toast) + confirmations
- Tests: admin RDV + validation medecins
- Documentation: endpoints admin

## Deliverables
- Admin gestion RDV complet
- Validation medecins
- Statistiques basiques (compteurs)

---

## Risques & Mitigations
- Conflits horaires RDV: verifier overlap sur backend
- Donnees incoherentes: validations metier strictes
- Retards UI: prioriser pages critiques (auth, RDV)

## Definition of Done (DoD)
- Fonctionnel complet
- Tests passes
- Revue rapide du code
- Documentation courte mise a jour
