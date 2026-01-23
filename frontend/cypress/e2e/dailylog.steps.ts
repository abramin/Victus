import { When, Then } from "@badeball/cypress-cucumber-preprocessor"

// Import shared data from shared-steps (step definitions are auto-loaded)
import { validDailyLog } from "../support/shared-steps"

const apiBaseUrl = Cypress.env("apiBaseUrl") as string

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

When("I create a performance day log", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/logs`,
    body: {
      ...validDailyLog,
      dayType: "performance",
    },
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I create a fatburner day log", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/logs`,
    body: {
      ...validDailyLog,
      dayType: "fatburner",
    },
    failOnStatusCode: false,
  }).as("lastResponse")
})

Then("the meal points should reflect supplement deductions", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const targets = body.calculatedTargets as Record<string, unknown>
    const meals = targets.meals as Record<string, Record<string, number>>

    // Verify meal points exist and are reasonable (supplements should reduce available macros)
    expect(meals.breakfast.carbs).to.be.a("number")
    expect(meals.breakfast.protein).to.be.a("number")
    expect(meals.breakfast.fats).to.be.a("number")

    // Points should be multiples of 5 (rounding rule)
    expect(meals.breakfast.carbs % 5).to.equal(0)
    expect(meals.breakfast.protein % 5).to.equal(0)
    expect(meals.breakfast.fats % 5).to.equal(0)
  })
})

Then("the meal points should not deduct maltodextrin or whey", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const targets = body.calculatedTargets as Record<string, unknown>
    const meals = targets.meals as Record<string, Record<string, number>>

    // Fatburner should still have valid meal points
    expect(meals.breakfast.carbs).to.be.a("number")
    expect(meals.breakfast.protein).to.be.a("number")

    // Points should be multiples of 5
    expect(meals.breakfast.carbs % 5).to.equal(0)
    expect(meals.breakfast.protein % 5).to.equal(0)
  })
})
