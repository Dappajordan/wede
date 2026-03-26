-- Seed data
INSERT INTO users (email, name) VALUES
    ('admin@example.com', 'Admin')
ON CONFLICT (email) DO NOTHING;
