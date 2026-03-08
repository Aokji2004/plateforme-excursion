/**
 * Formule d'accréditation des points (barème).
 * Utilisée par SelectionService pour créditer les points à la clôture d'une activité.
 * SINGLE : pts agent uniquement
 * COUPLE : pts agent + pts conjoint (si marié)
 * FAMILY : pts agent + pts conjoint (si marié) + nb_enfants × pts par enfant
 */
export type BeneficiaryType = "FAMILY" | "SINGLE" | "COUPLE";

const VALID_BENEFICIARIES: BeneficiaryType[] = ["FAMILY", "SINGLE", "COUPLE"];

/**
 * Détermine le bénéficiaire à utiliser pour la formule des points.
 * Priorité au type d'excursion (Excursion.type) : l'événement concret (SINGLE/COUPLE/FAMILY) fixe la règle.
 * Ex. excursion Single → pts agent uniquement ; excursion Famille → agent + conjoint + enfants.
 * Fallback sur le beneficiary du type d'activité si le type d'excursion est invalide.
 */
export function resolveBeneficiaryForFormula(
  excursionType: string | null | undefined,
  activityTypeBeneficiary: string | null | undefined
): BeneficiaryType {
  const fromExcursion = String(excursionType ?? "").trim().toUpperCase();
  const fromActivity = String(activityTypeBeneficiary ?? "").trim().toUpperCase();
  if (VALID_BENEFICIARIES.includes(fromExcursion as BeneficiaryType)) {
    return fromExcursion as BeneficiaryType;
  }
  if (VALID_BENEFICIARIES.includes(fromActivity as BeneficiaryType)) {
    return fromActivity as BeneficiaryType;
  }
  return "SINGLE";
}

export interface ActivityTypePoints {
  points: number;
  pointsConjoint?: number | null;
  pointsPerChild?: number | null;
}

export interface UserContext {
  maritalStatus: string | null;
  _count?: { children: number };
}

export function computePointsToCredit(
  excursionType: BeneficiaryType,
  activityType: ActivityTypePoints,
  user: UserContext
): number {
  const pts = activityType.points ?? 0;
  const ptsConjoint = activityType.pointsConjoint ?? 0;
  const ptsEnfant = activityType.pointsPerChild ?? 0;
  const isMarried = user.maritalStatus === "MARRIED";
  const childCount = user._count?.children ?? 0;

  if (excursionType === "SINGLE") {
    return pts;
  }
  if (excursionType === "COUPLE") {
    return pts + (isMarried ? ptsConjoint : 0);
  }
  // FAMILY
  return pts + (isMarried ? ptsConjoint : 0) + childCount * ptsEnfant;
}
