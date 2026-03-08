import { prisma } from "../db";
import type { InscriptionStatus } from "../../generated/prisma/enums";
import { SelectionAction, SelectionStatus, ExcursionStatus } from "../../generated/prisma/enums";
import { computePointsToCredit as computePoints, resolveBeneficiaryForFormula } from "./pointsFormula";

interface SelectionConfig {
  excursionId: number;
  maxPlaces: number;
  sortBy: "points" | "date"; // "points" desc, "date" asc
  sortBySecondary?: "points" | "date"; // critère secondaire
  paymentDeadline?: Date;
}

export class SelectionService {
  /**
   * Lance le processus de sélection pour une activité
   * Trie les participants par critères de priorité:
   * - Critère principal: points (croissant) ou date (croissant)
   *   - Points croissants: les moins actifs (moins de points) ont la priorité
   *   - Date croissante: les plus anciens inscrits sont sélectionnés en priorité
   * - En cas d'égalité: considère l'autre critère
   * - Puis classe les N premiers en SELECTIONNE et le reste en ATTENTE
   */
  static async startSelection(config: SelectionConfig) {
    const { excursionId, maxPlaces, sortBy, sortBySecondary, paymentDeadline } =
      config;

    try {
      // 1. Récupérer tous les participants INSCRITS
      // Tri: 
      //  - Critère principal (points ASC = min points = priorité, OU date ASC = ancien = priorité)
      //  - Critère secondaire en cas d'égalité (date ASC)
      const inscriptions = await prisma.excursionApplication.findMany({
        where: {
          excursionId,
          inscriptionStatus: "INSCRIT",
        },
        include: {
          user: true,
        },
        orderBy: [
          sortBy === "points"
            ? { user: { points: "asc" } }  // Points bas = moins actif = plus éligible (récompenser les moins actifs)
            : { createdAt: "asc" },         // Date ancienne = plus éligible
          sortBySecondary === "points"
            ? { user: { points: "asc" } }  // En cas d'égalité, points bas
            : { createdAt: "asc" },         // En cas d'égalité, date ancienne
        ],
      });

      // 2. Mettre à jour les statuts et scores
      const selectedIds: number[] = [];
      const waitingIds: number[] = [];

      for (let i = 0; i < inscriptions.length; i++) {
        const app = inscriptions[i];
        // Score pour le classement (utilisé pour l'ordre de sélection)
        const computedScore =
          sortBy === "points" ? app.user.points : i;

        if (i < maxPlaces) {
          // Sélectionné - premiers N participants
          selectedIds.push(app.id);
          await prisma.excursionApplication.update({
            where: { id: app.id },
            data: {
              inscriptionStatus: "SELECTIONNE",
              selectionOrder: i + 1,
              computedScore,
            },
          });

          // Historique
          await this.logSelection(
            excursionId,
            app.id,
            SelectionAction.PARTICIPANT_SELECTED,
            "INSCRIT",
            "SELECTIONNE",
            `Sélectionné (rang ${i + 1}) - ${app.user.firstName} ${app.user.lastName}`
          );
        } else {
          // En attente - le reste des participants
          waitingIds.push(app.id);
          await prisma.excursionApplication.update({
            where: { id: app.id },
            data: {
              inscriptionStatus: "ATTENTE",
              selectionOrder: i + 1,
              computedScore,
            },
          });

          // Historique
          await this.logSelection(
            excursionId,
            app.id,
            SelectionAction.PARTICIPANT_SELECTED,
            "INSCRIT",
            "ATTENTE",
            `En attente (rang ${i + 1}) - ${app.user.firstName} ${app.user.lastName}`
          );
        }
      }

      // 3. Mettre à jour l'excursion
      await prisma.excursion.update({
        where: { id: excursionId },
        data: {
          selectionStatus: "COMPLETED",
          paymentDeadline,
          selectionMaxPlaces: maxPlaces,
        },
      });

      // 4. Log principal
      await this.logSelection(
        excursionId,
        null,
        SelectionAction.SELECTION_STARTED,
        null,
        null,
        `Sélection lancée: ${selectedIds.length} sélectionnés, ${waitingIds.length} en attente. Critère: ${sortBy} ${sortBySecondary ? `(secondaire: ${sortBySecondary})` : ""}`
      );

      return {
        success: true,
        selectedCount: selectedIds.length,
        waitingCount: waitingIds.length,
        message: `Sélection lancée avec succès: ${selectedIds.length} participants sélectionnés, ${waitingIds.length} en attente`,
      };
    } catch (error) {
      console.error("Erreur lors du lancement de la sélection:", error);
      throw error;
    }
  }

