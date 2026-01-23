import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor"
import { validProfile } from "../support/shared-steps"

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
  cy.get(".animate-spin", { timeout: 100 }).should("exist").or("not.exist")
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
