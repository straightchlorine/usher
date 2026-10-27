package middlewares

import (
	"errors"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Retrieve an environment variable as an integer or returns a default value.
func getEnvAsInt(key string, defaultValue int) (int, error) {
	valueStr := os.Getenv(key)
	if valueStr == "" {
		return defaultValue, nil
	}
	value, err := strconv.Atoi(valueStr)
	if err != nil {
		return defaultValue, fmt.Errorf("invalid value for %s: %v", key, err)
	}
	return value, nil
}

// Creates a JWT token with user claims.
func GenerateJWT(userID string, username string, role string, secret string) (string, int64, error) {
	// get the token validity duration from env variable, otherwise 24 hours
	validHours, err := getEnvAsInt("TOKEN_VALID_HOURS", 24)
	if err != nil {
		log.Printf("Invalid TOKEN_VALID_HOURS, defaulting to 24 hours: %v", err)
	}

	expirationTime := time.Now().Add(time.Hour * time.Duration(validHours)).Unix()

	// generate the claims
	claims := jwt.MapClaims{
		"userID":   userID,
		"username": username,
		"role":     role,
		"exp":      expirationTime,
	}

	// create the JWT token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", 0, fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, expirationTime, nil
}

// Validate the JWT token from the Authorization header
func ValidateJWT(tokenString string, secret string) (*jwt.Token, error) {
	return jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// validate the signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("invalid signing method")
		}
		return []byte(secret), nil
	})
}

// Read the JWT secret from the environment; refuse to start without one.
func InitJWTSecret() string {
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Fatal("JWT_SECRET is not set; set it to a long random string before starting the API")
	}
	return jwtSecret
}
