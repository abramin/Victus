package main

import (
	"sort"
	"time"

	"github.com/charmbracelet/bubbles/help"
	"github.com/charmbracelet/bubbles/key"
	"github.com/charmbracelet/bubbles/progress"
	tea "github.com/charmbracelet/bubbletea"

	"victus/internal/domain"
)

type AppView int

const (
	ViewGenerator AppView = iota
	ViewPlayer
)

type PlayerState int

const (
	PlayerIdle PlayerState = iota
	PlayerCountdown
	PlayerRunning
	PlayerPaused
	PlayerTransition
	PlayerComplete
)

type FlatExercise struct {
	Phase        string
	Name         string
	Description  string
	Category     string
	Difficulty   int
	DurationSecs int
	DurationStr  string
}

type TickMsg time.Time

var phaseOrder = []string{"PREPARE", "PRACTICE", "PLAY", "PUSH", "PONDER"}

var levels = []string{"standard", "accelerated"}
var durations = []int{15, 30, 45}

type Model struct {
	view   AppView
	width  int
	height int

	// Generator
	cursorRow   int // 0=level, 1=duration, 2=theme
	levelIdx    int
	durationIdx int
	themeIdx    int // 0=Random, 1..N=MovementThemeOrder
	seed        int64
	session     domain.GMBSessionResult

	// Player
	exercises      []FlatExercise
	playerState    PlayerState
	currentIdx     int
	timerSecs      int
	totalElapsed   int
	countdownSecs  int
	transitionSecs int

	// Components
	progress progress.Model
	help     help.Model
	keys     keyMap
}

func NewModel() Model {
	m := Model{
		view:        ViewGenerator,
		durationIdx: 1, // 30 min default
		themeIdx:    0, // Random
		seed:        time.Now().UnixNano(),
		progress:    progress.New(progress.WithDefaultGradient()),
		help:        help.New(),
		keys:        newKeyMap(),
	}
	m.generateSession()
	return m
}

func (m *Model) generateSession() {
	level := levels[m.levelIdx]
	focus := ""
	if m.themeIdx > 0 {
		focus = domain.MovementThemeOrder[m.themeIdx-1]
	}
	dur := durations[m.durationIdx]
	m.session = domain.GenerateGMBSession(level, focus, m.seed, dur, domain.DefaultCatalogue, domain.DefaultPhasePool)
	m.flattenExercises()
}

func (m *Model) flattenExercises() {
	m.exercises = nil
	for _, phase := range phaseOrder {
		exs, ok := m.session.Phases[phase]
		if !ok || len(exs) == 0 {
			continue
		}
		sorted := make([]domain.GMBExercise, len(exs))
		copy(sorted, exs)
		sort.Slice(sorted, func(i, j int) bool { return sorted[i].Order < sorted[j].Order })
		for _, ex := range sorted {
			m.exercises = append(m.exercises, FlatExercise{
				Phase:        phase,
				Name:         ex.Name,
				Description:  ex.Description,
				Category:     ex.Category,
				Difficulty:   ex.Difficulty,
				DurationSecs: ex.DurationSecs,
				DurationStr:  ex.DurationStr,
			})
		}
	}
}

func (m *Model) startPlayer() {
	m.view = ViewPlayer
	m.playerState = PlayerIdle
	m.currentIdx = 0
	m.totalElapsed = 0
	if len(m.exercises) > 0 {
		m.timerSecs = m.exercises[0].DurationSecs
	}
}

func tickCmd() tea.Cmd {
	return tea.Tick(time.Second, func(t time.Time) tea.Msg {
		return TickMsg(t)
	})
}

func (m Model) Init() tea.Cmd {
	return nil
}

func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		m.progress.Width = msg.Width - 10
		if m.progress.Width < 20 {
			m.progress.Width = 20
		}
		return m, nil

	case tea.KeyMsg:
		return m.handleKey(msg)

	case TickMsg:
		return m.handleTick()

	case progress.FrameMsg:
		progressModel, cmd := m.progress.Update(msg)
		m.progress = progressModel.(progress.Model)
		return m, cmd
	}
	return m, nil
}

func (m Model) handleKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch m.view {
	case ViewGenerator:
		return m.handleGeneratorKey(msg)
	case ViewPlayer:
		return m.handlePlayerKey(msg)
	}
	return m, nil
}

func (m Model) handleGeneratorKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch {
	case key.Matches(msg, m.keys.Quit):
		return m, tea.Quit

	case key.Matches(msg, m.keys.Up):
		if m.cursorRow > 0 {
			m.cursorRow--
		}
		return m, nil

	case key.Matches(msg, m.keys.Down):
		if m.cursorRow < 2 {
			m.cursorRow++
		}
		return m, nil

	case key.Matches(msg, m.keys.Left):
		m.adjustParam(-1)
		m.generateSession()
		return m, nil

	case key.Matches(msg, m.keys.Right):
		m.adjustParam(1)
		m.generateSession()
		return m, nil

	case key.Matches(msg, m.keys.Enter):
		m.startPlayer()
		return m, nil

	case key.Matches(msg, m.keys.Reroll):
		m.seed = time.Now().UnixNano()
		m.generateSession()
		return m, nil
	}
	return m, nil
}

func (m *Model) adjustParam(delta int) {
	themeCount := len(domain.MovementThemeOrder) + 1 // +1 for Random
	switch m.cursorRow {
	case 0: // level
		m.levelIdx = (m.levelIdx + delta + len(levels)) % len(levels)
	case 1: // duration
		m.durationIdx = (m.durationIdx + delta + len(durations)) % len(durations)
	case 2: // theme
		m.themeIdx = (m.themeIdx + delta + themeCount) % themeCount
	}
}

