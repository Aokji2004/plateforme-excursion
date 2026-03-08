import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { prisma } from "../db";

export const publicInscriptionRouter = Router();

/**
 * GET /public/inscription/:token
 * Retourne les infos de l'activité et la validité du lien (sans auth).
 */
publicInscriptionRouter.get("/:token", async (req, res) => {
  try {
    let token = String(req.params.token || "").trim().replace(/\/+$/, "");
    if (!token) {
      return res.status(400).json({ message: "Token manquant" });
    }

    const excursion = await prisma.excursion.findFirst({
      where: { inscriptionToken: token },
      include: { activityType: true },
    });

    if (!excursion) {
      return res.status(404).json({ message: "Lien d'inscription invalide ou expiré" });
    }

    const now = new Date();
    const validFrom = excursion.inscriptionLinkValidFrom
      ? new Date(excursion.inscriptionLinkValidFrom)
      : null;
    const validUntil = excursion.inscriptionLinkValidUntil
      ? new Date(excursion.inscriptionLinkValidUntil)
      : null;

    let valid = excursion.status === "OPEN";
    if (validFrom && now < validFrom) valid = false;
    if (validUntil && now > validUntil) valid = false;

    return res.json({
      id: excursion.id,
      title: excursion.title,
      city: excursion.city,
      type: excursion.type,
      startDate: excursion.startDate,
      endDate: excursion.endDate,
      durationDays: excursion.durationDays,
      totalSeats: excursion.totalSeats,
      description: excursion.description,
      imageUrl: excursion.imageUrl,
      activityType: excursion.activityType,
      valid,
      validFrom: validFrom?.toISOString() ?? null,
      validUntil: validUntil?.toISOString() ?? null,
      status: excursion.status,
      inscriptionFormTitle: excursion.inscriptionFormTitle ?? null,
      inscriptionFormDescription: excursion.inscriptionFormDescription ?? null,
      registrationStartDate: excursion.registrationStartDate?.toISOString() ?? null,
      registrationEndDate: excursion.registrationEndDate?.toISOString() ?? null,
      paymentStartDate: excursion.paymentStartDate?.toISOString() ?? null,
      paymentEndDate: excursion.paymentEndDate?.toISOString() ?? null,
    });
  } catch (e: any) {
    console.error("GET /public/inscription/:token", e);
    return res.status(500).json({ message: "Erreur serveur" });
  }
});

/**
 * POST /public/inscription/:token
 * Candidature sans login : identifier l'employé par email ou matricule, créer l'inscription.
 */
publicInscriptionRouter.post("/:token", async (req, res) => {
  try {
    let token = String(req.params.token || "").trim().replace(/\/+$/, "");
    const { firstName, lastName, matricule, email, address, phone } = req.body || {};

    if (!token) {
      return res.status(400).json({ message: "Token manquant" });
    }

    const matriculeStr = matricule != null ? String(matricule).trim() : "";
    if (!matriculeStr) {
      return res.status(400).json({
        message: "Le matricule est obligatoire",
      });
    }

    const excursion = await prisma.excursion.findFirst({
      where: { inscriptionToken: token },
    });

    if (!excursion) {
      return res.status(404).json({ message: "Lien d'inscription invalide ou expiré" });
    }

    if (excursion.status !== "OPEN") {
      return res.status(400).json({
        message: "Les inscriptions ne sont plus ouvertes pour cette activité",
      });
    }

    const now = new Date();
    if (excursion.inscriptionLinkValidFrom) {
      const from = new Date(excursion.inscriptionLinkValidFrom);
      if (now < from) {
        return res.status(400).json({
          message: "Le lien d'inscription n'est pas encore actif",
        });
      }
    }
    if (excursion.inscriptionLinkValidUntil) {
      const until = new Date(excursion.inscriptionLinkValidUntil);
      if (now > until) {
        return res.status(400).json({
          message: "Le lien d'inscription a expiré",
        });
      }
    }

    let user = await prisma.user.findFirst({
      where: { matricule: matriculeStr },
    });

    let pendingUser = false;
    if (!user) {
      // Employé non présent dans la liste des utilisateurs : création d'un profil minimal
      // et signalement (profileIncomplete) pour que l'admin complète les infos
      const firstNameStr = firstName != null && String(firstName).trim() ? String(firstName).trim() : "Prénom";
      const lastNameStr = lastName != null && String(lastName).trim() ? String(lastName).trim() : "Nom";
      const emailStr = email != null && String(email).trim() && String(email).includes("@") ? String(email).trim() : null;
      const pendingEmail = emailStr || `pending-${matriculeStr}@ocp.ma`;
      const tempPassword = crypto.randomBytes(24).toString("base64url");
      const passwordHash = await bcrypt.hash(tempPassword, 10);
      user = await prisma.user.create({
        data: {
          email: pendingEmail,
          passwordHash,
          firstName: firstNameStr,
          lastName: lastNameStr,
          matricule: matriculeStr,
          role: "EMPLOYEE",
          profileIncomplete: true,
        },
      });
      pendingUser = true;
    }

    const existing = await prisma.excursionApplication.findFirst({
      where: { excursionId: excursion.id, userId: user.id },
    });

    if (existing) {
      return res.status(400).json({
        message: "Vous avez déjà candidaté à cette activité",
      });
    }

    await prisma.excursionApplication.create({
      data: {
        excursionId: excursion.id,
        userId: user.id,
        inscriptionFirstName: firstName != null && String(firstName).trim() ? String(firstName).trim() : null,
        inscriptionLastName: lastName != null && String(lastName).trim() ? String(lastName).trim() : null,
        inscriptionAddress: (email != null && String(email).trim() ? String(email).trim() : null) || (address != null && String(address).trim() ? String(address).trim() : null),
        inscriptionPhone: phone != null && String(phone).trim() ? String(phone).trim() : null,
      },
    });

    return res.status(201).json({
      message: pendingUser
        ? "Candidature enregistrée. Vous n'étiez pas encore dans la liste des employés ; l'administration complétera vos informations."
        : "Candidature enregistrée avec succès",
      activityTitle: excursion.title,
      pendingUser,
    });
  } catch (e: any) {
    console.error("POST /public/inscription/:token", e);
    const detail = process.env.NODE_ENV === "development" ? e?.message : undefined;
    return res.status(500).json({ message: "Erreur serveur", ...(detail && { detail }) });
  }
});
