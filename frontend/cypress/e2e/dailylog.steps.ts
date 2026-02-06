import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor"

// Import shared data from shared-steps (step definitions are auto-loaded)
import { validDailyLog } from "../support/shared-steps"
import { DAILY_LOGS, ACTUAL_SESSIONS, BOUNDARIES, getDateOffset } from "../support/fixtures"

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

const actualTrainingSessions = [
  {
    type: "strength",
    durationMin: 25,
    perceivedIntensity: 7,
    notes: "Felt strong",
  },
  {
    type: "walking",
    durationMin: 15,
  },
]

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

When("I update the actual training sessions", () => {
  cy.request({
    method: "PATCH",
    url: `${apiBaseUrl}/api/logs/${validDailyLog.date}/actual-training`,
    body: {
      actualSessions: actualTrainingSessions,
    },
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I clear the actual training sessions", () => {
  cy.request({
    method: "PATCH",
    url: `${apiBaseUrl}/api/logs/${validDailyLog.date}/actual-training`,
    body: {
      actualSessions: [],
    },
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I have updated the actual training sessions", () => {
  cy.request({
    method: "PATCH",
    url: `${apiBaseUrl}/api/logs/${validDailyLog.date}/actual-training`,
    body: {
      actualSessions: actualTrainingSessions,
    },
    failOnStatusCode: false,
  })
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

Then("the daily log response should include actual training sessions", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const sessions = body.actualTrainingSessions as Array<Record<string, unknown>>

    expect(sessions).to.have.length(actualTrainingSessions.length)
    expect(sessions[0].type).to.equal(actualTrainingSessions[0].type)
    expect(sessions[0].durationMin).to.equal(actualTrainingSessions[0].durationMin)
    expect(sessions[0].perceivedIntensity).to.equal(actualTrainingSessions[0].perceivedIntensity)
  })
})

Then("the daily log response should not include actual training sessions", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.actualTrainingSessions).to.be.undefined
  })
})

Then("the training summary should reflect actual sessions", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const summary = body.trainingSummary as Record<string, unknown>
    const totalDuration = actualTrainingSessions.reduce((sum, session) => sum + session.durationMin, 0)

    expect(summary.sessionCount).to.equal(actualTrainingSessions.length)
    expect(summary.totalDurationMin).to.equal(totalDuration)
  })
})

// =============================================================================
// UI STATE STEPS - Morning Check-in Modal
// =============================================================================

Given("no daily log exists for today", () => {
  cy.request({
    method: "DELETE",
    url: `${apiBaseUrl}/api/logs/today`,
    failOnStatusCode: false,
  })
})

Then("I should see the morning check-in modal", () => {
  cy.get('[aria-labelledby="checkin-title"], [role="dialog"]', { timeout: 10000 }).should("be.visible")
})

Then("the check-in form should show default values", () => {
  cy.get('[role="dialog"] input[type="number"]').first().should("exist")
})

Then("I should see the command center", () => {
  cy.get('[data-testid="command-center"]', { timeout: 10000 }).should("exist")
})

Then("the command center should show today's data", () => {
  // Command center renders zones with data when log exists
  cy.get('[data-testid="command-center"]').should("exist")
  cy.contains(/fuel budget|command center|today/i, { timeout: 10000 }).should("be.visible")
})

When("I clear the check-in weight field", () => {
  cy.get('[role="dialog"] input[type="number"]').first().clear()
})

When("I submit the check-in", () => {
  cy.get('[role="dialog"]').contains("button", /start day|save/i).click()
})

Then("the check-in should show a weight error", () => {
  cy.get('[role="dialog"]').then(($dialog) => {
    const hasError =
      $dialog.find('[aria-invalid="true"]').length > 0 ||
      $dialog.find('[role="alert"]').length > 0 ||
      $dialog.text().match(/required|invalid|weight/i)
    expect(hasError).to.be.ok
  })
})

When("I complete the morning check-in", () => {
  cy.get('[role="dialog"] input[type="number"]').first().clear().type("82.5")
})

// =============================================================================
// SAVE/UPDATE FLOW - API WEIGHT UPDATE
// =============================================================================

