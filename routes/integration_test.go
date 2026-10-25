// Integration tests for the HTTP API.
// PostgreSQL database named by TEST_DATABASE_URL and are skipped without it.
package routes_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	"github.com/straightchlorine/usher/db"
	"github.com/straightchlorine/usher/middlewares"
	"github.com/straightchlorine/usher/models"
	"github.com/straightchlorine/usher/routes"
)

// testEnv holds a database pool and an httptest server running the real router.
type testEnv struct {
	t      *testing.T
	pool   *pgxpool.Pool
	server *httptest.Server
}

// setupEnv connects to TEST_DATABASE_URL and serves the router with a JWT secret.
// The calling test is skipped when TEST_DATABASE_URL is unset.
func setupEnv(t *testing.T) *testEnv {
	t.Helper()
	dbURL := os.Getenv("TEST_DATABASE_URL")
	if dbURL == "" {
		t.Skip("TEST_DATABASE_URL not set; skipping integration test")
	}

	// same secret source as main.go
	t.Setenv("JWT_SECRET", "integration-test-secret")
	secret := middlewares.InitJWTSecret()

	pool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		t.Fatalf("connect to test database: %v", err)
	}
	t.Cleanup(pool.Close)
	if err := pool.Ping(context.Background()); err != nil {
		t.Fatalf("ping test database: %v", err)
	}

	// demo account is seeded at startup in main.go; do the same here
	if err := db.EnsureDemoUser(context.Background(), pool); err != nil {
		t.Fatalf("seed demo user: %v", err)
	}

	srv := httptest.NewServer(routes.SetupRoutes(pool, secret))
	t.Cleanup(srv.Close)

	return &testEnv{t: t, pool: pool, server: srv}
}

// seedUser inserts a user with the given role and returns its id, username and password.
func (e *testEnv) seedUser(role string) (id, username, password string) {
	e.t.Helper()
	username = "user-" + uuid.NewString()[:8]
	password = "pass-" + uuid.NewString()[:8]
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.MinCost)
	if err != nil {
		e.t.Fatalf("hash password: %v", err)
	}
	err = e.pool.QueryRow(
		context.Background(), `
		INSERT INTO users (name, surname, username, email, password_hash, role_id)
		VALUES ('Test', 'User', $1, $2, $3, (SELECT id FROM roles WHERE name = $4))
		RETURNING id::text`,
		username, username+"@example.test", string(hash), role,
	).Scan(&id)
	if err != nil {
		e.t.Fatalf("seed user: %v", err)
	}
	return id, username, password
}

// seedEvent inserts a location and an upcoming event with the given ticket count.
func (e *testEnv) seedEvent(tickets int) int {
	e.t.Helper()
	ctx := context.Background()

	var locationID, eventID int
	err := e.pool.QueryRow(
		ctx, `
		INSERT INTO locations (stadium, address, country, capacity)
		VALUES ($1, '1 Test Street', 'Testland', 1000)
		RETURNING id`,
		"Stadium-"+uuid.NewString()[:8],
	).Scan(&locationID)
	if err != nil {
		e.t.Fatalf("seed location: %v", err)
	}

	err = e.pool.QueryRow(
		ctx, `
		INSERT INTO events (name, date, price, location_id, available_tickets)
		VALUES ($1, $2, 25.00, $3, $4)
		RETURNING id`,
		"Event-"+uuid.NewString()[:8], time.Now().Add(30*24*time.Hour), locationID, tickets,
	).Scan(&eventID)
	if err != nil {
		e.t.Fatalf("seed event: %v", err)
	}
	return eventID
}

