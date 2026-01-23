import { When, Then } from "@badeball/cypress-cucumber-preprocessor"

// Shared step definitions are auto-loaded from shared-steps.ts
import { validProfile } from "../support/shared-steps"

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
