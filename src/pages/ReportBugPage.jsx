// src/pages/ReportBugPage.jsx
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useUserProfileStore } from '../stores/useUserProfileStore';
import { subscribeToBugs, addBug, updateBug, deleteBug, addBugReaction } from '../firebase/bugs';
import { updatePresence, subscribeToActiveCount } from '../firebase/userProfile';

const ADMIN_EMAILS = ['tanishq2520@gmail.com']; // User specified themselves as admin

export default function ReportBugPage() {
  const { user } = useAuth();
  const profile = useUserProfileStore(s => s.profile);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [activeCount, setActiveCount] = useState(1);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const displayName = profile?.displayName || user?.displayName || 'Anonymous User';
  const isAdmin = user?.email && ADMIN_EMAILS.includes(user.email);

  // Subscribe to Global Bugs
  useEffect(() => {
    const unsub = subscribeToBugs((newMessages) => {
      setMessages(newMessages);
    });
    return () => unsub();
  }, []);

  // Presence Heartbeat & Active Count
  useEffect(() => {
    if (!user) return;
    
    // Initial presence
    updatePresence(user.uid, displayName);
    
    // Heartbeat every 1 minute
    const interval = setInterval(() => {
      updatePresence(user.uid, displayName);
    }, 60000);

    const unsubCount = subscribeToActiveCount((count) => {
      setActiveCount(count);
    });

    return () => {
      clearInterval(interval);
      unsubCount();
    };
  }, [user, displayName]);

  // Close menu on click outside or escape
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('.message-dropdown') && !e.target.closest('.message-chevron')) {
        setOpenMenuId(null);
      }
    };
    const keyHandler = (e) => {
      if (e.key === 'Escape') setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, []);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() && !selectedImage) return;

    try {
      await addBug(user.uid, displayName, inputText, selectedImage, user?.email);
      setInputText('');
      setSelectedImage(null);
    } catch (err) {
      console.error("Failed to send:", err);
    }
  };

  const handleEditSave = async () => {
    if (!editText.trim()) return;
    try {
      await updateBug(editingId, editText);
      setEditingId(null);
      setEditText('');
    } catch (err) {
      console.error("Failed to edit:", err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteBug(id);
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (re) => {
        setSelectedImage(re.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const renderText = (text) => {
    if (!text) return null;
    // Highlight tags like @username
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => 
      part?.startsWith('@') ? 
        <span key={i} style={{ color: '#F97316', fontWeight: 'bold' }}>{part}</span> : 
        part
    );
  };

  return (
    <div style={{ 
      maxWidth: 1400, 
      width: '95%',
      margin: '0 auto', 
      height: 'calc(100vh - 100px)', 
      display: 'flex', 
      flexDirection: 'column',
      padding: '0 20px' 
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, color: 'rgba(255,255,255,0.95)', margin: 0 }}>Community Hub & Bug Tracker</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: '4px 0 0 0' }}>Share bugs, suggestions, and connect with other users.</p>
        </div>
        
        {/* Live User Count */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 8, 
          background: 'rgba(0,0,0,0.3)', 
          padding: '6px 12px', 
          borderRadius: 20, 
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 8px #22C55E', animation: 'pulse-green 2s infinite' }} />
          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
            {activeCount} {activeCount === 1 ? 'User' : 'Users'} Live
          </span>
        </div>
      </div>
      
      {/* Chat Container */}
      <div 
        className="liquid-glass-strong" 
        style={{ 
          flex: 1, 
          borderRadius: 24, 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
        }}
      >
        <div 
          ref={scrollRef}
          style={{ 
            flex: 1, 
            padding: 24, 
            overflowY: 'auto', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 24 
          }}
        >
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', marginTop: 40 }}>
              <p>No messages yet. Be the first to post!</p>
            </div>
          )}
          {messages.map((msg) => {
            const isMe = msg.uid === user?.uid;
            const canManage = isMe || isAdmin;

            return (
              <div 
                key={msg.id} 
                className="message-item"
                style={{ 
                  alignSelf: isMe ? 'flex-end' : 'flex-start',
                  maxWidth: '75%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start',
                  position: 'relative'
                }}
              >
                <div style={{ 
                  fontSize: 10, 
                  color: 'rgba(255,255,255,0.4)', 
                  fontFamily: 'var(--font-mono)', 
                  marginBottom: 6,
                  display: 'flex',
                  gap: 8,
                  alignItems: 'center'
                }}>
                  <span style={{ color: (ADMIN_EMAILS.includes(msg.userEmail)) ? '#F97316' : 'inherit', display: 'flex', alignItems: 'center', gap: 6, fontWeight: ADMIN_EMAILS.includes(msg.userEmail) ? 700 : 500 }}>
                    {isMe ? 'You' : msg.displayName}
                    {(ADMIN_EMAILS.includes(msg.userEmail || '')) && (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 3, 
                        background: 'linear-gradient(135deg, rgba(249,115,22,0.2) 0%, rgba(234,88,12,0.3) 100%)', 
                        color: '#F97316', 
                        padding: '2px 8px', 
                        borderRadius: 12, 
                        fontSize: 9, 
                        fontWeight: 800,
                        border: '1px solid rgba(249,115,22,0.3)',
                        boxShadow: '0 0 10px rgba(249,115,22,0.15)',
                        letterSpacing: 0.5
                      }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        </svg>
                        ADMIN
                      </div>
                    )}
                  </span>
                  {msg.updatedAt && <span style={{ opacity: 0.5 }}>(edited)</span>}
                </div>
                
                <div className="message-wrapper" style={{ position: 'relative' }}>
                  {canManage && !editingId && (
                    <div 
                      className={`message-chevron ${openMenuId === msg.id ? 'open' : ''}`}
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === msg.id ? null : msg.id); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: 14,
                        background: 'rgba(0,0,0,0.25)',
                        borderRadius: '50%',
                        width: 22,
                        height: 22
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                  )}

                  {openMenuId === msg.id && (
                    <div className="message-dropdown liquid-glass" style={{
                      position: 'absolute',
                      top: -38,
                      right: 0,
                      display: 'flex',
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      background: 'rgba(30,30,30,0.85)',
                      backdropFilter: 'blur(12px)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 16,
                      padding: '4px 8px',
                      zIndex: 20,
                      boxShadow: '0 4px 15px rgba(0,0,0,0.5)'
                    }}>
                      {canManage && (
                        <>
                          <div className="dropdown-item-icon" onClick={() => { setEditingId(msg.id); setEditText(msg.text); setOpenMenuId(null); }} title="Edit">✏️</div>
                          <div className="dropdown-item-icon" onClick={() => { setDeleteConfirmId(msg.id); setOpenMenuId(null); }} title="Delete">🗑️</div>
                          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />
                        </>
                      )}
                      {['👍', '❤️', '😂', '😮', '😢'].map(emoji => (
                        <div key={emoji} className="dropdown-item-icon" onClick={() => { addBugReaction(msg.id, emoji); setOpenMenuId(null); }}>{emoji}</div>
                      ))}
                    </div>
                  )}

                  <div 
                    className="liquid-glass message-bubble" 
                    style={{ 
                      padding: '14px 18px', 
                      borderRadius: isMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                      background: isMe ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${isMe ? 'rgba(249,115,22,0.25)' : 'rgba(255,255,255,0.1)'}`,
                      color: 'rgba(255,255,255,0.95)',
                      position: 'relative',
                      transition: 'all 0.2s ease',
                      minWidth: 80,
                      width: editingId === msg.id ? '100%' : 'auto'
                    }}
                  >
                  
                  {msg.image && (
                    <img 
                      src={msg.image} 
                      alt="Attachment" 
                      style={{ maxWidth: '100%', borderRadius: 12, marginBottom: 10, display: 'block', border: '1px solid rgba(255,255,255,0.1)' }} 
                    />
                  )}
                  
                  {editingId === msg.id ? (
                    <div className="liquid-glass-strong" style={{ 
                      padding: 20, 
                      borderRadius: 16, 
                      background: 'linear-gradient(145deg, rgba(30,30,30,0.8) 0%, rgba(15,15,15,0.9) 100%)',
                      border: '1px solid rgba(249,115,22,0.4)',
                      boxShadow: '0 12px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)',
                      animation: 'scale-up 0.2s ease-out',
                      width: '100%',
                      minWidth: 300
                    }}>
                      <div style={{ fontSize: 11, color: '#F97316', marginBottom: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, letterSpacing: 0.5 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        EDITING MESSAGE
                      </div>
                      <textarea 
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        style={{ 
                          background: 'rgba(0,0,0,0.4)', 
                          color: '#fff', 
                          border: '1px solid rgba(255,255,255,0.12)', 
                          borderRadius: 12, 
                          padding: 16,
                          fontSize: 15,
                          width: '100%',
                          minHeight: 120,
                          outline: 'none',
                          fontFamily: 'var(--font-body)',
                          resize: 'vertical',
                          boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2)',
                          transition: 'border-color 0.2s ease',
                          lineHeight: 1.6
                        }}
                        autoFocus
                      />
                      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
                        <button 
                          onClick={() => setEditingId(null)} 
                          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', padding: '8px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500, transition: 'all 0.2s ease' }}
                          className="hover-bright"
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={handleEditSave} 
                          style={{ background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)', border: 'none', color: '#fff', padding: '8px 24px', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, boxShadow: '0 4px 15px rgba(249,115,22,0.4)', transition: 'all 0.2s ease' }}
                          className="hover-pop"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 15, lineHeight: 1.6 }}>{renderText(msg.text)}</div>
                  )}
                  
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                      {Object.entries(
                        msg.reactions.reduce((acc, r) => { acc[r] = (acc[r] || 0) + 1; return acc; }, {})
                      ).map(([emoji, count]) => (
                        <span key={emoji} style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 12, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, border: '1px solid rgba(255,255,255,0.05)' }}>
                          {emoji} <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)' }}>{count}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  </div>
                  
                  {deleteConfirmId === msg.id && (
                    <div className="liquid-glass-strong" style={{ 
                      marginTop: 8, padding: 12, 
                      background: 'rgba(239,68,68,0.1)', 
                      border: '1px solid rgba(239,68,68,0.3)', 
                      borderRadius: 12,
                      width: '100%',
                      animation: 'scale-up 0.2s ease-out'
                    }}>
                       <p style={{ fontSize: 13, color: '#fff', margin: '0 0 10px 0', fontWeight: 500 }}>Are you sure you want to delete this message?</p>
                       <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                         <button onClick={() => setDeleteConfirmId(null)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>Cancel</button>
                         <button onClick={() => { handleDelete(msg.id); setDeleteConfirmId(null); }} style={{ background: '#EF4444', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 'bold' }}>Delete</button>
                       </div>
                    </div>
                  )}
                </div>
                
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
                  {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                  {isAdmin && !isMe && <span style={{ marginLeft: 8, color: 'rgba(249,115,22,0.4)', fontSize: 8 }}>ADMIN VIEW</span>}
                </div>
              </div>
            );
          })}
        </div>

        {/* Input Bar */}
        <div style={{ padding: '24px 30px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(10px)' }}>
          {selectedImage && (
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
              <img src={selectedImage} alt="Preview" style={{ height: 80, borderRadius: 12, border: '2px solid #F97316', boxShadow: '0 0 15px rgba(249,115,22,0.3)' }} />
              <button 
                onClick={() => setSelectedImage(null)}
                style={{ position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: '50%', background: '#EF4444', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
              >
                ×
              </button>
            </div>
          )}
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <button 
              onClick={() => fileInputRef.current.click()}
              style={{ 
                padding: 12, 
                background: 'rgba(255,255,255,0.08)', 
                border: '1px solid rgba(255,255,255,0.12)', 
                borderRadius: '50%', 
                cursor: 'pointer', 
                color: 'rgba(255,255,255,0.7)', 
                flexShrink: 0,
                transition: 'all 0.2s ease'
              }}
              className="hover-bright"
              title="Attach screenshot"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7" />
                <polyline points="16 5 21 5 21 10" />
                <line x1="12" y1="12" x2="21" y2="3" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept="image/*" 
              onChange={handleFileChange} 
            />
            <div style={{ flex: 1, position: 'relative' }}>
              <textarea 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Suggest a feature or report a bug... use @ to tag users"
                style={{ 
                  width: '100%', 
                  background: 'rgba(255,255,255,0.06)', 
                  border: '1px solid rgba(255,255,255,0.15)', 
                  borderRadius: 16, 
                  padding: '14px 20px', 
                  color: '#fff', 
                  fontSize: 15, 
                  fontFamily: 'var(--font-body)', 
                  outline: 'none', 
                  resize: 'none',
                  maxHeight: 150,
                  transition: 'border-color 0.2s ease'
                }}
                rows={1}
              />
            </div>
            <button 
              onClick={handleSend}
              disabled={!inputText.trim() && !selectedImage}
              style={{ 
                background: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)', 
                color: '#fff', 
                border: 'none', 
                borderRadius: '50%', 
                width: 48, 
                height: 48, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                cursor: 'pointer',
                opacity: (!inputText.trim() && !selectedImage) ? 0.3 : 1,
                flexShrink: 0,
                boxShadow: '0 4px 15px rgba(249,115,22,0.3)',
                transition: 'all 0.2s ease'
              }}
              className="hover-pop"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-green {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.3); }
        }
        @keyframes scale-up {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        .message-chevron {
          opacity: 0;
          transition: opacity 0.15s ease;
          position: absolute;
          top: 6px;
          right: 6px;
          cursor: pointer;
          z-index: 5;
        }
        .message-wrapper:hover .message-chevron,
        .message-chevron.open {
          opacity: 1;
        }
        .dropdown-item-icon {
          padding: 6px;
          font-size: 15px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s ease, transform 0.15s ease;
          width: 32px;
          height: 32px;
        }
        .dropdown-item-icon:hover {
          background: rgba(255,255,255,0.1);
          transform: scale(1.1);
        }
        .hover-bright:hover {
          background: rgba(255,255,255,0.15) !important;
          color: #fff !important;
        }
        .hover-pop-delete:hover {
          background: rgba(239,68,68,0.2) !important;
          border-color: rgba(239,68,68,0.4) !important;
          color: #EF4444 !important;
        }
        .hover-pop:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 20px rgba(249,115,22,0.4) !important;
        }
        textarea:focus {
          border-color: rgba(249,115,22,0.5) !important;
        }
      `}</style>
    </div>
  );
}
