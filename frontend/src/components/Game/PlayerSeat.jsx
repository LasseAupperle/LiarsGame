import useGame from '../../hooks/useGame';

const CARD_BACK = '/assets/cards/card_back.png';

export default function PlayerSeat({ player }) {
  const { currentPlayerId, playerId: myId, disconnectedPlayers } = useGame();
  const isActive = player.id === currentPlayerId;
  const isMe = player.id === myId;
  const isDisconnected = disconnectedPlayers.some(d => d.playerId === player.id);
  const cardsLeft = player.cardsLeft ?? player.hand?.length ?? 0;

  return (
    <div className={`player-seat ${isActive ? 'active-turn' : ''} ${isDisconnected ? 'disconnected' : ''} ${isMe ? 'self-seat' : ''}`}>
      <div className="seat-cards">
        {Array.from({ length: Math.max(1, cardsLeft) }).map((_, i) => (
          <img
            key={i}
            src={CARD_BACK}
            alt="card"
            className="seat-card-back"
            style={{ marginLeft: i > 0 ? -14 : 0, zIndex: i }}
          />
        ))}
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
