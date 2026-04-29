import useGame from '../../hooks/useGame';
import PlayerSeat from './PlayerSeat';
import ScoreStrip from './ScoreStrip';
import TableCenter from './TableCenter';
import SelfArea from './SelfArea';
import RoundTransition from './RoundTransition';

export default function PokerTable() {
  const { players, playerId } = useGame();

  const opponents = (players || []).filter(p => p.id !== playerId);
  const self = (players || []).find(p => p.id === playerId);

  return (
    <div className="poker-table-wrap">
      <div className="opponents-row">
        {opponents.map(p => <PlayerSeat key={p.id} player={p} />)}
        {opponents.length === 0 && (
          <p className="waiting-opponents">Waiting for opponents...</p>
        )}
      </div>

      <ScoreStrip />

      <div className="table-felt">
        <TableCenter />
      </div>

      {self && <PlayerSeat player={self} />}

      <SelfArea />

      <RoundTransition />
    </div>
  );
}
