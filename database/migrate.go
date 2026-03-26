// Run pending SQL migrations against a Postgres database.
//
// Tracks applied migrations in a _migrations table so each file only runs once.
// Also runs seed.sql if the seed hasn't been applied yet.
//
// Usage:
//
//    go run ./database/                      # local (default)
//    go run ./database/ --env dev            # uses .env.dev
//    go run ./database/ --env main           # uses .env.main
//    go run ./database/ --env local          # uses .env (or .env.local)
//    go run ./database/ --status             # show migration status
//    go run ./database/ --reset              # drop schema and re-run all
//    go run ./database/ --env dev --reset    # reset dev database
package main

import (
	"context"
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"

	"github.com/jackc/pgx/v5"
)

var (
	_, srcFile, _, _ = runtime.Caller(0)
	here             = filepath.Dir(srcFile)
	repoRoot         = filepath.Dir(here)
	migrationsDir    = filepath.Join(here, "migrations")
	seedFile         = filepath.Join(here, "seed.sql")
	envFiles         = map[string]string{
		"main":  filepath.Join(repoRoot, ".env.main"),
		"dev":   filepath.Join(repoRoot, ".env.dev"),
		"local": filepath.Join(repoRoot, ".env.local"),
	}
)

const trackingTable = `
CREATE TABLE IF NOT EXISTS _migrations (
    filename   TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);`

func loadDatabaseURL(env string) string {
	envFile := envFiles[env]
	if env == "local" {
		if _, err := os.Stat(envFile); err != nil {
			envFile = filepath.Join(repoRoot, ".env")
		}
	}
	if data, err := os.ReadFile(envFile); err == nil {
		for _, line := range strings.Split(string(data), "\n") {
			line = strings.TrimSpace(line)
			if strings.HasPrefix(line, "#") || !strings.Contains(line, "=") {
				continue
			}
			key, val, _ := strings.Cut(line, "=")
			if strings.TrimSpace(key) == "DATABASE_URL" {
				return strings.TrimSpace(val)
			}
		}
	}
	if url := os.Getenv("DATABASE_URL"); url != "" {
		return url
	}
	fmt.Fprintf(os.Stderr, "ERROR: DATABASE_URL not found in %s\n", envFile)
	os.Exit(1)
	return ""
}

func connect(ctx context.Context, dbURL string) *pgx.Conn {
	conn, err := pgx.Connect(ctx, dbURL)
	if err != nil {
		fmt.Fprintf(os.Stderr, "ERROR: could not connect: %v\n", err)
		os.Exit(1)
	}
	return conn
}

func ensureTracking(ctx context.Context, conn *pgx.Conn) {
	if _, err := conn.Exec(ctx, trackingTable); err != nil {
		fmt.Fprintf(os.Stderr, "ERROR: could not create tracking table: %v\n", err)
		os.Exit(1)
	}
}

func getApplied(ctx context.Context, conn *pgx.Conn) map[string]bool {
	rows, err := conn.Query(ctx, "SELECT filename FROM _migrations")
	if err != nil {
		fmt.Fprintf(os.Stderr, "ERROR: %v\n", err)
		os.Exit(1)
	}
	defer rows.Close()
	applied := map[string]bool{}
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err == nil {
			applied[name] = true
		}
	}
	return applied
}

func getMigrationFiles() []string {
	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		fmt.Fprintf(os.Stderr, "ERROR: reading migrations dir: %v\n", err)
		os.Exit(1)
	}
	var files []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") {
			files = append(files, e.Name())
		}
	}
	sort.Strings(files)
	return files
}

func applyFile(ctx context.Context, conn *pgx.Conn, path, name string) bool {
	data, err := os.ReadFile(path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "    ERROR: %v\n", err)
		return false
	}
	sql := fmt.Sprintf(
		"BEGIN;\n%s\nINSERT INTO _migrations (filename) VALUES ('%s');\nCOMMIT;",
		string(data), name,
	)
	if _, err := conn.Exec(ctx, sql); err != nil {
		fmt.Fprintf(os.Stderr, "    ERROR: %v\n", err)
		return false
	}
	return true
}

