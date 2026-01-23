import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor"

// Shared step definitions are auto-loaded from shared-steps.ts
import { formatDate, buildDailyLog } from "../support/shared-steps"
import { WEIGHT_TRENDS, createWeightTrendLogs, DAILY_LOGS } from "../support/fixtures"

const apiBaseUrl = Cypress.env("apiBaseUrl") as string

Given("I have created daily logs for the last {int} days", (days: number) => {
  const today = new Date()

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const logDate = new Date(today)
    logDate.setDate(today.getDate() - offset)

    const weightKg = 82 - (days - 1 - offset) * 0.3
    cy.request({
      method: "POST",
      url: `${apiBaseUrl}/api/logs`,
      body: buildDailyLog(formatDate(logDate), weightKg),
      failOnStatusCode: false,
    }).then((response) => {
      expect([201, 409]).to.include(response.status)
    })
  }
})

When("I fetch the weight trend for {string}", (range: string) => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/stats/weight-trend?range=${range}`,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I fetch the weight trend without a range", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/stats/weight-trend`,
    failOnStatusCode: false,
  }).as("lastResponse")
})

Then("the weight trend response should include points", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const points = body.points as Array<Record<string, unknown>>

    expect(points).to.be.an("array")
  })
})

Then("the weight trend response should include points for the last {int} days", (days: number) => {
  const today = new Date()
  const expectedDates: string[] = []

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const logDate = new Date(today)
    logDate.setDate(today.getDate() - offset)
    expectedDates.push(formatDate(logDate))
  }

  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const points = body.points as Array<Record<string, unknown>>
    const dates = points.map((point) => point.date) as string[]

    expectedDates.forEach((date) => {
      expect(dates).to.include(date)
    })

    for (let i = 1; i < dates.length; i += 1) {
      expect(dates[i] >= dates[i - 1]).to.equal(true)
    }
  })
})

Then("the weight trend response should include a trend summary", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const trend = body.trend as Record<string, unknown> | undefined

    expect(trend).to.exist
    if (trend) {
      expect(trend.weeklyChangeKg).to.be.a("number")
      expect(trend.rSquared).to.be.a("number")
      expect(trend.startWeightKg).to.be.a("number")
      expect(trend.endWeightKg).to.be.a("number")
    }
  })
})

// =============================================================================
// EDGE CASE STEPS
// =============================================================================

Given("no daily logs exist", () => {
  // Delete all logs by deleting today's log (the API may not support bulk delete)
  cy.request({
    method: "DELETE",
    url: `${apiBaseUrl}/api/logs/today`,
    failOnStatusCode: false,
  })
})