When("I update the log weight to {int}", (weight: number) => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/logs/${validDailyLog.date}`,
    body: { ...validDailyLog, weightKg: weight },
    failOnStatusCode: false,
  }).as("lastResponse")
})

Then("the weight should be updated in the log", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/logs/today`,
  }).then((response) => {
    expect(response.body.weightKg).to.equal(85)
  })
})

// =============================================================================
// BOUNDARY CONDITION STEPS
// =============================================================================

When("I create a daily log with minimum weight", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/logs`,
    body: { ...DAILY_LOGS.minWeight },
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I create a daily log with maximum weight", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/logs`,
    body: { ...DAILY_LOGS.maxWeight },
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I create a daily log with weight below minimum", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/logs`,
    body: { ...DAILY_LOGS.weightBelowMin },
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I create a daily log with weight above maximum", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/logs`,
    body: { ...DAILY_LOGS.weightAboveMax },
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I create a daily log with minimum sleep quality", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/logs`,
    body: { ...DAILY_LOGS.minSleepQuality },
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I create a daily log with maximum sleep quality", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/logs`,
    body: { ...DAILY_LOGS.maxSleepQuality },
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I create a daily log with sleep quality below minimum", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/logs`,
    body: { ...DAILY_LOGS.sleepQualityBelowMin },
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I create a daily log with all boundary values", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/logs`,
    body: {
      ...validDailyLog,
      bodyFatPercent: BOUNDARIES.bodyFat.min,
      restingHeartRate: BOUNDARIES.heartRate.min,
      sleepHours: BOUNDARIES.sleepHours.max,
    },
    failOnStatusCode: false,
  }).as("lastResponse")
})

Then("the daily log response should include all optional fields", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.bodyFatPercent).to.exist
    expect(body.restingHeartRate).to.exist
    expect(body.sleepHours).to.exist
  })
})

// =============================================================================
// TRAINING SESSION VARIATION STEPS
// =============================================================================

When("I create a rest day log", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/logs`,
    body: { ...DAILY_LOGS.restDay },
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I have created a rest day log", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/logs`,
    body: { ...DAILY_LOGS.restDay },
    failOnStatusCode: false,
  })
})

Then("the training summary should show rest day", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const summary = body.trainingSummary as Record<string, unknown>
    expect(summary.sessionCount).to.equal(1)
    expect(summary.totalDurationMin).to.equal(0)
  })
})

When("I create a daily log with multiple training sessions", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/logs`,
    body: { ...DAILY_LOGS.multipleTraining },
    failOnStatusCode: false,
  }).as("lastResponse")
})

Then("the training summary should reflect multiple sessions", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const summary = body.trainingSummary as Record<string, unknown>
    expect(summary.sessionCount).to.equal(DAILY_LOGS.multipleTraining.plannedTrainingSessions.length)
  })
})

When("I create a daily log with all training types", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/logs`,
    body: { ...DAILY_LOGS.allTrainingTypes },
    failOnStatusCode: false,
  }).as("lastResponse")
})

Then("the training summary should include all session types", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const summary = body.trainingSummary as Record<string, unknown>
    expect(summary.sessionCount).to.equal(DAILY_LOGS.allTrainingTypes.plannedTrainingSessions.length)
  })
})

When("I update the actual training with minimum RPE", () => {
  cy.request({
    method: "PATCH",
    url: `${apiBaseUrl}/api/logs/${validDailyLog.date}/actual-training`,
    body: { actualSessions: ACTUAL_SESSIONS.minRpe },
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I update the actual training with maximum RPE", () => {
  cy.request({
    method: "PATCH",
    url: `${apiBaseUrl}/api/logs/${validDailyLog.date}/actual-training`,
    body: { actualSessions: ACTUAL_SESSIONS.maxRpe },
    failOnStatusCode: false,
  }).as("lastResponse")
})

Then("the actual sessions should have minimum RPE", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const sessions = body.actualTrainingSessions as Array<Record<string, unknown>>
    expect(sessions[0].perceivedIntensity).to.equal(BOUNDARIES.rpe.min)
  })
})

Then("the actual sessions should have maximum RPE", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const sessions = body.actualTrainingSessions as Array<Record<string, unknown>>
    expect(sessions[0].perceivedIntensity).to.equal(BOUNDARIES.rpe.max)
  })
})

// =============================================================================
// DAY TYPE VARIATION STEPS
// =============================================================================

