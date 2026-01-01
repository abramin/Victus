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

const today = new Date().toISOString().split("T")[0]

const validDailyLog = {
  date: today,
  weightKg: 82.5,
  sleepQuality: 80,
  plannedTrainingSessions: [
    {
      type: "strength",
      durationMin: 60,
    },
  ],
  dayType: "performance",
}

const invalidDailyLog = {
  ...validDailyLog,
  plannedTrainingSessions: [
    {
      type: "invalid_type",
      durationMin: 60,
    },
  ],
}

When("I create a valid daily log", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/logs`,
    body: validDailyLog,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I create a daily log with invalid training type", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/logs`,
    body: invalidDailyLog,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I fetch today's daily log", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/logs/today`,
    failOnStatusCode: false,
  }).as("lastResponse")
})

Given("I have created a valid daily log for today", () => {
  // First ensure we have a profile
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: validProfile,
  }).its("status").should("eq", 200)

  // Then create the daily log
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/logs`,
    body: validDailyLog,
    failOnStatusCode: false,
  }).then((response) => {
    // Accept both 201 (created) and 409 (already exists)
    expect([201, 409]).to.include(response.status)
  })
})

Then("the daily log response should include calculated targets", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>

    expect(body.calculatedTargets).to.exist
    const targets = body.calculatedTargets as Record<string, unknown>

    expect(targets.totalCarbsG).to.be.a("number")
    expect(targets.totalProteinG).to.be.a("number")
    expect(targets.totalFatsG).to.be.a("number")
    expect(targets.totalCalories).to.be.a("number")
    expect(targets.dayType).to.be.oneOf(["performance", "fatburner", "metabolize"])
    expect(targets.meals).to.exist
    expect(targets.fruitG).to.be.a("number")
    expect(targets.veggiesG).to.be.a("number")
    expect(targets.waterL).to.be.a("number")
  })
})

Then("the daily log response should include the submitted log data", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>

    expect(body.date).to.equal(validDailyLog.date)
    expect(body.weightKg).to.equal(validDailyLog.weightKg)
    expect(body.sleepQuality).to.equal(validDailyLog.sleepQuality)

    const sessions = body.plannedTrainingSessions as Array<Record<string, unknown>>
    expect(sessions).to.have.length(1)
    expect(sessions[0].type).to.equal(validDailyLog.plannedTrainingSessions[0].type)
    expect(sessions[0].durationMin).to.equal(validDailyLog.plannedTrainingSessions[0].durationMin)
  })
})

When("I delete today's daily log", () => {
  cy.request({
    method: "DELETE",
    url: `${apiBaseUrl}/api/logs/today`,
    failOnStatusCode: false,
  }).as("lastResponse")
})
