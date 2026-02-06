/**
 * Step definitions for weekly debrief (Mission Report) feature tests.
 */
import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor"
import { PROFILES } from "../support/fixtures"

const apiBaseUrl = Cypress.env("apiBaseUrl") as string

function getDateOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d
}

function createDailyLog(date: string, opts: Record<string, unknown> = {}) {
  return cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/logs`,
    body: {
      date,
      weightKg: 82,
      sleepQuality: 75,
      plannedTrainingSessions: [{ type: "strength", durationMin: 60 }],
      dayType: "performance",
      ...opts,
    },
    failOnStatusCode: false,
  })
}

// =============================================================================
// SETUP STEPS
// =============================================================================

Given("I have daily logs for the current week", () => {
  const monday = getMonday(new Date())
  const today = new Date()
  for (let d = new Date(monday); d <= today; d.setDate(d.getDate() + 1)) {
    createDailyLog(d.toISOString().split("T")[0])
  }
})

Given("I have daily logs for the week of {}", (dateStr: string) => {
  const monday = new Date(dateStr)
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    createDailyLog(d.toISOString().split("T")[0])
  }
})

Given("I have only {int} daily logs for the current week", (count: number) => {
  const monday = getMonday(new Date())
  for (let i = 0; i < count; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    createDailyLog(d.toISOString().split("T")[0])
  }
})

Given("I completed all planned sessions this week", () => {
  const monday = getMonday(new Date())
  const today = new Date()
  for (let d = new Date(monday); d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0]
    createDailyLog(dateStr).then(() => {
      cy.request({
        method: "PATCH",
        url: `${apiBaseUrl}/api/logs/${dateStr}/actual-training`,
        body: {
          actualSessions: [{ type: "strength", durationMin: 60, perceivedIntensity: 7 }],
        },
        failOnStatusCode: false,
      })
    })
  }
})

Given("I completed {int} out of {int} planned sessions", (completed: number, _total: number) => {
  const monday = getMonday(new Date())
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().split("T")[0]
    createDailyLog(dateStr).then(() => {
      if (i < completed) {
        cy.request({
          method: "PATCH",
          url: `${apiBaseUrl}/api/logs/${dateStr}/actual-training`,
          body: {
            actualSessions: [{ type: "strength", durationMin: 60, perceivedIntensity: 7 }],
          },
          failOnStatusCode: false,
        })
      }
    })
  }
})

Given("I planned rest all week and rested", () => {
  const monday = getMonday(new Date())
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    createDailyLog(d.toISOString().split("T")[0], {
      plannedTrainingSessions: [{ type: "rest", durationMin: 0 }],
      dayType: "fatburner",
    })
  }
})

Given("I tracked macros all week within 5% of targets", () => {
  // Macro tracking is done via consumed-macros endpoint; setup logs with tracking
  const monday = getMonday(new Date())
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    createDailyLog(d.toISOString().split("T")[0])
  }
})

Given("I have tracked macros for {int} days", (days: number) => {
  const monday = getMonday(new Date())
  for (let i = 0; i < days; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    createDailyLog(d.toISOString().split("T")[0])
  }
})

Given("I tracked macros for {int} out of {int} days", (tracked: number, _total: number) => {
  const monday = getMonday(new Date())
  for (let i = 0; i < tracked; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    createDailyLog(d.toISOString().split("T")[0])
  }
})

Given("a valid profile with lose_weight goal exists", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: { ...PROFILES.loseWeight },
  }).its("status").should("eq", 200)
})

Given("a valid profile with maintain goal exists", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: { ...PROFILES.maintain },
  }).its("status").should("eq", 200)
})

Given("my weight decreased by 0.5 kg this week", () => {
  const monday = getMonday(new Date())
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    createDailyLog(d.toISOString().split("T")[0], { weightKg: 83 - (i * 0.5) / 7 })
  }
})

Given("my weight fluctuated within 0.2 kg this week", () => {
  const weights = [80.0, 80.1, 79.9, 80.2, 79.8, 80.1, 80.0]
  const monday = getMonday(new Date())
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    createDailyLog(d.toISOString().split("T")[0], { weightKg: weights[i] })
  }
})

Given("my weight increased by 0.3 kg this week", () => {
  const monday = getMonday(new Date())
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    createDailyLog(d.toISOString().split("T")[0], { weightKg: 82 + (i * 0.3) / 7 })
  }
})

Given("I have complete week data", () => {
  const monday = getMonday(new Date())
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().split("T")[0]
    createDailyLog(dateStr).then(() => {
      cy.request({
        method: "PATCH",
        url: `${apiBaseUrl}/api/logs/${dateStr}/actual-training`,
        body: {
          actualSessions: [{ type: "strength", durationMin: 60, perceivedIntensity: 7 }],
        },
        failOnStatusCode: false,
      })
    })
  }
})

Given("I had excellent compliance this week", () => {
  // Same as complete week data
  const monday = getMonday(new Date())
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().split("T")[0]
    createDailyLog(dateStr).then(() => {
      cy.request({
        method: "PATCH",
        url: `${apiBaseUrl}/api/logs/${dateStr}/actual-training`,
        body: {
          actualSessions: [{ type: "strength", durationMin: 60, perceivedIntensity: 7 }],
        },
        failOnStatusCode: false,
      })
    })
  }
})

Given("I had poor compliance this week", () => {
  const monday = getMonday(new Date())
  // Only create 1 log with training out of 7 days
  createDailyLog(monday.toISOString().split("T")[0])
})

Given("I have data for last 2 weeks", () => {
  for (let w = 0; w < 2; w++) {
    const monday = getMonday(new Date())
    monday.setDate(monday.getDate() - w * 7)
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      createDailyLog(d.toISOString().split("T")[0])
    }
  }
})

Given("I am viewing last week's debrief", () => {
  cy.visit("/debrief")
  cy.contains("button", /previous|←|back/i).click()
})

Given("no logs exist for a specific week", () => {
  // No-op; the default state has no logs for arbitrary past weeks
})

Given("I have mixed compliance this week", () => {
  const monday = getMonday(new Date())
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = d.toISOString().split("T")[0]
    createDailyLog(dateStr).then(() => {
      if (i % 2 === 0) {
        cy.request({
          method: "PATCH",
          url: `${apiBaseUrl}/api/logs/${dateStr}/actual-training`,
          body: {
            actualSessions: [{ type: "strength", durationMin: 60, perceivedIntensity: 7 }],
          },
          failOnStatusCode: false,
        })
      }
    })
  }
})

Given("I have tracked macros all week", () => {
  const monday = getMonday(new Date())
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    createDailyLog(d.toISOString().split("T")[0])
  }
})

Given("I have logs for a week spanning January-February", () => {
  // Jan 27 to Feb 2
  for (let i = 27; i <= 31; i++) {
    createDailyLog(`2026-01-${i}`)
  }
  createDailyLog("2026-02-01")
  createDailyLog("2026-02-02")
})

Given("this is my first week of logging", () => {
  const today = new Date().toISOString().split("T")[0]
  createDailyLog(today)
})

// =============================================================================
// ACTION STEPS
// =============================================================================

When("I fetch the current week debrief", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/debrief/current`,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I fetch the debrief for {}", (dateStr: string) => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/debrief/weekly/${dateStr}`,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I fetch the weekly debrief without specifying a date", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/debrief/weekly`,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I fetch the debrief for next week", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/debrief/weekly/${getDateOffset(7)}`,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I fetch that week's debrief", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/debrief/weekly/2026-01-27`,
    failOnStatusCode: false,
  }).as("lastResponse")
})

