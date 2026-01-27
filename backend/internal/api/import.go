package api

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"
)

// Maximum upload size: 10MB
const maxImportSize = 10 << 20

// uploadGarminData handles POST /api/import/garmin
// Accepts multipart/form-data with:
//   - file: CSV or ZIP file (required)
//   - year: Year for date parsing (optional, defaults to current year)
func (s *Server) uploadGarminData(w http.ResponseWriter, r *http.Request) {
	// Limit request body size
	r.Body = http.MaxBytesReader(w, r.Body, maxImportSize)

	// Parse multipart form
	if err := r.ParseMultipartForm(maxImportSize); err != nil {
		if err.Error() == "http: request body too large" {
			writeError(w, http.StatusBadRequest, "file_too_large", "Maximum upload size is 10MB")
			return
		}
		writeError(w, http.StatusBadRequest, "invalid_form", "Failed to parse multipart form: "+err.Error())
		return
	}

	// Get file from form
	file, header, err := r.FormFile("file")
	if err != nil {
		writeError(w, http.StatusBadRequest, "missing_file", "No file provided in 'file' field")
		return
	}
	defer file.Close()

	// Read file data
	data, err := io.ReadAll(file)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "read_error", "Failed to read uploaded file")
		return
	}

	// Parse optional year parameter
	year := 0
	if yearStr := r.FormValue("year"); yearStr != "" {
		if y, err := strconv.Atoi(yearStr); err == nil && y >= 2000 && y <= 2100 {
			year = y
		}
	}

	// Process the upload
	result, err := s.importService.ProcessGarminUpload(r.Context(), header.Filename, data, year)
	if err != nil {
		writeError(w, http.StatusBadRequest, "import_error", err.Error())
		return
	}

	// Return result
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(result)
}

// getMonthlySummaries handles GET /api/stats/monthly-summaries
// Query parameters:
//   - from: Start year-month (e.g., "2025-01") - optional
//   - to: End year-month (e.g., "2025-12") - optional
func (s *Server) getMonthlySummaries(w http.ResponseWriter, r *http.Request) {
	from := r.URL.Query().Get("from")
	to := r.URL.Query().Get("to")

	var summaries interface{}
	var err error

	if from != "" && to != "" {
		summaries, err = s.monthlySummaryStore.GetRange(r.Context(), from, to)
	} else if from != "" {
		summaries, err = s.monthlySummaryStore.GetByYearMonth(r.Context(), from)
	} else {
		summaries, err = s.monthlySummaryStore.GetAll(r.Context())
	}

	if err != nil {
		writeError(w, http.StatusInternalServerError, "database_error", "Failed to retrieve monthly summaries")
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(summaries)
}
