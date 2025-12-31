import { defineConfig } from "cypress"
import createBundler from "@bahmutov/cypress-esbuild-preprocessor"
import { addCucumberPreprocessorPlugin } from "@badeball/cypress-cucumber-preprocessor"
import { createEsbuildPlugin } from "@badeball/cypress-cucumber-preprocessor/esbuild"

export default defineConfig({
  env: {
    "cypress-cucumber-preprocessor": {
      stepDefinitions: "cypress/e2e/**/*.steps.{js,ts}",
    },
    apiBaseUrl: "http://localhost:8080",
  },
  e2e: {
    baseUrl: "http://localhost:5173",
    specPattern: "cypress/e2e/**/*.feature",
    supportFile: "cypress/support/e2e.ts",
    async setupNodeEvents(on, config) {
      await addCucumberPreprocessorPlugin(on, config)
      on(
        "file:preprocessor",
        createBundler({
          plugins: [createEsbuildPlugin(config)],
        })
      )
      return config
    },
  },
})
