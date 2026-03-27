package main

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/bubbles/key"
	"github.com/charmbracelet/lipgloss"

	"victus/internal/domain"
)

func (m Model) View() string {
	if m.width == 0 {
		return "Loading..."
	}
	switch m.view {
	case ViewGenerator:
		return m.viewGenerator()
	case ViewPlayer:
		return m.viewPlayer()
	}
	return ""
}

// ── Generator View ──────────────────────────────────────────────────────────

func (m Model) viewGenerator() string {
	leftWidth := m.width * 35 / 100
	if leftWidth < 30 {
		leftWidth = 30
	}
	rightWidth := m.width - leftWidth - 4
	if rightWidth < 30 {
		rightWidth = 30
	}

	left := m.generatorLeft(leftWidth)
	right := m.generatorRight(rightWidth)

	content := lipgloss.JoinHorizontal(lipgloss.Top, left, "  ", right)

	helpKeys := m.keys.generatorHelp()
	helpView := helpStyle.Render(renderHelp(helpKeys))

	return lipgloss.JoinVertical(lipgloss.Left, content, helpView)
}

func (m Model) generatorLeft(width int) string {
	var b strings.Builder

	b.WriteString(titleStyle.Render("GMB SESSION GENERATOR"))
	b.WriteString("\n\n")

	rows := []struct {
		label string
		value string
	}{
		{"Level", levels[m.levelIdx]},
		{"Duration", fmt.Sprintf("%d min", durations[m.durationIdx])},
		{"Theme", m.themeName()},
	}

	for i, row := range rows {
		cursor := "  "
		style := inactiveParamStyle
		if i == m.cursorRow {
			cursor = cursorStyle.Render("> ")
			style = activeParamStyle
		}
		b.WriteString(fmt.Sprintf("%s%-10s %s\n", cursor, row.label+":", style.Render(row.value)))
	}

	return lipgloss.NewStyle().Width(width).Render(b.String())
}

func (m Model) themeName() string {
	if m.themeIdx == 0 {
		return "Random"
	}
	return domain.MovementThemeOrder[m.themeIdx-1]
}

func (m Model) generatorRight(width int) string {
	var b strings.Builder

	header := fmt.Sprintf("%s  •  %s  •  %d exercises",
		m.session.Theme, m.session.TotalTimeEst, m.session.ExerciseCount)
	b.WriteString(lipgloss.NewStyle().Bold(true).Render(header))
	b.WriteString("\n\n")

	maxNameLen := width - 16
	if maxNameLen < 20 {
		maxNameLen = 20
	}

	for _, phase := range phaseOrder {
		exs, ok := m.session.Phases[phase]
		if !ok || len(exs) == 0 {
			continue
		}

		color := phaseColor(phase)
		label := phaseLabelStyle.Foreground(color).Render(phase)
		b.WriteString(label)
		b.WriteString("\n")

		for _, ex := range exs {
			name := ex.Name
			if len(name) > maxNameLen {
				name = name[:maxNameLen-1] + "…"
			}
			dur := lipgloss.NewStyle().Faint(true).Render(ex.DurationStr)
			b.WriteString(fmt.Sprintf("  %s  %s\n", name, dur))
		}
		b.WriteString("\n")
	}

	return cardStyle.Width(width).Render(b.String())
}

// ── Player View ─────────────────────────────────────────────────────────────

func (m Model) viewPlayer() string {
	if len(m.exercises) == 0 {
		return "No exercises."
	}

	switch m.playerState {
	case PlayerComplete:
		return m.viewComplete()
	case PlayerTransition:
		return m.viewTransition()
	default:
		return m.viewActiveExercise()
	}
}

