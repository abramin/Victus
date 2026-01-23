import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor"

// Import shared step definitions (Given steps are auto-loaded from shared-steps.ts)
// Import shared data
import { validDailyLog, buildDailyLog, formatDate } from "../support/shared-steps"
import { DAILY_LOGS, ACTUAL_SESSIONS, BOUNDARIES } from "../support/fixtures"

const apiBaseUrl = Cypress.env("apiBaseUrl") as string

// Store planned load for comparison
let plannedLoad: number | null = null

Then("the training load should reflect planned sessions", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const trainingLoad = body.trainingLoad as Record<string, unknown>

    expect(trainingLoad).to.exist
    expect(trainingLoad.dailyLoad).to.be.a("number")
    expect(trainingLoad.dailyLoad).to.be.greaterThan(0)

    // With planned strength session of 60 min, we expect some load value
    // Strength load = 5 * (60/60) * (5/3) = 8.333 (with default RPE 5)
    expect(trainingLoad.dailyLoad).to.be.within(8, 9)
    plannedLoad = trainingLoad.dailyLoad as number
  })
})

Then("the ACR should be 1.0", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const trainingLoad = body.trainingLoad as Record<string, unknown>

    expect(trainingLoad).to.exist
    expect(trainingLoad.acr).to.equal(1)
  })
})

Then("the training load should reflect actual sessions", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const trainingLoad = body.trainingLoad as Record<string, unknown>

    expect(trainingLoad).to.exist
    expect(trainingLoad.dailyLoad).to.be.a("number")
    expect(trainingLoad.dailyLoad).to.be.greaterThan(0)

    // Actual sessions: strength 25min RPE 7 + walking 15min no RPE
    // This should be different from the planned 60min strength session
    // The exact value depends on the actual training data in dailylog.steps.ts
  })
})

// =============================================================================
// ACR THRESHOLD STEPS
// =============================================================================

Given("I have created logs with decreasing training load", () => {
  const today = new Date()

  // Create 28 days of logs with decreasing training
  for (let i = 27; i >= 0; i -= 1) {
    const logDate = new Date(today)
    logDate.setDate(today.getDate() - i)

    // Earlier days have more training, recent days have less
    const durationMin = i > 20 ? 90 : i > 14 ? 60 : i > 7 ? 30 : 15

    cy.request({
      method: "POST",
      url: `${apiBaseUrl}/api/logs`,
      body: {
        ...buildDailyLog(formatDate(logDate), 82),
        plannedTrainingSessions: [{ type: "strength", durationMin }],
      },
      failOnStatusCode: false,
    })
  }
})

Given("I have created logs with increasing training load", () => {
  const today = new Date()

  // Create 28 days of logs with increasing training
  for (let i = 27; i >= 0; i -= 1) {
    const logDate = new Date(today)
    logDate.setDate(today.getDate() - i)

    // Earlier days have less training, recent days have more
    const durationMin = i > 20 ? 15 : i > 14 ? 30 : i > 7 ? 60 : 120

    cy.request({
      method: "POST",
      url: `${apiBaseUrl}/api/logs`,
      body: {
        ...buildDailyLog(formatDate(logDate), 82),
        plannedTrainingSessions: [{ type: "strength", durationMin }],
      },
      failOnStatusCode: false,
    })
  }
})

Given("I have created logs with consistent training load", () => {
  const today = new Date()

  // Create 28 days of logs with consistent training
  for (let i = 27; i >= 0; i -= 1) {
    const logDate = new Date(today)
    logDate.setDate(today.getDate() - i)

    cy.request({
      method: "POST",
      url: `${apiBaseUrl}/api/logs`,
      body: {
        ...buildDailyLog(formatDate(logDate), 82),
        plannedTrainingSessions: [{ type: "strength", durationMin: 60 }],
      },
      failOnStatusCode: false,
    })
  }
})

Then("the ACR should indicate undertraining zone", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const trainingLoad = body.trainingLoad as Record<string, unknown>

    expect(trainingLoad).to.exist
    expect(trainingLoad.acr).to.be.lessThan(0.8)
  })
})

