import useGame from '../../hooks/useGame';

const CARD_BACK = '/assets/cards/card_back.png';

export default function PlayerSeat({ player, position = 'top', turnIndex }) {
  const { currentPlayerId, playerId: myId, disconnectedPlayers } = useGame();
  const isActive = player.id === currentPlayerId;
  const isMe = player.id === myId;
  const isDisconnected = disconnectedPlayers.some(d => d.playerId === player.id);
  const cardsLeft = player.cardsLeft ?? player.hand?.length ?? 0;
  const isVertical = position === 'left' || position === 'right';

  return (
    <div className={`player-seat seat-pos-${position} ${isActive ? 'active-turn' : ''} ${isDisconnected ? 'disconnected' : ''} ${isMe ? 'self-seat' : ''}`}>
      {turnIndex != null && (
        <span className="turn-badge">#{turnIndex + 1}</span>
      )}
      <div className={`seat-cards ${isVertical ? 'seat-cards-vertical' : ''}`}>
        {Array.from({ length: Math.min(3, Math.max(1, cardsLeft)) }).map((_, i) => (
          <img
            key={i}
            src={CARD_BACK}
            alt="card"
            className="seat-card-back"
            style={isVertical
              ? { marginTop: i > 0 ? -20 : 0, zIndex: i }
              : { marginLeft: i > 0 ? -20 : 0, zIndex: i }
            }
          />
        ))}
        <span className="seat-card-count">{cardsLeft}</span>
      </div>
      <div className="seat-info">
        <span className="seat-name">
          {player.name}{isMe ? ' (You)' : ''}
          {isDisconnected && ' ⚡'}
        </span>
        <span className="seat-score">{player.mainScore ?? 0} pts</span>
      </div>
    </div>
  );
}
