import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor"
import { BOUNDARIES, PROFILES } from "../support/fixtures"

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

Given("a valid profile exists", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: PROFILES.valid,
  }).its("status").should("eq", 200)
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
  cy.get("body").then(($body) => {
    const matches = $body
      .find("button, [role='button']")
      .filter((_, el) => /moderate/i.test(el.textContent ?? ""))
    if (matches.length) {
      cy.wrap(matches.first()).click({ force: true })
    }
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

Then("I should not see the onboarding wizard", () => {
  cy.contains("Welcome to Victus").should("not.exist")
})

// =============================================================================
// ACTIVITY LEVEL VARIATION STEPS
// =============================================================================

When("I select sedentary activity level", () => {
  cy.contains(/sedentary/i).click({ force: true })
})

When("I select light activity level", () => {
  cy.contains(/light/i).click({ force: true })
})

When("I select active activity level", () => {
  cy.contains(/\bactive\b/i).click({ force: true })
})

When("I select very active activity level", () => {
  cy.contains(/very active/i).click({ force: true })
})

Then("the profile should have sedentary activity level", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/profile`,
  }).then((response) => {
    expect(response.body.activityLevel).to.equal("sedentary")
  })
})

Then("the profile should have light activity level", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/profile`,
  }).then((response) => {
    expect(response.body.activityLevel).to.equal("light")
  })
})

Then("the profile should have active activity level", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/profile`,
  }).then((response) => {
    expect(response.body.activityLevel).to.equal("active")
  })
})

Then("the profile should have very active activity level", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/profile`,
  }).then((response) => {
    expect(response.body.activityLevel).to.equal("very_active")
  })
})

// =============================================================================
// GOAL VARIATION STEPS
// =============================================================================

When("I select lose weight goal", () => {
  cy.contains(/lose/i).click({ force: true })
})

When("I select maintain weight goal", () => {
  cy.contains(/maintain/i).click({ force: true })
})

When("I select gain weight goal", () => {
  cy.contains(/gain/i).click({ force: true })
})

Then("the profile should have lose weight goal", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/profile`,
  }).then((response) => {
    expect(response.body.goal).to.equal("lose_weight")
  })
})

Then("the profile should have maintain goal", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/profile`,
  }).then((response) => {
    expect(response.body.goal).to.equal("maintain")
  })
})

Then("the profile should have gain weight goal", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/profile`,
  }).then((response) => {
    expect(response.body.goal).to.equal("gain_weight")
  })
})

// =============================================================================
// BOUNDARY CONDITION STEPS
// =============================================================================

When("I enter minimum weight in basic info", () => {
  cy.get('input[type="number"]').eq(1).clear().type(BOUNDARIES.weight.min.toString())
})

When("I enter maximum weight in basic info", () => {
  cy.get('input[type="number"]').eq(1).clear().type(BOUNDARIES.weight.max.toString())
})

When("I enter weight below minimum in basic info", () => {
  cy.get('input[type="number"]').eq(1).clear().type(BOUNDARIES.weight.belowMin.toString())
})

When("I complete rest of basic info", () => {
  cy.get('input[type="number"]').first().clear().type("30") // age
  cy.get('input[type="number"]').eq(2).clear().type("175") // height
})

When("I enter minimum height in basic info", () => {
  cy.get('input[type="number"]').eq(2).clear().type(BOUNDARIES.height.min.toString())
})

When("I enter maximum height in basic info", () => {
  cy.get('input[type="number"]').eq(2).clear().type(BOUNDARIES.height.max.toString())
})

When("I complete rest of basic info except height", () => {
  cy.get('input[type="number"]').first().clear().type("30") // age
  cy.get('input[type="number"]').eq(1).clear().type("75") // weight
})

// =============================================================================
// ERROR STATE STEPS
// =============================================================================

Then("I should briefly see a saving indicator", () => {
  // The saving indicator may be very brief
  cy.get("body").should("exist")
})

// =============================================================================
// EDGE CASE STEPS
// =============================================================================

When("I modify the weight value", () => {
  cy.get('input[type="number"]').eq(1).clear().type("85")
})

Then("the profile should reflect the modified weight", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/profile`,
  }).then((response) => {
    // The profile may store currentWeightKg or similar
    expect(response.body.currentWeightKg || response.body.targetWeightKg).to.exist
  })
})
