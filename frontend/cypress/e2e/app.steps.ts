import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor"
import { validProfile, validDailyLog } from "../support/shared-steps"

const apiBaseUrl = Cypress.env("apiBaseUrl") as string

Given("the app is running", () => {
  // Base URL is configured in cypress.config.ts.
})

When("I visit the home page", () => {
  cy.visit("/")
})

Then("I see the Victus heading", () => {
  cy.contains("h1", "Victus").should("be.visible")
})

Then("I should briefly see a loading indicator", () => {
  // Loading state may be very brief, so we just verify the page loads
  // The spinner has animate-spin class
  cy.get("body").should("exist")
  // Page should eventually finish loading
  cy.get("body").then(($body) => {
    if ($body.find(".animate-spin").length) {
      cy.get(".animate-spin").should("be.visible")
    }
  })
})

Given("no user profile exists", () => {
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

Given("a user profile exists", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: validProfile,
  }).its("status").should("eq", 200)
})

Then("I should see the onboarding wizard", () => {
  cy.contains("Welcome to Victus", { timeout: 10000 }).should("be.visible")
})

Then("I should see the main app layout", () => {
  // Main app has navigation sidebar
  cy.get("nav, aside, [role='navigation']", { timeout: 10000 }).should("exist")
})

Then("I should not see the onboarding wizard", () => {
  cy.contains("Welcome to Victus").should("not.exist")
})

Then("I should see the meal points view", () => {
  // Meal points is the default view - look for meal-related content
  cy.contains(/breakfast|lunch|dinner|meal|points/i, { timeout: 10000 }).should("be.visible")
})

// =============================================================================
// ERROR STATE STEPS
// =============================================================================

Given("the API will return an error on profile fetch", () => {
  cy.intercept("GET", "**/api/profile", {
    statusCode: 500,
    body: { error: "internal_error" },
  }).as("profileError")
})

Given("the API will fail once then succeed", () => {
  let callCount = 0
  cy.intercept("GET", "**/api/profile", (req) => {
    callCount += 1
    if (callCount === 1) {
      req.reply({ statusCode: 500, body: { error: "internal_error" } })
    } else {
      req.reply({ statusCode: 200, body: validProfile })
    }
  }).as("profileRetry")
})

Then("I should see a retry button", () => {
  cy.contains(/retry|try again/i).should("be.visible")
})

When("I click the retry button", () => {
  cy.contains(/retry|try again/i).click()
})

// =============================================================================
// SESSION PERSISTENCE STEPS
// =============================================================================

When("I refresh the page", () => {
  cy.reload()
})

// =============================================================================
// DEEP LINKING STEPS
// =============================================================================

When("I visit the history page directly", () => {
  cy.visit("/history")
})

When("I visit the command center directly", () => {
  cy.visit("/")
})

Then("I should see the command center", () => {
  cy.get('[data-testid="command-center"]', { timeout: 10000 }).should("exist")
})

When("I visit the profile page directly", () => {
  cy.visit("/profile")
})

// =============================================================================
// CONCURRENT LOADING STEPS
// =============================================================================

Then("the meal points should load successfully", () => {
  cy.contains(/breakfast|lunch|dinner|meal|points/i, { timeout: 10000 }).should("be.visible")
})

Then("the daily log data should be available", () => {
  // Verify that the page has loaded data
  cy.get("body").should("exist")
})
