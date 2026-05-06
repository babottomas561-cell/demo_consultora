import React, { useEffect, useState } from 'react'

function App() {
  const [status, setStatus] = useState("Loading...")

  useEffect(() => {
    fetch('/api/v1/companies/ping')
      .then(res => res.json())
      .then(data => setStatus("API Status: " + data.status))
      .catch(err => setStatus("API Error: " + err.message))
  }, [])

  return (
    <div>
      <h1>Demo Consultora SaaS</h1>
      <p>{status}</p>
    </div>
  )
}

export default App
