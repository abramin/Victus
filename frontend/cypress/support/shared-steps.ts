/**
 * Shared step definitions for Cypress/Cucumber tests.
 * Centralizes common setup steps to avoid duplication across feature files.
 */
import { Given, Then, When } from "@badeball/cypress-cucumber-preprocessor"
import { PROFILES, DAILY_LOGS, BOUNDARIES, OPTIONS, ERROR_CODES } from "./fixtures"

const apiBaseUrl = Cypress.env("apiBaseUrl") as string

// =============================================================================
// RE-EXPORT FIXTURES FOR BACKWARDS COMPATIBILITY
// =============================================================================

export const validProfile = PROFILES.valid
export const profileWithSupplements = PROFILES.withSupplements
export const today = new Date().toISOString().split("T")[0]
export const validDailyLog = DAILY_LOGS.valid

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

// =============================================================================
// UI INTERACTION STEPS - Form Fields
// Use name attribute (semantic) as the primary selector.
// data-testid is reserved for elements without a stable name attribute.
// =============================================================================

When("I enter {string} in the {string} field", (value: string, field: string) => {
  cy.get(`input[name="${field}"]`)
    .first()
    .clear()
    .type(value)
})

When("I clear the {string} field", (field: string) => {
  cy.get(`input[name="${field}"]`)
    .first()
    .clear()
})

When("I select {string} for the {string} field", (value: string, field: string) => {
  cy.get(`select[name="${field}"]`)
    .first()
    .select(value)
})

When("I click the {string} button", (buttonText: string) => {
  cy.contains("button", new RegExp(buttonText, "i")).click()
})

When("I click the {string} option", (optionText: string) => {
  cy.contains(new RegExp(optionText, "i")).click()
})

When("I submit the form", () => {
  cy.get('button[type="submit"]').click()
})

// =============================================================================
// UI INTERACTION STEPS - Boundary Values
// Use name attribute for all form inputs.
// =============================================================================

When("I enter a weight below the minimum", () => {
  cy.get('input[name="weight"]').first().clear().type(BOUNDARIES.weight.belowMin.toString())
})

When("I enter a weight above the maximum", () => {
  cy.get('input[name="weight"]').first().clear().type(BOUNDARIES.weight.aboveMax.toString())
})

When("I enter a weight at the minimum boundary", () => {
  cy.get('input[name="weight"]').first().clear().type(BOUNDARIES.weight.min.toString())
})

When("I enter a weight at the maximum boundary", () => {
  cy.get('input[name="weight"]').first().clear().type(BOUNDARIES.weight.max.toString())
})

When("I enter a height below the minimum", () => {
  cy.get('input[name="height"]').first().clear().type(BOUNDARIES.height.belowMin.toString())
})

When("I enter a height above the maximum", () => {
  cy.get('input[name="height"]').first().clear().type(BOUNDARIES.height.aboveMax.toString())
})

When("I enter a body fat percentage below the minimum", () => {
  cy.get('input[name="bodyFatPercent"]').first().clear().type(BOUNDARIES.bodyFat.belowMin.toString())
})

When("I enter a body fat percentage above the maximum", () => {
  cy.get('input[name="bodyFatPercent"]').first().clear().type(BOUNDARIES.bodyFat.aboveMax.toString())
})

When("I enter a sleep quality at the minimum", () => {
  cy.get('input[name="sleepQuality"]').first().clear().type(BOUNDARIES.sleepQuality.min.toString())
})

When("I enter a sleep quality at the maximum", () => {
  cy.get('input[name="sleepQuality"]').first().clear().type(BOUNDARIES.sleepQuality.max.toString())
})

// =============================================================================
// UI STATE STEPS - Validation Errors
// Use ARIA roles and attributes as the primary query strategy.
// =============================================================================

Then("I should see a validation error for {string}", (field: string) => {
  cy.get(`[aria-describedby*="${field}"], input[name="${field}"]`)
    .first()
    .should("have.attr", "aria-invalid", "true")
})

Then("I should not see a validation error for {string}", (field: string) => {
  cy.get(`input[name="${field}"]`)
    .first()
    .should("not.have.attr", "aria-invalid", "true")
})

Then("I should see the error message {string}", (message: string) => {
  cy.contains(message).should("be.visible")
})

Then("the {string} field should show an error", (field: string) => {
  cy.get(`input[name="${field}"]`)
    .first()
    .should("have.attr", "aria-invalid", "true")
})

Then("the form should show validation errors", () => {
  cy.get('[role="alert"]').should("be.visible")
})

Then("the form should not show validation errors", () => {
  cy.get('[role="alert"]').should("not.exist")
})

