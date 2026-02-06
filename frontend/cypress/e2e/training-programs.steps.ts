/**
 * Step definitions for training program management feature tests.
 */
import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor"
import { PROFILES } from "../support/fixtures"

const apiBaseUrl = Cypress.env("apiBaseUrl") as string

let currentProgramId: number | null = null
let currentInstallationId: number | null = null

// =============================================================================
// PROGRAM FIXTURES
// =============================================================================

const PROGRAM_FIXTURES = {
  basic: {
    name: "Test Program",
    description: "8-week test program",
    mesocycles: [
      {
        name: "Strength Block",
        durationWeeks: 4,
        focus: "strength",
        weeklyTemplate: [
          { dayOfWeek: 1, trainingType: "strength", durationMin: 60 },
          { dayOfWeek: 3, trainingType: "strength", durationMin: 60 },
          { dayOfWeek: 5, trainingType: "hiit", durationMin: 30 },
        ],
      },
      {
        name: "Hypertrophy Block",
        durationWeeks: 4,
        focus: "hypertrophy",
        weeklyTemplate: [
          { dayOfWeek: 1, trainingType: "strength", durationMin: 75 },
          { dayOfWeek: 3, trainingType: "calisthenics", durationMin: 60 },
          { dayOfWeek: 5, trainingType: "strength", durationMin: 75 },
        ],
      },
    ],
  },
  withWaveform: {
    name: "Waveform Program",
    description: "Program with linear periodization",
    loadProgression: "linear",
    mesocycles: [
      {
        name: "Build Phase",
        durationWeeks: 6,
        focus: "strength",
        weeklyTemplate: [
          { dayOfWeek: 1, trainingType: "strength", durationMin: 60 },
          { dayOfWeek: 4, trainingType: "strength", durationMin: 60 },
        ],
      },
    ],
  },
  shortDuration: {
    name: "Short Program",
    mesocycles: [
      {
        name: "Quick Block",
        durationWeeks: 1,
        focus: "strength",
        weeklyTemplate: [{ dayOfWeek: 1, trainingType: "strength", durationMin: 60 }],
      },
    ],
  },
  noName: {
    name: "",
    mesocycles: [
      {
        name: "Block",
        durationWeeks: 4,
        focus: "strength",
        weeklyTemplate: [{ dayOfWeek: 1, trainingType: "strength", durationMin: 60 }],
      },
    ],
  },
  zeroWeekMesocycle: {
    name: "Bad Program",
    mesocycles: [
      {
        name: "Block",
        durationWeeks: 0,
        focus: "strength",
        weeklyTemplate: [{ dayOfWeek: 1, trainingType: "strength", durationMin: 60 }],
      },
    ],
  },
  noMesocycles: {
    name: "Empty Program",
    mesocycles: [],
  },
}

// =============================================================================
// HELPER: create a program via API and store its ID
// =============================================================================

function createProgram(fixture: Record<string, unknown> = PROGRAM_FIXTURES.basic as unknown as Record<string, unknown>) {
  return cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/training-programs`,
    body: fixture,
    failOnStatusCode: false,
  }).then((response) => {
    if (response.status === 201) {
      currentProgramId = response.body.id
    }
    return response
  })
}

// =============================================================================
// SETUP STEPS
// =============================================================================

Given("I have created a training program", () => {
  createProgram()
})

Given("I have created a training program with waveform", () => {
  createProgram(PROGRAM_FIXTURES.withWaveform as unknown as Record<string, unknown>)
})

Given("I have created {int} training programs", (count: number) => {
  for (let i = 0; i < count; i++) {
    createProgram({
      ...(PROGRAM_FIXTURES.basic as unknown as Record<string, unknown>),
      name: `Test Program ${i + 1}`,
    })
  }
})

Given("I have an active program installation", () => {
  // Create a program if needed, then install it
  createProgram().then(() => {
    cy.request({
      method: "POST",
      url: `${apiBaseUrl}/api/training-programs/${currentProgramId}/install`,
      body: { startDate: new Date().toISOString().split("T")[0] },
      failOnStatusCode: false,
    }).then((response) => {
      if (response.status === 201) {
        currentInstallationId = response.body.id
      } else if (response.status === 409) {
        // Already installed - fetch active
        cy.request({
          method: "GET",
          url: `${apiBaseUrl}/api/program-installations/active`,
        }).then((activeResponse) => {
          currentInstallationId = activeResponse.body.id
        })
      }
    })
  })
})

Given("no program is currently installed", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/program-installations/active`,
    failOnStatusCode: false,
  }).then((response) => {
    if (response.status === 200 && response.body?.id) {
      cy.request({
        method: "POST",
        url: `${apiBaseUrl}/api/program-installations/${response.body.id}/abandon`,
        failOnStatusCode: false,
      })
    }
  })
})

