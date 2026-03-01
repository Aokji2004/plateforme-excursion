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
 * Priorité au type d'activité (ActivityType.beneficiary), sinon à l'excursion (Excursion.type).
 * Garantit que les points du barème (activityType) sont toujours associés à la bonne formule.
 */
export function resolveBeneficiaryForFormula(
  activityTypeBeneficiary: string | null | undefined,
  excursionType: string | null | undefined
): BeneficiaryType {
  const fromActivity = String(activityTypeBeneficiary ?? "").trim().toUpperCase();
  const fromExcursion = String(excursionType ?? "").toUpperCase();
  if (VALID_BENEFICIARIES.includes(fromActivity as BeneficiaryType)) {
    return fromActivity as BeneficiaryType;
  }
  if (VALID_BENEFICIARIES.includes(fromExcursion as BeneficiaryType)) {
    return fromExcursion as BeneficiaryType;
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
