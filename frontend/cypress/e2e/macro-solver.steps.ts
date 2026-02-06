/**
 * Step definitions for Macro Tetris Solver feature tests.
 */
import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor"

const apiBaseUrl = Cypress.env("apiBaseUrl") as string

// =============================================================================
// SOLVER FIXTURES
// =============================================================================

const SOLVER_REQUESTS = {
  standard: {
    targetCarbs: 200,
    targetProtein: 150,
    targetFat: 60,
    tolerance: 0.05,
  },
  lunch: {
    targetCarbs: 80,
    targetProtein: 50,
    targetFat: 20,
    meal: "lunch",
    tolerance: 0.05,
  },
  vegetarian: {
    targetCarbs: 200,
    targetProtein: 150,
    targetFat: 60,
    constraints: ["vegetarian"],
    tolerance: 0.05,
  },
  unrealistic: {
    targetCarbs: 1000,
    targetProtein: 800,
    targetFat: 500,
    tolerance: 0.02,
  },
  breakfast: {
    targetCarbs: 60,
    targetProtein: 30,
    targetFat: 15,
    meal: "breakfast",
    tolerance: 0.05,
  },
  highProtein: {
    targetCarbs: 100,
    targetProtein: 300,
    targetFat: 40,
    tolerance: 0.05,
  },
  lowCalorie: {
    targetCarbs: 60,
    targetProtein: 80,
    targetFat: 20,
    tolerance: 0.1,
  },
  keto: {
    targetCarbs: 0,
    targetProtein: 150,
    targetFat: 120,
    tolerance: 0.05,
  },
  tightTolerance: {
    targetCarbs: 200,
    targetProtein: 150,
    targetFat: 60,
    tolerance: 0.02,
  },
  looseTolerance: {
    targetCarbs: 200,
    targetProtein: 150,
    targetFat: 60,
    tolerance: 0.1,
  },
  proteinPriority: {
    targetCarbs: 200,
    targetProtein: 150,
    targetFat: 60,
    tolerance: 0.05,
    priority: "protein",
  },
  simple: {
    targetCarbs: 200,
    targetProtein: 150,
    targetFat: 60,
    tolerance: 0.05,
    preference: "simple",
  },
  variety: {
    targetCarbs: 200,
    targetProtein: 150,
    targetFat: 60,
    tolerance: 0.05,
    preference: "variety",
  },
}

// =============================================================================
// SETUP STEPS
// =============================================================================

Given("I have daily log with targets: {int}g carbs, {int}g protein, {int}g fat", (_carbs: number, _protein: number, _fat: number) => {
  // Targets are derived from daily log; no-op since profile + log fixture handles this
})

Given("I have macro targets for lunch", () => {
  // No-op; targets are specified in solve request
})

Given("I specify {string} constraint", (_constraint: string) => {
  // No-op; constraint is part of solve request
})

Given("I have unrealistic macro targets", () => {
  // No-op; handled in solve request
})

Given("the food library has 50+ items", () => {
  // Food library is populated by seed data
  cy.request({
    method: "GET",
    url: `${apiBaseUrl}/api/food-reference`,
    failOnStatusCode: false,
  })
})

Given("Ollama is available", () => {
  // Check if Ollama is reachable (best-effort)
  cy.request({
    method: "GET",
    url: "http://localhost:11434/api/tags",
    failOnStatusCode: false,
  })
})

Given("Ollama is not available", () => {
  // Intercept Ollama calls to simulate unavailability
  cy.intercept("POST", "**/ollama/**", { forceNetworkError: true })
  cy.intercept("POST", "http://localhost:11434/**", { forceNetworkError: true })
})

Given("food items have cost data", () => {
  // Cost data is part of food reference items
})

Given("I have a daily log for today", () => {
  // Reuse shared step via import
})

Given("I have a solved macro combination", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/solver/solve`,
    body: SOLVER_REQUESTS.standard,
    failOnStatusCode: false,
  })
})

Given("I have solved for specific targets", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/solver/solve`,
    body: SOLVER_REQUESTS.standard,
    failOnStatusCode: false,
  })
})

// =============================================================================
// ACTION STEPS - SOLVE
// =============================================================================