// do sends a JSON request and returns the status and body. It does not touch
// the test state, so it is safe to call from goroutines.
func (e *testEnv) do(method, path, token string, body any) (int, []byte, error) {
	var reader io.Reader
	if body != nil {
		payload, err := json.Marshal(body)
		if err != nil {
			return 0, nil, err
		}
		reader = bytes.NewReader(payload)
	}

	req, err := http.NewRequest(method, e.server.URL+path, reader)
	if err != nil {
		return 0, nil, err
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()

	out, err := io.ReadAll(resp.Body)
	return resp.StatusCode, out, err
}

// call is do for the test goroutine: transport errors fail the test.
func (e *testEnv) call(method, path, token string, body any) (int, []byte) {
	e.t.Helper()
	status, out, err := e.do(method, path, token, body)
	if err != nil {
		e.t.Fatalf("%s %s: %v", method, path, err)
	}
	return status, out
}

// expect checks the status code of a request and returns the response body.
func (e *testEnv) expect(want int, label, method, path, token string, body any) []byte {
	e.t.Helper()
	status, out := e.call(method, path, token, body)
	if status != want {
		e.t.Errorf(
			"%s: %s %s status = %d (body %q), want %d",
			label,
			method,
			path,
			status,
			out,
			want,
		)
	}
	return out
}

// tokenFor logs in and returns the JWT, failing the test if login does not succeed.
func (e *testEnv) tokenFor(username, password string) string {
	e.t.Helper()
	status, out := e.call("POST", "/api/login", "", models.LoginRequest{
		Username: username,
		Password: password,
	})
	if status != http.StatusOK {
		e.t.Fatalf("login as %s: status %d, body %q", username, status, out)
	}

	var login models.LoginResponse
	if err := json.Unmarshal(out, &login); err != nil || login.Token == "" {
		e.t.Fatalf("login as %s: no token in response %q (err %v)", username, out, err)
	}
	return login.Token
}

// reserve creates a reservation of the given size and returns its id.
func (e *testEnv) reserve(token string, eventID, tickets int) string {
	e.t.Helper()
	out := e.expect(http.StatusCreated, "create reservation", "PUT", "/api/reservations",
		token, reservationBody(eventID, tickets))

	var created models.SuccessResponseCreateUUID
	if err := json.Unmarshal(out, &created); err != nil || created.UUID == "" {
		e.t.Fatalf("create reservation: no id in response %q (err %v)", out, err)
	}
	return created.UUID
}

// reservationBody builds a payload with the given number of STANDARD tickets.
func reservationBody(eventID, tickets int) map[string]any {
	list := make([]map[string]string, 0, tickets)
	for range tickets {
		list = append(list, map[string]string{"type": "STANDARD"})
	}
	return map[string]any{"event_id": eventID, "tickets": list}
}

func TestLogin(t *testing.T) {
	e := setupEnv(t)
	_, username, password := e.seedUser("REGISTERED")

	status, _ := e.call("POST", "/api/login", "", models.LoginRequest{
		Username: username,
		Password: "wrong-" + password,
	})
	if status != http.StatusUnauthorized {
		t.Errorf("wrong password: status = %d, want 401", status)
	}

	// tokenFor fails the test unless a token is returned
	token := e.tokenFor(username, password)
	e.reserve(token, e.seedEvent(1), 1)
	e.expect(http.StatusOK, "token accepted by protected route", "GET",
		"/api/reservations/user", token, nil)
}

func TestProtectedRouteRequiresAuth(t *testing.T) {
	e := setupEnv(t)

	e.expect(http.StatusUnauthorized, "no Authorization header", "GET",
		"/api/reservations/user", "", nil)
	e.expect(http.StatusUnauthorized, "garbage token", "GET",
		"/api/reservations/user", "not-a-jwt", nil)
}

func TestReservationOwnership(t *testing.T) {
	e := setupEnv(t)
	eventID := e.seedEvent(10)

	aID, aName, aPass := e.seedUser("REGISTERED")
	_, bName, bPass := e.seedUser("REGISTERED")
	_, adminName, adminPass := e.seedUser("ADMIN")
	tokenA := e.tokenFor(aName, aPass)
	tokenB := e.tokenFor(bName, bPass)
	tokenAdmin := e.tokenFor(adminName, adminPass)

	resPath := "/api/reservations/" + e.reserve(tokenA, eventID, 1)

	// user B must not read, cancel or list A's reservations
	e.expect(http.StatusForbidden, "B reads A's reservation", "GET", resPath, tokenB, nil)
	e.expect(http.StatusForbidden, "B cancels A's reservation", "POST",
		resPath+"/cancel", tokenB, nil)
	e.expect(http.StatusForbidden, "B lists A's reservations", "GET",
		"/api/reservations/user/"+aID, tokenB, nil)

	// the rejected cancel must not have changed the reservation
	var res models.ReservationResponse
	out := e.expect(http.StatusOK, "A reads own reservation", "GET", resPath, tokenA, nil)
	if err := json.Unmarshal(out, &res); err != nil {
		t.Fatalf("decode reservation: %v", err)
	}
	if res.Status != "CONFIRMED" {
		t.Errorf("status after rejected cancel = %q, want CONFIRMED", res.Status)
	}

	e.expect(http.StatusOK, "A lists own reservations", "GET",
		"/api/reservations/user/"+aID, tokenA, nil)
	e.expect(http.StatusOK, "admin reads A's reservation", "GET", resPath, tokenAdmin, nil)
	e.expect(http.StatusOK, "A cancels own reservation", "POST",
		resPath+"/cancel", tokenA, nil)

	// admin may cancel any reservation
	adminResPath := "/api/reservations/" + e.reserve(tokenA, eventID, 1)
	e.expect(http.StatusOK, "admin cancels A's reservation", "POST",
		adminResPath+"/cancel", tokenAdmin, nil)
}

func TestConcurrentReservationsDoNotOversell(t *testing.T) {
	const available = 5
	const attempts = 20

	e := setupEnv(t)
	eventID := e.seedEvent(available)
	_, username, password := e.seedUser("REGISTERED")
	token := e.tokenFor(username, password)

	statuses := make([]int, attempts)
	errs := make([]error, attempts)
	start := make(chan struct{})

	var wg sync.WaitGroup
	for i := range attempts {
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start // release all requests at once
			statuses[i], _, errs[i] = e.do("PUT", "/api/reservations", token,
				reservationBody(eventID, 1))
		}()
	}
	close(start)
	wg.Wait()

	succeeded := 0
	for i := range attempts {
		if errs[i] != nil {
			t.Errorf("attempt %d: transport error: %v", i, errs[i])
			continue
		}
		if statuses[i] >= 200 && statuses[i] < 300 {
			succeeded++
		} else if statuses[i] != http.StatusBadRequest {
			t.Errorf("attempt %d: loser got %d, want 400", i, statuses[i])
		}
	}
	t.Logf("statuses: %v", statuses)
	if succeeded != available {
		t.Errorf("successful reservations = %d, want %d (statuses %v)",
			succeeded, available, statuses)
	}

	var remaining, reservations int
	ctx := context.Background()
	if err := e.pool.QueryRow(
		ctx,
		`SELECT available_tickets FROM events WHERE id = $1`, eventID,
	).Scan(&remaining); err != nil {
		t.Fatalf("read available tickets: %v", err)
	}
	if err := e.pool.QueryRow(
		ctx,
		`SELECT COUNT(*) FROM reservations WHERE event_id = $1`, eventID,
	).Scan(&reservations); err != nil {
		t.Fatalf("count reservations: %v", err)
	}

	if remaining != 0 {
		t.Errorf("available_tickets = %d, want 0", remaining)
	}
	if reservations != available {
		t.Errorf("stored reservations = %d, want %d", reservations, available)
	}
}

