# Ration Generator - Ollama Integration Fix

## What Was Fixed

### 1. Enhanced Logging & Debugging ([backend/internal/service/ollama.go](backend/internal/service/ollama.go))

Added comprehensive logging to track the Ollama integration:

- **Connection Status**: Logs when Ollama is disabled due to previous failures
- **Request Tracking**: Logs when sending requests to Ollama (with timeout info)
- **Response Parsing**: Logs raw LLM responses and any JSON parsing errors
- **Validation**: Logs validation failures (invalid title/instruction length)
- **Success**: Logs successful recipe generation with the mission title
- **Fallback**: Logs when falling back to generic instructions

**Example log output:**
```
[OLLAMA] Generating semantic refinement for 2 ingredients
[OLLAMA] Sending semantic refinement request to http://localhost:11434 (timeout: 15s)
[OLLAMA] Raw response: {"missionTitle":"WHEY CHIA SLUDGE // MK-4", ...}
[OLLAMA] Successfully generated semantic refinement: WHEY CHIA SLUDGE // MK-4
```

### 2. Improved "Tactical Chef" System Prompt ([backend/internal/service/ollama.go:353-430](backend/internal/service/ollama.go#L353-L430))

Completely rewrote the LLM prompt with:

**Structured JSON Requirements:**
- Clear field specifications with character limits
- Examples for each field type
- Explicit null handling instructions

**Liquid Binder Logic:**
- CRITICAL instruction: LLM MUST add liquid (water/almond milk) if ingredients are dry
- Examples: "Hydrate 12 tbsp chia in 300ml water for 10 mins, then fold in 6 scoops whey until pudding consistency."

**Mission Title Format:**
- Format: `[MAIN INGREDIENT] + [TEXTURE/PREP] // [ALPHA-NUMERIC CODE]`
- MUST BE ALL CAPS
- Example: `WHEY CHIA SLUDGE // MK-4`

**Logistic Alert Enhancement:**
- Must include SPLITTING STRATEGY when there's a problem
- Example: `PROTEIN OVERLOAD (72g). Split into 2 servings: consume 50% now, refrigerate 50% for +3hr post-training.`

**Flavor Patch:**
- Zero-calorie additives only (cinnamon, salt, vanilla extract, sweetener)
- Example: `Add cinnamon and sweetener to neutralize whey bitterness.`

### 3. Smarter Fallback Logic ([backend/internal/service/ollama.go:448-514](backend/internal/service/ollama.go#L448-L514))

When Ollama is offline, the fallback now:

**Detects Dry Ingredients:**
- Checks for whey, protein powder, chia, oats
- Automatically calculates liquid needed (1.5ml per gram of dry ingredients)
- Generates instruction like: `Combine all ingredients with 250ml water or almond milk. Mix until uniform consistency.`

**Before (Generic):**
```
"Combine ingredients and serve."
```

**After (Smart):**
```
"Combine all ingredients with 250ml water or almond milk. Mix until uniform consistency."
```

### 4. Frontend UI Already Supports All Features ([frontend/src/components/solver/SolutionCard.tsx](frontend/src/components/solver/SolutionCard.tsx))

The frontend was already well-designed and will automatically display:

- **Mission Title**: Typewriter animation with tactical name
- **Operational Steps**: Green glowing box with prep instructions
- **Logistic Alert**: Amber pulsing box with splitting strategy
- **Flavor Patch**: Cyan box with taste suggestions
- **AI Badge**: Shows when LLM-enhanced vs fallback

## Testing Instructions

### Step 1: Verify Ollama is Running

```bash
curl http://localhost:11434/api/tags
```

Should return JSON with llama3.2 model. ✅ Confirmed running.

### Step 2: Restart Backend Server

The new code needs to be loaded:

```bash
cd backend
./server  # or go run ./cmd/server
```

Watch for `[OLLAMA]` log messages during solver requests.

### Step 3: Test from Frontend

