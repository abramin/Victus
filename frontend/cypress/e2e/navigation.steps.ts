import { Given, When, Then } from "@badeball/cypress-cucumber-preprocessor"
import { validProfile } from "../support/shared-steps"

const apiBaseUrl = Cypress.env("apiBaseUrl") as string

Given("a valid profile exists", () => {
  cy.request({
    method: "PUT",
    url: `${apiBaseUrl}/api/profile`,
    body: validProfile,
  }).its("status").should("eq", 200)
})

Then("I should see the sidebar navigation", () => {
  cy.get("nav, [role='navigation'], aside").should("be.visible")
})

Then("I should see the meal points nav item", () => {
  cy.contains(/meal|points/i).should("be.visible")
})

Then("I should see the plan nav item", () => {
  cy.contains(/plan/i).should("be.visible")
})

Then("I should see the history nav item", () => {
  cy.contains(/history/i).should("be.visible")
})

Then("I should see the daily update nav item", () => {
  cy.contains(/daily|update/i).should("be.visible")
})

Then("I should see the profile nav item", () => {
  cy.contains(/profile|settings/i).should("be.visible")
})

When("I click on the meal points nav item", () => {
  cy.contains(/meal|points/i).click()
})

When("I click on the plan nav item", () => {
  cy.contains(/plan/i).first().click()
})

When("I click on the history nav item", () => {
  cy.contains(/history/i).click()
})

When("I click on the daily update nav item", () => {
  cy.contains(/daily update/i).click()
})

When("I click on the profile nav item", () => {
  cy.contains(/profile/i).click()
})

Then("I should see the meal points dashboard", () => {
  // The meal points dashboard should have meal cards or points display
  cy.get("[data-testid='meal-points-dashboard'], .meal-points, h1, h2").contains(/meal|points|breakfast|lunch|dinner/i).should("be.visible")
})

Then("I should see the plan calendar", () => {
  cy.contains(/plan|calendar|week/i).should("be.visible")
})

Then("I should see the weight history", () => {
  cy.contains(/weight|history|trend/i).should("be.visible")
})

Then("I should see the daily update form", () => {
  cy.contains(/daily update/i).should("be.visible")
  cy.get("form, input[type='number']").should("exist")
})

Then("I should see the profile settings form", () => {
  cy.contains(/profile|settings/i).should("be.visible")
  cy.get("form, input").should("exist")
})

Then("the history nav item should be highlighted", () => {
  cy.contains(/history/i).should("have.class", /active|selected|current/i).or("have.attr", "aria-current", "page")
})

Then("the plan nav item should be highlighted", () => {
  cy.contains(/plan/i).first().should("have.class", /active|selected|current/i).or("have.attr", "aria-current", "page")
})
