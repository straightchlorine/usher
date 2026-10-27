package db

import (
	"context"
	_ "embed"
	"fmt"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

//go:embed init/schema.sql
var schemaSQL string

// EnsureSchema runs the embedded schema once, when the events table is missing.
// On an existing schema it does nothing (the schema file drops tables).
func EnsureSchema(ctx context.Context, pool *pgxpool.Pool) error {
	var reg *string
	if err := pool.QueryRow(ctx, "SELECT to_regclass('public.events')::text").Scan(&reg); err != nil {
		return fmt.Errorf("check schema: %w", err)
	}
	if reg != nil {
		return nil
	}
	log.Println("schema: public.events not found, applying embedded schema")
	if _, err := pool.Exec(ctx, schemaSQL); err != nil {
		return fmt.Errorf("apply schema: %w", err)
	}
	return nil
}

// ResetDemo wipes reservations, tickets, events and locations and every user
// except the root and demo accounts, then re-seeds the demo data.
func ResetDemo(ctx context.Context, pool *pgxpool.Pool) error {
	root := os.Getenv("ROOT_NAME")
	if root == "" {
		root = "root"
	}
	demo := os.Getenv("DEMO_USERNAME")
	if demo == "" {
		demo = "demo"
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	if _, err := tx.Exec(ctx,
		"TRUNCATE tickets, reservations, events, locations RESTART IDENTITY CASCADE"); err != nil {
		return fmt.Errorf("truncate demo data: %w", err)
	}
	if _, err := tx.Exec(ctx,
		"DELETE FROM users WHERE username <> $1 AND username <> $2", root, demo); err != nil {
		return fmt.Errorf("delete users: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return err
	}

	return PopulateDatabase(pool)
}
