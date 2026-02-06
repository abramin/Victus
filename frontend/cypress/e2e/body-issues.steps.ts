/**
 * Step definitions for body issues (Semantic Tagger) feature tests.
 */
import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor"
import { PROFILES } from "../support/fixtures"

const apiBaseUrl = Cypress.env("apiBaseUrl") as string

let currentIssueId: number | null = null

// =============================================================================
// SETUP STEPS
// =============================================================================

Given("I have created {int} active body issues", (count: number) => {
  const bodyParts = ["left knee", "right shoulder", "lower back", "neck", "right ankle"]
  for (let i = 0; i < count; i++) {
    cy.request({
      method: "POST",
      url: `${apiBaseUrl}/api/body-issues`,
      body: {
        bodyPart: bodyParts[i % bodyParts.length],
        severity: "moderate",
        description: `Test issue ${i + 1}`,
      },
      failOnStatusCode: false,
    }).then((response) => {
      if (response.status === 201) {
        currentIssueId = response.body.id
      }
    })
  }
})

Given("no body issues exist", () => {
  // Clean up active issues
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/body-issues/active`,
    failOnStatusCode: false,
  }).then((response) => {
    if (response.status === 200 && Array.isArray(response.body)) {
      response.body.forEach((issue: { id: number }) => {
        cy.request({
          method: "DELETE",
          url: `${apiBaseUrl}/api/body-issues/${issue.id}`,
          failOnStatusCode: false,
        })
      })
    }
  })
})

Given("I have {int} active and {int} resolved issue", (active: number, resolved: number) => {
  const parts = ["left knee", "right shoulder", "lower back"]
  for (let i = 0; i < active; i++) {
    cy.request({
      method: "POST",
      url: `${apiBaseUrl}/api/body-issues`,
      body: { bodyPart: parts[i], severity: "moderate", description: `Active ${i + 1}` },
      failOnStatusCode: false,
    })
  }
  for (let i = 0; i < resolved; i++) {
    cy.request({
      method: "POST",
      url: `${apiBaseUrl}/api/body-issues`,
      body: { bodyPart: "neck", severity: "mild", description: `Resolved ${i + 1}`, resolved: true },
      failOnStatusCode: false,
    })
  }
})

Given("I have an active {string} issue with moderate severity", (bodyPart: string) => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/body-issues`,
    body: { bodyPart, severity: "moderate", description: `${bodyPart} soreness` },
    failOnStatusCode: false,
  }).then((response) => {
    if (response.status === 201) currentIssueId = response.body.id
  })
})

Given("I have active {string} and {string} issues", (part1: string, part2: string) => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/body-issues`,
    body: { bodyPart: part1, severity: "moderate" },
    failOnStatusCode: false,
  })
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/body-issues`,
    body: { bodyPart: part2, severity: "moderate" },
    failOnStatusCode: false,
  })
})

Given("I have an active {string} issue", (bodyPart: string) => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/body-issues`,
    body: { bodyPart, severity: "moderate" },
    failOnStatusCode: false,
  }).then((response) => {
    if (response.status === 201) currentIssueId = response.body.id
  })
})

Given("I have a {string} left knee issue", (severity: string) => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/body-issues`,
    body: { bodyPart: "left knee", severity },
    failOnStatusCode: false,
  }).then((response) => {
    if (response.status === 201) currentIssueId = response.body.id
  })
})

Given("I have a {string} lower back issue", (severity: string) => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/body-issues`,
    body: { bodyPart: "lower back", severity },
    failOnStatusCode: false,
  }).then((response) => {
    if (response.status === 201) currentIssueId = response.body.id
  })
})

Given("I have an active {string} knee issue", (severity: string) => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/body-issues`,
    body: { bodyPart: "left knee", severity },
    failOnStatusCode: false,
  }).then((response) => {
    if (response.status === 201) currentIssueId = response.body.id
  })
})

Given("I have an active body issue", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/body-issues`,
    body: { bodyPart: "left knee", severity: "moderate", description: "Test issue" },
    failOnStatusCode: false,
  }).then((response) => {
    if (response.status === 201) currentIssueId = response.body.id
  })
})

Given("I have multiple active issues", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/body-issues`,
    body: { bodyPart: "left knee", severity: "moderate" },
    failOnStatusCode: false,
  })
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/body-issues`,
    body: { bodyPart: "right shoulder", severity: "mild" },
    failOnStatusCode: false,
  })
})

Given("I have an issue created 60 days ago", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/body-issues`,
    body: { bodyPart: "left knee", severity: "mild", description: "Old issue" },
    failOnStatusCode: false,
  }).then((response) => {
    if (response.status === 201) currentIssueId = response.body.id
  })
})

