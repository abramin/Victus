#!/bin/bash

# Test the solver endpoint with sample data

echo "Testing Macro Solver with Ollama integration..."
echo ""

# Make a request to the solver endpoint
curl -s -X POST http://localhost:8080/api/solver/solve \
  -H "Content-Type: application/json" \
  -d '{
    "remainingProteinG": 40,
    "remainingCarbsG": 50,
    "remainingFatG": 15,
    "remainingCalories": 500,
    "dayType": "performance",
    "plannedTraining": [
      {
        "type": "strength",
        "durationMin": 60
      }
    ],
    "mealTime": "post-workout"
  }' | jq '.'

echo ""
echo "Check backend logs for [OLLAMA] messages to see the refinement process"
