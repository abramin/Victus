package main

import "github.com/charmbracelet/bubbles/key"

type keyMap struct {
	Up    key.Binding
	Down  key.Binding
	Left  key.Binding
	Right key.Binding
	Enter key.Binding
	Space key.Binding
	Reroll key.Binding
	Escape key.Binding
	Quit  key.Binding
}

func newKeyMap() keyMap {
	return keyMap{
		Up:    key.NewBinding(key.WithKeys("up", "k"), key.WithHelp("↑/k", "up")),
		Down:  key.NewBinding(key.WithKeys("down", "j"), key.WithHelp("↓/j", "down")),
		Left:  key.NewBinding(key.WithKeys("left", "h"), key.WithHelp("←/h", "prev")),
		Right: key.NewBinding(key.WithKeys("right", "l"), key.WithHelp("→/l", "next")),
		Enter: key.NewBinding(key.WithKeys("enter"), key.WithHelp("enter", "start")),
		Space: key.NewBinding(key.WithKeys(" "), key.WithHelp("space", "pause/resume")),
		Reroll: key.NewBinding(key.WithKeys("r"), key.WithHelp("r", "re-roll")),
		Escape: key.NewBinding(key.WithKeys("esc"), key.WithHelp("esc", "back")),
		Quit:  key.NewBinding(key.WithKeys("q", "ctrl+c"), key.WithHelp("q", "quit")),
	}
}

func (k keyMap) generatorHelp() []key.Binding {
	return []key.Binding{k.Up, k.Down, k.Left, k.Right, k.Enter, k.Reroll, k.Quit}
}

func (k keyMap) playerHelp() []key.Binding {
	return []key.Binding{k.Space, k.Left, k.Right, k.Escape, k.Quit}
}

func (k keyMap) completeHelp() []key.Binding {
	return []key.Binding{k.Enter, k.Quit}
}
