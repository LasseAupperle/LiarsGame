/**
 * ChatPanel.jsx - Lobby/game chat (SPEC §2.4): floating button + slide-up panel.
 * Messages are rendered as plain text.
 */
import { useEffect, useRef, useState } from 'react';
import useGameStore from '../../store/gameStore';
import useUIStore, { toast } from '../../store/uiStore';
import useSocketStore from '../../store/socketStore';

const QUICK = ['😂', '👀', '🤥', '😏', '👍', '🔥'];
const MAX_LENGTH = 200;

export default function ChatPanel() {
  const gameCode = useGameStore((s) => s.gameCode);
  const myId = useGameStore((s) => s.playerId);
  const chatLobby = useUIStore((s) => s.chatLobby);
  const allMessages = useUIStore((s) => s.chatMessages);
  const open = useUIStore((s) => s.chatOpen);
  const unread = useUIStore((s) => s.chatUnread);
  const setOpen = useUIStore((s) => s.setChatOpen);
  const emit = useSocketStore((s) => s.emit);
  const [text, setText] = useState('');
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const messages = chatLobby === gameCode ? allMessages : [];
  const badge = chatLobby === gameCode ? unread : 0;

  useEffect(() => {
    if (open && listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [open, messages.length]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!gameCode) return null;

  const send = (value) => {
    const message = value.trim();
    if (!message) return;
    emit('chat:send', message, (res) => {
      if (!res?.success) toast(res?.message || 'Message not sent', 'error');
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    send(text);
    setText('');
  };

  return (
    <>
      <button
        className="chat-fab"
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close chat' : `Open chat${badge ? ` (${badge} unread)` : ''}`}
        title="Chat"
      >
        💬
        {badge > 0 && <span className="chat-badge">{badge > 9 ? '9+' : badge}</span>}
      </button>

      {open && (
        <div className="chat-panel" role="dialog" aria-label="Chat">
          <div className="chat-header">
            <span>Chat</span>
            <button className="chat-close" onClick={() => setOpen(false)} aria-label="Close chat">✕</button>
          </div>

          <div className="chat-messages" ref={listRef}>
            {messages.length === 0 && <p className="chat-empty">No messages yet — say hi 👋</p>}
            {messages.map((m) => (
              <div key={m.id} className={`chat-msg${m.playerId === myId ? ' mine' : ''}${m.isBot ? ' bot' : ''}`}>
                {m.playerId !== myId && <span className="chat-author">{m.playerName}</span>}
                <span className="chat-text">{m.text}</span>
              </div>
            ))}
          </div>

          <div className="chat-quick">
            {QUICK.map((emoji) => (
              <button key={emoji} type="button" onClick={() => send(emoji)} aria-label={`Send ${emoji}`}>
                {emoji}
              </button>
            ))}
          </div>

          <form className="chat-input-row" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={MAX_LENGTH}
              placeholder="Message…"
              aria-label="Chat message"
              onKeyDown={(e) => { if (e.key === 'Escape') setOpen(false); }}
            />
            <button type="submit" disabled={!text.trim()}>Send</button>
          </form>
        </div>
      )}
    </>
  );
}
