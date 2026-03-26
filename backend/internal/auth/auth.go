package auth

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"sync"
)

type Handler struct {
	password    string
	mu          sync.Mutex
	attempts    int
	locked      bool
	maxAttempts int
	sessions    map[string]bool
}

func New(password string) *Handler {
	return &Handler{
		password:    password,
		maxAttempts: 3,
		sessions:    make(map[string]bool),
	}
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	h.mu.Lock()
	if h.locked {
		h.mu.Unlock()
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]any{
			"error":  "locked",
			"message": "Too many failed attempts. Restart the server to unlock.",
		})
		return
	}
	h.mu.Unlock()

	var body struct {
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "invalid request"})
		return
	}

	h.mu.Lock()
	defer h.mu.Unlock()

	if body.Password != h.password {
		h.attempts++
		remaining := h.maxAttempts - h.attempts
		if remaining <= 0 {
			h.locked = true
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(map[string]any{
				"error":  "locked",
				"message": "Too many failed attempts. Restart the server to unlock.",
			})
			return
		}
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]any{
			"error":     "wrong_password",
			"remaining": remaining,
		})
		return
	}

	h.attempts = 0

	token := make([]byte, 32)
	rand.Read(token)
	sessionToken := hex.EncodeToString(token)
	h.sessions[sessionToken] = true

	json.NewEncoder(w).Encode(map[string]string{
		"token": sessionToken,
	})
}

func (h *Handler) Check(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	token := r.Header.Get("Authorization")
	if token == "" {
		token = r.URL.Query().Get("token")
	}

	h.mu.Lock()
	valid := h.sessions[token]
	locked := h.locked
	h.mu.Unlock()

	json.NewEncoder(w).Encode(map[string]any{
		"authenticated": valid,
		"locked":        locked,
	})
}

func (h *Handler) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := r.Header.Get("Authorization")
		if token == "" {
			token = r.URL.Query().Get("token")
		}

		h.mu.Lock()
		valid := h.sessions[token]
		h.mu.Unlock()

		if !valid {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"error": "unauthorized"})
			return
		}
		next.ServeHTTP(w, r)
	})
}
