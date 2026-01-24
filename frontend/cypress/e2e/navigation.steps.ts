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

Then("I should see the today nav item", () => {
  cy.contains(/today/i).should("be.visible")
})

Then("I should see the kitchen nav item", () => {
  cy.contains(/kitchen/i).should("be.visible")
})

Then("I should see the strategy nav item", () => {
  cy.contains(/strategy/i).should("be.visible")
})

Then("I should see the schedule nav item", () => {
  cy.contains(/schedule/i).should("be.visible")
})

Then("I should see the history nav item", () => {
  cy.contains(/history/i).should("be.visible")
})

Then("I should see the profile nav item", () => {
  cy.contains(/profile|settings/i).should("be.visible")
})

When("I click on the today nav item", () => {
  cy.contains(/today/i).click()
})

When("I click on the kitchen nav item", () => {
  cy.contains(/kitchen/i).click()
})

When("I click on the strategy nav item", () => {
  cy.contains(/strategy/i).click()
})

When("I click on the schedule nav item", () => {
  cy.contains(/schedule/i).click()
})

When("I click on the history nav item", () => {
  cy.contains(/history/i).click()
})

When("I click on the profile nav item", () => {
  cy.contains(/profile/i).click()
})

Then("I should see the today dashboard", () => {
  // Today view shows check-in, training, and activity monitor
  cy.get("form, input[type='number']").should("exist")
})

Then("I should see the kitchen dashboard", () => {
  // Kitchen view shows meal cards and food library
  cy.contains(/kitchen|breakfast|lunch|dinner|food/i).should("be.visible")
})

Then("I should see the strategy view", () => {
  cy.contains(/strategy/i).should("be.visible")
})

Then("I should see the schedule calendar", () => {
  cy.contains(/schedule/i).should("be.visible")
})

Then("I should see the weight history", () => {
  cy.contains(/weight|history|trend/i).should("be.visible")
})

Then("I should see the profile settings form", () => {
  cy.contains(/profile|settings/i).should("be.visible")
  cy.get("form, input").should("exist")
})

Then("the history nav item should be highlighted", () => {
  cy.get("nav, [role='navigation'], aside").contains(/history/i).then(($el) => {
    const className = $el.attr("class") ?? ""
    const isHighlighted = /active|selected|current|bg-gray-800/i.test(className) || $el.attr("aria-current") === "page"
    expect(isHighlighted).to.equal(true)
  })
})

Then("the strategy nav item should be highlighted", () => {
  cy.get("nav, [role='navigation'], aside").contains(/strategy/i).then(($el) => {
    const className = $el.attr("class") ?? ""
    const isHighlighted = /active|selected|current|bg-gray-800/i.test(className) || $el.attr("aria-current") === "page"
    expect(isHighlighted).to.equal(true)
  })
})