  /**
   * Confirme le paiement d'un participant sélectionné
   */
  static async confirmPayment(applicationId: number) {
    try {
      const app = await prisma.excursionApplication.findUnique({
        where: { id: applicationId },
      });

      if (!app) {
        throw new Error("Inscription non trouvée");
      }

      if (app.inscriptionStatus !== "SELECTIONNE") {
        throw new Error(
          "Seuls les participants sélectionnés peuvent confirmer leur paiement"
        );
      }

      // Mettre à jour
      const updated = await prisma.excursionApplication.update({
        where: { id: applicationId },
        data: {
          inscriptionStatus: "FINAL",
          paymentConfirmed: true,
          paymentConfirmedDate: new Date(),
        },
        include: { user: true },
      });

      // Historique
      await this.logSelection(
        app.excursionId,
        applicationId,
        SelectionAction.PAYMENT_CONFIRMED,
        "SELECTIONNE",
        "FINAL",
        `Paiement confirmé par ${updated.user.firstName} ${updated.user.lastName}`
      );

      return updated;
    } catch (error) {
      console.error("Erreur lors de la confirmation du paiement:", error);
      throw error;
    }
  }

  /**
   * Refuse un participant et promeut le premier de la liste d'attente
   */
  static async refuseParticipant(applicationId: number, reason?: string) {
    try {
      const app = await prisma.excursionApplication.findUnique({
        where: { id: applicationId },
        include: { user: true },
      });

      if (!app) {
        throw new Error("Inscription non trouvée");
      }

      // Vérifier qu'il est sélectionné ou final
      if (
        app.inscriptionStatus !== "SELECTIONNE" &&
        app.inscriptionStatus !== "FINAL"
      ) {
        throw new Error(
          "Seuls les participants sélectionnés ou finaux peuvent être refusés"
        );
      }

      const previousStatus = app.inscriptionStatus;

      // Refuser le participant
      await prisma.excursionApplication.update({
        where: { id: applicationId },
        data: { inscriptionStatus: "REFUSE" },
      });

      // Historique
      await this.logSelection(
        app.excursionId,
        applicationId,
        SelectionAction.PARTICIPANT_REFUSED,
        previousStatus,
        "REFUSE",
        reason || "Participant refusé"
      );

      // Promouvoir le premier de la liste d'attente
      await this.promoteFromWaitingList(app.excursionId);

      return {
        success: true,
        message: "Participant refusé et liste d'attente mise à jour",
      };
    } catch (error) {
      console.error("Erreur lors du refus du participant:", error);
      throw error;
    }
  }

  /**
   * Promeut le premier participant de la liste d'attente.
   * - Si replaceApplicationId est fourni : swap (le promu prend la place du remplacé, le remplacé passe en attente) → garde le nombre de places.
   * - Sinon (ex. après un refus) : simple promotion en SELECTIONNE (libère une place).
   */
  static async promoteFromWaitingList(
    excursionId: number,
    replaceApplicationId?: number
  ) {
    try {
      const nextWaiting = await prisma.excursionApplication.findFirst({
        where: {
          excursionId,
          inscriptionStatus: "ATTENTE",
        },
        orderBy: { selectionOrder: "asc" },
        include: { user: true },
      });

      if (!nextWaiting) {
        return { promoted: false, message: "Aucun participant en attente" };
      }

      if (replaceApplicationId != null && Number.isInteger(replaceApplicationId)) {
        // Mode remplacement : garder le nombre de places
        const toReplace = await prisma.excursionApplication.findFirst({
          where: {
            id: replaceApplicationId,
            excursionId,
            inscriptionStatus: { in: ["SELECTIONNE", "FINAL"] },
          },
          include: { user: true },
        });

        if (!toReplace) {
          return {
            promoted: false,
            message: "Participant à remplacer introuvable ou non sélectionné/final",
          };
        }

        const replacedOrder = toReplace.selectionOrder ?? 0;
        const replacedStatus = toReplace.inscriptionStatus;

        const maxWaitingOrder = await prisma.excursionApplication
          .aggregate({
            where: {
              excursionId,
              inscriptionStatus: "ATTENTE",
            },
            _max: { selectionOrder: true },
          })
          .then((r) => (r._max.selectionOrder ?? 0) + 1);

        await prisma.excursionApplication.update({
          where: { id: nextWaiting.id },
          data: { inscriptionStatus: replacedStatus, selectionOrder: replacedOrder },
        });
        await prisma.excursionApplication.update({
          where: { id: toReplace.id },
          data: { inscriptionStatus: "ATTENTE", selectionOrder: maxWaitingOrder },
        });

        await this.logSelection(
          excursionId,
          nextWaiting.id,
          SelectionAction.PARTICIPANT_PROMOTED_FROM_WAITING,
          "ATTENTE",
          replacedStatus,
          `${nextWaiting.user.firstName} ${nextWaiting.user.lastName} promu en remplacement de ${toReplace.user.firstName} ${toReplace.user.lastName}`
        );

        return {
          promoted: true,
          participant: {
            id: nextWaiting.id,
            name: `${nextWaiting.user.firstName} ${nextWaiting.user.lastName}`,
            email: nextWaiting.user.email,
          },
          replaced: {
            id: toReplace.id,
            name: `${toReplace.user.firstName} ${toReplace.user.lastName}`,
          },
        };
      }

      // Mode simple (ex. après refus) : promouvoir en SELECTIONNE
      await prisma.excursionApplication.update({
        where: { id: nextWaiting.id },
        data: { inscriptionStatus: "SELECTIONNE" },
      });
      await this.logSelection(
        excursionId,
        nextWaiting.id,
        SelectionAction.PARTICIPANT_PROMOTED_FROM_WAITING,
        "ATTENTE",
        "SELECTIONNE",
        `${nextWaiting.user.firstName} ${nextWaiting.user.lastName} promu de la liste d'attente`
      );
      return {
        promoted: true,
        participant: {
          id: nextWaiting.id,
          name: `${nextWaiting.user.firstName} ${nextWaiting.user.lastName}`,
          email: nextWaiting.user.email,
        },
      };
    } catch (error) {
      console.error("Erreur lors de la promotion de la liste d'attente:", error);
      throw error;
    }
  }