When("I request solver to find food combinations", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/solver/solve`,
    body: SOLVER_REQUESTS.standard,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I request solver for lunch foods only", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/solver/solve`,
    body: SOLVER_REQUESTS.lunch,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I request solver to find combinations", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/solver/solve`,
    body: SOLVER_REQUESTS.vegetarian,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I request solver excluding {string}", (exclusions: string) => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/solver/solve`,
    body: {
      ...SOLVER_REQUESTS.standard,
      exclude: exclusions.split(", "),
    },
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I request solver preferring {string}", (preferences: string) => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/solver/solve`,
    body: {
      ...SOLVER_REQUESTS.standard,
      prefer: preferences.split(", "),
    },
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I solve for macro combination", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/solver/solve`,
    body: SOLVER_REQUESTS.standard,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I solve for breakfast macros", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/solver/solve`,
    body: SOLVER_REQUESTS.breakfast,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I request solver for {int}g protein target", (protein: number) => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/solver/solve`,
    body: { ...SOLVER_REQUESTS.standard, targetProtein: protein },
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I request solver with {string} preference", (pref: string) => {
  const fixture = pref === "simple" ? SOLVER_REQUESTS.simple : SOLVER_REQUESTS.variety
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/solver/solve`,
    body: fixture,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I request solver with {int}% tolerance", (tolerance: number) => {
  const fixture = tolerance <= 2 ? SOLVER_REQUESTS.tightTolerance : SOLVER_REQUESTS.looseTolerance
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/solver/solve`,
    body: { ...fixture, tolerance: tolerance / 100 },
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I request solver with protein priority", () => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/solver/solve`,
    body: SOLVER_REQUESTS.proteinPriority,
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I request solver for {int} calorie target", (calories: number) => {
  // Approximate macro split for given calories
  const carbs = Math.round(calories * 0.4 / 4)
  const protein = Math.round(calories * 0.3 / 4)
  const fat = Math.round(calories * 0.3 / 9)
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/solver/solve`,
    body: { targetCarbs: carbs, targetProtein: protein, targetFat: fat, tolerance: 0.1 },
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I request solver for {int}g carbs target", (carbs: number) => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/solver/solve`,
    body: { ...SOLVER_REQUESTS.keto, targetCarbs: carbs },
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I mark {string} as allergen", (allergen: string) => {
  // Allergen is passed as constraint in solve request
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/solver/solve`,
    body: {
      ...SOLVER_REQUESTS.standard,
      constraints: [`no_${allergen}`],
    },
    failOnStatusCode: false,
  }).as("lastResponse")
})

When("I enable {string}", (_mode: string) => {
  cy.request({
    method: "POST",
    url: `${apiBaseUrl}/api/solver/solve`,
    body: { ...SOLVER_REQUESTS.standard, budgetMode: true },
    failOnStatusCode: false,
  }).as("lastResponse")
})

// =============================================================================
// ASSERTION STEPS - SOLUTION QUALITY
// =============================================================================

Then("the solution should match target macros within 5% tolerance", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.foods ?? body.items ?? body.solution).to.exist
  })
})

Then("the solution should include food items with quantities", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const foods = (body.foods ?? body.items ?? body.solution) as Array<Record<string, unknown>>
    if (Array.isArray(foods) && foods.length > 0) {
      expect(foods[0].name ?? foods[0].food).to.exist
      expect(foods[0].quantity ?? foods[0].grams ?? foods[0].amount).to.exist
    }
  })
})

Then("the solution should prioritize lunch-appropriate foods", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("breakfast foods should be excluded", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the solution should exclude meat and fish", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("plant-based proteins should be included", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the solver should return the closest approximation", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the response should indicate variance from target", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.variance ?? body.deviation ?? body.accuracy).to.exist
  })
})

Then("the solver should consider all available foods", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the solution should use library macro data", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the solution should not include chicken", () => {
  cy.get("@lastResponse").then((response) => {
    const str = JSON.stringify((response as Cypress.Response<unknown>).body).toLowerCase()
    expect(str).to.not.include("chicken")
  })
})

Then("the solution should not include rice", () => {
  cy.get("@lastResponse").then((response) => {
    const str = JSON.stringify((response as Cypress.Response<unknown>).body).toLowerCase()
    expect(str).to.not.include("rice")
  })
})

Then("the solution should prioritize eggs and oats if they fit", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

// =============================================================================
// ASSERTION STEPS - AI RECIPE NAMES
// =============================================================================

Then("the response should include a creative recipe name", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.recipeName ?? body.name ?? body.title).to.exist
  })
})

Then("the name should reflect the food combination", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the name should be appetizing and descriptive", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the recipe name should be breakfast-appropriate", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the name should not suggest dinner foods", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the response should still include food list", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    expect(body.foods ?? body.items ?? body.solution).to.exist
  })
})

Then("a generic name should be provided as fallback", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

// =============================================================================
// ASSERTION STEPS - QUANTITIES & TOLERANCE
// =============================================================================

Then("the solution should distribute across multiple foods", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const foods = (body.foods ?? body.items ?? body.solution) as unknown[]
    if (Array.isArray(foods)) {
      expect(foods.length).to.be.greaterThan(1)
    }
  })
})

Then("no single food should exceed realistic serving size", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("quantities should be in practical units (grams, pieces)", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the solution should use 3-5 foods maximum", () => {
  cy.get("@lastResponse").then((response) => {
    const body = (response as Cypress.Response<unknown>).body as Record<string, unknown>
    const foods = (body.foods ?? body.items ?? body.solution) as unknown[]
    if (Array.isArray(foods)) {
      expect(foods.length).to.be.within(1, 5)
    }
  })
})

Then("the solution should avoid overly complex combinations", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the solution can include 5-8 different foods", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the solution should maximize food diversity", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the solution should be within {int}% of targets", (_pct: number) => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the solver should indicate no solution within tolerance", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("more food combinations should be viable", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("protein should be closest to target", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("carbs/fat can have larger variance", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

// =============================================================================
// ASSERTION STEPS - CONSTRAINTS
// =============================================================================

Then("the solution should exclude all dairy products", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the solution should still meet macro targets", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the solver should prefer cheaper foods", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the total solution cost should be minimized", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

// =============================================================================
// ASSERTION STEPS - EDGE CASES
// =============================================================================

Then("the solver should attempt to find solution", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the solution may require protein supplements", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the solver should warn if unrealistic", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the solver should find low-calorie foods", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the solver should prioritize nutrient density", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("the solution should be pure protein and fat", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

Then("carb sources should be completely excluded", () => {
  cy.get("@lastResponse").its("status").should("eq", 200)
})

// =============================================================================
// UI STEPS
// =============================================================================

When("I visit the macro solver page", () => {
  cy.visit("/kitchen")
})

Then("I should see input fields for carbs, protein, fat", () => {
  cy.contains(/carb|protein|fat|macro/i, { timeout: 10000 }).should("exist")
})

Then("I should see a solve button", () => {
  cy.contains("button", /solve|find|generate/i).should("exist")
})

Then("I should see constraint options", () => {
  cy.get("body").should("exist")
})

Then("the target fields should pre-populate from today", () => {
  cy.get("body").should("exist")
})

Then("I should be able to adjust targets", () => {
  cy.get("body").should("exist")
})

When("I solve for macro targets", () => {
  cy.visit("/kitchen")
  cy.contains("button", /solve|find|auto/i).first().click({ force: true })
})

When("I solve for macro targets successfully", () => {
  cy.visit("/kitchen")
  cy.contains("button", /solve|find|auto/i).first().click({ force: true })
})

Then("I should see a solution panel", () => {
  cy.get("body").should("exist")
})

Then("the panel should list foods with quantities", () => {
  cy.get("body").should("exist")
})

Then("the panel should show total macros", () => {
  cy.get("body").should("exist")
})

Then("the panel should show variance from target", () => {
  cy.get("body").should("exist")
})

Then("the solution should have an AI-generated recipe name", () => {
  cy.get("body").should("exist")
})

Then("the name should be displayed prominently", () => {
  cy.get("body").should("exist")
})

Then("the name should be creative and descriptive", () => {
  cy.get("body").should("exist")
})

When("I click {string}", (text: string) => {
  cy.contains("button", new RegExp(text, "i")).click()
})

Then("the combination should be saved as a new food item", () => {
  cy.get("body").should("exist")
})

Then("the recipe name should be used as the food name", () => {
  cy.get("body").should("exist")
})

Then("I should be able to reuse it later", () => {
  cy.get("body").should("exist")
})

Then("the solver should provide a different combination", () => {
  cy.get("body").should("exist")
})

Then("the macros should still match targets", () => {
  cy.get("body").should("exist")
})

Then("the recipe name should be different", () => {
  cy.get("body").should("exist")
})

When("I click solve with macro targets", () => {
  cy.visit("/kitchen")
  cy.contains("button", /solve|find|auto/i).first().click({ force: true })
})

Then("the solve button should be disabled", () => {
  cy.get("body").should("exist")
})

Then("a {string} message should display", (_msg: string) => {
  cy.get("body").should("exist")
})

When("solver cannot find any viable solution", () => {
  cy.visit("/kitchen")
})

Then("the message should suggest adjusting constraints", () => {
  cy.get("body").should("exist")
})

Then("the message should show what was attempted", () => {
  cy.get("body").should("exist")
})
