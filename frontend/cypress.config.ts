import { defineConfig } from "cypress"
import * as createBundlerModule from "@bahmutov/cypress-esbuild-preprocessor"
const createBundler = (createBundlerModule as any).default || createBundlerModule
import { addCucumberPreprocessorPlugin } from "@badeball/cypress-cucumber-preprocessor"
import { createEsbuildPlugin } from "@badeball/cypress-cucumber-preprocessor/esbuild"

const apiBaseUrl = process.env.CYPRESS_apiBaseUrl || "http://localhost:8080"
const baseUrl = process.env.CYPRESS_baseUrl || "http://localhost:5173"

export default defineConfig({
  env: {
    apiBaseUrl,
  },
  e2e: {
    baseUrl,
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
