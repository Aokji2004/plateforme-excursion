import { describe, it, expect } from "vitest";
import { computePointsToCredit, resolveBeneficiaryForFormula } from "./pointsFormula";

describe("Plan d'accréditation des points - Formules", () => {
  describe("SINGLE (agent seul)", () => {
    it("retourne uniquement les points agent", () => {
      expect(
        computePointsToCredit(
          "SINGLE",
          { points: 5, pointsConjoint: 2, pointsPerChild: 1 },
          { maritalStatus: null }
        )
      ).toBe(5);
      expect(
        computePointsToCredit(
          "SINGLE",
          { points: 10 },
          { maritalStatus: "MARRIED", _count: { children: 3 } }
        )
      ).toBe(10);
    });
  });

  describe("COUPLE (agent + conjoint)", () => {
    it("agent marié : pts agent + pts conjoint", () => {
      expect(
        computePointsToCredit(
          "COUPLE",
          { points: 4, pointsConjoint: 2, pointsPerChild: 1 },
          { maritalStatus: "MARRIED" }
        )
      ).toBe(6);
    });
    it("agent non marié : pts agent uniquement", () => {
      expect(
        computePointsToCredit(
          "COUPLE",
          { points: 4, pointsConjoint: 2 },
          { maritalStatus: "SINGLE" }
        )
      ).toBe(4);
      expect(
        computePointsToCredit(
          "COUPLE",
          { points: 4, pointsConjoint: 2 },
          { maritalStatus: null }
        )
      ).toBe(4);
    });
  });

  describe("FAMILY (agent + conjoint + enfants)", () => {
    it("marié + 3 enfants : 4 pt agent + 2 pt conjoint + 3×1 pt enfant = 9", () => {
      expect(
        computePointsToCredit(
          "FAMILY",
          { points: 4, pointsConjoint: 2, pointsPerChild: 1 },
          { maritalStatus: "MARRIED", _count: { children: 3 } }
        )
      ).toBe(9);
    });
    it("marié sans enfant : pts agent + pts conjoint", () => {
      expect(
        computePointsToCredit(
          "FAMILY",
          { points: 4, pointsConjoint: 2, pointsPerChild: 1 },
          { maritalStatus: "MARRIED", _count: { children: 0 } }
        )
      ).toBe(6);
    });
    it("non marié avec enfants (cas rare) : pts agent + n×pts enfant seulement", () => {
      expect(
        computePointsToCredit(
          "FAMILY",
          { points: 4, pointsConjoint: 2, pointsPerChild: 1 },
          { maritalStatus: "SINGLE", _count: { children: 2 } }
        )
      ).toBe(6);
    });
    it("valeurs null/undefined gérées (fallback 0)", () => {
      expect(
        computePointsToCredit(
          "FAMILY",
          { points: 4 },
          { maritalStatus: "MARRIED", _count: { children: 1 } }
        )
      ).toBe(4);
      expect(
        computePointsToCredit(
          "FAMILY",
          { points: 4, pointsConjoint: 2, pointsPerChild: 1 },
          { maritalStatus: "MARRIED" }
        )
      ).toBe(6);
    });
  });
});

describe("Résolution du beneficiary (priorité type d'excursion)", () => {
  it("privilégie le type d'excursion (FAMILY)", () => {
    expect(resolveBeneficiaryForFormula("FAMILY", "SINGLE")).toBe("FAMILY");
    expect(resolveBeneficiaryForFormula("family", "COUPLE")).toBe("FAMILY");
  });
  it("privilégie le type d'excursion (SINGLE) – ex. Agadir Single → pts agent uniquement", () => {
    expect(resolveBeneficiaryForFormula("SINGLE", "FAMILY")).toBe("SINGLE");
    expect(resolveBeneficiaryForFormula("Single", null)).toBe("SINGLE");
  });
  it("privilégie le type d'excursion (COUPLE)", () => {
    expect(resolveBeneficiaryForFormula("COUPLE", "FAMILY")).toBe("COUPLE");
  });
  it("fallback sur le type d'activité si type d'excursion invalide ou vide", () => {
    expect(resolveBeneficiaryForFormula("", "FAMILY")).toBe("FAMILY");
    expect(resolveBeneficiaryForFormula(null, "COUPLE")).toBe("COUPLE");
    expect(resolveBeneficiaryForFormula("EXCURSION", "FAMILY")).toBe("FAMILY");
  });
  it("fallback SINGLE si les deux invalides", () => {
    expect(resolveBeneficiaryForFormula("", "")).toBe("SINGLE");
    expect(resolveBeneficiaryForFormula(null, null)).toBe("SINGLE");
    expect(resolveBeneficiaryForFormula("OTHER", "AUTRE")).toBe("SINGLE");
  });
});

