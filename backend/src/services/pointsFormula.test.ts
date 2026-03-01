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

describe("Dépendance type d'activité – Résolution du beneficiary", () => {
  it("privilégie toujours le beneficiary du type d'activité (FAMILY)", () => {
    expect(resolveBeneficiaryForFormula("FAMILY", "SINGLE")).toBe("FAMILY");
    expect(resolveBeneficiaryForFormula("family", "COUPLE")).toBe("FAMILY");
  });
  it("privilégie toujours le beneficiary du type d'activité (SINGLE)", () => {
    expect(resolveBeneficiaryForFormula("SINGLE", "FAMILY")).toBe("SINGLE");
    expect(resolveBeneficiaryForFormula("Single", null)).toBe("SINGLE");
  });
  it("privilégie toujours le beneficiary du type d'activité (COUPLE)", () => {
    expect(resolveBeneficiaryForFormula("COUPLE", "FAMILY")).toBe("COUPLE");
  });
  it("fallback sur le type d'excursion si type d'activité invalide ou vide", () => {
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
