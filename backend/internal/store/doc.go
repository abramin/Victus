// Package store provides database persistence for domain entities.
//
// # Store Boundary Conventions
//
// Stores are pure I/O adapters. They fetch and persist data — nothing more.
//
// ## What stores DO:
//   - Map database rows to domain types and vice versa
//   - Execute SQL queries and handle database errors
//   - Return sentinel errors (ErrNotFound, ErrAlreadyExists) for expected conditions
//   - Manage transactions via WithTx pattern
//
// ## What stores must NOT do:
//   - Check domain state (e.g., `if log.DayType == ...`)
//   - Make state transition decisions
//   - Enforce business rules or invariants beyond data integrity
//   - Validate domain logic
//   - Call domain methods that make decisions
//
// ## The key test:
//
// Can this store be replaced with a different implementation (Postgres, Redis, file)
// without changing any domain logic? If the store contains if/else on domain state
// or calls domain methods to make decisions, it is doing too much.
//
// ## Error handling:
//
// Stores return sentinel errors only. Domain-level error interpretation
// belongs in the service layer.
//
// ## Model organization:
//
// Domain construction always goes through the service layer (using constructors).
// Stores never mutate domain state — they return what they read and persist what
// they receive.
package store