// availableTickets reads the current available_tickets of an event.
func (e *testEnv) availableTickets(eventID int) int {
	e.t.Helper()
	var n int
	if err := e.pool.QueryRow(
		context.Background(),
		`SELECT available_tickets FROM events WHERE id = $1`, eventID,
	).Scan(&n); err != nil {
		e.t.Fatalf("read available tickets: %v", err)
	}
	return n
}

func TestDeleteEventRequiresAdmin(t *testing.T) {
	e := setupEnv(t)
	_, userName, userPass := e.seedUser("REGISTERED")
	_, adminName, adminPass := e.seedUser("ADMIN")
	tokenUser := e.tokenFor(userName, userPass)
	tokenAdmin := e.tokenFor(adminName, adminPass)

	eventID := e.seedEvent(5)
	path := "/api/events/" + strconv.Itoa(eventID)

	e.expect(http.StatusForbidden, "non-admin deletes event", "DELETE", path, tokenUser, nil)
	var count int
	if err := e.pool.QueryRow(
		context.Background(), `SELECT COUNT(*) FROM events WHERE id = $1`, eventID,
	).Scan(&count); err != nil || count != 1 {
		t.Fatalf("event after rejected delete: count %d, err %v", count, err)
	}

	e.expect(http.StatusOK, "admin deletes event", "DELETE", path, tokenAdmin, nil)
	if err := e.pool.QueryRow(
		context.Background(), `SELECT COUNT(*) FROM events WHERE id = $1`, eventID,
	).Scan(&count); err != nil || count != 0 {
		t.Errorf("event after admin delete: count %d, err %v", count, err)
	}
}

