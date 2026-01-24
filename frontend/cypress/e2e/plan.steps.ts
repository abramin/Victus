/**
 * Step definitions for nutrition plan feature tests.
 */
import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor"
import { PROFILES } from "../support/fixtures"

const apiBaseUrl = Cypress.env("apiBaseUrl") as string
const today = new Date().toISOString().split("T")[0]

// Store for plan ID across steps
let currentPlanId: number | null = null

// =============================================================================
// PLAN FIXTURES
// =============================================================================

const PLAN_FIXTURES = {
  safeWeightLoss: {
    startDate: today,
    startWeightKg: 85,
    goalWeightKg: 80,
    durationWeeks: 12, // ~0.42 kg/week - safe
  },
  safeWeightGain: {
    startDate: today,
    startWeightKg: 70,
    goalWeightKg: 75,
    durationWeeks: 16, // ~0.31 kg/week - safe
  },
  aggressiveWeightLoss: {
    startDate: today,
    startWeightKg: 90,
    goalWeightKg: 70,
    durationWeeks: 12, // ~1.67 kg/week - too aggressive
  },
  aggressiveWeightGain: {
    startDate: today,
    startWeightKg: 70,
    goalWeightKg: 85,
    durationWeeks: 12, // ~1.25 kg/week - too aggressive
  },
  minDuration: {
    startDate: today,
    startWeightKg: 82,
    goalWeightKg: 81,
    durationWeeks: 4,
  },
  maxDuration: {
    startDate: today,
    startWeightKg: 85,
    goalWeightKg: 75,
    durationWeeks: 104,
  },
  belowMinDuration: {
    startDate: today,
    startWeightKg: 82,
    goalWeightKg: 81,
    durationWeeks: 3,
  },
  aboveMaxDuration: {
    startDate: today,
    startWeightKg: 85,
    goalWeightKg: 75,
    durationWeeks: 105,
  },
  invalidStartDate: {
    startDate: "invalid-date",
    startWeightKg: 82,
    goalWeightKg: 80,
    durationWeeks: 8,
  },
}

// =============================================================================
// SETUP STEPS
// =============================================================================

Given("the plan API is running", () => {
  cy.request(`${apiBaseUrl}/api/health`).its("status").should("eq", 200)
})

Given("a valid profile exists", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: PROFILES.valid,
  }).its("status").should("eq", 200)
})

Given("no profile exists", () => {
  // Delete any existing plans first (they depend on profile)
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/plans`,
    failOnStatusCode: false,
  }).then((response) => {
    if (response.status === 200 && Array.isArray(response.body)) {
      response.body.forEach((plan: { id: number }) => {
        cy.request({
          method: "DELETE",
          url: `${apiBaseUrl}/api/plans/${plan.id}`,
          failOnStatusCode: false,
        })
      })
    }
  })
  // Delete logs that depend on profile
  cy.request({
    method: "DELETE",
    url: `${apiBaseUrl}/api/logs/today`,
    failOnStatusCode: false,
  })
  // Now delete profile
  cy.request({
    method: "DELETE",
    url: `${apiBaseUrl}/api/profile`,
    failOnStatusCode: false,
  })
})

Given("no active plan exists", () => {
  // Get active plan and delete it if exists
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/plans/active`,
    failOnStatusCode: false,
  }).then((response) => {
    if (response.status === 200 && response.body?.id) {
      cy.request({
        method: "DELETE",
        url: `${apiBaseUrl}/api/plans/${response.body.id}`,
        failOnStatusCode: false,
      })
    }
  })
  currentPlanId = null
})