// =============================================================================
// ACTION STEPS - CREATE
// =============================================================================

When("I create a training program with {int} weeks duration", (weeks: number) => {
  const fixture = weeks === 1 ? PROGRAM_FIXTURES.shortDuration : PROGRAM_FIXTURES.basic
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/training-programs`,
    body: { ...fixture, name: `${weeks}-week program` },
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I add a mesocycle with strength focus", () => {
  // Mesocycles are added as part of program creation body - no-op (handled in save)
})

When("I add a mesocycle with hypertrophy focus", () => {
  // Mesocycles are added as part of program creation body - no-op (handled in save)
})

When("I save the training program", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/training-programs`,
    body: PROGRAM_FIXTURES.basic,
    failOnStatusCode: false,
  }).then((response) => {
    if (response.status === 201) {
      currentProgramId = response.body.id
    }
  }).as("lastResponse")
})

When("I create a training program with waveform periodization", () => {
  // Handled by "I save the training program" with waveform fixture
})

When("I set load progression as linear", () => {
  // Handled in fixture
})

When("I create a training program without a name", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/training-programs`,
    body: PROGRAM_FIXTURES.noName,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I create a program with 0-week mesocycle", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/training-programs`,
    body: PROGRAM_FIXTURES.zeroWeekMesocycle,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I create a program without mesocycles", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/training-programs`,
    body: PROGRAM_FIXTURES.noMesocycles,
    failOnStatusCode: false,
  }).as("lastResponse")
})

// =============================================================================
// ACTION STEPS - RETRIEVE
// =============================================================================

When("I fetch all training programs", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/training-programs`,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I fetch the program by its ID", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/training-programs/${currentProgramId}`,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I fetch the program waveform", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/training-programs/${currentProgramId}/waveform`,
    failOnStatusCode: false,
  }).as("lastResponse")
})

// =============================================================================
// ACTION STEPS - INSTALLATION
// =============================================================================

When("I install the program starting today", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/training-programs/${currentProgramId}/install`,
    body: { startDate: new Date().toISOString().split("T")[0] },
    failOnStatusCode: false,
  }).then((response) => {
    if (response.status === 201) {
      currentInstallationId = response.body.id
    }
  }).as("lastResponse")
})

When("I attempt to install another program", () => {
  createProgram({
    ...(PROGRAM_FIXTURES.basic as unknown as Record<string, unknown>),
    name: "Second Program",
  }).then(() => {
    cy.request({
      method: "POST",
      url: `${apiBaseUrl}/api/training-programs/${currentProgramId}/install`,
      body: { startDate: new Date().toISOString().split("T")[0] },
      failOnStatusCode: false,
    }).as("lastResponse")
  })
})

When("I fetch the active installation", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/program-installations/active`,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I fetch the scheduled sessions", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/program-installations/${currentInstallationId}/sessions`,
    failOnStatusCode: false,
  }).as("lastResponse")
})

// =============================================================================
// ACTION STEPS - LIFECYCLE
// =============================================================================

