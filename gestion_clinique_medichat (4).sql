-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Hôte : 127.0.0.1
-- Généré le : ven. 17 avr. 2026 à 18:30
-- Version du serveur : 10.4.32-MariaDB
-- Version de PHP : 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de données : `gestion_clinique_medichat`
--

-- --------------------------------------------------------

--
-- Structure de la table `administrateur`
--

CREATE TABLE `administrateur` (
  `id` bigint(20) NOT NULL,
  `utilisateur_id` bigint(20) NOT NULL,
  `fonction` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `administrateur`
--

INSERT INTO `administrateur` (`id`, `utilisateur_id`, `fonction`) VALUES
(2, 19, 'Administrateur principal'),
(3, 20, NULL);

-- --------------------------------------------------------

--
-- Structure de la table `consultation`
--

CREATE TABLE `consultation` (
  `id` bigint(20) NOT NULL,
  `rendez_vous_id` bigint(20) DEFAULT NULL,
  `patient_id` bigint(20) NOT NULL,
  `medecin_id` bigint(20) NOT NULL,
  `symptomes` text DEFAULT NULL,
  `diagnostic` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `traitement` text DEFAULT NULL,
  `date_consultation` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `disponibilite_medecin`
--

CREATE TABLE `disponibilite_medecin` (
  `id` bigint(20) NOT NULL,
  `medecin_id` bigint(20) NOT NULL,
  `jour_semaine` enum('LUNDI','MARDI','MERCREDI','JEUDI','VENDREDI','SAMEDI','DIMANCHE') DEFAULT NULL,
  `heure_debut` time DEFAULT NULL,
  `heure_fin` time DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `dossier_medical`
--

CREATE TABLE `dossier_medical` (
  `id` bigint(20) NOT NULL,
  `patient_id` bigint(20) NOT NULL,
  `groupe_sanguin` enum('A+','A-','B+','B-','AB+','AB-','O+','O-') DEFAULT NULL,
  `taille` decimal(5,2) DEFAULT NULL,
  `poids` decimal(5,2) DEFAULT NULL,
  `allergies` text DEFAULT NULL,
  `medicaments_actuels` text DEFAULT NULL,
  `maladies_chroniques` text DEFAULT NULL,
  `interventions_chirurgicales` text DEFAULT NULL,
  `hospitalisations_precedentes` text DEFAULT NULL,
  `antecedent_diabete` tinyint(1) DEFAULT 0,
  `antecedent_hypertension` tinyint(1) DEFAULT 0,
  `antecedent_asthme` tinyint(1) DEFAULT 0,
  `antecedent_maladies_cardiaques` tinyint(1) DEFAULT 0,
  `antecedent_troubles_sante_mentale` tinyint(1) DEFAULT 0,
  `antecedent_cancer` tinyint(1) DEFAULT 0,
  `statut_tabagique` enum('NON_FUMEUR','FUMEUR','ANCIEN_FUMEUR') DEFAULT NULL,
  `consommation_alcool` enum('AUCUNE','OCCASIONNELLE','REGULIERE') DEFAULT NULL,
  `frequence_activite_physique` enum('FAIBLE','MODEREE','REGULIERE','INTENSE') DEFAULT NULL,
  `habitudes_alimentaires` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `medecin`
--

CREATE TABLE `medecin` (
  `id` bigint(20) NOT NULL,
  `utilisateur_id` bigint(20) NOT NULL,
  `specialite_id` bigint(20) DEFAULT NULL,
  `service_medical_id` bigint(20) DEFAULT NULL,
  `experience_annees` int(11) DEFAULT NULL,
  `matricule` varchar(255) DEFAULT NULL,
  `biographie` varchar(255) DEFAULT NULL,
  `statut_validation` enum('EN_ATTENTE','VALIDE','REFUSE') DEFAULT 'EN_ATTENTE',
  `disponible` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `medecin`
--

INSERT INTO `medecin` (`id`, `utilisateur_id`, `specialite_id`, `service_medical_id`, `experience_annees`, `matricule`, `biographie`, `statut_validation`, `disponible`) VALUES
(1, 3, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
(2, 7, 1, 2, 3, 'MED010', 'Test médecin', NULL, 1),
(3, 9, NULL, NULL, NULL, NULL, NULL, 'REFUSE', 1),
(4, 10, NULL, NULL, NULL, NULL, NULL, NULL, 1),
(7, 13, NULL, NULL, NULL, NULL, NULL, 'VALIDE', 1),
(9, 18, 5, NULL, NULL, NULL, NULL, 'VALIDE', 1),
(17, 28, 1, NULL, 5, '15', 'aaaaaaaaaaaaaaaaaaaaaaa', 'VALIDE', 1);

-- --------------------------------------------------------

--
-- Structure de la table `notification`
--

CREATE TABLE `notification` (
  `id` bigint(20) NOT NULL,
  `utilisateur_id` bigint(20) NOT NULL,
  `titre` varchar(150) DEFAULT NULL,
  `message` text DEFAULT NULL,
  `lu` tinyint(1) DEFAULT 0,
  `date_envoi` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `ordonnance`
--

CREATE TABLE `ordonnance` (
  `id` bigint(20) NOT NULL,
  `consultation_id` bigint(20) NOT NULL,
  `patient_id` bigint(20) NOT NULL,
  `medecin_id` bigint(20) NOT NULL,
  `date_ordonnance` date DEFAULT NULL,
  `fichier_pdf` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `ordonnance_ligne`
--

CREATE TABLE `ordonnance_ligne` (
  `id` bigint(20) NOT NULL,
  `ordonnance_id` bigint(20) NOT NULL,
  `medicament` varchar(150) DEFAULT NULL,
  `posologie` varchar(100) DEFAULT NULL,
  `duree` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `patient`
--

CREATE TABLE `patient` (
  `id` bigint(20) NOT NULL,
  `utilisateur_id` bigint(20) NOT NULL,
  `situation_matrimoniale` varchar(255) DEFAULT NULL,
  `contact_urgence_nom` varchar(255) DEFAULT NULL,
  `contact_urgence_telephone` varchar(255) DEFAULT NULL,
  `methode_contact_preferee` enum('TELEPHONE','EMAIL','SMS') DEFAULT NULL,
  `numero_dossier` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `patient`
--

INSERT INTO `patient` (`id`, `utilisateur_id`, `situation_matrimoniale`, `contact_urgence_nom`, `contact_urgence_telephone`, `methode_contact_preferee`, `numero_dossier`) VALUES
(1, 1, 'Célibataire', 'Contact Urgence', NULL, 'TELEPHONE', 'PAT-001'),
(12, 5, NULL, NULL, NULL, NULL, NULL),
(15, 7, 'Célibataire', 'Ali', '22111222', 'TELEPHONE', 'PAT007'),
(18, 17, NULL, NULL, NULL, NULL, NULL),
(19, 29, 'Célibataire', 'rahmarahma', '22444666', 'TELEPHONE', 'PAT-005');

-- --------------------------------------------------------

--
-- Structure de la table `rendez_vous`
--

CREATE TABLE `rendez_vous` (
  `id` bigint(20) NOT NULL,
  `patient_id` bigint(20) NOT NULL,
  `medecin_id` bigint(20) NOT NULL,
  `date_rendez_vous` date DEFAULT NULL,
  `heure_debut` time DEFAULT NULL,
  `heure_fin` time DEFAULT NULL,
  `mode_consultation` enum('ONLINE','PRESENTIEL') DEFAULT NULL,
  `motif` text DEFAULT NULL,
  `statut` enum('EN_ATTENTE','CONFIRME','ANNULE','TERMINE') DEFAULT 'EN_ATTENTE'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Structure de la table `service_medical`
--

CREATE TABLE `service_medical` (
  `id` bigint(20) NOT NULL,
  `nom` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `localisation` varchar(150) DEFAULT NULL,
  `actif` tinyint(1) DEFAULT 1,
  `departement` varchar(255) DEFAULT NULL,
  `prix` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `service_medical`
--

INSERT INTO `service_medical` (`id`, `nom`, `description`, `localisation`, `actif`, `departement`, `prix`) VALUES
(2, 'Consultation générale', 'Consultation de base', NULL, 1, 'Médecine générale', '200'),
(3, 'Consultation spécialisée', 'Service de démo', NULL, 1, 'Bloc B', '60 TND');

-- --------------------------------------------------------

--
-- Structure de la table `specialite`
--

CREATE TABLE `specialite` (
  `id` bigint(20) NOT NULL,
  `nom` varchar(255) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `service_medical_id` bigint(20) DEFAULT NULL,
  `actif` tinyint(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `specialite`
--

INSERT INTO `specialite` (`id`, `nom`, `description`, `service_medical_id`, `actif`) VALUES
(1, 'Cardiologie', 'Spécialité du cœur', NULL, 1),
(3, 'Neurologie', 'Spécialité du système nerveux', NULL, 1),
(4, 'Pédiatrie', 'Soins médicaux pour les enfants', NULL, 1),
(5, 'Dermatologie', 'Traitement des maladies de la peau', NULL, 1),
(6, 'Ophtalmologie', 'Spécialité des yeux et de la vision', NULL, 1),
(7, 'Médecine interne', 'Pathologies générales adultes', NULL, 1),
(8, 'aaa', NULL, NULL, 1);

-- --------------------------------------------------------

--
-- Structure de la table `utilisateur`
--

CREATE TABLE `utilisateur` (
  `id` bigint(20) NOT NULL,
  `nom` varchar(255) NOT NULL,
  `prenom` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `mot_de_passe` varchar(255) NOT NULL,
  `telephone` varchar(255) DEFAULT NULL,
  `adresse` varchar(255) DEFAULT NULL,
  `ville` varchar(255) DEFAULT NULL,
  `gouvernorat` varchar(255) DEFAULT NULL,
  `code_postal` varchar(255) DEFAULT NULL,
  `date_naissance` date DEFAULT NULL,
  `sexe` enum('HOMME','FEMME') DEFAULT NULL,
  `photo` varchar(255) DEFAULT NULL,
  `role` varchar(255) DEFAULT NULL,
  `actif` tinyint(1) DEFAULT 1,
  `date_creation` timestamp NOT NULL DEFAULT current_timestamp(),
  `date_modification` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Déchargement des données de la table `utilisateur`
--

INSERT INTO `utilisateur` (`id`, `nom`, `prenom`, `email`, `mot_de_passe`, `telephone`, `adresse`, `ville`, `gouvernorat`, `code_postal`, `date_naissance`, `sexe`, `photo`, `role`, `actif`, `date_creation`, `date_modification`) VALUES
(1, 'Ali Modifie', 'Test', 'ali@test.com', '123456', '99999999', 'Tunis', 'Tunis', 'Tunis', '1000', NULL, NULL, NULL, 'PATIENT', 1, '2026-04-08 18:21:32', '2026-04-09 15:29:37'),
(2, 'dhia', 'chateur ', 'dhia.chateur@gmail.com', '147258', '88888888', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PATIENT', 1, '2026-04-10 03:15:43', '2026-04-10 03:15:43'),
(3, 'mohamed', 'mohamed', 'mohamed.mohamed@gmail.com', '123123', '12345786', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'MEDECIN', 1, '2026-04-10 03:20:22', '2026-04-10 03:20:22'),
(4, 'samira', 'samira', 'samira.samira@gmail.com', '121212', '14444444', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PATIENT', 1, '2026-04-10 03:32:12', '2026-04-10 03:32:12'),
(5, 'nouveau', 'patient', 'nouveau.patient@gmail.com', '123456', '55667788', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PATIENT', 1, '2026-04-11 19:57:15', '2026-04-11 19:57:15'),
(6, 'nouveau', 'patient', 'nouveau.patient77@gmail.com', '123456', '55667788', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PATIENT', 1, '2026-04-11 20:00:04', '2026-04-11 20:00:04'),
(7, 'Ahmed', 'Ali', 'medecin1@gmail.com', '123456', '55443322', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PATIENT', 1, '2026-04-11 22:15:34', '2026-04-15 19:47:10'),
(9, 'Ahmed', 'Ali', 'medecin10@gmail.com', '123456', '55443322', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'MEDECIN', 1, '2026-04-14 20:28:57', '2026-04-14 20:28:57'),
(10, 'chayma', 'chateur', 'chaymachater23@gmail.com', '123456', '26581224', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'MEDECIN', 1, '2026-04-16 18:36:10', '2026-04-16 18:36:10'),
(13, 'ben', 'yassine', 'yassine.yassine@gmail.com', 'yassine123', '50677987', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'MEDECIN', 1, '2026-04-16 22:44:53', '2026-04-16 22:44:53'),
(16, 'hvjbkn', 'jhbknl,', 'test@test', '', '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PATIENT', 1, '2026-04-16 23:24:08', '2026-04-16 23:24:08'),
(17, 'hvjbkn', 'jhbknl,', 'test@test.tn', '123456', '25252525', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'PATIENT', 1, '2026-04-16 23:24:33', '2026-04-16 23:24:33'),
(18, 'amir', 'kh', 'amir@gmail.com', 'amir123', '21212121', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'MEDECIN', 1, '2026-04-16 23:35:37', '2026-04-16 23:35:37'),
(19, 'Admin', 'Principal', 'admin@medichat.local', 'admin123', '00000000', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ADMIN', 1, '2026-04-17 00:01:11', '2026-04-17 00:01:11'),
(20, 'adddmin', 'add', 'admin@admin.tn', '123456', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ADMIN', 1, '2026-04-17 00:15:10', '2026-04-17 00:15:10'),
(28, 'rayen', 'rayen', 'rayen123@gmail.com', 'rayen123', '55555555', 'kef', 'kef', 'kef', '8050', '2000-01-01', 'HOMME', NULL, 'MEDECIN', 1, '2026-04-17 16:27:08', '2026-04-17 16:27:08'),
(29, 'rahma', 'rahma', 'rahma@gmail.com', 'rahma123', '22444666', 'nabeul', 'nabaul', 'nabeul', '3027', '1999-04-04', 'FEMME', NULL, 'PATIENT', 1, '2026-04-17 16:29:52', '2026-04-17 16:29:52');

--
-- Index pour les tables déchargées
--

--
-- Index pour la table `administrateur`
--
ALTER TABLE `administrateur`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `utilisateur_id` (`utilisateur_id`);

--
-- Index pour la table `consultation`
--
ALTER TABLE `consultation`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `rendez_vous_id` (`rendez_vous_id`),
  ADD KEY `idx_consultation_patient` (`patient_id`),
  ADD KEY `idx_consultation_medecin` (`medecin_id`);

--
-- Index pour la table `disponibilite_medecin`
--
ALTER TABLE `disponibilite_medecin`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_disponibilite_medecin` (`medecin_id`);

--
-- Index pour la table `dossier_medical`
--
ALTER TABLE `dossier_medical`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `patient_id` (`patient_id`);

--
-- Index pour la table `medecin`
--
ALTER TABLE `medecin`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `utilisateur_id` (`utilisateur_id`),
  ADD UNIQUE KEY `matricule` (`matricule`),
  ADD KEY `idx_medecin_specialite` (`specialite_id`),
  ADD KEY `idx_medecin_service` (`service_medical_id`);

--
-- Index pour la table `notification`
--
ALTER TABLE `notification`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_notification_utilisateur` (`utilisateur_id`);

--
-- Index pour la table `ordonnance`
--
ALTER TABLE `ordonnance`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `consultation_id` (`consultation_id`),
  ADD KEY `idx_ordonnance_patient` (`patient_id`),
  ADD KEY `idx_ordonnance_medecin` (`medecin_id`);

--
-- Index pour la table `ordonnance_ligne`
--
ALTER TABLE `ordonnance_ligne`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_ligne_ordonnance` (`ordonnance_id`);

--
-- Index pour la table `patient`
--
ALTER TABLE `patient`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `utilisateur_id` (`utilisateur_id`),
  ADD UNIQUE KEY `numero_dossier` (`numero_dossier`),
  ADD KEY `idx_patient_numero_dossier` (`numero_dossier`);

--
-- Index pour la table `rendez_vous`
--
ALTER TABLE `rendez_vous`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_rdv_patient` (`patient_id`),
  ADD KEY `idx_rdv_medecin` (`medecin_id`),
  ADD KEY `idx_rdv_date` (`date_rendez_vous`);

--
-- Index pour la table `service_medical`
--
ALTER TABLE `service_medical`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nom` (`nom`);

--
-- Index pour la table `specialite`
--
ALTER TABLE `specialite`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nom` (`nom`),
  ADD KEY `fk_specialite_service` (`service_medical_id`);

--
-- Index pour la table `utilisateur`
--
ALTER TABLE `utilisateur`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_utilisateur_role` (`role`),
  ADD KEY `idx_utilisateur_email` (`email`);

--
-- AUTO_INCREMENT pour les tables déchargées
--

--
-- AUTO_INCREMENT pour la table `administrateur`
--
ALTER TABLE `administrateur`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT pour la table `consultation`
--
ALTER TABLE `consultation`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `disponibilite_medecin`
--
ALTER TABLE `disponibilite_medecin`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `dossier_medical`
--
ALTER TABLE `dossier_medical`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `medecin`
--
ALTER TABLE `medecin`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT pour la table `notification`
--
ALTER TABLE `notification`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `ordonnance`
--
ALTER TABLE `ordonnance`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `ordonnance_ligne`
--
ALTER TABLE `ordonnance_ligne`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `patient`
--
ALTER TABLE `patient`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=20;

--
-- AUTO_INCREMENT pour la table `rendez_vous`
--
ALTER TABLE `rendez_vous`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT pour la table `service_medical`
--
ALTER TABLE `service_medical`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT pour la table `specialite`
--
ALTER TABLE `specialite`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT pour la table `utilisateur`
--
ALTER TABLE `utilisateur`
  MODIFY `id` bigint(20) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- Contraintes pour les tables déchargées
--

--
-- Contraintes pour la table `administrateur`
--
ALTER TABLE `administrateur`
  ADD CONSTRAINT `fk_admin_utilisateur` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateur` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `consultation`
--
ALTER TABLE `consultation`
  ADD CONSTRAINT `fk_consultation_medecin` FOREIGN KEY (`medecin_id`) REFERENCES `medecin` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_consultation_patient` FOREIGN KEY (`patient_id`) REFERENCES `patient` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_consultation_rdv` FOREIGN KEY (`rendez_vous_id`) REFERENCES `rendez_vous` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- Contraintes pour la table `disponibilite_medecin`
--
ALTER TABLE `disponibilite_medecin`
  ADD CONSTRAINT `fk_disponibilite_medecin` FOREIGN KEY (`medecin_id`) REFERENCES `medecin` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `dossier_medical`
--
ALTER TABLE `dossier_medical`
  ADD CONSTRAINT `fk_dossier_patient` FOREIGN KEY (`patient_id`) REFERENCES `patient` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `medecin`
--
ALTER TABLE `medecin`
  ADD CONSTRAINT `fk_medecin_service` FOREIGN KEY (`service_medical_id`) REFERENCES `service_medical` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_medecin_specialite` FOREIGN KEY (`specialite_id`) REFERENCES `specialite` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_medecin_utilisateur` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateur` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `notification`
--
ALTER TABLE `notification`
  ADD CONSTRAINT `fk_notification_utilisateur` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateur` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `ordonnance`
--
ALTER TABLE `ordonnance`
  ADD CONSTRAINT `fk_ordonnance_consultation` FOREIGN KEY (`consultation_id`) REFERENCES `consultation` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ordonnance_medecin` FOREIGN KEY (`medecin_id`) REFERENCES `medecin` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_ordonnance_patient` FOREIGN KEY (`patient_id`) REFERENCES `patient` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `ordonnance_ligne`
--
ALTER TABLE `ordonnance_ligne`
  ADD CONSTRAINT `fk_ligne_ordonnance` FOREIGN KEY (`ordonnance_id`) REFERENCES `ordonnance` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `patient`
--
ALTER TABLE `patient`
  ADD CONSTRAINT `fk_patient_utilisateur` FOREIGN KEY (`utilisateur_id`) REFERENCES `utilisateur` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `rendez_vous`
--
ALTER TABLE `rendez_vous`
  ADD CONSTRAINT `fk_rdv_medecin` FOREIGN KEY (`medecin_id`) REFERENCES `medecin` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_rdv_patient` FOREIGN KEY (`patient_id`) REFERENCES `patient` (`id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Contraintes pour la table `specialite`
--
ALTER TABLE `specialite`
  ADD CONSTRAINT `fk_specialite_service` FOREIGN KEY (`service_medical_id`) REFERENCES `service_medical` (`id`) ON DELETE SET NULL ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
