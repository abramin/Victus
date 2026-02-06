import '@testing-library/jest-dom'
import { vi, beforeEach } from 'vitest'

// Mock fetch globally for API tests
global.fetch = vi.fn()

class MockOscillatorNode {
  frequency = { value: 0 }
  type: OscillatorType = 'sine'
  connect = vi.fn()
  start = vi.fn()
  stop = vi.fn()
}

class MockGainNode {
  gain = {
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  }
  connect = vi.fn()
}

class MockAudioContext {
  currentTime = 0
  destination = {}

  createOscillator() {
    return new MockOscillatorNode()
  }

  createGain() {
    return new MockGainNode()
  }
}

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'AudioContext', {
    writable: true,
    value: MockAudioContext,
  })

  Object.defineProperty(window, 'webkitAudioContext', {
    writable: true,
    value: MockAudioContext,
  })
}

// Reset mocks before each test
beforeEach(() => {
  vi.resetAllMocks()
})
