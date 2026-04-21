import React, { useState, useEffect, useRef, useCallback } from 'react';

const API_BASE_URL =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : 'https://firereach-1-9rf9.onrender.com';

// ── Icons ────────────────────────────────────────────────────
const IconZap = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
  </svg>
);

const IconTerminal = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 17 10 11 4 5" /><line x1="12" y1="19" x2="20" y2="19" />
  </svg>
);

const IconMail = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" /><polyline points="2,4 12,14 22,4" />
  </svg>
);

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const IconEdit = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3" />
  </svg>
);

const IconSend = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

// ── Log Parser ───────────────────────────────────────────────
function getLogType(log) {
  const text = (log.log || log || '').toString().toLowerCase();
  if (log.type === 'error' || text.includes('error')) return 'error';
  if (log.type === 'success' || text.includes('success') || text.includes('sent') || text.includes('complete')) return 'success';
  if (text.includes('tool') || text.includes('harvesting')) return 'tool';
  if (text.includes('agent') || text.includes('analyzing')) return 'agent';
  return 'info';
}

function getLogPrefix(type) {
  const prefixes = { tool: '>', agent: '⚡', success: '✓', error: '×', info: '·' };
  return prefixes[type];
}

// ── Main App ─────────────────────────────────────────────────
function App() {
  const [companyName, setCompanyName] = useState('Stripe');
  const [icp, setIcp] = useState('Founders seeking robust payment integration.');
  const [recipient, setRecipient] = useState('founder@startup.com');
  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [emailPreview, setEmailPreview] = useState(null);
  const [signals, setSignals] = useState([]);
  const [apiStatus, setApiStatus] = useState({ groq: false, tavily: false, gmail: false });
  const [isEditing, setIsEditing] = useState(false);
  const [editedSubject, setEditedSubject] = useState('');
  const [editedBody, setEditedBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const logsEndRef = useRef(null);
  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [logs]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/status`)
      .then(res => res.json())
      .then(data => setApiStatus(data))
      .catch(err => console.error('API status fetch failed', err));
  }, []);

  const handleRun = useCallback(async () => {
    if (!companyName.trim() || !icp.trim() || !recipient.trim()) {
      setLogs(prev => [...prev, { log: 'Please fill in all fields', type: 'error' }]);
      return;
    }
    setLogs([]); setEmailPreview(null); setSignals([]); setIsRunning(true);
    setIsEditing(false);
    setEmailSent(false);

    console.log('Starting outreach with API_BASE_URL:', API_BASE_URL);

    try {
      const url = `${API_BASE_URL}/api/run-outreach`;
      console.log('Fetching from:', url);
      
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_name: companyName, icp, recipient }),
      });

      console.log('Response status:', res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('HTTP Error:', res.status, errorText);
        setLogs(prev => [...prev, { log: `HTTP Error: ${res.status} - ${errorText}`, type: 'error' }]);
        setIsRunning(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n\n');
        buffer = parts.pop();

        for (const part of parts) {
          if (part.startsWith('data: ')) {
            const jsonStr = part.substring(6).trim();
            if (jsonStr) {
              try {
                const data = JSON.parse(jsonStr);
                console.log('Received data:', data);
                setLogs(prev => [...prev, data]);
                if (data.signals) setSignals(data.signals);
                if (data.result?.subject) {
                  setEmailPreview(data.result);
                  setEditedSubject(data.result.subject);
                  setEditedBody(data.result.body);
                }
              } catch (e) {
                console.error('JSON parse error:', e, 'for:', jsonStr);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setLogs(prev => [...prev, { log: `Error: ${error.message}`, type: 'error' }]);
    }
    setIsRunning(false);
  }, [companyName, icp, recipient]);

  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleSendEmail = useCallback(async () => {
    if (!emailPreview || !editedSubject.trim() || !editedBody.trim()) return;
    
    setIsSending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: editedSubject,
          body: editedBody,
          recipient: emailPreview.recipient,
          sender: emailPreview.sender
        }),
      });

      const data = await res.json();
      if (data.status === 'live_sent' || data.status === 'mock_sent') {
        setLogs(prev => [...prev, { log: `Email sent successfully to ${data.recipient}`, type: 'success' }]);
        setEmailSent(true);
        setIsEditing(false);
      } else {
        setLogs(prev => [...prev, { log: `Error sending email: ${data.message || 'Unknown error'}`, type: 'error' }]);
      }
    } catch (error) {
      setLogs(prev => [...prev, { log: `Error: ${error.message}`, type: 'error' }]);
    }
    setIsSending(false);
  }, [emailPreview, editedSubject, editedBody]);

  return (
    <div className="dark-orbs" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '24px', zIndex: 1, overflowY: 'auto' }}>
      
      {/* ── Dynamic Top Nav ──────────────────────────────── */}
      <header className="glass-panel animate-slide-in" style={{ flexShrink: 0, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderRadius: '100px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))', color: 'white', padding: '8px', borderRadius: '50%', boxShadow: '0 0 15px rgba(139, 92, 246, 0.4)' }}>
            <IconZap />
          </div>
          <h1 className="gradient-text" style={{ margin: 0, fontSize: '20px', fontWeight: 900 }}>FireReach</h1>
          <span style={{ fontSize: '10px', fontWeight: 800, background: 'rgba(139,92,246,0.15)', color: '#c4b5fd', padding: '4px 10px', borderRadius: '20px', border: '1px solid rgba(139,92,246,0.3)' }}>V2.0 Core</span>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          {[
            { key: 'groq', label: 'Groq API', active: apiStatus.groq },
            { key: 'tavily', label: 'Tavily Search', active: apiStatus.tavily },
            { key: 'gmail', label: 'Gmail SMTP', active: apiStatus.gmail },
          ].map(s => (
            <div key={s.key} className="status-pill">
              <span className={`status-dot ${s.active ? 'active' : 'warning'}`} />
              {s.label}
            </div>
          ))}
        </div>
      </header>

      {/* ── Bento Grid Layout ────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(400px, 1.5fr) minmax(360px, 1.25fr)', gap: '24px', flex: 1, minHeight: 0 }}>
        
        {/* Col 1: Config */}
        <aside className="glass-panel glass-panel-hoverable animate-slide-in" style={{ display: 'flex', flexDirection: 'column', padding: '28px', animationDelay: '0.1s' }}>
          <div className="section-header">
            <div className="section-icon"><IconZap /></div>
            <div className="section-title">Campaign Config</div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
            <div className="fr-field">
              <label className="fr-label">Target Company</label>
              <input type="text" className="fr-input" value={companyName} onChange={e => setCompanyName(e.target.value)} disabled={isRunning} />
            </div>
            
            <div className="fr-field" style={{ flex: 1 }}>
              <label className="fr-label">Ideal Customer Profile</label>
              <textarea className="fr-input" style={{ height: '100%' }} value={icp} onChange={e => setIcp(e.target.value)} disabled={isRunning} />
            </div>

            <div className="fr-field">
              <label className="fr-label">Recipient Email</label>
              <input type="email" className="fr-input" value={recipient} onChange={e => setRecipient(e.target.value)} disabled={isRunning} />
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            <button onClick={handleRun} disabled={isRunning} className={`btn-launch ${isRunning ? 'btn-launch-running' : 'btn-launch-active'}`}>
              {isRunning ? 'Agents Synchronizing...' : 'Launch Outreach'}
            </button>
          </div>
        </aside>

        {/* Col 2: Mission Logs (Central Focus) */}
        <main className="glass-panel animate-slide-in" style={{ display: 'flex', flexDirection: 'column', padding: '28px', animationDelay: '0.2s' }}>
          <div className="section-header">
            <div className="section-icon"><IconTerminal /></div>
            <div className="section-title">Execution Logs</div>
          </div>
          
          <div className="log-container" style={{ flex: 1, overflowY: 'auto' }}>
            {logs.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                &gt; System initialized. Awaiting parameters.
              </div>
            ) : (
              logs.map((log, i) => {
                const type = getLogType(log);
                return (
                  <div key={i} className={`log-entry type-${type} animate-fade-in-up`} style={{ animationDelay: `${Math.min(i * 20, 300)}ms`}}>
                    <strong style={{ opacity: 0.8, userSelect: 'none' }}>{getLogPrefix(type)}</strong>
                    <span>{log.log || log}</span>
                  </div>
                );
              })
            )}
            <div ref={logsEndRef} />
          </div>
        </main>

        {/* Col 3: Signals & Email Split */}
        <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: '24px', minHeight: 0 }}>
          
          {/* Top: Signals */}
          <section className="glass-panel glass-panel-hoverable animate-slide-in" style={{ display: 'flex', flexDirection: 'column', padding: '24px', animationDelay: '0.3s', minHeight: 0 }}>
            <div className="section-header" style={{ marginBottom: '16px' }}>
              <div className="section-icon"><IconSearch /></div>
              <div className="section-title">Intelligence Signals</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '8px' }}>
              {signals.length === 0 ? (
                <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No web vectors detected yet.
                </div>
              ) : (
                signals.map((sig, i) => (
                  <a key={i} href={sig.url} target="_blank" rel="noreferrer" className="signal-item" style={{ display: 'block', textDecoration: 'none' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '14px', marginBottom: '6px' }}>{sig.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {sig.content}
                    </div>
                  </a>
                ))
              )}
            </div>
          </section>

          {/* Bottom: Email */}
          <section className="glass-panel glass-panel-hoverable animate-slide-in" style={{ display: 'flex', flexDirection: 'column', padding: '24px', animationDelay: '0.4s', minHeight: 0 }}>
            <div className="section-header" style={{ marginBottom: '16px' }}>
              <div className="section-icon"><IconMail /></div>
              <div className="section-title">Generated Email</div>
              {emailSent && <span style={{ marginLeft: 'auto', color: '#10b981', fontWeight: 900, fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.3)' }}><IconCheck/> SENT</span>}
            </div>
            
            {emailPreview ? (
              <div className="email-card animate-fade-in-up" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {isEditing ? (
                  <>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Subject</label>
                      <input
                        type="text"
                        value={editedSubject}
                        onChange={e => setEditedSubject(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          background: 'rgba(2, 6, 23, 0.6)',
                          border: '1px solid rgba(139, 92, 246, 0.3)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          fontSize: '14px',
                          fontFamily: 'inherit',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, marginBottom: '12px' }}>
                      <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>Body</label>
                      <textarea
                        value={editedBody}
                        onChange={e => setEditedBody(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '12px',
                          background: 'rgba(2, 6, 23, 0.6)',
                          border: '1px solid rgba(139, 92, 246, 0.3)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          fontSize: '13px',
                          fontFamily: 'inherit',
                          resize: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => setIsEditing(false)}
                        disabled={isSending}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          background: 'rgba(139, 92, 246, 0.1)',
                          border: '1px solid rgba(139, 92, 246, 0.3)',
                          borderRadius: '8px',
                          color: '#c4b5fd',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSendEmail}
                        disabled={isSending}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                          border: 'none',
                          borderRadius: '8px',
                          color: 'white',
                          fontSize: '13px',
                          fontWeight: 700,
                          cursor: isSending ? 'not-allowed' : 'pointer',
                          opacity: isSending ? 0.5 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          transition: 'all 0.2s'
                        }}
                      >
                        <IconSend />
                        {isSending ? 'Sending...' : 'Send Email'}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="email-header">
                      <div style={{ fontWeight: 800, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>{editedSubject}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>To: {emailPreview.recipient}</div>
                    </div>
                    <div className="email-body" style={{ flex: 1, marginBottom: '12px' }}>
                      {editedBody}
                    </div>
                    {!emailSent && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={handleEdit}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            background: 'linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            transition: 'all 0.2s'
                          }}
                        >
                          <IconEdit />
                          Edit
                        </button>
                        <button
                          onClick={handleSendEmail}
                          disabled={isSending}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: '8px',
                            color: '#10b981',
                            fontSize: '13px',
                            fontWeight: 700,
                            cursor: isSending ? 'not-allowed' : 'pointer',
                            opacity: isSending ? 0.5 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            transition: 'all 0.2s'
                          }}
                        >
                          <IconSend />
                          {isSending ? 'Sending...' : 'Send'}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div style={{ flex: 1, background: 'rgba(2, 6, 23, 0.4)', borderRadius: '20px', border: '1px dashed rgba(255, 255, 255, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                Awaiting agent payload...
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}

export default App;
