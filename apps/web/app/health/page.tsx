'use client'

import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar'

interface HealthStatus {
  status: string
  message: string
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch('/api/health')
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const data = await response.json()
        setHealth(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch health status')
      } finally {
        setLoading(false)
      }
    }

    fetchHealth()
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">
              System Health
            </h1>
            
            <div className="max-w-md mx-auto">
              {loading ? (
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2">Loading...</span>
                  </div>
                </div>
              ) : error ? (
                <div className="bg-red-50 border border-red-200 p-6 rounded-lg">
                  <div className="flex items-center">
                    <svg className="h-6 w-6 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-lg font-medium text-red-800">Error</h3>
                  </div>
                  <p className="mt-2 text-red-700">{error}</p>
                </div>
              ) : health ? (
                <div className="bg-green-50 border border-green-200 p-6 rounded-lg">
                  <div className="flex items-center">
                    <svg className="h-6 w-6 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-lg font-medium text-green-800">API Status</h3>
                  </div>
                  <div className="mt-4 space-y-2">
                    <p className="text-green-700">
                      <strong>Status:</strong> {health.status}
                    </p>
                    <p className="text-green-700">
                      <strong>Message:</strong> {health.message}
                    </p>
                  </div>
                </div>
              ) : null}
              
              <div className="mt-8">
                <button
                  onClick={() => window.location.reload()}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
