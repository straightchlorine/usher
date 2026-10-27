package middlewares

import (
	"crypto/subtle"
	"encoding/json"
	"net/http"

	"github.com/straightchlorine/usher/models"
)

// ProxyKeyHeader carries the shared secret set by the trusted front proxy.
const ProxyKeyHeader = "X-Usher-Proxy-Key"

// RequireProxyKey rejects requests lacking the shared secret header. An empty
// secret disables the check. Health checks and CORS preflights are exempt.
func RequireProxyKey(secret string, next http.Handler) http.Handler {
	if secret == "" {
		return next
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// exempt options and healthcheck
		exempt := r.Method == http.MethodOptions ||
			(r.Method == http.MethodGet && r.URL.Path == "/api/health")

		// check the key header
		got := r.Header.Get(ProxyKeyHeader)
		if !exempt && subtle.ConstantTimeCompare([]byte(got), []byte(secret)) != 1 {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			_ = json.NewEncoder(w).Encode(models.ErrorResponse{Message: "Forbidden."})
			return
		}
		next.ServeHTTP(w, r)
	})
}

// LimitBody caps request bodies at max bytes; reads past it fail, so handlers
// decoding JSON answer with an error status.
func LimitBody(max int64, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, max)
		next.ServeHTTP(w, r)
	})
}