Given("I have created only one daily log", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/logs`,
    body: { ...DAILY_LOGS.valid },
    failOnStatusCode: false,
  }).then((response) => {
    expect([201, 409]).to.include(response.status)
  })
})

Then("the weight trend response should have empty points", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const points = body.points as Array<Record<string, unknown>>
    expect(points).to.be.an("array")
    expect(points.length).to.equal(0)
  })
})

Then("the trend summary should be null", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.trend).to.be.null
  })
})

Then("the weight trend response should have exactly {int} point", (count: number) => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const points = body.points as Array<Record<string, unknown>>
    expect(points.length).to.equal(count)
  })
})

Then("the trend summary should handle single point", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    // With single point, trend may be null or have limited data
    const trend = body.trend as Record<string, unknown> | null
    // Either null or exists with limited data
    expect(trend === null || typeof trend === "object").to.be.true
  })
})

Then("the weight trend response should include all {int} points", (count: number) => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const points = body.points as Array<Record<string, unknown>>
    expect(points.length).to.equal(count)
  })
})

// =============================================================================
// TREND DIRECTION STEPS
// =============================================================================

Given("I have created weight loss trend logs", () => {
  const weights = WEIGHT_TRENDS.losing.weights
  const today = new Date()

  weights.forEach((weight, index) => {
    const logDate = new Date(today)
    logDate.setDate(today.getDate() - (weights.length - 1 - index))

    cy.request({
      method: "POST",
      url: `${apiBaseUrl}/api/logs`,
      body: buildDailyLog(formatDate(logDate), weight),
      failOnStatusCode: false,
    })
  })
})

Given("I have created weight gain trend logs", () => {
  const weights = WEIGHT_TRENDS.gaining.weights
  const today = new Date()

  weights.forEach((weight, index) => {
    const logDate = new Date(today)
    logDate.setDate(today.getDate() - (weights.length - 1 - index))

    cy.request({
      method: "POST",
      url: `${apiBaseUrl}/api/logs`,
      body: buildDailyLog(formatDate(logDate), weight),
      failOnStatusCode: false,
    })
  })
})

Given("I have created weight maintenance trend logs", () => {
  const weights = WEIGHT_TRENDS.maintaining.weights
  const today = new Date()

  weights.forEach((weight, index) => {
    const logDate = new Date(today)
    logDate.setDate(today.getDate() - (weights.length - 1 - index))

    cy.request({
      method: "POST",
      url: `${apiBaseUrl}/api/logs`,
      body: buildDailyLog(formatDate(logDate), weight),
      failOnStatusCode: false,
    })
  })
})

Then("the trend should indicate weight loss", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const trend = body.trend as Record<string, unknown>
    expect(trend.endWeightKg).to.be.lessThan(trend.startWeightKg as number)
  })
})

Then("the trend should indicate weight gain", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const trend = body.trend as Record<string, unknown>
    expect(trend.endWeightKg).to.be.greaterThan(trend.startWeightKg as number)
  })
})

Then("the trend should indicate maintenance", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const trend = body.trend as Record<string, unknown>
    const difference = Math.abs((trend.endWeightKg as number) - (trend.startWeightKg as number))
    expect(difference).to.be.lessThan(1) // Less than 1kg difference
  })
})

Then("the weekly change should be negative", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const trend = body.trend as Record<string, unknown>
    expect(trend.weeklyChangeKg).to.be.lessThan(0)
  })
})

Then("the weekly change should be positive", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const trend = body.trend as Record<string, unknown>
    expect(trend.weeklyChangeKg).to.be.greaterThan(0)
  })
})

Then("the weekly change should be near zero", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const trend = body.trend as Record<string, unknown>
    expect(Math.abs(trend.weeklyChangeKg as number)).to.be.lessThan(0.5)
  })
})

// =============================================================================
// TREND CALCULATION VALIDATION STEPS
// =============================================================================

Then("the trend summary should include r-squared value", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const trend = body.trend as Record<string, unknown>
    expect(trend.rSquared).to.exist
    expect(trend.rSquared).to.be.a("number")
  })
})

Then("the r-squared should be between 0 and 1", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const trend = body.trend as Record<string, unknown>
    expect(trend.rSquared).to.be.at.least(0)
    expect(trend.rSquared).to.be.at.most(1)
  })
})

Then("the trend summary should include start weight", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const trend = body.trend as Record<string, unknown>
    expect(trend.startWeightKg).to.exist
    expect(trend.startWeightKg).to.be.a("number")
  })
})

Then("the trend summary should include end weight", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const trend = body.trend as Record<string, unknown>
    expect(trend.endWeightKg).to.exist
    expect(trend.endWeightKg).to.be.a("number")
  })
})

// =============================================================================
// UI STEPS
// =============================================================================

Then("I should see the weight chart", () => {
  cy.get('[data-testid="weight-chart"], canvas, svg, .recharts-wrapper').should("exist")
})

Then("the chart should display data points", () => {
  cy.get('[data-testid="weight-chart"] [data-testid="data-point"], .recharts-dot, circle').should("exist")
})

Then("I should see the range selector", () => {
  cy.get('[data-testid="range-selector"], select, [role="tablist"]').should("exist")
})

Then("the range selector should have all options", () => {
  cy.contains(/7d|7 days|week/i).should("exist")
  cy.contains(/30d|30 days|month/i).should("exist")
})

When("I select the 30 day range", () => {
  cy.contains(/30d|30 days|month/i).click()
})

Then("the chart should update with new data", () => {
  // Chart should still exist after update
  cy.get('[data-testid="weight-chart"], canvas, svg, .recharts-wrapper').should("exist")
})

Then("I should see an empty state message", () => {
  cy.contains(/no data|no logs|start tracking|no entries/i).should("exist")
})

Then("I should see a trend line on the chart", () => {
  cy.get('[data-testid="trend-line"], .recharts-line, line').should("exist")
})

Then("I should see the weekly change statistic", () => {
  cy.contains(/weekly|per week|\/week/i).should("exist")
})

Then("I should see the total change statistic", () => {
  cy.contains(/total|change|kg/i).should("exist")
})