describe("Conformité : points du type d'activité + formule selon beneficiary", () => {
  it("type Excursion FAMILY (4+2+1×3) applique exactement 9 pts pour marié + 3 enfants", () => {
    const activityType = { points: 4, pointsConjoint: 2, pointsPerChild: 1 };
    const user = { maritalStatus: "MARRIED" as const, _count: { children: 3 } };
    const beneficiary = resolveBeneficiaryForFormula("FAMILY", null);
    expect(beneficiary).toBe("FAMILY");
    const pts = computePointsToCredit(beneficiary, activityType, user);
    expect(pts).toBe(9);
  });
  it("type Dîner SINGLE (5 pts) applique exactement 5 pts", () => {
    const activityType = { points: 5, pointsConjoint: 0, pointsPerChild: 0 };
    const user = { maritalStatus: "MARRIED" as const, _count: { children: 2 } };
    const beneficiary = resolveBeneficiaryForFormula("SINGLE", "FAMILY");
    expect(beneficiary).toBe("SINGLE");
    const pts = computePointsToCredit(beneficiary, activityType, user);
    expect(pts).toBe(5);
  });
  it("type Escapade COUPLE (4+2) applique exactement 6 pts pour marié", () => {
    const activityType = { points: 4, pointsConjoint: 2, pointsPerChild: 1 };
    const user = { maritalStatus: "MARRIED" as const, _count: { children: 0 } };
    const beneficiary = resolveBeneficiaryForFormula("COUPLE", null);
    expect(beneficiary).toBe("COUPLE");
    const pts = computePointsToCredit(beneficiary, activityType, user);
    expect(pts).toBe(6);
  });
});

/**
 * Table de vérification pour audit / déploiement : chaque scénario attendu vs résultat réel.
 * Barème utilisé : 4 pts agent, 2 pts conjoint, 1 pt/enfant (comme exemples CDC).
 */
describe("Table de vérification (audit pré-déploiement)", () => {
  const barème = { points: 4, pointsConjoint: 2, pointsPerChild: 1 };

  const scenarios: Array<{
    label: string;
    type: "SINGLE" | "COUPLE" | "FAMILY";
    maritalStatus: string | null;
    childrenCount: number;
    expectedPoints: number;
  }> = [
    { label: "SINGLE – Célibataire", type: "SINGLE", maritalStatus: "SINGLE", childrenCount: 0, expectedPoints: 4 },
    { label: "SINGLE – Marié (ignoré)", type: "SINGLE", maritalStatus: "MARRIED", childrenCount: 2, expectedPoints: 4 },
    { label: "COUPLE – Célibataire", type: "COUPLE", maritalStatus: "SINGLE", childrenCount: 0, expectedPoints: 4 },
    { label: "COUPLE – Marié", type: "COUPLE", maritalStatus: "MARRIED", childrenCount: 0, expectedPoints: 6 },
    { label: "COUPLE – Divorcé", type: "COUPLE", maritalStatus: "DIVORCED", childrenCount: 0, expectedPoints: 4 },
    { label: "COUPLE – Veuf", type: "COUPLE", maritalStatus: "WIDOWED", childrenCount: 0, expectedPoints: 4 },
    { label: "FAMILY – Marié 0 enfant", type: "FAMILY", maritalStatus: "MARRIED", childrenCount: 0, expectedPoints: 6 },
    { label: "FAMILY – Marié 1 enfant", type: "FAMILY", maritalStatus: "MARRIED", childrenCount: 1, expectedPoints: 7 },
    { label: "FAMILY – Marié 3 enfants", type: "FAMILY", maritalStatus: "MARRIED", childrenCount: 3, expectedPoints: 9 },
    { label: "FAMILY – Marié 5 enfants", type: "FAMILY", maritalStatus: "MARRIED", childrenCount: 5, expectedPoints: 11 },
    { label: "FAMILY – Célibataire 2 enfants", type: "FAMILY", maritalStatus: "SINGLE", childrenCount: 2, expectedPoints: 6 },
    { label: "FAMILY – Divorcé 1 enfant", type: "FAMILY", maritalStatus: "DIVORCED", childrenCount: 1, expectedPoints: 5 },
  ];

  scenarios.forEach(({ label, type, maritalStatus, childrenCount, expectedPoints }) => {
    it(`${label} → ${expectedPoints} pts`, () => {
      const user = { maritalStatus, _count: { children: childrenCount } };
      const pts = computePointsToCredit(type, barème, user);
      expect(pts).toBe(expectedPoints);
    });
  });
});
