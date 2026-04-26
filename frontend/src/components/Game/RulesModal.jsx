import { useState } from 'react';

export default function RulesModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button className="btn-rules-toggle" onClick={() => setOpen(true)} title="Game Rules">
        ?
      </button>

      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal-content rules-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Game Rules</h2>
              <button className="modal-close" onClick={() => setOpen(false)}>✕</button>
            </div>

            <div className="rules-body">
              <section>
                <h3>Setup</h3>
                <p>2–4 players. Each round, a <strong>Table Card</strong> (Ace, King, or Queen) is chosen at random. Every player is dealt 5 cards. <strong>Jokers always count as the Table Card.</strong></p>
              </section>

              <section>
                <h3>Taking a Turn</h3>
                <p>The current player plays <strong>1–3 cards</strong> face-down and claims they are all the Table Card. Example: "I played 2 Kings."</p>
                <p>They may be bluffing — the claim is always the Table Card regardless of what was actually played.</p>
              </section>

              <section>
                <h3>Calling Liar</h3>
                <p>Only the <strong>next player in turn order</strong> can call "Liar" to challenge the play, or they can choose to play their own cards instead.</p>
                <ul>
                  <li><strong>Liar correct</strong> (they were bluffing): accused −1 pt, caller +1 pt + bonus, others +1 pt</li>
                  <li><strong>Liar wrong</strong> (they were truthful): caller −1 pt, accused +1 pt, others +1 pt</li>
                </ul>
                <p>After a Liar call, a new round starts.</p>
              </section>

              <section>
                <h3>Bonus Modifier</h3>
                <p>Each round that passes <em>without</em> a Liar call, the bonus increases by +1. This is added to the caller's score if they successfully call a Liar. It resets after any Liar call.</p>
              </section>

              <section>
                <h3>Winning</h3>
                <p>First player to reach <strong>20+ points</strong> with the highest score wins. If multiple players reach 20, only the tied leaders keep playing until one pulls ahead.</p>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