Given("an active plan exists", () => {
  // First ensure no active plan
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/plans/active`,
    failOnStatusCode: false,
  }).then((response) => {
    if (response.status === 200 && response.body?.id) {
      currentPlanId = response.body.id
    } else {
      // Create a new plan
      cy.request({
        method: "POST",
        url: `${apiBaseUrl}/api/plans`,
        body: PLAN_FIXTURES.safeWeightLoss,
      }).then((createResponse) => {
        expect(createResponse.status).to.eq(201)
        currentPlanId = createResponse.body.id
      })
    }
  })
})

Given("an active plan exists starting today", () => {
  // First delete any existing active plan
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/plans/active`,
    failOnStatusCode: false,
  }).then((response) => {
    if (response.status === 200 && response.body?.id) {
      cy.request({
        method: "DELETE",
        url: `${apiBaseUrl}/api/plans/${response.body.id}`,
        failOnStatusCode: false,
      })
    }
  })
  // Create a new plan starting today
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/plans`,
    body: PLAN_FIXTURES.safeWeightLoss,
  }).then((createResponse) => {
    expect(createResponse.status).to.eq(201)
    currentPlanId = createResponse.body.id
  })
})

// =============================================================================
// ACTION STEPS - CREATE
// =============================================================================

When("I create a plan with safe weight loss parameters", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/plans`,
    body: PLAN_FIXTURES.safeWeightLoss,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I create a plan with safe weight gain parameters", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/plans`,
    body: PLAN_FIXTURES.safeWeightGain,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I create a plan with aggressive weight loss", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/plans`,
    body: PLAN_FIXTURES.aggressiveWeightLoss,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I create a plan with aggressive weight gain", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/plans`,
    body: PLAN_FIXTURES.aggressiveWeightGain,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I create a plan with {int} weeks duration", (weeks: number) => {
  const fixture = weeks === 4 ? PLAN_FIXTURES.minDuration :
                  weeks === 104 ? PLAN_FIXTURES.maxDuration :
                  weeks === 3 ? PLAN_FIXTURES.belowMinDuration :
                  PLAN_FIXTURES.aboveMaxDuration
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/plans`,
    body: fixture,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I create a plan with invalid start date", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/plans`,
    body: PLAN_FIXTURES.invalidStartDate,
    failOnStatusCode: false,
  }).as("lastResponse")
})

// =============================================================================
// ACTION STEPS - RETRIEVE
// =============================================================================

When("I fetch the active plan", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/plans/active`,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I fetch the plan by its ID", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/plans/${currentPlanId}`,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I fetch a plan with ID {int}", (id: number) => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/plans/${id}`,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I list all plans", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/plans`,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I fetch the current week target", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/plans/current-week`,
    failOnStatusCode: false,
  }).as("lastResponse")
})

// =============================================================================
// ACTION STEPS - LIFECYCLE
// =============================================================================

When("I complete the plan", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/plans/${currentPlanId}/complete`,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I abandon the plan", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/plans/${currentPlanId}/abandon`,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I delete the plan", () => {
  cy.request({
    method: "DELETE",
    url: `${apiBaseUrl}/api/plans/${currentPlanId}`,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I complete a plan with ID {int}", (id: number) => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/plans/${id}/complete`,
    failOnStatusCode: false,
  }).as("lastResponse")
})

// =============================================================================
// ASSERTION STEPS
// =============================================================================

Then("the plan response should include weekly targets", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.weeklyTargets).to.be.an("array")
    expect((body.weeklyTargets as unknown[]).length).to.be.greaterThan(0)
  })
})

Then("the plan status should be active", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.status).to.equal("active")
  })
})

Then("the required weekly change should be positive", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.requiredWeeklyChangeKg).to.be.greaterThan(0)
  })
})

Then("the plan response should include the plan ID", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.id).to.equal(currentPlanId)
  })
})

Then("the response should be a list of plans", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body
    expect(body).to.be.an("array")
  })
})

Then("the plan should no longer be active", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/plans/active`,
    failOnStatusCode: false,
  }).its("status").should("eq", 404)
})

Then("the plan should not exist", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/plans/${currentPlanId}`,
    failOnStatusCode: false,
  }).its("status").should("eq", 404)
})

Then("the response should include week number {int}", (weekNum: number) => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.weekNumber).to.equal(weekNum)
  })
})

Then("the plan duration should be {int} weeks", (weeks: number) => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.durationWeeks).to.equal(weeks)
  })
})
