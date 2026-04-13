/**
 * KeyboardShortcutsHelp.jsx - Display available keyboard shortcuts
 */

import { useState } from 'react';

export default function KeyboardShortcutsHelp() {
  const [showHelp, setShowHelp] = useState(false);

  const shortcuts = [
    { key: '1-9', action: 'Select card by position' },
    { key: 'Enter', action: 'Play selected cards' },
    { key: 'L', action: 'Call Liar' },
    { key: 'R', action: 'Ready for next turn' },
    { key: 'C', action: 'Copy lobby code' },
    { key: 'S', action: 'Toggle sound' },
    { key: 'H', action: 'Hide/show cards' }
  ];

  return (
    <>
      <button
        className="help-button"
        onClick={() => setShowHelp(!showHelp)}
        title="Show keyboard shortcuts"
      >
        ⌨️
      </button>

      {showHelp && (
        <div className="shortcuts-help">
          <div className="shortcuts-header">
            <h4>Keyboard Shortcuts (PC)</h4>
            <button className="close-btn" onClick={() => setShowHelp(false)}>×</button>
          </div>
          <ul>
            {shortcuts.map((shortcut, idx) => (
              <li key={idx}>
                <span className="shortcut-key">{shortcut.key}</span>
                <span className="shortcut-action">{shortcut.action}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
