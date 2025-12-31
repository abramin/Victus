import { useEffect, useState } from 'react'

interface HealthResponse {
  status: string
  service: string
  time: string
}

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    fetch('/api/health')
      .then(async (res) => {
        if (!res.ok) throw new Error('Health check failed')
        const data = (await res.json()) as HealthResponse
        setHealth(data)
      })
      .catch((err) => setError(err.message))
  }, [])

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-lg w-full bg-slate-950/60 backdrop-blur rounded-lg border border-slate-800 shadow-xl p-8">
        <h1 className="text-3xl font-semibold mb-4">Victus Stack</h1>
        <p className="text-slate-300 mb-6">
          Go backend, React + TypeScript frontend, and SQLite persistence ready for development.
        </p>

        <div className="space-y-2">
          <h2 className="text-xl font-medium">Health</h2>
          {health ? (
            <ul className="text-sm text-slate-200 list-disc pl-5 space-y-1">
              <li>Service: {health.service}</li>
              <li>Status: {health.status}</li>
              <li>Time: {health.time}</li>
            </ul>
          ) : error ? (
            <p className="text-red-400 text-sm">{error}</p>
          ) : (
            <p className="text-slate-400 text-sm">Checking backend health...</p>
          )}
        </div>
      </div>
    </main>
  )
}

export default App
