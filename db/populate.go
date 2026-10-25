package db

import (
	"context"
	"log"
	"math"
	"os"
	"time"

	"github.com/brianvoe/gofakeit/v6"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"
)

// Fetch the IDs of existing records from given table.
func fetchIds(ctx context.Context, pool *pgxpool.Pool, table string) []int {
	// fetch the ids from the table
	rows, err := pool.Query(ctx, "SELECT id FROM "+table)
	if err != nil {
		return []int{}
	}
	defer rows.Close()

	// build the list of ids
	var ids []int
	for rows.Next() {
		var id int
		if err := rows.Scan(&id); err != nil {
			return []int{}
		}
		ids = append(ids, id)
	}
	return ids
}

// Fetch the IDs of existing records from given table.
func fetchUUIDIds(ctx context.Context, pool *pgxpool.Pool, table string) []uuid.UUID {
	// fetch the ids from the table
	rows, err := pool.Query(ctx, "SELECT id FROM "+table)
	if err != nil {
		return []uuid.UUID{}
	}
	defer rows.Close()

	// build the list of ids
	var ids []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return []uuid.UUID{}
		}
		ids = append(ids, id)
	}
	return ids
}

// Add an admin user to the database.
func AddAdminUser(fake *gofakeit.Faker, pool *pgxpool.Pool) error {
	// get the root user credentials from env
	root_password := os.Getenv("ROOT_PASSWORD")
	root_username := os.Getenv("ROOT_NAME")

	// if not provided, go with root
	if root_password == "" {
		root_password = "root"
	}
	if root_username == "" {
		root_username = "root"
	}

	// create hash from provided password
	passwordHash, err := bcrypt.GenerateFromPassword([]byte(root_password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	if fake == nil {
		fake = gofakeit.New(0)
	}

	// fill in the root user struct
	root_user := UserPopulate{
		Name:     "Root",
		Surname:  "Root",
		Username: root_username,
		Email:    "root@root.rt",
		RoleID:   3, // admin role
		IsActive: true,
	}

	// query template for inserting a user
	query := `
		INSERT INTO Users (name, surname, username,
											email, password_hash, role_id,
											is_active, last_login, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`

	// in case nil is passed, populating is off, so run regular insert
	if pool != nil {
		_, err := pool.Exec(
			context.Background(),
			query+" ON CONFLICT DO NOTHING",
			root_user.Name,
			root_user.Surname,
			root_user.Username,
			root_user.Email,
			string(passwordHash),
			root_user.RoleID,
			root_user.IsActive,
		)
		if err != nil {
			return err
		}

		return EnsureDemoUser(context.Background(), pool)
	}
	return nil
}

// EnsureDemoUser makes sure the demo fan account exists. It does nothing if the
// username is already taken, so it is safe to run on every startup.
func EnsureDemoUser(ctx context.Context, pool *pgxpool.Pool) error {
	username := os.Getenv("DEMO_USERNAME")
	password := os.Getenv("DEMO_PASSWORD")
	if username == "" {
		username = "demo"
	}
	if password == "" {
		password = "matchday"
	}

	var exists bool
	if err := pool.QueryRow(
		ctx, "SELECT EXISTS (SELECT 1 FROM Users WHERE username = $1)", username,
	).Scan(&exists); err != nil {
		return err
	}
	if exists {
		return nil
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	// ON CONFLICT covers a taken email, or a concurrent startup racing this check
	_, err = pool.Exec(
		ctx, `
		INSERT INTO Users (name, surname, username, email, password_hash,
											 role_id, is_active, last_login, created_at)
		VALUES ('Demo', 'Fan', $1, 'demo@usher.example', $2,
						(SELECT id FROM Roles WHERE name = 'REGISTERED'), TRUE, NOW(), NOW())
		ON CONFLICT DO NOTHING`,
		username, string(passwordHash),
	)
	return err
}

type UserPopulate struct {
	Name     string `json:"name"`
	Surname  string `json:"surname"`
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
	RoleID   int    `json:"role_id"`
	IsActive bool   `json:"is_active"`
}

// Populate the database with fake user records.
func populateUsers(ctx context.Context, pool *pgxpool.Pool) error {
	fake := gofakeit.New(0)

	// user struct
	users := make([]UserPopulate, 40)

	// role struct
	roleIDs := fetchIds(ctx, pool, "Roles")

	// batch insert
	batch := &pgx.Batch{}

	// fill the struct with fake data
	for i := range users {
		// fake password, and its hash
		password := fake.Password(true, true, true, true, false, 12)
		passwordHash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			return err
		}

		// fill the struct
		users[i] = UserPopulate{
			Name:     fake.FirstName(),
			Surname:  fake.LastName(),
			Username: fake.Username(),
			Email:    fake.Email(),
			RoleID:   roleIDs[i%len(roleIDs)],
			IsActive: fake.Bool(),
		}

		// fill the batch with requests
		batch.Queue(
			`INSERT INTO Users (name, surname, username,
                          email, password_hash, role_id,
													is_active, last_login, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
			users[i].Name,
			users[i].Surname,
			users[i].Username,
			users[i].Email,
			string(passwordHash),
			users[i].RoleID,
			users[i].IsActive,
			fake.PastDate(),
			fake.PastDate(),
		)
	}

	// send the batch
	br := pool.SendBatch(ctx, batch)
	defer br.Close()

	// return nil if no errors
	return nil
}

type venue struct {
	Stadium  string
	Address  string
	Country  string
	Capacity int
}

// Fictional football venues.
var venues = []venue{
	{"Kestrel Park", "12 Kestrel Road, Northbridge", "England", 32000},
	{"Quayside Stadium", "1 Quay Street, Harbour City", "England", 41000},
	{"Moor Road", "Moor Road, St. Aubin", "England", 18500},
	{"Valley Park", "Valley Park Way, Abercwm", "Wales", 22000},
	{"The Wharf", "Wharf Lane, Castleford", "England", 15000},
	{"Ellis Lane", "Ellis Lane, Port Ellis", "England", 12500},
	{"Redmarsh Park", "Marsh Avenue, Redmarsh", "Scotland", 24000},
	{"Vale Ground", "Vale Road, Albion", "England", 16000},
}

type club struct {
	Name  string
	Venue string
}

// Fictional clubs and their home venues (index matches venues).
var clubs = []club{
	{"Northbridge", "Kestrel Park"},
	{"Harbour City", "Quayside Stadium"},
	{"St. Aubin", "Moor Road"},
	{"Valley Rovers", "Valley Park"},
	{"Castleford Town", "The Wharf"},
	{"Port Ellis", "Ellis Lane"},
	{"Redmarsh", "Redmarsh Park"},
	{"Albion Vale", "Vale Ground"},
}

// Populate the database with the fictional football venues.
func populateLocations(ctx context.Context, pool *pgxpool.Pool) error {
	batch := &pgx.Batch{}
	for _, v := range venues {
		batch.Queue(
			`INSERT INTO Locations (stadium, address, country, capacity)
        VALUES ($1, $2, $3, $4)`,
			v.Stadium, v.Address, v.Country, v.Capacity,
		)
	}

	br := pool.SendBatch(ctx, batch)
	return br.Close()
}

type EventPopulate struct {
	Name             string    `json:"name"`
	Date             time.Time `json:"date"`
	AvailableTickets int       `json:"available_tickets"`
	Price            float64   `json:"price"`
	LocationID       int       `json:"location_id"`
}

// Next occurrence of the weekday strictly after today, at the given time, in UTC.
func nextWeekday(now time.Time, day time.Weekday, hour, min, weeksAhead int) time.Time {
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	delta := (int(day)-int(today.Weekday())+6)%7 + 1
	d := today.AddDate(0, 0, delta+7*weeksAhead)
	return time.Date(d.Year(), d.Month(), d.Day(), hour, min, 0, 0, time.UTC)
}

// Build the 16 football fixtures: every club hosts two, spread over the next 5 weeks.
func buildFixtures(now time.Time, locationIDs map[string]int) []EventPopulate {
	// five slots per week: Sat 15:00, Sat 17:30, Sun 14:00, Sun 16:30, Wed 19:45
	type slot struct {
		day        time.Weekday
		hour, mins int
	}
	slots := []slot{
		{time.Saturday, 15, 0},
		{time.Saturday, 17, 30},
		{time.Sunday, 14, 0},
		{time.Sunday, 16, 30},
		{time.Wednesday, 19, 45},
	}

	// fixed ticket counts for a few fixtures: nearly gone, almost gone, sold out
	special := map[int]int{5: 37, 9: 12, 13: 0}

	const total = 16
	events := make([]EventPopulate, 0, total)
	for i := range total {
		home := clubs[i%len(clubs)]
		offset := 1
		if i >= len(clubs) {
			offset = 3
		}
		away := clubs[(i%len(clubs)+offset)%len(clubs)]

		// pick 16 of the 25 slots, evenly spread
		idx := i * 25 / total
		sl := slots[idx%len(slots)]
		date := nextWeekday(now, sl.day, sl.hour, sl.mins, idx/len(slots))

		tickets, ok := special[i]
		if !ok {
			tickets = 400 + (i*337)%2601
		}

		events = append(events, EventPopulate{
			Name:             home.Name + " vs " + away.Name,
			Date:             date,
			Price:            28 + float64((i*173)%55)/2, // whole euros or .50, 28-55
			LocationID:       locationIDs[home.Venue],
			AvailableTickets: tickets,
		})
	}
	return events
}

// Populate the database with the football fixtures.
func populateEvents(ctx context.Context, pool *pgxpool.Pool) error {
	// map venue names onto their location ids
	locationIDs := map[string]int{}
	rows, err := pool.Query(ctx, "SELECT id, stadium FROM Locations")
	if err != nil {
		return err
	}
	for rows.Next() {
		var id int
		var stadium string
		if err := rows.Scan(&id, &stadium); err != nil {
			rows.Close()
			return err
		}
		locationIDs[stadium] = id
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}

	batch := &pgx.Batch{}
	for _, e := range buildFixtures(time.Now(), locationIDs) {
		batch.Queue(
			`INSERT INTO Events (name, date, price, location_id, available_tickets)
        VALUES ($1, $2, $3, $4, $5)`,
			e.Name, e.Date, e.Price, e.LocationID, e.AvailableTickets,
		)
	}

	br := pool.SendBatch(ctx, batch)
	return br.Close()
}

// Ticket price multiplier per ticket type (1 - discount).
var ticketMultipliers = map[string]float64{
	"STANDARD": 1,
	"STUDENT":  0.8,
	"SENIOR":   0.85,
}

// Cents-rounded ticket price for an event base price and ticket type.
func ticketPrice(base float64, ticketType string) float64 {
	return math.Round(base*ticketMultipliers[ticketType]*100) / 100
}

// Populate the database with fake reservations and matching tickets. Root and
// demo users are never given random reservations.
func populateReservations(ctx context.Context, pool *pgxpool.Pool) error {
	fake := gofakeit.New(0)

	rootName := os.Getenv("ROOT_NAME")
	if rootName == "" {
		rootName = "root"
	}
	demoName := os.Getenv("DEMO_USERNAME")
	if demoName == "" {
		demoName = "demo"
	}

	var userIDs []uuid.UUID
	rows, err := pool.Query(ctx, "SELECT id FROM Users WHERE username NOT IN ($1, $2)", rootName, demoName)
	if err != nil {
		return err
	}
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return err
		}
		userIDs = append(userIDs, id)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}
	if len(userIDs) == 0 {
		return nil
	}

	type eventInfo struct {
		id        int
		price     float64
		available int
	}
	var events []eventInfo
	rows, err = pool.Query(ctx, "SELECT id, price::float8, available_tickets FROM Events ORDER BY id")
	if err != nil {
		return err
	}
	for rows.Next() {
		var e eventInfo
		if err := rows.Scan(&e.id, &e.price, &e.available); err != nil {
			rows.Close()
			return err
		}
		events = append(events, e)
	}
	rows.Close()
	if err := rows.Err(); err != nil {
		return err
	}
	if len(events) == 0 {
		return nil
	}

	// reservation status -> ticket status
	statuses := []struct{ res, ticket string }{
		{"CONFIRMED", "SOLD"},
		{"PENDING", "RESERVED"},
		{"CANCELLED", "CANCELLED"},
	}
	typeNames := []string{"STANDARD", "STUDENT", "SENIOR"}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	for i := range 100 {
		ev := &events[i%len(events)]
		st := statuses[i%len(statuses)]
		total := fake.Number(1, 10)

		// skip reservations that would oversell the fixture
		if st.res != "CANCELLED" && total > ev.available {
			continue
		}

		var resID uuid.UUID
		if err := tx.QueryRow(ctx, `
			INSERT INTO Reservations (user_id, event_id, created_at, total_tickets, status_id)
			VALUES ($1, $2, $3, $4, (SELECT id FROM reservation_statuses WHERE name = $5))
			RETURNING id`,
			userIDs[i%len(userIDs)], ev.id, fake.PastDate(), total, st.res,
		).Scan(&resID); err != nil {
			return err
		}

		for range total {
			tn := typeNames[fake.Number(0, len(typeNames)-1)]
			if _, err := tx.Exec(ctx, `
				INSERT INTO Tickets (reservation_id, price, type_id, status_id)
				VALUES ($1, $2, (SELECT id FROM ticket_types WHERE name = $3),
				        (SELECT id FROM ticket_statuses WHERE name = $4))`,
				resID, ticketPrice(ev.price, tn), tn, st.ticket,
			); err != nil {
				return err
			}
		}

		if st.res != "CANCELLED" {
			if _, err := tx.Exec(ctx,
				"UPDATE Events SET available_tickets = available_tickets - $1 WHERE id = $2 AND available_tickets >= $1",
				total, ev.id); err != nil {
				return err
			}
			ev.available -= total
		}
	}
	return tx.Commit(ctx)
}

// Give the demo fan one CONFIRMED reservation (2 STANDARD + 1 STUDENT, SOLD)
// for the second-soonest fixture and one CANCELLED (1 STANDARD) on the fourth,
// so My tickets shows both sections.
func populateDemoReservation(ctx context.Context, pool *pgxpool.Pool) error {
	username := os.Getenv("DEMO_USERNAME")
	if username == "" {
		username = "demo"
	}

	var userID uuid.UUID
	if err := pool.QueryRow(ctx, "SELECT id FROM Users WHERE username = $1", username).Scan(&userID); err != nil {
		return err
	}

	var eventID int
	var base float64
	if err := pool.QueryRow(
		ctx, "SELECT id, price::float8 FROM Events ORDER BY date ASC, id ASC OFFSET 1 LIMIT 1",
	).Scan(&eventID, &base); err != nil {
		return err
	}

	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var resID uuid.UUID
	if err := tx.QueryRow(ctx, `
		INSERT INTO Reservations (user_id, event_id, total_tickets, status_id)
		VALUES ($1, $2, 3, (SELECT id FROM reservation_statuses WHERE name = 'CONFIRMED'))
		RETURNING id`, userID, eventID).Scan(&resID); err != nil {
		return err
	}

	// price = base * (1 - discount), rounded to cents
	for _, t := range []string{"STANDARD", "STANDARD", "STUDENT"} {
		if _, err := tx.Exec(ctx, `
			INSERT INTO Tickets (reservation_id, price, type_id, status_id)
			SELECT $1, ROUND($2::numeric * (1 - tt.discount), 2), tt.id,
			       (SELECT id FROM ticket_statuses WHERE name = 'SOLD')
			FROM ticket_types tt WHERE tt.name = $3`, resID, base, t); err != nil {
			return err
		}
	}

	if _, err := tx.Exec(ctx,
		"UPDATE Events SET available_tickets = available_tickets - 3 WHERE id = $1 AND available_tickets >= 3",
		eventID); err != nil {
		return err
	}

	// second reservation: CANCELLED, 1 STANDARD on a later fixture (availability untouched)
	var laterID int
	var laterBase float64
	if err := tx.QueryRow(
		ctx, "SELECT id, price::float8 FROM Events ORDER BY date ASC, id ASC OFFSET 3 LIMIT 1",
	).Scan(&laterID, &laterBase); err != nil {
		return err
	}
	if err := tx.QueryRow(ctx, `
		INSERT INTO Reservations (user_id, event_id, total_tickets, status_id)
		VALUES ($1, $2, 1, (SELECT id FROM reservation_statuses WHERE name = 'CANCELLED'))
		RETURNING id`, userID, laterID).Scan(&resID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		INSERT INTO Tickets (reservation_id, price, type_id, status_id)
		SELECT $1, ROUND($2::numeric * (1 - tt.discount), 2), tt.id,
		       (SELECT id FROM ticket_statuses WHERE name = 'CANCELLED')
		FROM ticket_types tt WHERE tt.name = 'STANDARD'`, resID, laterBase); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

// Populate the database with fake data.
func PopulateDatabase(pool *pgxpool.Pool) error {
	// context with timeout
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	// root admin and demo user must exist on every run (AddAdminUser also ensures the demo user)
	if err := AddAdminUser(nil, pool); err != nil {
		return err
	}
	if err := EnsureDemoUser(ctx, pool); err != nil {
		return err
	}

	// skip seeding when fixtures exist, so restarts (--populate on every start) do not duplicate data
	var count int
	if err := pool.QueryRow(ctx, "SELECT COUNT(*) FROM Events").Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		log.Printf("populate: events table already has %d rows, skipping seeding", count)
		return nil
	}

	// group the functions in appropriate order
	populationFuncs := []func(context.Context, *pgxpool.Pool) error{
		populateUsers,
		populateLocations,
		populateEvents,
		populateReservations,
		populateDemoReservation,
	}

	// populate the database
	for _, populateFunc := range populationFuncs {
		if err := populateFunc(ctx, pool); err != nil {
			return err
		}
	}

	return nil
}