  /** Délègue au module pointsFormula (testé unitairement). */
  static computePointsToCredit(
    excursionType: "FAMILY" | "SINGLE" | "COUPLE",
    activityType: { points: number; pointsConjoint?: number | null; pointsPerChild?: number | null },
    user: { maritalStatus: string | null; _count?: { children: number } }
  ): number {
    return computePoints(excursionType, activityType, user);
  }

  /**
   * Crédite les points aux participants (liste finale / sélectionnés) quand la sélection est clôturée.
   * Formule selon type d'activité : Single = pts agent ; Couple = agent + conjoint ; Famille = agent + conjoint (si marié) + n×pts enfant.
   */
  static async creditPointsForClosedExcursion(
    excursionId: number,
    adminId: number
  ): Promise<{ credited: number; skipped: number }> {
    const excursion = await prisma.excursion.findUnique({
      where: { id: excursionId },
      include: { activityType: true },
    });
    if (!excursion) throw new Error("Activité non trouvée");
    if (excursion.pointsCreditedAt) {
      return { credited: 0, skipped: 0 };
    }
    if (!excursion.activityType) {
      console.warn(`[creditPoints] Activité ${excursionId} sans type d'activité (activityTypeId) - aucun point crédité`);
      return { credited: 0, skipped: 0 };
    }

    const applications = await prisma.excursionApplication.findMany({
      where: {
        excursionId,
        inscriptionStatus: { in: ["SELECTIONNE", "FINAL"] },
      },
      include: {
        user: {
          include: {
            _count: { select: { children: true } },
          },
        },
      },
    });

    let credited = 0;
    const activityType = excursion.activityType;
    // Priorité au type d'excursion (SINGLE/COUPLE/FAMILY) : c'est l'événement concret qui fixe la règle.
    // Ex. excursion "Agadir Single" → uniquement pts agent (4), pas de conjoint/enfants.
    // Fallback sur le beneficiary du type d'activité si le type d'excursion est invalide.
    const beneficiaryForFormula = resolveBeneficiaryForFormula(
      excursion.type,
      activityType.beneficiary
    );

    for (const app of applications) {
      const delta = computePoints(beneficiaryForFormula, activityType, {
        maritalStatus: app.user.maritalStatus,
        _count: app.user._count,
      });
      if (delta <= 0) continue;

      await prisma.$transaction([
        prisma.user.update({
          where: { id: app.userId },
          data: { points: { increment: delta } },
        }),
        prisma.userPointHistory.create({
          data: {
            userId: app.userId,
            delta,
            reason: `Points activité clôturée: ${excursion.title} (${activityType.title})`,
            createdById: adminId,
          },
        }),
      ]);
      credited++;
    }

    await prisma.excursion.update({
      where: { id: excursionId },
      data: { pointsCreditedAt: new Date() },
    });

    return { credited, skipped: applications.length - credited };
  }

