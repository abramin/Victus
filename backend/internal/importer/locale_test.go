package importer

import (
	"testing"

	"github.com/stretchr/testify/suite"
)

// Justification: Parsing functions are pure invariants; unit tests lock the
// format handling without external dependencies.

type LocaleSuite struct {
	suite.Suite
}

func TestLocaleSuite(t *testing.T) {
	suite.Run(t, new(LocaleSuite))
}

func (s *LocaleSuite) TestParseSpanishDate() {
	s.Run("simple date uses default year", func() {
		got, err := ParseSpanishDate("2 Dic", 2025)
		s.Require().NoError(err)
		s.Equal("2025-12-02", got)
	})

	s.Run("date with year ignores default", func() {
		got, err := ParseSpanishDate("16 Ene 2026", 2025)
		s.Require().NoError(err)
		s.Equal("2026-01-16", got)
	})

	s.Run("handles leading whitespace", func() {
		got, err := ParseSpanishDate(" 26 Ene", 2026)
		s.Require().NoError(err)
		s.Equal("2026-01-26", got)
	})

	s.Run("empty string returns error", func() {
		_, err := ParseSpanishDate("", 2025)
		s.Require().Error(err)
	})

	s.Run("missing data marker returns error", func() {
		_, err := ParseSpanishDate("--", 2025)
		s.Require().Error(err)
	})
}

func (s *LocaleSuite) TestParseSpanishYearMonth() {
	s.Run("August 2025", func() {
		got, err := ParseSpanishYearMonth("Ago 2025")
		s.Require().NoError(err)
		s.Equal("2025-08", got)
	})

	s.Run("December 2025", func() {
		got, err := ParseSpanishYearMonth("Dic 2025")
		s.Require().NoError(err)
		s.Equal("2025-12", got)
	})

	s.Run("January 2026", func() {
		got, err := ParseSpanishYearMonth("Ene 2026")
		s.Require().NoError(err)
		s.Equal("2026-01", got)
	})

	s.Run("invalid format returns error", func() {
		_, err := ParseSpanishYearMonth("2025")
		s.Require().Error(err)
	})
}

func (s *LocaleSuite) TestParseHRVValue() {
	s.Run("with ms suffix", func() {
		got := ParseHRVValue("33ms")
		s.Require().NotNil(got)
		s.Equal(33, *got)
	})

	s.Run("without suffix", func() {
		got := ParseHRVValue("42")
		s.Require().NotNil(got)
		s.Equal(42, *got)
	})

	s.Run("missing data marker returns nil", func() {
		got := ParseHRVValue("--")
		s.Nil(got)
	})

	s.Run("empty string returns nil", func() {
		got := ParseHRVValue("")
		s.Nil(got)
	})
}

func (s *LocaleSuite) TestParseSleepDuration() {
	s.Run("hours and minutes", func() {
		got := ParseSleepDuration("7h 3min")
		s.Require().NotNil(got)
		s.InDelta(7.05, *got, 0.01)
	})

	s.Run("hours only", func() {
		got := ParseSleepDuration("8h")
		s.Require().NotNil(got)
		s.Equal(8.0, *got)
	})

	s.Run("minutes only", func() {
		got := ParseSleepDuration("45min")
		s.Require().NotNil(got)
		s.Equal(0.75, *got)
	})

	s.Run("missing data returns nil", func() {
		got := ParseSleepDuration("--")
		s.Nil(got)
	})
}

func (s *LocaleSuite) TestParseWeight() {
	s.Run("with kg suffix", func() {
		got := ParseWeight("89.4 kg")
		s.Require().NotNil(got)
		s.Equal(89.4, *got)
	})

	s.Run("without suffix", func() {
		got := ParseWeight("89.4")
		s.Require().NotNil(got)
		s.Equal(89.4, *got)
	})

	s.Run("comma decimal separator", func() {
		got := ParseWeight("89,4 kg")
		s.Require().NotNil(got)
		s.Equal(89.4, *got)
	})

	s.Run("missing data returns nil", func() {
		got := ParseWeight("--")
		s.Nil(got)
	})
}

func (s *LocaleSuite) TestParsePercentage() {
	s.Run("with percent suffix and space", func() {
		got := ParsePercentage("27.1 %")
		s.Require().NotNil(got)
		s.Equal(27.1, *got)
	})

	s.Run("with percent suffix no space", func() {
		got := ParsePercentage("27.1%")
		s.Require().NotNil(got)
		s.Equal(27.1, *got)
	})

	s.Run("without suffix", func() {
		got := ParsePercentage("27.1")
		s.Require().NotNil(got)
		s.Equal(27.1, *got)
	})

	s.Run("missing data returns nil", func() {
		got := ParsePercentage("--")
		s.Nil(got)
	})
}

func (s *LocaleSuite) TestParseHeartRate() {
	s.Run("with ppm suffix", func() {
		got := ParseHeartRate("63 ppm")
		s.Require().NotNil(got)
		s.Equal(63, *got)
	})

	s.Run("without suffix", func() {
		got := ParseHeartRate("63")
		s.Require().NotNil(got)
		s.Equal(63, *got)
	})

	s.Run("missing data returns nil", func() {
		got := ParseHeartRate("--")
		s.Nil(got)
	})
}
