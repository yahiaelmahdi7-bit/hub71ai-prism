import type { HousingPolicy, HousingSearchResult, PersonProfile, RentalHome } from "../types.ts";

const BEDROOM_ASSUMPTIONS = [
  "Bedroom fit is a planning hint only: studio or 1-bed for one adult, 1-bed for a couple, 2-bed for households with children, and larger homes where available.",
  "The hard housing filter uses only current asking rent, minimum monthly income, max rent share of income, and annual housing allowance.",
  "The max rent share of income is an explicit planning assumption, not an Abu Dhabi government or bank rule.",
];

export function matchHomes(
  profile: Pick<PersonProfile, "household" | "income" | "preferredAreaIds">,
  policy: HousingPolicy,
  homes: RentalHome[],
): HousingSearchResult {
  validateInputs(profile, policy);

  const incomeBudget = profile.income.minMonthlyAed * 12 * policy.maxRentShareOfIncome;
  const annualBudgetAed = Math.floor(Math.min(policy.annualAllowanceAed, incomeBudget));
  const preferredAreas = new Set(profile.preferredAreaIds);
  const recommendedBedrooms = recommendedBedroomCount(profile.household);
  const excluded: HousingSearchResult["excluded"] = [];
  const matches: HousingSearchResult["matches"] = [];

  for (const home of homes) {
    if (home.annualRentAed > annualBudgetAed) {
      excluded.push({
        listingId: home.id,
        reasons: [
          `Annual rent AED ${home.annualRentAed.toLocaleString("en-US")} exceeds the filtered budget of AED ${annualBudgetAed.toLocaleString("en-US")}.`,
        ],
      });
      continue;
    }

    const reasons = [
      `Within the AED ${annualBudgetAed.toLocaleString("en-US")} annual budget after income and allowance filters.`,
    ];
    let score = Math.max(0, 100 - Math.round(((annualBudgetAed - home.annualRentAed) / annualBudgetAed) * 20));

    if (preferredAreas.has(home.areaId)) {
      score += 20;
      reasons.push(`Matches preferred area ${home.area}.`);
    }

    if (home.bedrooms >= recommendedBedrooms) {
      score += 10;
      reasons.push(`Bedroom count fits the household planning assumption.`);
    } else {
      score -= 10;
      reasons.push(
        `Bedroom count is below the household planning assumption of ${recommendedBedrooms} bedroom${recommendedBedrooms === 1 ? "" : "s"}.`,
      );
    }

    if (home.sourceKind === "snapshot") {
      reasons.push("Dated observed listing snapshot; availability is unconfirmed until checked on the portal.");
    }
    if (home.synthetic) {
      reasons.push("Synthetic example for planning only; no agent contact action is allowed.");
    }

    matches.push({
      home,
      annualBudgetAed,
      monthlyRentAed: Math.round(home.annualRentAed / 12),
      score,
      reasons,
    });
  }

  matches.sort((a, b) => b.score - a.score || a.home.annualRentAed - b.home.annualRentAed);

  return {
    matches,
    excluded,
    annualBudgetAed,
    assumptions:
      matches.length > 0
        ? BEDROOM_ASSUMPTIONS
        : [
            ...BEDROOM_ASSUMPTIONS,
            `No homes remained under AED ${annualBudgetAed.toLocaleString("en-US")} after the income and allowance filter.`,
          ],
  };
}

function validateInputs(
  profile: Pick<PersonProfile, "household" | "income" | "preferredAreaIds">,
  policy: HousingPolicy,
) {
  if (!Number.isFinite(profile.income.minMonthlyAed) || profile.income.minMonthlyAed < 0) {
    throw new RangeError("profile.income.minMonthlyAed must be zero or greater.");
  }
  if (!Number.isFinite(policy.annualAllowanceAed) || policy.annualAllowanceAed < 0) {
    throw new RangeError("policy.annualAllowanceAed must be zero or greater.");
  }
  if (
    !Number.isFinite(policy.maxRentShareOfIncome) ||
    policy.maxRentShareOfIncome <= 0 ||
    policy.maxRentShareOfIncome > 1
  ) {
    throw new RangeError("policy.maxRentShareOfIncome must be greater than zero and at most one.");
  }
  if (
    !Number.isInteger(profile.household.adults) ||
    !Number.isInteger(profile.household.children) ||
    profile.household.adults < 1 ||
    profile.household.children < 0
  ) {
    throw new RangeError("profile.household must include at least one adult and no negative counts.");
  }
}

function recommendedBedroomCount(household: { adults: number; children: number }) {
  if (household.children > 0) {
    return 2;
  }
  return household.adults > 1 ? 1 : 0;
}
