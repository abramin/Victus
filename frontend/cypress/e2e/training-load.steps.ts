import { Then } from "@badeball/cypress-cucumber-preprocessor"

// Import shared step definitions (Given steps are auto-loaded from shared-steps.ts)
// Import shared data
import { validDailyLog } from "../support/shared-steps"

Then("the training load should reflect planned sessions", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const trainingLoad = body.trainingLoad as Record<string, unknown>

    expect(trainingLoad).to.exist
    expect(trainingLoad.dailyLoad).to.be.a("number")
    expect(trainingLoad.dailyLoad).to.be.greaterThan(0)

    // With planned strength session of 60 min, we expect some load value
    // Strength load = 5 * (60/60) * (5/3) = 8.333 (with default RPE 5)
    expect(trainingLoad.dailyLoad).to.be.within(8, 9)
  })
})

Then("the ACR should be 1.0", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const trainingLoad = body.trainingLoad as Record<string, unknown>

    expect(trainingLoad).to.exist
    expect(trainingLoad.acr).to.equal(1)
  })
})

Then("the training load should reflect actual sessions", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const trainingLoad = body.trainingLoad as Record<string, unknown>

    expect(trainingLoad).to.exist
    expect(trainingLoad.dailyLoad).to.be.a("number")
    expect(trainingLoad.dailyLoad).to.be.greaterThan(0)

    // Actual sessions: strength 25min RPE 7 + walking 15min no RPE
    // This should be different from the planned 60min strength session
    // The exact value depends on the actual training data in dailylog.steps.ts
  })
})