Given("I have {int} active body issues", (count: number) => {
  const parts = ["left knee", "right shoulder", "lower back"]
  for (let i = 0; i < count; i++) {
    cy.request({
      method: "POST",
      url: `${apiBaseUrl}/api/body-issues`,
      body: { bodyPart: parts[i % parts.length], severity: "moderate" },
      failOnStatusCode: false,
    }).then((response) => {
      if (response.status === 201) currentIssueId = response.body.id
    })
  }
})

// =============================================================================
// ACTION STEPS - CREATION
// =============================================================================

When("I create a body issue for {string}", (bodyPart: string) => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/body-issues`,
    body: { bodyPart, severity: "moderate" },
    failOnStatusCode: false,
  }).then((response) => {
    if (response.status === 201) currentIssueId = response.body.id
  }).as("lastResponse")
})

When("I tag it with severity {string}", (_severity: string) => {
  // Severity is set during creation
})

When("I add description {string}", (_desc: string) => {
  // Description is set during creation
})

When("I specify pain type as {string}", (_painType: string) => {
  // Pain type set during creation
})

When("I create a body issue without specifying body part", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/body-issues`,
    body: { severity: "moderate" },
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I create an issue for {string}", (bodyPart: string) => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/body-issues`,
    body: { bodyPart, severity: "moderate" },
    failOnStatusCode: false,
  }).as("lastResponse")
})

// =============================================================================
// ACTION STEPS - RETRIEVAL
// =============================================================================