func TestCreateUserRequiresAdmin(t *testing.T) {
	e := setupEnv(t)
	_, userName, userPass := e.seedUser("REGISTERED")
	tokenUser := e.tokenFor(userName, userPass)

	newName := "new-" + uuid.NewString()[:8]
	e.expect(http.StatusForbidden, "non-admin creates user", "PUT", "/api/users/", tokenUser,
		map[string]any{
			"name": "New", "surname": "User", "username": newName,
			"email": newName + "@example.test", "password": "pw-" + newName,
			"role_name": "REGISTERED", "is_active": true,
		})

	var count int
	if err := e.pool.QueryRow(
		context.Background(), `SELECT COUNT(*) FROM users WHERE username = $1`, newName,
	).Scan(&count); err != nil || count != 0 {
		t.Errorf("user created despite 403: count %d, err %v", count, err)
	}
}

func TestCancelReservationRestoresTickets(t *testing.T) {
	e := setupEnv(t)
	_, username, password := e.seedUser("REGISTERED")
	token := e.tokenFor(username, password)
	eventID := e.seedEvent(10)

	resPath := "/api/reservations/" + e.reserve(token, eventID, 3)
	if got := e.availableTickets(eventID); got != 7 {
		t.Fatalf("available after reserving 3 = %d, want 7", got)
	}

	e.expect(http.StatusOK, "first cancel", "POST", resPath+"/cancel", token, nil)
	if got := e.availableTickets(eventID); got != 10 {
		t.Errorf("available after cancel = %d, want 10", got)
	}

	e.expect(http.StatusConflict, "second cancel", "POST", resPath+"/cancel", token, nil)
	if got := e.availableTickets(eventID); got != 10 {
		t.Errorf("available after second cancel = %d, want 10", got)
	}
}

