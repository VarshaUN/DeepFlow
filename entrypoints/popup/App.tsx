import { useState, useEffect } from 'react';
import './App.css';  // Remove if not using custom CSS

interface Session {
  id: number;
  note: string;
  tabs: { url: string; title: string }[];
  timestamp: string;
}

function App() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [note, setNote] = useState('');
  const [isInFocus, setIsInFocus] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // For button disabling during ops

  // Load sessions on mount
  useEffect(() => {
    chrome.storage.local.get('deepflowSessions').then((data: any) => {
      setSessions(data.deepflowSessions || []);
    }).catch(console.error);
  }, []);

  const saveSession = async () => {
    setIsLoading(true);
    try {
      const allTabs = await chrome.tabs.query({});
      const activeTab = (await chrome.tabs.query({ active: true, currentWindow: true }))[0];

      const tabData = allTabs
        .filter((t: chrome.tabs.Tab) => t.url)
        .map((t: chrome.tabs.Tab) => ({ url: t.url!, title: t.title || 'Untitled' }));

      let defaultNote = note.trim();
      if (!defaultNote && activeTab?.title) {
        defaultNote = `Working on: ${activeTab.title.substring(0, 60)}${activeTab.title.length > 60 ? '...' : ''}`;
      }

      const newSession: Session = {
        id: Date.now(),
        note: defaultNote || `Quick session ${new Date().toLocaleTimeString()}`,
        tabs: tabData,
        timestamp: new Date().toLocaleString(),
      };

      const updated = [...sessions, newSession];
      await chrome.storage.local.set({ deepflowSessions: updated });
      setSessions(updated);
      setNote('');
      alert('Context saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save session. Check console for details.');
    } finally {
      setIsLoading(false);
    }
  };

  const enterFocusMode = async () => {
    setIsLoading(true);
    try {
      await saveSession();
      setIsInFocus(true);
      alert('Focus mode activated!');
    } catch (err) {
      alert('Error entering focus mode.');
    } finally {
      setIsLoading(false);
    }
  };

  const exitFocusMode = () => {
    setIsInFocus(false);
    alert('Focus mode ended.');
  };

  const restoreSession = async (session: Session) => {
    setIsLoading(true);
    try {
      for (const tab of session.tabs) {
        await chrome.tabs.create({ url: tab.url });
      }
      alert('Session restored!');
    } catch (err) {
      alert('Failed to restore tabs.');
    } finally {
      setIsLoading(false);
    }
  };

  const restoreLastSession = () => {
    if (sessions.length > 0) {
      restoreSession(sessions[sessions.length - 1]);
    }
  };

  const deleteSession = async (id: number) => {
    const updated = sessions.filter((s) => s.id !== id);
    await chrome.storage.local.set({ deepflowSessions: updated });
    setSessions(updated);
  };

  const clearAllSessions = async () => {
    if (confirm('Clear all saved sessions? This cannot be undone.')) {
      await chrome.storage.local.remove('deepflowSessions');
      setSessions([]);
    }
  };

  return (
    <div style={{
      padding: '16px',
      width: '340px',
      fontFamily: 'system-ui, sans-serif',
      background: '#ffffff',
      borderRadius: '12px',
      boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
      minHeight: '400px',
    }}>
      <h2 style={{ margin: '0 0 8px', fontSize: '22px', color: '#111' }}>
        DeepFlow
      </h2>
      <p style={{ margin: '0 0 16px', fontSize: '14px', color: '#555' }}>
        Preserve your flow • One click
      </p>

      {/* Focus Controls */}
      {isInFocus ? (
        <div style={{
          background: '#e8f5e9',
          padding: '12px',
          borderRadius: '8px',
          marginBottom: '16px',
          textAlign: 'center',
          fontWeight: '600',
          color: '#1b5e20',
          fontSize: '15px',
        }}>
          Focus Active 🔥
          <button
            onClick={exitFocusMode}
            disabled={isLoading}
            style={{
              marginLeft: '16px',
              padding: '6px 12px',
              fontSize: '13px',
              background: '#c62828',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            End
          </button>
        </div>
      ) : (
        <button
          onClick={enterFocusMode}
          disabled={isLoading}
          style={{
            width: '100%',
            padding: '12px',
            background: '#f4511e',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '600',
            marginBottom: '12px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '15px',
          }}
        >
          {isLoading ? 'Saving...' : 'Enter Focus Mode'}
        </button>
      )}

      {/* Quick Restore */}
      <button
        onClick={restoreLastSession}
        disabled={isLoading || sessions.length === 0}
        style={{
          width: '100%',
          padding: '12px',
          background: sessions.length > 0 && !isLoading ? '#388e3c' : '#ccc',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          marginBottom: '16px',
          fontWeight: '600',
          cursor: (sessions.length > 0 && !isLoading) ? 'pointer' : 'not-allowed',
        }}
      >
        Restore Last Session
      </button>

      {/* Note + Save */}
      <input
        type="text"
        placeholder="Optional note..."
        value={note}
        onChange={(e) => setNote(e.target.value)}
        disabled={isLoading}
        style={{
          width: '100%',
          padding: '10px',
          marginBottom: '12px',
          border: '1px solid #ddd',
          borderRadius: '8px',
          fontSize: '14px',
        }}
      />

      <button
        onClick={saveSession}
        disabled={isLoading}
        style={{
          width: '100%',
          padding: '12px',
          background: isLoading ? '#90caf9' : '#2196f3',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontWeight: '600',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          marginBottom: '20px',
        }}
      >
        {isLoading ? 'Saving...' : `Save Current Context (${sessions.length + 1} total)`}
      </button>

      {/* Session List Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', color: '#222' }}>
          Saved Sessions ({sessions.length})
        </h3>
        {sessions.length > 0 && (
          <button
            onClick={clearAllSessions}
            style={{
              background: 'none',
              border: 'none',
              color: '#d32f2f',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            Clear All
          </button>
        )}
      </div>

      {sessions.length === 0 && (
        <p style={{ color: '#888', fontSize: '14px', textAlign: 'center', margin: '20px 0' }}>
          Start by saving your first context
        </p>
      )}

      <div style={{ maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
        {sessions.map((s) => (
          <div
            key={s.id}
            style={{
              border: '1px solid #e0e0e0',
              padding: '12px 12px 12px 16px',
              marginBottom: '12px',
              borderRadius: '10px',
              background: '#f9f9f9',
              position: 'relative',
            }}
          >
            <strong style={{ display: 'block', marginBottom: '4px', fontSize: '15px' }}>
              {s.note}
            </strong>
            <small style={{ color: '#555', display: 'block', marginBottom: '10px' }}>
              {s.timestamp} • {s.tabs.length} tab{s.tabs.length !== 1 ? 's' : ''}
            </small>

            <button
              onClick={() => restoreSession(s)}
              disabled={isLoading}
              style={{
                padding: '8px 20px',
                background: '#43a047',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                marginRight: '8px',
              }}
            >
              Restore
            </button>

            <button
              onClick={() => deleteSession(s.id)}
              title="Delete"
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: '#ef5350',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '28px',
                height: '28px',
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;