// =============================================================================
// UI STATE STEPS - Loading & Saving
// Use role="status" for loading indicators (ARIA live region).
// =============================================================================

Then("I should see a loading spinner", () => {
  cy.get('[role="status"]').should("be.visible")
})

Then("the loading spinner should disappear", () => {
  cy.get('[role="status"]', { timeout: 10000 }).should("not.exist")
})

Then("I should see a saving indicator", () => {
  cy.contains(/saving|updating|loading/i).should("be.visible")
})

Then("the save button should be disabled", () => {
  cy.get('button[type="submit"]').should("be.disabled")
})

Then("the save button should be enabled", () => {
  cy.get('button[type="submit"]').should("not.be.disabled")
})

Then("the save button should show {string}", (text: string) => {
  cy.get('button[type="submit"]').should("contain.text", text)
})

// =============================================================================
// UI STATE STEPS - Success & Error Messages
// Use role="status" for success (live region), role="alert" for errors.
// =============================================================================

Then("I should see a success message", () => {
  cy.get('[role="status"]')
    .contains(/saved|success|updated|created/i)
    .should("be.visible")
})

Then("I should see a success message containing {string}", (text: string) => {
  cy.contains(text).should("be.visible")
})

Then("I should see an error message", () => {
  cy.get('[role="alert"]').should("be.visible")
})

Then("I should see an error message containing {string}", (text: string) => {
  cy.contains(text).should("be.visible")
})

Then("the success message should disappear", () => {
  cy.get('[role="status"]', { timeout: 6000 }).should("not.exist")
})

// =============================================================================
// UI STATE STEPS - Form State
// =============================================================================

Then("the form should be pre-populated with existing data", () => {
  cy.get('input[type="number"]').first().should("not.have.value", "0")
})

Then("the form should show default values", () => {
  cy.get('input[type="number"]').should("exist")
})

Then("the {string} field should have value {string}", (field: string, value: string) => {
  cy.get(`input[name="${field}"]`)
    .first()
    .should("have.value", value)
})

Then("the form should indicate unsaved changes", () => {
  cy.get('[data-testid="unsaved-indicator"], button').contains(/save|update/i).should("not.be.disabled")
})

Then("the form should not indicate unsaved changes", () => {
  cy.get('[data-testid="unsaved-indicator"]').should("not.exist")
})

// =============================================================================
// UI STATE STEPS - Conditional Fields
// =============================================================================

Then("the body fat field should be visible", () => {
  cy.get('input[name="bodyFatPercent"]').should("be.visible")
})

Then("the body fat field should not be visible", () => {
  cy.get('input[name="bodyFatPercent"]').should("not.exist")
})

Then("the manual TDEE field should be visible", () => {
  cy.get('input[name="manualTdee"]').should("be.visible")
})

Then("the manual TDEE field should not be visible", () => {
  cy.get('input[name="manualTdee"]').should("not.exist")
})

Then("I should see an aggressive goal warning", () => {
  cy.contains(/aggressive|unsustainable|muscle loss|excess fat/i).should("be.visible")
})

Then("I should not see an aggressive goal warning", () => {
  cy.contains(/aggressive|unsustainable|muscle loss|excess fat/i).should("not.exist")
})

// =============================================================================
// API MOCKING STEPS
// =============================================================================

Given("the API will return an error on profile save", () => {
  cy.intercept("PUT", "**/api/profile", {
    statusCode: 500,
    body: { error: "internal_error", message: "Server error" },
  }).as("profileError")
})

Given("the API will return an error on daily log save", () => {
  cy.intercept("POST", "**/api/logs", {
    statusCode: 500,
    body: { error: "internal_error", message: "Server error" },
  }).as("logError")
})

Given("the API will respond slowly", () => {
  cy.intercept("GET", "**/api/**", (req) => {
    req.on("response", (res) => {
      res.setDelay(2000)
    })
  }).as("slowResponse")
})

Given("the API will timeout", () => {
  cy.intercept("GET", "**/api/profile", {
    forceNetworkError: true,
  }).as("networkError")
})

Given("the weight trend API will return an empty response", () => {
  cy.intercept("GET", "**/api/stats/weight-trend*", {
    statusCode: 200,
    body: { points: [], trend: null },
  }).as("emptyTrend")
})

Given("the weight trend API will return a single point", () => {
  cy.intercept("GET", "**/api/stats/weight-trend*", {
    statusCode: 200,
    body: {
      points: [{ date: new Date().toISOString().split("T")[0], weightKg: 82.0 }],
      trend: null,
    },
  }).as("singlePointTrend")
})

// =============================================================================
// EXISTING SHARED STEPS (preserved for backwards compatibility)
// =============================================================================

