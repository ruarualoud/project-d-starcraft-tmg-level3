-- Ticket 11 PostgreSQL RoomStore schema contract.
-- This file is declarative only; Codex has not executed a migration.

CREATE TABLE sc_rooms (
  room_id text PRIMARY KEY,
  room_revision bigint NOT NULL CHECK (room_revision >= 0),
  state_revision bigint NOT NULL CHECK (state_revision >= 0),
  private_sequence bigint NOT NULL CHECK (private_sequence >= 0),
  public_sequence bigint NOT NULL CHECK (public_sequence >= 0),
  recovery_revision bigint NOT NULL CHECK (recovery_revision >= 0),
  aggregate_cipher text NOT NULL,
  initial_envelope_cipher text NOT NULL,
  created_at_audit timestamptz NOT NULL,
  updated_at_audit timestamptz NOT NULL
);

CREATE TABLE sc_private_journal (
  room_id text NOT NULL REFERENCES sc_rooms(room_id) ON DELETE RESTRICT,
  sequence bigint NOT NULL CHECK (sequence > 0),
  payload_cipher text NOT NULL,
  PRIMARY KEY (room_id, sequence)
);

CREATE TABLE sc_public_journal (
  room_id text NOT NULL REFERENCES sc_rooms(room_id) ON DELETE RESTRICT,
  sequence bigint NOT NULL CHECK (sequence > 0),
  payload_json jsonb NOT NULL,
  PRIMARY KEY (room_id, sequence)
);

CREATE TABLE sc_seat_recovery (
  room_id text NOT NULL REFERENCES sc_rooms(room_id) ON DELETE RESTRICT,
  recovery_revision bigint NOT NULL CHECK (recovery_revision > 0),
  seat_key text NOT NULL,
  payload_cipher text NOT NULL,
  PRIMARY KEY (room_id, recovery_revision)
);

CREATE TABLE sc_idempotency (
  room_id text NOT NULL REFERENCES sc_rooms(room_id) ON DELETE RESTRICT,
  key_hash text NOT NULL,
  result_cipher text NOT NULL,
  PRIMARY KEY (room_id, key_hash)
);

CREATE TABLE sc_checkpoints (
  room_id text NOT NULL REFERENCES sc_rooms(room_id) ON DELETE RESTRICT,
  state_revision bigint NOT NULL CHECK (state_revision >= 0),
  private_sequence bigint NOT NULL CHECK (private_sequence >= 0),
  checkpoint_cipher text NOT NULL,
  checkpoint_hash text NOT NULL,
  PRIMARY KEY (room_id, state_revision)
);