  /**
   * Clôt l'activité (aucune nouvelle inscription autorisée) et crédite les points aux participants.
   * Retourne { excursion, warnings, pointsCreditedCount } pour informer du nombre d'agents ayant reçu des points.
   */
  static async closeSelection(excursionId: number, adminId?: number): Promise<{ excursion: any; warnings: string[]; pointsCreditedCount?: number }> {
    const warnings: string[] = [];
    let pointsCreditedCount: number | undefined;
    try {
      const excursion = await prisma.excursion.findUnique({
        where: { id: excursionId },
        include: { activityType: true },
      });
      if (!excursion) throw new Error("Activité non trouvée");
      if (excursion.selectionStatus === "CLOSED") {
        return { excursion, warnings, pointsCreditedCount };
      }

      if (!excursion.activityTypeId || !excursion.activityType) {
        warnings.push("Type d'activité (prestation) non renseigné : les points ne seront pas crédités aux participants. Renseignez-le dans la fiche activité puis rouvrez la sélection si besoin.");
      }

      // Créditer les points aux participants (liste finale / sélectionnés) avant de clôturer
      if (!excursion.pointsCreditedAt && excursion.activityType && adminId) {
        try {
          const { credited } = await this.creditPointsForClosedExcursion(excursionId, adminId);
          pointsCreditedCount = credited;
        } catch (creditError: any) {
          console.error("Erreur crédit des points (la clôture va quand même s'effectuer):", creditError);
          warnings.push("Les points n'ont pas pu être crédités aux participants: " + (creditError?.message || "erreur technique") + ". Vous pourrez les attribuer manuellement si besoin.");
        }
      }

      const result = await prisma.excursion.update({
        where: { id: excursionId },
        data: {
          selectionStatus: SelectionStatus.CLOSED,
          status: ExcursionStatus.CLOSED,
        },
      });

      await this.logSelection(
        excursionId,
        null,
        SelectionAction.SELECTION_CLOSED,
        null,
        null,
        "Sélection clôturée - Activité marquée comme fermée"
      );

      return { excursion: result, warnings, pointsCreditedCount };
    } catch (error) {
      console.error("Erreur lors de la clôture de la sélection:", error);
      throw error;
    }
  }

  /**
   * Récupère TOUS les participants avec leurs statuts (INSCRIT, SÉLECTIONNÉ, EN ATTENTE, FINAL, REFUSÉ)
   */
  static async getAllParticipants(excursionId: number) {
    try {
      const excursion = await prisma.excursion.findUnique({
        where: { id: excursionId },
      });

      if (!excursion) {
        throw new Error("Activité non trouvée");
      }

      // Récupérer TOUS les participants avec leurs statuts, triés par ordre de sélection
      const allParticipants = await prisma.excursionApplication.findMany({
        where: { excursionId },
        include: { user: true },
        orderBy: [
          { selectionOrder: "asc" },
          { createdAt: "asc" },
        ],
      });

      // Compter les statuts
      const stats = await prisma.excursionApplication.groupBy({
        by: ["inscriptionStatus"],
        where: { excursionId },
        _count: true,
      });

      const statCounts = stats.reduce(
        (acc, s) => {
          acc[s.inscriptionStatus] = s._count;
          return acc;
        },
        {} as Record<InscriptionStatus, number>
      );

      // Formater les données
      const participants = allParticipants.map((p) => ({
        id: p.id,
        name: `${p.user.firstName} ${p.user.lastName}`,
        firstName: p.user.firstName,
        lastName: p.user.lastName,
        email: p.user.email,
        matricule: p.user.matricule,
        points: p.user.points,
        status: p.inscriptionStatus,
        selectionOrder: p.selectionOrder,
        paymentConfirmed: p.paymentConfirmed,
        paymentConfirmedDate: p.paymentConfirmedDate,
        createdAt: p.createdAt,
        computedScore: p.computedScore,
      }));

      return {
        excursion,
        stats: statCounts,
        participants,
        selectedCount: statCounts.SELECTIONNE || 0,
        waitingCount: statCounts.ATTENTE || 0,
        finalCount: statCounts.FINAL || 0,
        totalCount: allParticipants.length,
      };
    } catch (error) {
      console.error("Erreur lors de la récupération des participants:", error);
      throw error;
    }
  }

