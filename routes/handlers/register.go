package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	"github.com/straightchlorine/usher/models"
)

// RegisterHandler lets anyone create an account with the registered role.
//
//	@Summary		Register a new account.
//	@Description	Create an active user with the registered role. No authentication required.
//	@ID				api.register
//	@Tags			auth
//	@Accept			json
//	@Produce		json
//	@Param			body	body		models.RegisterRequest				true	"Account details"
//	@Success		201		{object}	models.SuccessResponseCreateUUID	"Account created"
//	@Failure		400		{object}	models.ErrorResponse				"Bad Request"
//	@Failure		409		{object}	models.ErrorResponse				"Username or email already registered"
//	@Failure		500		{object}	models.ErrorResponse				"Internal Server Error"
//	@Router			/register [post]
func RegisterHandler(pool *pgxpool.Pool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var req models.RegisterRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeErrorResponse(w, http.StatusBadRequest, "Invalid JSON input.")
			return
		}

		if err := validateRegisterPayload(&req); err != nil {
			writeErrorResponse(w, http.StatusBadRequest, err.Error())
			return
		}

		passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			writeErrorResponse(w, http.StatusInternalServerError, "Failed to hash the password.")
			return
		}

		roleId, err := fetchRoleId(r.Context(), pool, "REGISTERED")
		if err != nil {
			writeErrorResponse(w, roleId, err.Error())
			return
		}

		var userId string
		err = pool.QueryRow(
			r.Context(), `
			INSERT INTO users
				(name, surname, username, email, is_active, password_hash, role_id, last_login)
			VALUES ($1, $2, $3, $4, TRUE, $5, $6, NOW())
			RETURNING id`,
			req.Name, req.Surname, req.Username, req.Email, string(passwordHash), roleId,
		).Scan(&userId)
		if err != nil {
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == "23505" {
				writeErrorResponse(
					w,
					http.StatusConflict,
					"That username or email is already registered.",
				)
				return
			}
			writeErrorResponse(w, http.StatusInternalServerError, "Failed to create the account.")
			return
		}

		writeJSONResponse(
			w,
			http.StatusCreated,
			models.SuccessResponseCreateUUID{Message: "Account created.", UUID: userId},
		)
	}
}

// Trim and validate a registration payload; the error text is shown to the client.
func validateRegisterPayload(req *models.RegisterRequest) error {
	req.Name = strings.TrimSpace(req.Name)
	req.Surname = strings.TrimSpace(req.Surname)
	req.Username = strings.TrimSpace(req.Username)
	req.Email = strings.TrimSpace(req.Email)

	if req.Name == "" || req.Surname == "" || req.Username == "" ||
		req.Email == "" || req.Password == "" {
		return fmt.Errorf("Name, surname, username, email and password are all required.")
	}
	if len(req.Name) > 100 || len(req.Surname) > 100 {
		return fmt.Errorf("Name and surname must be at most 100 characters.")
	}
	if len(req.Username) < 3 || len(req.Username) > 50 {
		return fmt.Errorf("Username must be 3 to 50 characters long.")
	}
	for _, c := range req.Username {
		ok := c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c >= '0' && c <= '9' ||
			c == '.' || c == '-' || c == '_'
		if !ok {
			return fmt.Errorf(
				"Username may only contain letters, digits, dots, dashes and underscores.",
			)
		}
	}
	if !strings.Contains(req.Email, "@") {
		return fmt.Errorf("Email must contain an @.")
	}
	if len(req.Email) > 150 {
		return fmt.Errorf("Email must be at most 150 characters.")
	}
	if len(req.Password) < 8 {
		return fmt.Errorf("Password must be at least 8 characters long.")
	}
	return nil
}
