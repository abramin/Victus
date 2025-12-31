package service

import (
	"context"
	"time"

	"victus/internal/domain"
	"victus/internal/store"
)

// ProfileService handles business logic for user profiles.
type ProfileService struct {
	store *store.ProfileStore
}

// NewProfileService creates a new ProfileService.
func NewProfileService(s *store.ProfileStore) *ProfileService {
	return &ProfileService{store: s}
}

// Get retrieves the user profile.
// Returns store.ErrProfileNotFound if no profile exists.
func (s *ProfileService) Get(ctx context.Context) (*domain.UserProfile, error) {
	return s.store.Get(ctx)
}

// Upsert creates or updates the user profile.
// Applies defaults and validates before persisting.
func (s *ProfileService) Upsert(ctx context.Context, profile *domain.UserProfile, now time.Time) (*domain.UserProfile, error) {
	profile.SetDefaults()
	if err := profile.ValidateAt(now); err != nil {
		return nil, err
	}
	if err := s.store.Upsert(ctx, profile); err != nil {
		return nil, err
	}
	return s.store.Get(ctx)
}

// Delete removes the user profile.
func (s *ProfileService) Delete(ctx context.Context) error {
	return s.store.Delete(ctx)
}