func TestDeleteReservationRestoresTickets(t *testing.T) {
	e := setupEnv(t)
	_, username, password := e.seedUser("REGISTERED")
	_, adminName, adminPass := e.seedUser("ADMIN")
	token := e.tokenFor(username, password)
	tokenAdmin := e.tokenFor(adminName, adminPass)
	eventID := e.seedEvent(10)

	resPath := "/api/reservations/" + e.reserve(token, eventID, 4)
	if got := e.availableTickets(eventID); got != 6 {
		t.Fatalf("available after reserving 4 = %d, want 6", got)
	}

	e.expect(http.StatusOK, "admin deletes confirmed reservation", "DELETE", resPath,
		tokenAdmin, nil)
	if got := e.availableTickets(eventID); got != 10 {
		t.Errorf("available after delete = %d, want 10", got)
	}

	// deleting an already cancelled reservation must not return tickets twice
	resPath = "/api/reservations/" + e.reserve(token, eventID, 2)
	e.expect(http.StatusOK, "cancel", "POST", resPath+"/cancel", token, nil)
	e.expect(http.StatusOK, "admin deletes cancelled reservation", "DELETE", resPath,
		tokenAdmin, nil)
	if got := e.availableTickets(eventID); got != 10 {
		t.Errorf("available after deleting cancelled = %d, want 10", got)
	}
}

func TestRegister(t *testing.T) {
	e := setupEnv(t)
	suffix := uuid.NewString()[:8]
	body := models.RegisterRequest{
		Name: "Jane", Surname: "Fan", Username: "jane." + suffix,
		Email: "jane-" + suffix + "@example.test", Password: "matchday1",
	}

	out := e.expect(http.StatusCreated, "register", "POST", "/api/register", "", body)
	var created models.SuccessResponseCreateUUID
	if err := json.Unmarshal(out, &created); err != nil || created.UUID == "" {
		t.Fatalf("register: no id in response %q (err %v)", out, err)
	}
	if created.Message != "Account created." {
		t.Errorf("register message = %q", created.Message)
	}

	// the new account is an active REGISTERED user who can log in
	var role string
	var active bool
	if err := e.pool.QueryRow(
		context.Background(),
		`SELECT r.name, u.is_active FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1`,
		created.UUID,
	).Scan(&role, &active); err != nil || role != "REGISTERED" || !active {
		t.Errorf("registered user: role %q, active %v, err %v", role, active, err)
	}
	e.tokenFor(body.Username, body.Password)

	// same username, fresh email
	dupName := body
	dupName.Email = "other-" + suffix + "@example.test"
	e.expect(http.StatusConflict, "duplicate username", "POST", "/api/register", "", dupName)

	// same email, fresh username
	dupMail := body
	dupMail.Username = "other." + suffix
	out = e.expect(http.StatusConflict, "duplicate email", "POST", "/api/register", "", dupMail)
	if !bytes.Contains(out, []byte("That username or email is already registered.")) {
		t.Errorf("duplicate message = %q", out)
	}
}

func TestRegisterValidation(t *testing.T) {
	e := setupEnv(t)
	suffix := uuid.NewString()[:8]
	valid := models.RegisterRequest{
		Name: "Jane", Surname: "Fan", Username: "val." + suffix,
		Email: "val-" + suffix + "@example.test", Password: "matchday1",
	}

	short := valid
	short.Password = "short"
	e.expect(http.StatusBadRequest, "short password", "POST", "/api/register", "", short)

	badName := valid
	badName.Username = "bad name!"
	e.expect(http.StatusBadRequest, "bad username chars", "POST", "/api/register", "", badName)

	badMail := valid
	badMail.Email = "no-at-sign"
	e.expect(http.StatusBadRequest, "email without @", "POST", "/api/register", "", badMail)

	missing := valid
	missing.Surname = ""
	e.expect(http.StatusBadRequest, "missing surname", "POST", "/api/register", "", missing)

	var count int
	if err := e.pool.QueryRow(
		context.Background(), `SELECT COUNT(*) FROM users WHERE username = $1`, valid.Username,
	).Scan(&count); err != nil || count != 0 {
		t.Errorf("user created despite 400: count %d, err %v", count, err)
	}
}

func TestDemoUserCanLogIn(t *testing.T) {
	e := setupEnv(t)
	username := os.Getenv("DEMO_USERNAME")
	if username == "" {
		username = "demo"
	}
	password := os.Getenv("DEMO_PASSWORD")
	if password == "" {
		password = "matchday"
	}
	e.tokenFor(username, password)
}
