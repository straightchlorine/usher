package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Health handler reports whether the database answers a ping.
//
//	@Summary		Health check
//	@Description	Returns 200 when the database answers within 2 seconds, 503 otherwise.
//	@ID				api.health
//	@Tags			health
//	@Produce		json
//	@Success		200	{object}	map[string]string	"ok"
//	@Failure		503	{object}	map[string]string	"unavailable"
//	@Router			/health [get]
func HealthHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if err := pool.Ping(ctx); err != nil {
			writeJSONResponse(w, http.StatusServiceUnavailable, map[string]string{"status": "unavailable"})
			return
		}
		writeJSONResponse(w, http.StatusOK, map[string]string{"status": "ok"})
	}
}
