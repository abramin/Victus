import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor"

Given("the app is running", () => {
  // Base URL is configured in cypress.config.ts.
})

When("I visit the home page", () => {
  cy.visit("/")
})

Then("I see the Victus Stack heading", () => {
  cy.contains("h1", "Victus Stack").should("be.visible")
})
