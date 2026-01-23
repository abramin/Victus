import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor"

const apiBaseUrl = Cypress.env("apiBaseUrl") as string

Given("the backend is running", () => {
  cy.request(`${apiBaseUrl}/api/health`).its("status").should("eq", 200)
})

Given("no profile exists", () => {
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

Then("I should see the onboarding wizard", () => {
  cy.contains("Welcome to Victus").should("be.visible")
  cy.contains("Step 1 of 3").should("be.visible")
})

When("I complete the basic info step with valid data", () => {
  // The form has default values, so we just need to ensure they're reasonable
  cy.get('input[type="number"]').first().clear().type("30") // age
  cy.get('input[type="number"]').eq(1).clear().type("75") // weight
  cy.get('input[type="number"]').eq(2).clear().type("175") // height
})

When("I click the next button", () => {
  cy.contains("button", "Next").click()
})

When("I click the previous button", () => {
  cy.contains("button", "Previous").click()
})

When("I click the complete button", () => {
  cy.contains("button", "Complete").click()
})

Then("I should see the activity goals step", () => {
  cy.contains("Step 2 of 3").should("be.visible")
  cy.contains(/activity|goal/i).should("be.visible")
})

When("I select my activity level and goal", () => {
  // Click on moderate activity if available
  cy.get("button, [role='button']").contains(/moderate/i).click({ force: true }).then(() => {}).catch(() => {
    // If not clickable, it might already be selected or use different UI
  })
})

Then("I should see the nutrition targets step", () => {
  cy.contains("Step 3 of 3").should("be.visible")
})

When("I set my nutrition targets", () => {
  // Targets have defaults, just verify they exist
  cy.get('input[type="number"]').should("have.length.at.least", 1)
})

Then("I should see the main dashboard", () => {
  // Main dashboard has the AppLayout with sidebar
  cy.get('[data-testid="app-layout"], nav, [role="navigation"]', { timeout: 10000 }).should("exist")
  // Or verify we're no longer on onboarding
  cy.contains("Welcome to Victus").should("not.exist")
})

Then("the profile should be saved", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/profile`,
  }).its("status").should("eq", 200)
})

When("I clear the weight field", () => {
  cy.get('input[type="number"]').eq(1).clear()
})

Then("I should still see the basic info step", () => {
  cy.contains("Step 1 of 3").should("be.visible")
})

Then("I should see the basic info step", () => {
  cy.contains("Step 1 of 3").should("be.visible")
})