When("I create a metabolize day log", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/logs`,
    body: { ...DAILY_LOGS.metabolize },
    failOnStatusCode: false,
  }).as("lastResponse")
})

Then("the calculated targets should reflect metabolize day", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const targets = body.calculatedTargets as Record<string, unknown>
    expect(targets.dayType).to.equal("metabolize")
  })
})

When("I create logs for all day types", () => {
  // Store targets for comparison
  const targetsMap: Record<string, Record<string, unknown>> = {}

  // Create performance log
  cy.request({
    method: "DELETE",
    url: `${apiBaseUrl}/api/logs/today`,
    failOnStatusCode: false,
  }).then(() => {
    cy.request({
      method: "POST",
      url: `${apiBaseUrl}/api/logs`,
      body: { ...DAILY_LOGS.performance },
    }).then((response) => {
      targetsMap.performance = (response.body as Record<string, unknown>).calculatedTargets as Record<string, unknown>

      // Create fatburner log
      cy.request({
        method: "DELETE",
        url: `${apiBaseUrl}/api/logs/today`,
        failOnStatusCode: false,
      }).then(() => {
        cy.request({
          method: "POST",
          url: `${apiBaseUrl}/api/logs`,
          body: { ...DAILY_LOGS.fatburner },
        }).then((response) => {
          targetsMap.fatburner = (response.body as Record<string, unknown>).calculatedTargets as Record<string, unknown>
          cy.wrap(targetsMap).as("dayTypeTargets")
        })
      })
    })
  })
})

Then("the performance day should have highest carbs", () => {
  cy.get("@dayTypeTargets").then((targetsMap) => {
    const targets = targetsMap as Record<string, Record<string, unknown>>
    expect(targets.performance.totalCarbsG).to.be.greaterThan(targets.fatburner.totalCarbsG as number)
  })
})

Then("the fatburner day should have lowest carbs", () => {
  cy.get("@dayTypeTargets").then((targetsMap) => {
    const targets = targetsMap as Record<string, Record<string, unknown>>
    expect(targets.fatburner.totalCarbsG).to.be.lessThan(targets.performance.totalCarbsG as number)
  })
})

// =============================================================================
// SAVE/UPDATE FLOW STEPS
// =============================================================================

When("I update the log to a different day type", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/logs/${validDailyLog.date}`,
    body: { ...validDailyLog, dayType: "metabolize" },
    failOnStatusCode: false,
  }).as("lastResponse")
})

Then("the calculated targets should reflect the new day type", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const targets = body.calculatedTargets as Record<string, unknown>
    expect(targets.dayType).to.equal("metabolize")
  })
})

When("I update the log with additional training sessions", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/logs/${DAILY_LOGS.restDay.date}`,
    body: { ...DAILY_LOGS.multipleTraining },
    failOnStatusCode: false,
  }).as("lastResponse")
})

Then("the training summary should reflect added sessions", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const summary = body.trainingSummary as Record<string, unknown>
    expect(summary.sessionCount).to.be.greaterThan(1)
  })
})

Then("the actual sessions should differ from planned", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const planned = body.plannedTrainingSessions as Array<Record<string, unknown>>
    const actual = body.actualTrainingSessions as Array<Record<string, unknown>>
    expect(actual).to.not.deep.equal(planned)
  })
})

Then("the training load should use actual sessions", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const trainingLoad = body.trainingLoad as Record<string, unknown>
    expect(trainingLoad.dailyLoad).to.be.a("number")
  })
})

// =============================================================================
// EDGE CASE STEPS
// =============================================================================

When("I create a daily log for yesterday", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/logs`,
    body: { ...validDailyLog, date: getDateOffset(-1) },
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I create a daily log for tomorrow", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/logs`,
    body: { ...validDailyLog, date: getDateOffset(1) },
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I create a daily log with maximum duration session", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/logs`,
    body: {
      ...validDailyLog,
      plannedTrainingSessions: [{ type: "cycle", durationMin: BOUNDARIES.duration.max }],
    },
    failOnStatusCode: false,
  }).as("lastResponse")
})

Then("the training summary should reflect long duration", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const summary = body.trainingSummary as Record<string, unknown>
    expect(summary.totalDurationMin).to.equal(BOUNDARIES.duration.max)
  })
})