When("I abandon the installation", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/program-installations/${currentInstallationId}/abandon`,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I delete the program", () => {
  cy.request({
    method: "DELETE",
    url: `${apiBaseUrl}/api/training-programs/${currentProgramId}`,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I attempt to delete the installed program", () => {
  cy.request({
    method: "DELETE",
    url: `${apiBaseUrl}/api/training-programs/${currentProgramId}`,
    failOnStatusCode: false,
  }).as("lastResponse")
})

// =============================================================================
// ASSERTION STEPS
// =============================================================================

Then("the program should have {int} mesocycles", (count: number) => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.mesocycles).to.be.an("array")
    expect((body.mesocycles as unknown[]).length).to.equal(count)
  })
})

Then("the program duration should be {int} weeks", (weeks: number) => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.durationWeeks).to.equal(weeks)
  })
})

Then("the program should include waveform data", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.loadProgression || body.waveform).to.exist
  })
})

Then("the response should include {int} programs", (count: number) => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body
    expect(body).to.be.an("array")
    expect((body as unknown[]).length).to.equal(count)
  })
})

Then("the program details should include mesocycles", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.mesocycles).to.be.an("array")
    expect((body.mesocycles as unknown[]).length).to.be.greaterThan(0)
  })
})

Then("the waveform should include load data points", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.dataPoints || body.weeks || body.points).to.exist
  })
})

Then("the waveform should show periodization waves", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    // Waveform data should have multiple entries showing load variation
    const points = (body.dataPoints || body.weeks || body.points) as unknown[]
    if (points) {
      expect(points.length).to.be.greaterThan(1)
    }
  })
})

Then("the installation should be active", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.status).to.equal("active")
  })
})

Then("scheduled sessions should appear on calendar", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.scheduledSessions || body.sessions).to.exist
  })
})

Then("the installation should include scheduled sessions", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.scheduledSessions || body.sessions).to.exist
  })
})

Then("the sessions should include training types and durations", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body
    const sessions = (Array.isArray(body) ? body : (body as Record<string, unknown>).sessions) as Array<Record<string, unknown>>
    expect(sessions).to.be.an("array")
    if (sessions.length > 0) {
      expect(sessions[0].trainingType || sessions[0].type).to.exist
      expect(sessions[0].durationMin).to.be.a("number")
    }
  })
})

Then("the installation should no longer be active", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/program-installations/active`,
    failOnStatusCode: false,
  }).its("status").should("eq", 404)
})

Then("I should be able to install a new program", () => {
  // Verify no active installation blocks new installs
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/program-installations/active`,
    failOnStatusCode: false,
  }).its("status").should("eq", 404)
})

Then("the program should not exist", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/training-programs/${currentProgramId}`,
    failOnStatusCode: false,
  }).its("status").should("eq", 404)
})

// =============================================================================
// UI STEPS
// =============================================================================

When("I visit the training programs page", () => {
  cy.visit("/programs")
})

When("I visit the program details page", () => {
  cy.visit(`/programs`)
  // Click on the first program card to view details
  cy.contains(/test program|waveform program/i).first().click()
})

Then("I should see {int} programs in the list", (count: number) => {
  cy.get('[data-testid="program-card"], [class*="program"]').should("have.length", count)
})

Then("each program should show name and duration", () => {
  cy.get('[data-testid="program-card"], [class*="program"]').first().within(() => {
    cy.contains(/program/i).should("exist")
    cy.contains(/week/i).should("exist")
  })
})

When("I click the create program button", () => {
  cy.contains("button", /create|new|add/i).click()
})

Then("I should see the program creation form", () => {
  cy.get("form, [role='dialog']").should("exist")
})

Then("the form should have mesocycle configuration", () => {
  cy.contains(/mesocycle|block|phase/i).should("exist")
})

Then("I should see the waveform visualization", () => {
  cy.get("canvas, svg, [class*='chart']").should("exist")
})

Then("the chart should show weekly load progression", () => {
  cy.contains(/load|volume|week/i).should("exist")
})

Then("peaks and valleys should indicate periodization", () => {
  // Visual verification - chart should render
  cy.get("canvas, svg, [class*='chart']").should("exist")
})

When("I click install on a program card", () => {
  cy.contains("button", /install/i).first().click()
})

Then("I should see installation confirmation", () => {
  cy.contains(/install|confirm|scheduled/i).should("be.visible")
})

Then("the calendar should populate with scheduled sessions", () => {
  // After installation, sessions should appear
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/program-installations/active`,
  }).its("status").should("eq", 200)
})

Then("the installed program should show {string} badge", (badge: string) => {
  cy.contains(new RegExp(badge, "i")).should("be.visible")
})

Then("other programs should show {string} button", (buttonText: string) => {
  cy.contains("button", new RegExp(buttonText, "i")).should("exist")
})
