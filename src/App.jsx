import { useState, useRef } from 'react'
import './App.css'

function extractDomain(email) {
  const parts = email.trim().split('@')
  if (parts.length !== 2 || !parts[1]) return null
  return parts[1].toLowerCase()
}

function extractTenantId(issuer) {
  // issuer: https://login.microsoftonline.com/{tenant-id}/v2.0
  const match = issuer.match(/login\.microsoftonline\.com\/([0-9a-f-]{36})\//i)
  return match ? match[1] : null
}

export default function App() {
  const [email, setEmail] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const inputRef = useRef(null)

  async function handleLookup(e) {
    e.preventDefault()
    setResult(null)
    setError(null)
    setCopied(false)

    const domain = extractDomain(email)
    if (!domain) {
      setError('Enter a valid email address.')
      return
    }

    setLoading(true)
    try {
      const url = `https://login.microsoftonline.com/${encodeURIComponent(domain)}/v2.0/.well-known/openid-configuration`
      const res = await fetch(url)
      if (!res.ok) {
        if (res.status === 400 || res.status === 404) {
          throw new Error(`No Microsoft Entra ID tenant found for domain "${domain}".`)
        }
        throw new Error(`Unexpected response: ${res.status} ${res.statusText}`)
      }
      const data = await res.json()
      const tenantId = extractTenantId(data.issuer)
      if (!tenantId) throw new Error('Could not parse tenant ID from the response.')
      setResult({
        tenantId,
        domain,
        region: data.tenant_region_scope ?? '—',
        cloudInstance: data.cloud_instance_name ?? '—',
      })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function handleCopy() {
    if (result?.tenantId) {
      navigator.clipboard.writeText(result.tenantId).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <svg className="ms-logo" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect width="19" height="19" fill="#f25022"/>
          <rect x="21" width="19" height="19" fill="#7fba00"/>
          <rect y="21" width="19" height="19" fill="#00a4ef"/>
          <rect x="21" y="21" width="19" height="19" fill="#ffb900"/>
        </svg>
        <div>
          <h1>Tenant ID Lookup</h1>
          <p className="subtitle">Find the Microsoft Entra ID tenant ID for any email domain</p>
        </div>
      </header>

      <main>
        <form className="lookup-form" onSubmit={handleLookup} noValidate>
          <label htmlFor="email-input">Email address</label>
          <div className="input-row">
            <input
              id="email-input"
              ref={inputRef}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@contoso.com"
              autoComplete="off"
              spellCheck={false}
              disabled={loading}
              required
            />
            <button type="submit" className="btn-primary" disabled={loading || !email.trim()}>
              {loading
                ? <span className="spinner" aria-label="Loading" />
                : 'Lookup'}
            </button>
          </div>
        </form>

        {error && (
          <div className="card card-error" role="alert">
            <span className="card-icon">✕</span>
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="card card-result">
            <div className="result-header">
              <span className="card-icon card-icon-success">✓</span>
              <span>Tenant found for <strong>{result.domain}</strong></span>
            </div>
            <dl>
              <div className="dl-row dl-row-main">
                <dt>Tenant ID</dt>
                <dd>
                  <code>{result.tenantId}</code>
                  <button
                    className="btn-copy"
                    onClick={handleCopy}
                    type="button"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </dd>
              </div>
              <div className="dl-row">
                <dt>Region</dt>
                <dd>{result.region}</dd>
              </div>
              <div className="dl-row">
                <dt>Cloud</dt>
                <dd>{result.cloudInstance}</dd>
              </div>
            </dl>
          </div>
        )}
      </main>

      <footer className="app-footer">
        Data fetched from the public Microsoft Entra ID OIDC discovery endpoint — no credentials required.
      </footer>
    </div>
  )
}
