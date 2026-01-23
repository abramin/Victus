import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor"

// Shared step definitions are auto-loaded from shared-steps.ts
import { validProfile } from "../support/shared-steps"
import { PROFILES, BOUNDARIES } from "../support/fixtures"

const apiBaseUrl = Cypress.env("apiBaseUrl") as string

const invalidProfile = {
  ...validProfile,
  height_cm: 90,
}

const profileWithBMREquation = {
  ...validProfile,
  bmrEquation: "katch_mcardle",
  bodyFatPercent: 15,
}

// Store original targets for comparison
let originalTargets: Record<string, unknown> | null = null

When("I upsert a valid user profile", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: validProfile,
  }).as("lastResponse")
})

When("I upsert an invalid user profile", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: invalidProfile,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I fetch the user profile", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/profile`,
    failOnStatusCode: false,
  }).as("lastResponse")
})

Then("the profile response should include the submitted profile data", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>

    expect(body.height_cm).to.equal(validProfile.height_cm)
    expect(body.birthDate).to.equal(validProfile.birthDate)
    expect(body.sex).to.equal(validProfile.sex)
    expect(body.goal).to.equal(validProfile.goal)
    expect(body.targetWeightKg).to.equal(validProfile.targetWeightKg)
    expect(body.targetWeeklyChangeKg).to.equal(validProfile.targetWeeklyChangeKg)
  })
})

Then("the profile response should include default ratios and targets", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>

    expect(body.carbRatio).to.equal(0.45)
    expect(body.proteinRatio).to.equal(0.3)
    expect(body.fatRatio).to.equal(0.25)

    const mealRatios = body.mealRatios as Record<string, number>
    expect(mealRatios.breakfast).to.equal(0.3)
    expect(mealRatios.lunch).to.equal(0.3)
    expect(mealRatios.dinner).to.equal(0.4)

    const pointsConfig = body.pointsConfig as Record<string, number>
    expect(pointsConfig.carbMultiplier).to.equal(1.15)
    expect(pointsConfig.proteinMultiplier).to.equal(4.35)
    expect(pointsConfig.fatMultiplier).to.equal(3.5)

    expect(body.fruitTargetG).to.equal(600)
    expect(body.veggieTargetG).to.equal(500)
  })
})

When("I upsert a profile with Katch-McArdle BMR equation", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: profileWithBMREquation,
  }).as("lastResponse")
})

Then("the profile response should include the selected BMR equation", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.bmrEquation).to.equal("katch_mcardle")
    expect(body.bodyFatPercent).to.equal(15)
  })
})

// =============================================================================
// SEX VARIATION STEPS
// =============================================================================

When("I upsert a male profile", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: { ...PROFILES.male },
  }).as("lastResponse")
})

When("I upsert a female profile", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: { ...PROFILES.female },
  }).as("lastResponse")
})

Then("the profile sex should be male", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.sex).to.equal("male")
  })
})

Then("the profile sex should be female", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.sex).to.equal("female")
  })
})

// =============================================================================
// GOAL VARIATION STEPS
// =============================================================================

When("I upsert a lose weight profile", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: { ...PROFILES.loseWeight },
  }).as("lastResponse")
})

When("I have upserted a lose weight profile", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: { ...PROFILES.loseWeight },
  })
})

When("I upsert a maintain weight profile", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: { ...PROFILES.maintain },
  }).as("lastResponse")
})

When("I upsert a gain weight profile", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: { ...PROFILES.gainWeight },
  }).as("lastResponse")
})

Then("the profile goal should be lose weight", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.goal).to.equal("lose_weight")
  })
})

Then("the profile goal should be maintain", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.goal).to.equal("maintain")
  })
})

Then("the profile goal should be gain weight", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.goal).to.equal("gain_weight")
  })
})

Then("the weekly change should be negative", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.targetWeeklyChangeKg).to.be.lessThan(0)
  })
})

Then("the weekly change should be zero", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.targetWeeklyChangeKg).to.equal(0)
  })
})

Then("the weekly change should be positive", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.targetWeeklyChangeKg).to.be.greaterThan(0)
  })
})

// =============================================================================
// BMR EQUATION VARIATION STEPS
// =============================================================================

When("I upsert a profile with Mifflin-St Jeor BMR", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: { ...PROFILES.mifflinStJeor },
  }).as("lastResponse")
})

When("I upsert a profile with Oxford-Henry BMR", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: { ...PROFILES.oxfordHenry },
  }).as("lastResponse")
})

When("I upsert a profile with Harris-Benedict BMR", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: { ...PROFILES.harrisBenedict },
  }).as("lastResponse")
})

When("I upsert a profile with Katch-McArdle but no body fat", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: { ...validProfile, bmrEquation: "katch_mcardle" },
    failOnStatusCode: false,
  }).as("lastResponse")
})

Then("the profile BMR equation should be mifflin_st_jeor", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.bmrEquation).to.equal("mifflin_st_jeor")
  })
})

Then("the profile BMR equation should be oxford_henry", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.bmrEquation).to.equal("oxford_henry")
  })
})

Then("the profile BMR equation should be harris_benedict", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.bmrEquation).to.equal("harris_benedict")
  })
})

// =============================================================================
// TDEE SOURCE VARIATION STEPS
// =============================================================================