  /**
   * Récupère le récapitulatif final
   */
  static async getFinalRecap(excursionId: number) {
    try {
      const excursion = await prisma.excursion.findUnique({
        where: { id: excursionId },
      });

      if (!excursion) {
        throw new Error("Activité non trouvée");
      }

      // Compter les statuts
      const stats = await prisma.excursionApplication.groupBy({
        by: ["inscriptionStatus"],
        where: { excursionId },
        _count: true,
      });

      const statCounts = stats.reduce(
        (acc, s) => {
          acc[s.inscriptionStatus] = s._count;
          return acc;
        },
        {} as Record<InscriptionStatus, number>
      );

      // Récupérer les participants finaux
      const finalParticipants = await prisma.excursionApplication.findMany({
        where: {
          excursionId,
          inscriptionStatus: "FINAL",
        },
        include: { user: true },
        orderBy: { selectionOrder: "asc" },
      });

      // Récupérer l'historique
      const history = await prisma.selectionHistory.findMany({
        where: { excursionId },
        orderBy: { createdAt: "desc" },
      });

      return {
        excursion,
        stats: statCounts,
        finalParticipants: finalParticipants.map((p) => ({
          id: p.id,
          name: `${p.user.firstName} ${p.user.lastName}`,
          email: p.user.email,
          matricule: p.user.matricule,
          points: p.user.points,
          selectionOrder: p.selectionOrder,
          paymentConfirmed: p.paymentConfirmed,
          paymentConfirmedDate: p.paymentConfirmedDate,
        })),
        history,
      };
    } catch (error) {
      console.error("Erreur lors de la récupération du récapitulatif:", error);
      throw error;
    }
  }

  /**
   * Réinitialise toutes les listes (sélectionnés, attente, finale, refusés) vers INSCRIT.
   * Conserve uniquement la liste des inscrits. Remet l'excursion en état "sélection non démarrée"
   * (y compris si la liste était clôturée). Permet de recommencer le processus de sélection.
   */
  static async clearSelections(excursionId: number) {
    try {
      // Réinitialiser tous les statuts (SELECTIONNE, ATTENTE, FINAL, REFUSE) -> INSCRIT, et paiement
      const updateResult = await prisma.excursionApplication.updateMany({
        where: {
          excursionId,
          inscriptionStatus: {
            in: ["SELECTIONNE", "ATTENTE", "FINAL", "REFUSE"],
          },
        },
        data: {
          inscriptionStatus: "INSCRIT",
          originalInscriptionStatus: "INSCRIT",
          selectionOrder: null,
          computedScore: null,
          paymentConfirmed: false,
          paymentConfirmedDate: null,
        },
      });

      // Remettre l'excursion en état "sélection non démarrée" et rouvrir si clôturée (en cas d'erreur / pour recommencer)
      await prisma.excursion.update({
        where: { id: excursionId },
        data: {
          selectionStatus: SelectionStatus.NOT_STARTED,
          status: ExcursionStatus.OPEN,
          pointsCreditedAt: null,
        },
      });

      await SelectionService.logSelection(
        excursionId,
        null,
        "RESET_SELECTION",
        null,
        "INSCRIT",
        `Réinitialisation de ${updateResult.count} inscriptions (listes sélection / attente / finale / refus)`
      );

      return updateResult.count;
    } catch (error: any) {
      console.error("Erreur lors de l'effacement des sélections:", error);
      throw new Error(
        "Erreur lors de l'effacement des sélections: " + error.message
      );
    }
  }

  /**
   * Enregistre une action dans l'historique
   */
  private static async logSelection(
    excursionId: number,
    applicationId: number | null,
    action: SelectionAction,
    previousStatus: InscriptionStatus | null,
    newStatus: InscriptionStatus | null,
    reason: string
  ) {
    try {
      // Récupérer les infos du participant si applicationId est fourni
      let participantName = "System";
      let participantEmail = "system";

      if (applicationId) {
        const app = await prisma.excursionApplication.findUnique({
          where: { id: applicationId },
          include: { user: true },
        });

        if (app) {
          participantName = `${app.user.firstName} ${app.user.lastName}`;
          participantEmail = app.user.email;
        }
      }

      await prisma.selectionHistory.create({
        data: {
          excursionId,
          applicationId: applicationId || undefined,
          action,
          participantName,
          participantEmail,
          previousStatus,
          newStatus,
          reason,
        },
      });
    } catch (error) {
      console.error("Erreur lors de l'enregistrement de l'historique:", error);
      // Ne pas lever d'erreur pour ne pas interrompre le processus
    }
  }
}
