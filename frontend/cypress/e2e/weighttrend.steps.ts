import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor"

// Shared step definitions are auto-loaded from shared-steps.ts
import { formatDate, buildDailyLog } from "../support/shared-steps"

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