func (m Model) viewActiveExercise() string {
	ex := m.exercises[m.currentIdx]
	color := phaseColor(ex.Phase)
	center := lipgloss.NewStyle().Width(m.width).Align(lipgloss.Center)

	var sections []string

	// Phase badge + counter
	badge := phaseBadgeStyle.Background(color).Foreground(lipgloss.Color("#000000")).Render(
		fmt.Sprintf(" %s ", ex.Phase))
	counter := fmt.Sprintf("  %d/%d", m.currentIdx+1, len(m.exercises))
	sections = append(sections, center.Render(badge+counter))

	// Exercise name
	name := exerciseNameStyle.Foreground(color).Render(ex.Name)
	sections = append(sections, center.Render(name))

	// Timer
	timerStr := formatTimer(m.timerSecs)
	switch m.playerState {
	case PlayerIdle:
		timerStr = formatTimer(ex.DurationSecs)
		t := timerStyle.Foreground(color).Render(timerStr)
		hint := descStyle.Render("Press SPACE to start")
		sections = append(sections, center.Render(t))
		sections = append(sections, center.Render(hint))
	case PlayerCountdown:
		cdText := timerStyle.Foreground(color).Render(fmt.Sprintf("GET READY  %d", m.countdownSecs))
		sections = append(sections, center.Render(cdText))
	case PlayerPaused:
		t := timerStyle.Foreground(color).Faint(true).Render(timerStr)
		paused := lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("#EF4444")).Render("  PAUSED")
		sections = append(sections, center.Render(t+paused))
	default:
		t := timerStyle.Foreground(color).Render(timerStr)
		sections = append(sections, center.Render(t))
	}

	// Description
	if ex.Description != "" {
		desc := descStyle.Width(m.width - 10).Align(lipgloss.Center).Render(ex.Description)
		sections = append(sections, center.Render(desc))
	}

	// Progress bar
	pct := float64(m.currentIdx) / float64(len(m.exercises))
	sections = append(sections, center.Render(m.progress.ViewAs(pct)))

	// Up Next
	if m.currentIdx+1 < len(m.exercises) {
		next := m.exercises[m.currentIdx+1]
		nextText := descStyle.Render(fmt.Sprintf("Up Next: %s", next.Name))
		sections = append(sections, center.Render(nextText))
	} else {
		sections = append(sections, center.Render(descStyle.Render("Final exercise")))
	}

	// Help
	var helpKeys []key.Binding
	switch m.playerState {
	case PlayerIdle:
		helpKeys = []key.Binding{m.keys.Space, m.keys.Escape, m.keys.Quit}
	default:
		helpKeys = m.keys.playerHelp()
	}
	sections = append(sections, center.Render(helpStyle.Render(renderHelp(helpKeys))))

	return lipgloss.JoinVertical(lipgloss.Center, sections...)
}

func (m Model) viewTransition() string {
	center := lipgloss.NewStyle().Width(m.width).Align(lipgloss.Center)

	var sections []string

	nextEx := m.exercises[m.currentIdx+1]
	nextColor := phaseColor(nextEx.Phase)

	badge := phaseBadgeStyle.Background(nextColor).Foreground(lipgloss.Color("#000000")).Render(
		fmt.Sprintf(" NEXT: %s ", nextEx.Phase))
	sections = append(sections, center.Render(badge))

	rest := timerStyle.Foreground(nextColor).Render(fmt.Sprintf("Rest  %d", m.transitionSecs))
	sections = append(sections, center.Render(rest))

	nextName := exerciseNameStyle.Foreground(nextColor).Render(nextEx.Name)
	sections = append(sections, center.Render(nextName))

	hint := descStyle.Render("Press SPACE to skip rest")
	sections = append(sections, center.Render(hint))

	pct := float64(m.currentIdx+1) / float64(len(m.exercises))
	sections = append(sections, center.Render(m.progress.ViewAs(pct)))

	return lipgloss.JoinVertical(lipgloss.Center, sections...)
}

func (m Model) viewComplete() string {
	center := lipgloss.NewStyle().Width(m.width).Align(lipgloss.Center)

	var sections []string

	done := lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("#22C55E")).Render("SESSION COMPLETE")
	sections = append(sections, center.Render(done))

	summary := fmt.Sprintf("%s  •  %d exercises  •  %s elapsed",
		m.session.Theme, len(m.exercises), formatTimer(m.totalElapsed))
	sections = append(sections, center.Render(summary))

	sections = append(sections, center.Render(m.progress.ViewAs(1.0)))

	hint := descStyle.Render("Press ENTER to return")
	sections = append(sections, center.Render(hint))

	return lipgloss.JoinVertical(lipgloss.Center, sections...)
}

// ── Helpers ─────────────────────────────────────────────────────────────────

func formatTimer(secs int) string {
	if secs < 0 {
		secs = 0
	}
	return fmt.Sprintf("%02d:%02d", secs/60, secs%60)
}

func renderHelp(bindings []key.Binding) string {
	var parts []string
	for _, b := range bindings {
		h := b.Help()
		parts = append(parts, fmt.Sprintf("%s %s", h.Key, h.Desc))
	}
	return strings.Join(parts, "  •  ")
}