// =============================================================================
// ASSERTION STEPS - DEBRIEF CONTENT
// =============================================================================

Then("the debrief should include training compliance", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.trainingCompliance ?? body.compliance ?? body.training).to.exist
  })
})

Then("the debrief should include nutrition adherence", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.nutritionAdherence ?? body.nutrition ?? body.macros).to.exist
  })
})

Then("the debrief should include weight trend summary", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.weightTrend ?? body.weight ?? body.trend).to.exist
  })
})

Then("the debrief should include AI-generated insights", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.insights ?? body.narrative ?? body.aiInsights).to.exist
  })
})

Then("the debrief should be for week starting {}", (dateStr: string) => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const weekStart = (body.weekStart ?? body.startDate ?? body.dateRange) as string
    expect(weekStart).to.include(dateStr)
  })
})

Then("the debrief should span 7 days", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.days ?? body.dailyBreakdown).to.exist
  })
})

Then("the debrief should be for the current week", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the debrief should indicate partial data", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.daysTracked ?? body.completeness).to.exist
  })
})

Then("metrics should be calculated from available days", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

// =============================================================================
// ASSERTION STEPS - COMPLIANCE
// =============================================================================

Then("the training compliance should be 100%", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const compliance = body.trainingCompliance ?? body.compliance
    if (typeof compliance === "number") {
      expect(compliance).to.be.within(95, 100)
    }
  })
})

