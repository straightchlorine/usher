// Main application runner.
package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/gorilla/handlers"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/straightchlorine/usher/db"
	"github.com/straightchlorine/usher/middlewares"
	"github.com/straightchlorine/usher/routes"
)

// maxBodyBytes caps every request body (1 MiB).
const maxBodyBytes = 1 << 20

// Populate the database with initial data if the populate flag is set.
func populateDatabase(populateFlag *bool, pool *pgxpool.Pool) {
	if *populateFlag {
		// if the flag is provided...
		fmt.Println("Populating the database with fake data and adding admin user...")
		err := db.PopulateDatabase(pool)
		if err != nil {
			log.Fatalf("Failed to populate the database: %v\n", err)
		}
		fmt.Println("Database populated successfully.")

	} else {
		// if the flag is not provided...
		fmt.Println("Skipping database population, adding only admin user...")
		err := db.AddAdminUser(nil, pool)
		if err != nil {
			log.Fatalf("Failed to populate the database: %v\n", err)
		}

	}
}

//	@title			Usher API
//	@version		1.0
//	@description	Simple API for managing ticket reservations.

//	@host		localhost:8080
//	@BasePath	/api/

// @securityDefinitions.apikey	BearerAuth
// @in							header
// @name						Authorization
func main() {
	// Initialize the JWT secret.
	jwtSecret := middlewares.InitJWTSecret()

	// Parse the command line flags.
	populateFlag := flag.Bool("populate", false, "Populate the database with initial data.")
	resetDemoFlag := flag.Bool("reset-demo", false, "Wipe demo data, re-seed it and exit.")
	flag.Parse()

	// Get the connection pool.
	pool, err := db.Connect()
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer pool.Close()

	// Create the schema on a fresh database.
	schemaCtx, schemaCancel := context.WithTimeout(context.Background(), time.Minute)
	if err := db.EnsureSchema(schemaCtx, pool); err != nil {
		log.Fatalf("Failed to ensure the schema: %v\n", err)
	}
	schemaCancel()

	// Reset the demo data and exit.
	if *resetDemoFlag {
		fmt.Println("Resetting demo data...")
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
		defer cancel()
		if err := db.ResetDemo(ctx, pool); err != nil {
			log.Fatalf("Failed to reset demo data: %v\n", err)
		}
		fmt.Println("Demo data reset.")
		return
	}

	// Populate the database if the flag is set.
	populateDatabase(populateFlag, pool)

	// Set up the API routes.
	r := routes.SetupRoutes(pool, jwtSecret)

	// Start the server (defaults to port 8080).
	port := os.Getenv("API_PORT")
	if port == "" {
		port = "8080"
	}

	// Enable CORS.
	cors := handlers.CORS(
		handlers.AllowedOrigins([]string{"*"}),
		handlers.AllowedMethods([]string{"GET", "POST", "PUT", "DELETE"}),
		handlers.AllowedHeaders([]string{"Content-Type", "Authorization"}),
	)

	// Start goroutine to clean up expired tokens.
	middlewares.StartTokenCleanupTask(pool, time.Hour)

	// Shared secret of the trusted front proxy; empty disables the check.
	proxySecret := strings.TrimSpace(os.Getenv("PROXY_SHARED_SECRET"))
	if proxySecret == "" {
		log.Println("WARNING: PROXY_SHARED_SECRET is empty; the proxy key check is disabled and the API accepts direct requests")
	}

	handler := middlewares.LimitBody(maxBodyBytes, middlewares.RequireProxyKey(proxySecret, cors(r)))
	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	// Graceful shutdown on SIGTERM/SIGINT.
	idleClosed := make(chan struct{})
	go func() {
		sigs := make(chan os.Signal, 1)
		signal.Notify(sigs, syscall.SIGTERM, syscall.SIGINT)
		<-sigs
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := srv.Shutdown(ctx); err != nil {
			log.Printf("Graceful shutdown failed: %v\n", err)
		}
		close(idleClosed)
	}()

	// Log the server start.
	fmt.Printf("Server running on port %s\n", port)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
	<-idleClosed
}
