package auth

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"sync"
)

type Handler struct {
	password    string
	mu          sync.Mutex
	attempts    int
	locked      bool
	maxAttempts int
	sessions    map[string]bool
	dataDir     string
}

func New(password string) *Handler {
	home, _ := os.UserHomeDir()
	dataDir := filepath.Join(home, ".wede")
	os.MkdirAll(dataDir, 0700)

	h := &Handler{
		password:    password,
		maxAttempts: 3,
		sessions:    make(map[string]bool),
		dataDir:     dataDir,
	}
	h.loadSessions()
	return h
}

func (h *Handler) sessionsFile() string {
	return filepath.Join(h.dataDir, "sessions.json")
}

func (h *Handler) loadSessions() {
	data, err := os.ReadFile(h.sessionsFile())
	if err != nil {
		return
	}
	var tokens []string
	if json.Unmarshal(data, &tokens) == nil {
		for _, t := range tokens {
			h.sessions[t] = true
		}
	}
}

func (h *Handler) saveSessions() {
	tokens := make([]string, 0, len(h.sessions))
	for t := range h.sessions {
		tokens = append(tokens, t)
	}
	data, _ := json.Marshal(tokens)
	os.WriteFile(h.sessionsFile(), data, 0600)
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	h.mu.Lock()
	if h.locked {
		h.mu.Unlock()
		w.WriteHeader(http.StatusForbidden)
		json.NewEncoder(w).Encode(map[string]any{
			"error":   "locked",
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
				"error":   "locked",
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
	h.saveSessions()

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