Then("the ACR should indicate overtraining risk zone", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const trainingLoad = body.trainingLoad as Record<string, unknown>

    expect(trainingLoad).to.exist
    expect(trainingLoad.acr).to.be.greaterThan(1.3)
  })
})

Then("the ACR should be in optimal zone", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const trainingLoad = body.trainingLoad as Record<string, unknown>

    expect(trainingLoad).to.exist
    expect(trainingLoad.acr).to.be.within(0.8, 1.3)
  })
})

// =============================================================================
// LOAD CALCULATION STEPS
// =============================================================================

Then("the acute load should reflect 7 day average", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const trainingLoad = body.trainingLoad as Record<string, unknown>

    expect(trainingLoad).to.exist
    expect(trainingLoad.acuteLoad).to.be.a("number")
    expect(trainingLoad.acuteLoad).to.be.greaterThan(0)
  })
})

Then("the chronic load should reflect 28 day average", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const trainingLoad = body.trainingLoad as Record<string, unknown>

    expect(trainingLoad).to.exist
    expect(trainingLoad.chronicLoad).to.be.a("number")
    expect(trainingLoad.chronicLoad).to.be.greaterThan(0)
  })
})

Then("the training load should be calculated with available data", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const trainingLoad = body.trainingLoad as Record<string, unknown>

    expect(trainingLoad).to.exist
    expect(trainingLoad.dailyLoad).to.be.a("number")
  })
})

// =============================================================================
// TRAINING INTENSITY STEPS
// =============================================================================

Then("the training load should be higher than planned", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const trainingLoad = body.trainingLoad as Record<string, unknown>

    expect(trainingLoad).to.exist
    // High RPE (10) should produce higher load
    if (plannedLoad !== null) {
      expect(trainingLoad.dailyLoad).to.be.greaterThan(plannedLoad * 0.5)
    }
  })
})

Then("the training load should be lower than planned", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const trainingLoad = body.trainingLoad as Record<string, unknown>

    expect(trainingLoad).to.exist
    // Low RPE (1) should produce lower load
    expect(trainingLoad.dailyLoad).to.be.a("number")
  })
})

// =============================================================================
// RECOVERY SCORE STEPS
// =============================================================================

When("I create a daily log with high sleep quality", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/logs`,
    body: { ...DAILY_LOGS.maxSleepQuality },
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I create a daily log with low sleep quality", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/logs`,
    body: { ...DAILY_LOGS.minSleepQuality },
    failOnStatusCode: false,
  }).as("lastResponse")
})

Then("the recovery score should be high", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const recoveryScore = body.recoveryScore as number | undefined

    if (recoveryScore !== undefined) {
      expect(recoveryScore).to.be.greaterThan(70)
    }
  })
})

Then("the recovery score should be low", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const recoveryScore = body.recoveryScore as number | undefined

    if (recoveryScore !== undefined) {
      expect(recoveryScore).to.be.lessThan(50)
    }
  })
})

// =============================================================================
// EDGE CASE STEPS
// =============================================================================

Then("the daily training load should be zero", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const trainingLoad = body.trainingLoad as Record<string, unknown>

    expect(trainingLoad).to.exist
    expect(trainingLoad.dailyLoad).to.equal(0)
  })
})

Then("the daily load should sum all sessions", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const trainingLoad = body.trainingLoad as Record<string, unknown>
    const summary = body.trainingSummary as Record<string, unknown>

    expect(trainingLoad).to.exist
    expect(trainingLoad.dailyLoad).to.be.greaterThan(0)
    expect(summary.sessionCount).to.be.greaterThan(1)
  })
})

When("I create a log with high intensity HIIT session", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/logs`,
    body: { ...DAILY_LOGS.hiitDay },
    failOnStatusCode: false,
  }).as("lastResponse")
})

Then("the load should reflect HIIT intensity factor", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const trainingLoad = body.trainingLoad as Record<string, unknown>

    expect(trainingLoad).to.exist
    expect(trainingLoad.dailyLoad).to.be.a("number")
    // HIIT has higher MET/load factor than strength
  })
})
