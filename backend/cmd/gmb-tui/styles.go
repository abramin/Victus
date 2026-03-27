package main

import "github.com/charmbracelet/lipgloss"

var phaseColors = map[string]lipgloss.Color{
	"PREPARE":  lipgloss.Color("#F59E0B"),
	"PRACTICE": lipgloss.Color("#14B8A6"),
	"PLAY":     lipgloss.Color("#22C55E"),
	"PUSH":     lipgloss.Color("#8B5CF6"),
	"PONDER":   lipgloss.Color("#3B82F6"),
}

func phaseColor(phase string) lipgloss.Color {
	if c, ok := phaseColors[phase]; ok {
		return c
	}
	return lipgloss.Color("#FFFFFF")
}

var (
	titleStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color("#F59E0B")).
			MarginBottom(1)

	cardStyle = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(lipgloss.Color("#444444")).
			Padding(1, 2)

	activeParamStyle = lipgloss.NewStyle().
				Bold(true).
				Foreground(lipgloss.Color("#22C55E"))

	inactiveParamStyle = lipgloss.NewStyle().
				Foreground(lipgloss.Color("#94A3B8"))

	cursorStyle = lipgloss.NewStyle().
			Bold(true).
			Foreground(lipgloss.Color("#22C55E"))

	phaseLabelStyle = lipgloss.NewStyle().
			Bold(true).
			PaddingRight(1)

	exerciseNameStyle = lipgloss.NewStyle().
				Bold(true)

	timerStyle = lipgloss.NewStyle().
			Bold(true)

	descStyle = lipgloss.NewStyle().
			Faint(true)

	phaseBadgeStyle = lipgloss.NewStyle().
			Bold(true).
			Padding(0, 2).
			Reverse(true)

	helpStyle = lipgloss.NewStyle().
			Faint(true).
			MarginTop(1)
)