func (m Model) handlePlayerKey(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch m.playerState {
	case PlayerIdle:
		switch {
		case key.Matches(msg, m.keys.Space), key.Matches(msg, m.keys.Enter):
			m.playerState = PlayerCountdown
			m.countdownSecs = 3
			return m, tickCmd()
		case key.Matches(msg, m.keys.Escape):
			m.view = ViewGenerator
			return m, nil
		case key.Matches(msg, m.keys.Quit):
			return m, tea.Quit
		}

	case PlayerCountdown:
		switch {
		case key.Matches(msg, m.keys.Escape):
			m.view = ViewGenerator
			return m, nil
		case key.Matches(msg, m.keys.Quit):
			return m, tea.Quit
		}

	case PlayerRunning:
		switch {
		case key.Matches(msg, m.keys.Space):
			m.playerState = PlayerPaused
			return m, nil
		case key.Matches(msg, m.keys.Right):
			return m.advanceExercise()
		case key.Matches(msg, m.keys.Left):
			return m.prevExercise()
		case key.Matches(msg, m.keys.Escape):
			m.view = ViewGenerator
			return m, nil
		case key.Matches(msg, m.keys.Quit):
			return m, tea.Quit
		}

	case PlayerPaused:
		switch {
		case key.Matches(msg, m.keys.Space):
			m.playerState = PlayerRunning
			return m, tickCmd()
		case key.Matches(msg, m.keys.Right):
			return m.advanceExercise()
		case key.Matches(msg, m.keys.Left):
			return m.prevExercise()
		case key.Matches(msg, m.keys.Escape):
			m.view = ViewGenerator
			return m, nil
		case key.Matches(msg, m.keys.Quit):
			return m, tea.Quit
		}

	case PlayerTransition:
		switch {
		case key.Matches(msg, m.keys.Space), key.Matches(msg, m.keys.Enter):
			// Skip rest
			m.currentIdx++
			if m.currentIdx < len(m.exercises) {
				m.timerSecs = m.exercises[m.currentIdx].DurationSecs
				m.playerState = PlayerCountdown
				m.countdownSecs = 3
				return m, tickCmd()
			}
			m.playerState = PlayerComplete
			return m, nil
		case key.Matches(msg, m.keys.Escape):
			m.view = ViewGenerator
			return m, nil
		case key.Matches(msg, m.keys.Quit):
			return m, tea.Quit
		}

	case PlayerComplete:
		switch {
		case key.Matches(msg, m.keys.Enter), key.Matches(msg, m.keys.Escape):
			m.view = ViewGenerator
			return m, nil
		case key.Matches(msg, m.keys.Quit):
			return m, tea.Quit
		}
	}
	return m, nil
}

func (m Model) advanceExercise() (tea.Model, tea.Cmd) {
	if m.currentIdx+1 >= len(m.exercises) {
		m.playerState = PlayerComplete
		return m, nil
	}
	cur := m.exercises[m.currentIdx]
	next := m.exercises[m.currentIdx+1]
	if cur.Phase != next.Phase {
		m.playerState = PlayerTransition
		m.transitionSecs = 10
		return m, tickCmd()
	}
	m.currentIdx++
	m.timerSecs = m.exercises[m.currentIdx].DurationSecs
	m.playerState = PlayerRunning
	return m, tickCmd()
}

func (m Model) prevExercise() (tea.Model, tea.Cmd) {
	if m.currentIdx > 0 {
		m.currentIdx--
		m.timerSecs = m.exercises[m.currentIdx].DurationSecs
		m.playerState = PlayerRunning
		return m, tickCmd()
	}
	return m, nil
}

func (m Model) handleTick() (tea.Model, tea.Cmd) {
	switch m.playerState {
	case PlayerCountdown:
		m.countdownSecs--
		if m.countdownSecs <= 0 {
			m.playerState = PlayerRunning
			if m.currentIdx < len(m.exercises) {
				m.timerSecs = m.exercises[m.currentIdx].DurationSecs
			}
			return m, tickCmd()
		}
		return m, tickCmd()

	case PlayerRunning:
		m.totalElapsed++
		m.timerSecs--
		if m.timerSecs < 0 {
			m.timerSecs = 0
		}
		if m.timerSecs == 0 {
			// Exercise complete
			if m.currentIdx+1 >= len(m.exercises) {
				m.playerState = PlayerComplete
				return m, nil
			}
			cur := m.exercises[m.currentIdx]
			next := m.exercises[m.currentIdx+1]
			if cur.Phase != next.Phase {
				m.playerState = PlayerTransition
				m.transitionSecs = 10
				return m, tickCmd()
			}
			m.currentIdx++
			m.timerSecs = m.exercises[m.currentIdx].DurationSecs
			return m, tickCmd()
		}
		return m, tickCmd()

	case PlayerTransition:
		m.transitionSecs--
		if m.transitionSecs <= 0 {
			m.currentIdx++
			if m.currentIdx < len(m.exercises) {
				m.timerSecs = m.exercises[m.currentIdx].DurationSecs
				m.playerState = PlayerCountdown
				m.countdownSecs = 3
				return m, tickCmd()
			}
			m.playerState = PlayerComplete
			return m, nil
		}
		return m, tickCmd()
	}
	return m, nil
}