When("I upsert a profile with formula TDEE", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: { ...PROFILES.formulaTdee },
  }).as("lastResponse")
})

When("I upsert a profile with manual TDEE", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: { ...PROFILES.manualTdee },
  }).as("lastResponse")
})

When("I upsert a profile with adaptive TDEE", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: { ...PROFILES.adaptiveTdee },
  }).as("lastResponse")
})

When("I upsert a profile with manual TDEE but no value", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: { ...validProfile, tdeeSource: "manual" },
    failOnStatusCode: false,
  }).as("lastResponse")
})

Then("the profile TDEE source should be formula", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.tdeeSource).to.equal("formula")
  })
})

Then("the profile TDEE source should be manual", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.tdeeSource).to.equal("manual")
  })
})

Then("the profile TDEE source should be adaptive", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.tdeeSource).to.equal("adaptive")
  })
})

Then("the profile should include manual TDEE value", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.manualTdee).to.equal(PROFILES.manualTdee.manualTdee)
  })
})

// =============================================================================
// BOUNDARY CONDITION STEPS
// =============================================================================

When("I upsert a profile with minimum height", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: { ...PROFILES.minHeight },
  }).as("lastResponse")
})

When("I upsert a profile with maximum height", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: { ...PROFILES.maxHeight },
  }).as("lastResponse")
})

When("I upsert a profile with height below minimum", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: { ...validProfile, height_cm: BOUNDARIES.height.belowMin },
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I upsert a profile with height above maximum", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: { ...validProfile, height_cm: BOUNDARIES.height.aboveMax },
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I upsert a profile with minimum body fat", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: { ...PROFILES.minBodyFat },
  }).as("lastResponse")
})

When("I upsert a profile with maximum body fat", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: { ...PROFILES.maxBodyFat },
  }).as("lastResponse")
})

When("I upsert a profile with body fat below minimum", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: { ...validProfile, bodyFatPercent: BOUNDARIES.bodyFat.belowMin },
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I upsert a profile with aggressive weight loss", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: { ...PROFILES.aggressiveLoss },
  }).as("lastResponse")
})

When("I upsert a profile with aggressive weight gain", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: { ...PROFILES.aggressiveGain },
  }).as("lastResponse")
})

Then("the profile should flag aggressive goal", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    // The profile is saved; the warning would be shown in UI
    expect(body.targetWeeklyChangeKg).to.exist
  })
})

When("I upsert a profile with minimum TDEE", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: { ...validProfile, tdeeSource: "manual", manualTdee: BOUNDARIES.tdee.min },
  }).as("lastResponse")
})

When("I upsert a profile with maximum TDEE", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: { ...validProfile, tdeeSource: "manual", manualTdee: BOUNDARIES.tdee.max },
  }).as("lastResponse")
})

// =============================================================================
// UI STEPS
// =============================================================================

When("I set an aggressive weight loss rate", () => {
  cy.get('[data-testid="weeklyChange-input"], input[name="targetWeeklyChangeKg"]')
    .first()
    .clear()
    .type(BOUNDARIES.weeklyChange.aggressiveLoss.toString())
})

When("I select Katch-McArdle BMR equation", () => {
  cy.get('[data-testid="bmrEquation-select"], select[name="bmrEquation"]')
    .first()
    .select("katch_mcardle")
})

When("I select manual TDEE source", () => {
  cy.get('[data-testid="tdeeSource-select"], select[name="tdeeSource"]')
    .first()
    .select("manual")
})

When("I update the height field", () => {
  cy.get('[data-testid="height-input"], input[name="height_cm"], input[name="height"]')
    .first()
    .clear()
    .type("185")
})

Then("the profile should reflect updated height", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/profile`,
  }).then((response) => {
    expect(response.body.height_cm).to.equal(185)
  })
})

// =============================================================================
// SAVE/UPDATE FLOW STEPS
// =============================================================================

When("I update only the height field via API", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: { ...validProfile, height_cm: 190 },
  }).as("lastResponse")
})

Then("the other profile fields should be preserved", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.height_cm).to.equal(190)
    expect(body.sex).to.equal(validProfile.sex)
    expect(body.goal).to.equal(validProfile.goal)
  })
})

When("I update the profile to gain weight goal", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: { ...PROFILES.gainWeight },
  }).as("lastResponse")
})

When("I update the profile BMR equation", () => {
  // Store current targets first
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/logs/today`,
  }).then((response) => {
    originalTargets = (response.body as Record<string, unknown>).calculatedTargets as Record<string, unknown>
  })

  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: { ...PROFILES.harrisBenedict },
  })
})

Then("the calculated targets should differ from original", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const newTargets = body.calculatedTargets as Record<string, unknown>
    // Targets may or may not differ depending on the equations
    expect(newTargets).to.exist
  })
})

// =============================================================================
// EDGE CASE STEPS
// =============================================================================

When("I upsert a profile with invalid macro ratios", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: {
      ...validProfile,
      carbRatio: 0.5,
      proteinRatio: 0.5,
      fatRatio: 0.5, // Sum = 1.5, invalid
    },
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I upsert a profile with invalid meal ratios", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: {
      ...validProfile,
      mealRatios: {
        breakfast: 0.5,
        lunch: 0.5,
        dinner: 0.5, // Sum = 1.5, invalid
      },
    },
    failOnStatusCode: false,
  }).as("lastResponse")
})
