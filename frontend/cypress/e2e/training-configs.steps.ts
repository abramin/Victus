import { When, Then } from "@badeball/cypress-cucumber-preprocessor"

const apiBaseUrl = Cypress.env("apiBaseUrl") as string

const expectedTrainingTypes = [
  "rest", "qigong", "walking", "gmb", "run", "row",
  "cycle", "hiit", "strength", "calisthenics", "mobility", "mixed"
]

When("I fetch the training configurations", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/training-configs`,
    failOnStatusCode: false,
  }).as("lastResponse")
})

Then("the training configs should include all training types", () => {
  cy.get("@lastResponse").then((response) => {
    const configs = (response as Cypress.Response<unknown>).body as Array<Record<string, unknown>>

    expect(configs).to.have.length(12)

    const types = configs.map(c => c.type)
    for (const expectedType of expectedTrainingTypes) {
      expect(types).to.include(expectedType)
    }
  })
})

Then("the training configs should include MET values and load scores", () => {
  cy.get("@lastResponse").then((response) => {
    const configs = (response as Cypress.Response<unknown>).body as Array<Record<string, unknown>>

    const configMap = new Map(configs.map(c => [c.type, c]))

    // Verify rest has MET 1.0 and load score 0
    const rest = configMap.get("rest") as Record<string, unknown>
    expect(rest.met).to.equal(1.0)
    expect(rest.loadScore).to.equal(0)

    // Verify HIIT has highest MET (12.8) and high load score (5)
    const hiit = configMap.get("hiit") as Record<string, unknown>
    expect(hiit.met).to.equal(12.8)
    expect(hiit.loadScore).to.equal(5)

    // Verify strength has MET 5.0 and load score 5
    const strength = configMap.get("strength") as Record<string, unknown>
    expect(strength.met).to.equal(5.0)
    expect(strength.loadScore).to.equal(5)
  })
})
