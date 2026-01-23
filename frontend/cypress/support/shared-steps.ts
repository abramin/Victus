/**
 * Shared step definitions for Cypress/Cucumber tests.
 * Centralizes common setup steps to avoid duplication across feature files.
 */
import { Given, Then } from "@badeball/cypress-cucumber-preprocessor"

const apiBaseUrl = Cypress.env("apiBaseUrl") as string

// Shared test data
export const validProfile = {
  height_cm: 180,
  birthDate: "1990-01-01",
  sex: "male",
  goal: "maintain",
  targetWeightKg: 82,
  targetWeeklyChangeKg: 0,
}

export const profileWithSupplements = {
  ...validProfile,
  goal: "lose_weight",
  targetWeeklyChangeKg: -0.5,
  supplements: {
    maltodextrinG: 25,
    wheyG: 30,
    collagenG: 20,
  },
}

export const today = new Date().toISOString().split("T")[0]

export const validDailyLog = {
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

// Shared step definitions

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

Given("I have upserted a valid user profile", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: validProfile,
  }).its("status").should("eq", 200)
})

Given("I have upserted a profile with supplements configured", () => {
  // Delete existing log first to allow new log creation
  cy.request({
    method: "DELETE",
    url: `${apiBaseUrl}/api/logs/today`,
    failOnStatusCode: false,
  })
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: profileWithSupplements,
  }).its("status").should("eq", 200)
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

Then("the response status should be {int}", (status: number) => {
  cy.get("@lastResponse").its("status").should("eq", status)
})

Then("the error response should include {string}", (errorCode: string) => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.error).to.equal(errorCode)
  })
})

// Helper function for formatting dates
export const formatDate = (date: Date) => date.toISOString().split("T")[0]

// Helper for building daily logs
export const buildDailyLog = (date: string, weightKg: number) => ({
  date,
  weightKg,
  sleepQuality: 80,
  plannedTrainingSessions: [
    {
      type: "strength",
      durationMin: 60,
    },
  ],
  dayType: "performance",
})