func cmdMigrate(ctx context.Context, conn *pgx.Conn) {
	ensureTracking(ctx, conn)
	applied := getApplied(ctx, conn)
	files := getMigrationFiles()

	var pending []string
	for _, f := range files {
		if !applied[f] {
			pending = append(pending, f)
		}
	}

	_, seedErr := os.Stat(seedFile)
	if len(pending) == 0 && applied["seed.sql"] {
		fmt.Println("  ✓ Everything up to date.")
		return
	}

	if len(pending) > 0 {
		fmt.Printf("  %d pending migration(s):\n\n", len(pending))
		for _, f := range pending {
			fmt.Printf("    → %s ... ", f)
			if applyFile(ctx, conn, filepath.Join(migrationsDir, f), f) {
				fmt.Println("✓")
			} else {
				fmt.Println("✗ FAILED — aborting")
				os.Exit(1)
			}
		}
		fmt.Println()
	}

	if seedErr == nil && !applied["seed.sql"] {
		fmt.Printf("    → seed.sql ... ")
		if applyFile(ctx, conn, seedFile, "seed.sql") {
			fmt.Println("✓")
		} else {
			fmt.Println("✗ FAILED")
			os.Exit(1)
		}
		fmt.Println()
	}

	fmt.Println("  ✓ Done!")
}

func cmdStatus(ctx context.Context, conn *pgx.Conn) {
	ensureTracking(ctx, conn)
	applied := getApplied(ctx, conn)
	files := getMigrationFiles()

	fmt.Println()
	fmt.Printf("  %-50s STATUS\n", "FILE")
	fmt.Printf("  %s\n", strings.Repeat("─", 62))
	for _, f := range files {
		if applied[f] {
			fmt.Printf("  ✓ %-48s applied\n", f)
		} else {
			fmt.Printf("  • %-48s PENDING\n", f)
		}
	}
	if _, err := os.Stat(seedFile); err == nil {
		if applied["seed.sql"] {
			fmt.Printf("  ✓ %-48s applied\n", "seed.sql")
		} else {
			fmt.Printf("  • %-48s PENDING\n", "seed.sql")
		}
	}

	pending := 0
	for _, f := range files {
		if !applied[f] {
			pending++
		}
	}
	if _, err := os.Stat(seedFile); err == nil && !applied["seed.sql"] {
		pending++
	}
	fmt.Printf("\n  %d migration(s), %d pending\n\n", len(files), pending)
}

func cmdReset(ctx context.Context, conn *pgx.Conn) {
	fmt.Println("  ⚠ Dropping all objects in public schema...")
	if _, err := conn.Exec(ctx, "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"); err != nil {
		fmt.Fprintf(os.Stderr, "ERROR: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("  Re-running all migrations...\n")
	cmdMigrate(ctx, conn)
}

func main() {
	env := flag.String("env", "local", "Target environment: local (default), dev, or main")
	status := flag.Bool("status", false, "Show migration status")
	reset := flag.Bool("reset", false, "Drop schema and re-run all")
	flag.Parse()

	dbURL := loadDatabaseURL(*env)
	envFileName := filepath.Base(envFiles[*env])

	fmt.Println()
	fmt.Println("  ┌──────────────────────────────────────┐")
	fmt.Printf("  │  env:  %-30s │\n", fmt.Sprintf("%s (%s)", *env, envFileName))
	if len(dbURL) > 30 {
		fmt.Printf("  │  db:   %-30s │\n", dbURL[:30]+"...")
	} else {
		fmt.Printf("  │  db:   %-30s │\n", dbURL)
	}
	fmt.Println("  └──────────────────────────────────────┘")
	fmt.Println()

	ctx := context.Background()
	conn := connect(ctx, dbURL)
	defer conn.Close(ctx)

	switch {
	case *status:
		cmdStatus(ctx, conn)
	case *reset:
		cmdReset(ctx, conn)
	default:
		cmdMigrate(ctx, conn)
	}
}