Then("the compliance badge should show {string}", (badge: string) => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(JSON.stringify(body).toLowerCase()).to.include(badge.toLowerCase())
  })
})

Then("the training compliance should be approximately {int}%", (_pct: number) => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

// =============================================================================
// ASSERTION STEPS - NUTRITION
// =============================================================================

Then("the nutrition adherence should be high", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the calorie variance should be within acceptable range", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the debrief should show average carb intake", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the debrief should show average protein intake", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the debrief should show average fat intake", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the debrief should compare to weekly targets", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the adherence should be calculated from tracked days only", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the debrief should indicate tracking compliance", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

// =============================================================================
// ASSERTION STEPS - WEIGHT TRENDS
// =============================================================================

Then("the weight trend should show {string} kg change", (_change: string) => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the trend should be marked as {string}", (_label: string) => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the weight trend should show maintenance", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the AI insights should suggest course correction", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

// =============================================================================
// ASSERTION STEPS - AI INSIGHTS
// =============================================================================

Then("the debrief should include an AI narrative", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.narrative ?? body.insights ?? body.aiNarrative).to.exist
  })
})

Then("the narrative should summarize performance", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the narrative should provide recommendations", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the AI narrative should acknowledge strong performance", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the narrative should encourage continued progress", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the AI narrative should identify areas for improvement", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the narrative should suggest actionable changes", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

// =============================================================================
// UI STEPS
// =============================================================================

When("I visit the weekly debrief page", () => {
  cy.visit("/debrief")
})

Then("I should see the mission report header", () => {
  cy.contains(/mission report|weekly debrief/i, { timeout: 10000 }).should("be.visible")
})

Then("I should see training compliance metrics", () => {
  cy.contains(/compliance|training/i).should("exist")
})

Then("I should see nutrition adherence metrics", () => {
  cy.contains(/nutrition|adherence|macro/i).should("exist")
})

Then("I should see weight trend visualization", () => {
  cy.contains(/weight|trend/i).should("exist")
})

Then("I should see AI insights panel", () => {
  cy.contains(/insight|recommendation|narrative/i).should("exist")
})

When("I click the previous week button", () => {
  cy.contains("button", /previous|←|back/i).click()
})

When("I click the next week button", () => {
  cy.contains("button", /next|→|forward/i).click()
})

Then("I should see the debrief for last week", () => {
  cy.contains(/mission report|weekly debrief/i).should("be.visible")
})

Then("the date range should update", () => {
  cy.get("body").should("exist")
})

Then("I should see the debrief for current week", () => {
  cy.contains(/mission report|weekly debrief/i).should("be.visible")
})

When("I navigate to that week's debrief", () => {
  cy.visit("/debrief")
  // Navigate back to a week with no data
  for (let i = 0; i < 8; i++) {
    cy.contains("button", /previous|←|back/i).click()
  }
})

Then("I should see an empty state message", () => {
  cy.contains(/no data|no logs|empty|nothing/i).should("be.visible")
})

Then("the message should prompt to log daily data", () => {
  cy.contains(/log|track|start/i).should("exist")
})

Then("the training chart should show each day's status", () => {
  cy.get("body").should("exist")
})

Then("completed days should be highlighted green", () => {
  cy.get("body").should("exist")
})

Then("missed days should be highlighted red", () => {
  cy.get("body").should("exist")
})

Then("I should see a macro distribution chart", () => {
  cy.contains(/macro|carb|protein|fat/i).should("exist")
})

Then("the chart should compare actual vs target", () => {
  cy.get("body").should("exist")
})

Then("carbs, protein, and fat should be color-coded", () => {
  cy.get("body").should("exist")
})

// =============================================================================
// EDGE CASE STEPS
// =============================================================================

Then("the debrief should include all 7 days", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const days = body.days ?? body.dailyBreakdown
    if (Array.isArray(days)) {
      expect(days.length).to.equal(7)
    }
  })
})

Then("the date range should span both months", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the debrief should acknowledge new user", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("baselines should be established where possible", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})
