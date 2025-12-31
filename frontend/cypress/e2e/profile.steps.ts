import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor"

const apiBaseUrl = Cypress.env("apiBaseUrl") as string

const validProfile = {
  height_cm: 180,
  birthDate: "1990-01-01",
  sex: "male",
  goal: "maintain",
  targetWeightKg: 82,
  targetWeeklyChangeKg: 0,
}

const invalidProfile = {
  ...validProfile,
  height_cm: 90,
}

Given("the profile API is running", () => {
  cy.request(`${apiBaseUrl}/api/health`).its("status").should("eq", 200)
})

Given("the database is clean", () => {
  // Delete today's log first (it has a foreign key to profile)
  cy.request({
    method: "DELETE",
    url: `${apiBaseUrl}/api/logs/today`,
    failOnStatusCode: false,
  })
  // Delete profile
  cy.request({
    method: "DELETE",
    url: `${apiBaseUrl}/api/profile`,
    failOnStatusCode: false,
  })
})

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

Given("I have upserted a valid user profile", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: validProfile,
  }).its("status").should("eq", 200)
})

Then("the response status should be {int}", (status: number) => {
  cy.get("@lastResponse").its("status").should("eq", status)
})

Then("the profile response should include the submitted profile data", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response).body as Record<string, unknown>

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
    const body = (response as Cypress.Response).body as Record<string, any>

    expect(body.carbRatio).to.equal(0.45)
    expect(body.proteinRatio).to.equal(0.3)
    expect(body.fatRatio).to.equal(0.25)

    expect(body.mealRatios.breakfast).to.equal(0.3)
    expect(body.mealRatios.lunch).to.equal(0.3)
    expect(body.mealRatios.dinner).to.equal(0.4)

    expect(body.pointsConfig.carbMultiplier).to.equal(1.15)
    expect(body.pointsConfig.proteinMultiplier).to.equal(4.35)
    expect(body.pointsConfig.fatMultiplier).to.equal(3.5)

    expect(body.fruitTargetG).to.equal(600)
    expect(body.veggieTargetG).to.equal(500)
  })
})

Then("the error response should include {string}", (errorCode: string) => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response).body as Record<string, unknown>
    expect(body.error).to.equal(errorCode)
  })
})
