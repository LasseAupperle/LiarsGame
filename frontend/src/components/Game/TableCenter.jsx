import { useEffect, useRef } from 'react';
import useGame from '../../hooks/useGame';
import DiscardPile from './DiscardPile';

const CARD_IMAGES = {
  1: '/assets/cards/Ace.png',
  2: '/assets/cards/King.png',
  3: '/assets/cards/Queen.png',
  4: '/assets/cards/Joker.png',
};
const cardNames = { 1: 'Ace', 2: 'King', 3: 'Queen', 4: 'Joker' };

export default function TableCenter() {
  const {
    history,
    winningCard,
    tableDisplay,
    setTableDisplay,
    clearTableDisplay,
    players,
    currentPlayerId,
    roundNumber,
    addToDiscardPile,
    setRoundTransition,
  } = useGame();

  const prevHistoryLenRef = useRef(0);
  const prevRoundRef = useRef(roundNumber);

  useEffect(() => {
    const prevLen = prevHistoryLenRef.current;
    const curLen = history.length;
    prevHistoryLenRef.current = curLen;

    if (curLen > 0) {
      const last = history[curLen - 1];
      setTableDisplay({
        count: last.cardsPlayed,
        revealed: false,
        noLiar: false,
        cards: null,
        accusedName: null,
        callerName: null,
        isLiarCorrect: null,
        scoreDeltas: null,
        scores: null,
      });
    } else if (curLen === 0 && prevLen === 0) {
      clearTableDisplay();
    }
    // curLen===0, prevLen>0: round ended — keep reveal visible, trigger round transition
    if (curLen === 0 && prevLen > 0) {
      addToDiscardPile({ ...tableDisplay });
    }
  }, [history.length]);

  // Trigger round transition overlay when round number increments
  useEffect(() => {
    if (roundNumber > 0 && roundNumber !== prevRoundRef.current && prevRoundRef.current > 0) {
      setRoundTransition({ roundNumber, lastResult: tableDisplay });
    }
    prevRoundRef.current = roundNumber;
  }, [roundNumber]);

  const cardName = cardNames[winningCard] || '?';
  const { count, revealed, noLiar, cards, accusedName, callerName, isLiarCorrect, scoreDeltas, scores } = tableDisplay;
  const nextPlayerName = players?.find(p => p.id === currentPlayerId)?.name;

  return (
    <div className="table-center">
      <div className="table-card-badge">
        <span className="table-card-label">TABLE CARD</span>
        <span className="table-card-name">{cardName}</span>
        {winningCard && (
          <img src={CARD_IMAGES[winningCard]} alt={cardName} className="table-card-banner-img" />
        )}
      </div>

      <div className="table-main-area">
        <DiscardPile />

        <div className="played-area">
          {count === 0 ? (
            <p className="waiting-first-play">Waiting for first play...</p>
          ) : (
            <>
              {!revealed && (
                <p className="table-player-label">
                  {history[history.length - 1]?.playerName} played {count}
                </p>
              )}

              <div className="table-cards-row">
                {Array.from({ length: count }).map((_, i) => (
                  <div key={i} className={`card-flip ${revealed ? 'flipped' : ''}`}>
                    <div className="card-flip-inner">
                      <div className="card-flip-front">
                        <img src="/assets/cards/card_back.png" alt="Card back" />
                      </div>
                      <div className="card-flip-back">
                        <img
                          src={cards?.[i] != null ? CARD_IMAGES[cards[i]] : '/assets/cards/card_back.png'}
                          alt={cards?.[i] != null ? cardNames[cards[i]] : 'Card'}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {revealed && noLiar && (
                <div className="liar-result-banner no-liar-round">
                  <p className="liar-result-headline">✅ Round complete!</p>
                  <p className="liar-result-sub">No liar called — everyone gets +1</p>
                  <div className="score-deltas">
                    {scores?.map(p => (
                      <span key={p.id} className="score-delta positive">{p.name} +1</span>
                    ))}
                  </div>
                  {nextPlayerName && <p className="next-player-hint">▶ {nextPlayerName} goes first next round</p>}
                </div>
              )}

              {revealed && !noLiar && (
                <div className={`liar-result-banner ${isLiarCorrect ? 'liar-caught' : 'liar-wrong'}`}>
                  <p className="liar-result-headline">
                    {accusedName} was {isLiarCorrect ? '🤥 BLUFFING!' : '✅ TRUTHFUL!'}
                  </p>
                  <p className="liar-result-sub">
                    {callerName} called liar — {isLiarCorrect ? 'correct!' : 'wrong!'}
                  </p>
                  <div className="score-deltas">
                    {scores?.map(p => {
                      const delta = scoreDeltas?.[p.id] ?? 1;
                      return (
                        <span key={p.id} className={`score-delta ${delta >= 0 ? 'positive' : 'negative'}`}>
                          {p.name} {delta > 0 ? '+' : ''}{delta}
                        </span>
                      );
                    })}
                  </div>
                  {nextPlayerName && <p className="next-player-hint">▶ {nextPlayerName} goes first next round</p>}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
