
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_dbs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  encrypted_host VARCHAR(65) NOT NULL,
  encrypted_port VARCHAR(65) NOT NULL,
  encrypted_user VARCHAR(65) NOT NULL,
  encrypted_password VARCHAR(65) NOT NULL,
  encrypted_dbName VARCHAR(65) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE indexing_preferences (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  transaction_types VARCHAR[] NOT NULL,
  categories VARCHAR[] NOT NULL,
  network VARCHAR(10) NOT NULL,
  config JSONB NOT NULL, 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
