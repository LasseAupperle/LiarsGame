import useGame from '../../hooks/useGame';
import PlayerSeat from './PlayerSeat';
import ScoreStrip from './ScoreStrip';
import TableCenter from './TableCenter';
import SelfArea from './SelfArea';
import RoundTransition from './RoundTransition';

function assignPositions(opponents, turnOrder) {
  const sorted = [...opponents].sort((a, b) =>
    turnOrder.indexOf(a.id) - turnOrder.indexOf(b.id)
  );
  if (sorted.length === 1) return [{ player: sorted[0], pos: 'top', idx: 0 }];
  if (sorted.length === 2) return [
    { player: sorted[0], pos: 'left', idx: 0 },
    { player: sorted[1], pos: 'right', idx: 1 },
  ];
  return [
    { player: sorted[0], pos: 'left', idx: 0 },
    { player: sorted[1], pos: 'top', idx: 1 },
    { player: sorted[2], pos: 'right', idx: 2 },
  ];
}

export default function PokerTable() {
  const { players, playerId, turnOrder } = useGame();

  const opponents = (players || []).filter(p => p.id !== playerId);
  const self = (players || []).find(p => p.id === playerId);
  const positioned = opponents.length > 0 ? assignPositions(opponents, turnOrder || []) : [];

  const topSeat = positioned.find(s => s.pos === 'top');
  const leftSeat = positioned.find(s => s.pos === 'left');
  const rightSeat = positioned.find(s => s.pos === 'right');

  return (
    <div className="poker-table-wrap">
      <div className="table-grid">
        <div className="tg-top">
          {topSeat
            ? <PlayerSeat player={topSeat.player} position="top" turnIndex={topSeat.idx} />
            : opponents.length === 0 && <p className="waiting-opponents">Waiting for opponents...</p>
          }
        </div>

        <div className="tg-left">
          {leftSeat && <PlayerSeat player={leftSeat.player} position="left" turnIndex={leftSeat.idx} />}
        </div>

        <div className="tg-felt">
          <div className="table-felt">
            <TableCenter />
          </div>
        </div>

        <div className="tg-right">
          {rightSeat && <PlayerSeat player={rightSeat.player} position="right" turnIndex={rightSeat.idx} />}
        </div>

        <div className="tg-score">
          <ScoreStrip />
        </div>

        <div className="tg-self">
          {self && <PlayerSeat player={self} position="top" />}
          <SelfArea />
        </div>
      </div>

      <RoundTransition />
    </div>
  );
}