1. Open the app in your browser (http://localhost:5173)
2. Navigate to a day with remaining macros
3. Click "Ration Generator" or the solver button
4. Submit a request with remaining budget (e.g., 500 kcal, 40g protein, 50g carbs, 15g fat)

### Step 4: Watch Backend Logs

You should see output like:

```
[OLLAMA] Generating semantic refinement for 2 ingredients
[OLLAMA] Sending semantic refinement request to http://localhost:11434 (timeout: 15s)
[OLLAMA] Raw response: {"missionTitle":"WHEY CHIA SLUDGE // MK-4", "operationalSteps":"Hydrate chia in 300ml water for 10 mins before folding in whey to create a bio-available pudding.", ...}
[OLLAMA] Successfully generated semantic refinement: WHEY CHIA SLUDGE // MK-4
```

### Step 5: Verify Frontend Display

The solution card should show:

- ✅ **Title**: `WHEY CHIA SLUDGE // MK-4` (with typewriter animation)
- ✅ **Operational Steps**: Green box with specific instructions including liquid amounts
- ✅ **Logistic Alert**: Amber box if protein >60g, with splitting strategy
- ✅ **Flavor Patch**: Cyan box with zero-calorie suggestions
- ✅ **AI Enhanced Badge**: Green dot indicating LLM generation

## Troubleshooting

### Issue: Still Seeing "Combine ingredients and serve"

**Possible Causes:**
1. Backend not restarted with new code
2. Ollama is offline
3. Ollama is timing out (>15 seconds)
4. LLM returning malformed JSON

**Debug Steps:**
1. Check backend logs for `[OLLAMA]` messages
2. If you see `[OLLAMA] Semantic refinement skipped: Ollama service disabled`, Ollama failed previously
3. Restart both Ollama and the backend server
4. Use the test script:

```bash
./test_solver.sh
```

### Issue: No [OLLAMA] Logs

Backend wasn't rebuilt or restarted. Rebuild:

```bash
cd backend
go build -o server ./cmd/server
./server
```

### Issue: LLM Returns Invalid JSON

Check logs for:
```
[OLLAMA] Raw response: <whatever the LLM returned>
[OLLAMA] Failed to unmarshal semantic refinement JSON: ...
```

The new prompt is much more explicit about JSON format. If this still happens, the LLM model might need warming up or the prompt needs further refinement.

### Issue: Ollama Connection Refused

```bash
# Check if Ollama is running
curl http://localhost:11434/api/tags

# If not running, start Ollama
ollama serve

# Verify llama3.2 is available
ollama list
```

## What Happens if Ollama is Offline?

The system gracefully falls back to:

1. **Smart Fallback Instructions**: Detects dry ingredients and adds liquid binder instructions
2. **Generic Mission Title**: `WHEY & CHIA STACK` format
3. **Absurdity Alerts**: Still shown if domain logic detects issues (high protein, etc.)
4. **No AI Badge**: Frontend shows fallback mode

The app remains fully functional, just without the creative tactical names and detailed prep instructions.

## API Response Example

### With Ollama (LLM-Enhanced):

```json
{
  "solutions": [
    {
      "recipeName": "WHEY CHIA SLUDGE // MK-4",
      "refinement": {
        "missionTitle": "WHEY CHIA SLUDGE // MK-4",
        "tacticalPrep": "Hydrate 12 tbsp chia in 300ml water for 10 mins, then fold in 6 scoops whey until pudding consistency.",
        "logisticAlert": "PROTEIN OVERLOAD (72g). Split into 2 servings: consume 50% now, refrigerate 50% for +3hr post-training.",
        "flavorPatch": "Add cinnamon and vanilla extract to neutralize protein bitterness.",
        "contextualInsight": "High-protein recovery stack optimized for post-strength glycogen replenishment.",
        "generatedByLlm": true
      }
    }
  ]
}
```

### Without Ollama (Fallback):

```json
{
  "solutions": [
    {
      "recipeName": "WHEY PROTEIN & CHIA SEEDS STACK",
      "refinement": {
        "missionTitle": "WHEY PROTEIN & CHIA SEEDS STACK",
        "tacticalPrep": "Combine all ingredients with 250ml water or almond milk. Mix until uniform consistency.",
        "absurdityAlert": "High protein (72g). Consider splitting to optimize absorption.",
        "contextualInsight": "Near-perfect macro match for your remaining budget.",
        "generatedByLlm": false
      }
    }
  ]
}
```

## Files Modified

- [backend/internal/service/ollama.go](backend/internal/service/ollama.go) - Enhanced logging, improved prompt, smarter fallback
- [backend/internal/service/solver.go](backend/internal/service/solver.go) - No changes (already well-structured)
- [backend/internal/domain/solver_absurdity.go](backend/internal/domain/solver_absurdity.go) - No changes (already provides splitting suggestions)
- Frontend - No changes needed (already supports all features)

## Next Steps

1. **Test thoroughly** with various ingredient combinations
2. **Monitor logs** to see if Ollama is responding correctly
3. **Tune the prompt** if LLM responses aren't meeting expectations
4. **Consider adding a health check endpoint** that reports Ollama status to the frontend