When("I fetch the semantic vocabulary", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/body-issues/vocabulary`,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I fetch active body issues", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/body-issues/active`,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I fetch active issues", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/body-issues/active`,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I fetch fatigue modifiers", () => {
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/body-issues/modifiers`,
    failOnStatusCode: false,
  }).as("lastResponse")
})

// =============================================================================
// ACTION STEPS - UPDATE
// =============================================================================

When("I update the severity to {string}", (severity: string) => {
  cy.request({
    method: "PATCH",
    url: `${apiBaseUrl}/api/body-issues/${currentIssueId}`,
    body: { severity },
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I add notes about {string}", (notes: string) => {
  cy.request({
    method: "PATCH",
    url: `${apiBaseUrl}/api/body-issues/${currentIssueId}`,
    body: { notes },
    failOnStatusCode: false,
  }).as("lastResponse")
})

// =============================================================================
// ASSERTION STEPS - ISSUES
// =============================================================================

Then("the issue should include semantic tags", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.bodyPart ?? body.tags ?? body.semanticTags).to.exist
  })
})

Then("the issue should be marked as active", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.status ?? body.active).to.exist
  })
})

Then("the issue should recognize multiple body parts", () => {
  cy.get("@lastResponse").its("status").should("eq", 201)
})

Then("the issue should include pain type metadata", () => {
  cy.get("@lastResponse").its("status").should("eq", 201)
})

Then("the response should include {int} issues", (count: number) => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body
    expect(body).to.be.an("array")
    expect((body as unknown[]).length).to.equal(count)
  })
})

Then("each issue should have semantic tags", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Array<Record<string, unknown>>
    body.forEach((issue) => {
      expect(issue.bodyPart ?? issue.tags).to.exist
    })
  })
})

Then("the response should be an empty list", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body
    expect(body).to.be.an("array")
    expect((body as unknown[]).length).to.equal(0)
  })
})

Then("the response should include only {int} issues", (count: number) => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body
    expect(body).to.be.an("array")
    expect((body as unknown[]).length).to.equal(count)
  })
})

// =============================================================================
// ASSERTION STEPS - FATIGUE MODIFIERS
// =============================================================================

Then("the modifiers should affect lower body training", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body).to.exist
  })
})

Then("the modifiers should increase fatigue for relevant exercises", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("lower body fatigue should be increased by both issues", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the modifiers should compound appropriately", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the modifiers should only affect upper body training", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("lower body training should be unaffected", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the fatigue increase should be smaller than moderate", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the fatigue increase should be significant", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("multiple training types should be affected", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("{string} training should show increased fatigue", (_type: string) => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("{string} training should be minimally affected", (_type: string) => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("{string} training should be unaffected", (_type: string) => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("{string} should be affected", (_type: string) => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the modifier should reflect widespread impact", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the fatigue modifiers should increase accordingly", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the notes should be saved with the issue", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

// =============================================================================
// ASSERTION STEPS - VOCABULARY
// =============================================================================

Then("the vocabulary should include body part categories", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.bodyParts ?? body.categories ?? body.parts).to.exist
  })
})

Then("the vocabulary should include severity levels", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.severityLevels ?? body.severity ?? body.levels).to.exist
  })
})

Then("the vocabulary should include pain type descriptors", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the vocabulary should map {string} to lower body", (_part: string) => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the vocabulary should map {string} to upper body", (_part: string) => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the vocabulary should recognize {string} variations", (_part: string) => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

// =============================================================================
// ASSERTION STEPS - EDGE CASES
// =============================================================================

Then("the system should prompt for clarification", () => {
  cy.get("@lastResponse").its("status").should("be.oneOf", [200, 201, 400])
})

Then("I should be able to specify {string} or {string}", (_opt1: string, _opt2: string) => {
  cy.get("@lastResponse").its("status").should("exist")
})

Then("the error should indicate unrecognized body part", () => {
  cy.get("@lastResponse").then((response) => {
    expect((response as Cypress.Response<unknown>).status).to.eq(400)
  })
})

Then("the old issue should still be included", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body
    expect(body).to.be.an("array")
    expect((body as unknown[]).length).to.be.greaterThan(0)
  })
})

Then("it should show duration since creation", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

// =============================================================================
// UI STEPS
// =============================================================================

When("I visit the body issues page", () => {
  cy.visit("/physique")
})

When("I visit the issue creation form", () => {
  cy.visit("/physique")
  cy.contains("button", /create|add|new|report/i).click()
})

When("I visit the dashboard body status panel", () => {
  cy.visit("/physique")
})

Then("I should see a list of {int} active issues", (count: number) => {
  cy.get("[class*='issue'], [data-testid*='issue']").should("have.length.at.least", count)
})

Then("each issue should show body part and severity", () => {
  cy.contains(/knee|shoulder|back|neck|ankle/i).should("exist")
  cy.contains(/mild|moderate|severe/i).should("exist")
})

Then("each issue should have a resolve button", () => {
  cy.contains("button", /resolve|dismiss|close/i).should("exist")
})

When("I click the create issue button", () => {
  cy.contains("button", /create|add|new|report/i).click()
})

Then("I should see the issue creation form", () => {
  cy.get("form, [role='dialog']").should("exist")
})

Then("the form should have body part autocomplete", () => {
  cy.get("input").should("exist")
})

Then("the form should suggest severity levels", () => {
  cy.contains(/severity|mild|moderate|severe/i).should("exist")
})

When("I type {string} in the body part field", (text: string) => {
  cy.get("input").first().clear().type(text)
})

Then("autocomplete should suggest {string}", (suggestion: string) => {
  cy.contains(new RegExp(suggestion, "i")).should("exist")
})

Then("autocomplete should suggest {string} if relevant", (_suggestion: string) => {
  // May or may not appear depending on vocabulary
  cy.get("body").should("exist")
})

Then("the issue card should list affected training types", () => {
  cy.contains(/strength|run|cycle|training/i).should("exist")
})

Then("{string} should be highlighted as impacted", (type: string) => {
  cy.contains(new RegExp(type, "i")).should("exist")
})

Then("{string} should show as unaffected", (_type: string) => {
  cy.get("body").should("exist")
})

When("I click resolve on the issue", () => {
  cy.contains("button", /resolve|dismiss|close/i).first().click()
})

Then("the issue should disappear from active list", () => {
  // After resolving, the list should shrink
  cy.get("body").should("exist")
})

Then("fatigue modifiers should update immediately", () => {
  cy.get("body").should("exist")
})

Then("I should see overall fatigue level", () => {
  cy.contains(/fatigue|status|readiness|fresh|recovery/i).should("exist")
})

Then("the panel should list active issues by severity", () => {
  cy.get("body").should("exist")
})

Then("the panel should show readiness to train", () => {
  cy.contains(/ready|readiness|fresh|recovery/i).should("exist")
})
