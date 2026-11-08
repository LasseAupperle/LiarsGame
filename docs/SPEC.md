# Liars Game — Specification

**This file is the single source of truth for game rules, server behaviour and the
client/server protocol.** Every behavioural change is written here first, then
implemented. If code and this spec disagree, the code is wrong (or the spec must be
amended in the same commit). See `CLAUDE.md` for the workflow.

Status markers: **[OPEN]** = decision pending, not yet specified.

---

## 1. Game rules

### 1.1 Players & deck
- 2–4 players per game.
- Deck of 20 cards: 6× Ace (1), 6× King (2), 6× Queen (3), 2× Joker (4).
- A Joker always counts as the table card.

### 1.2 Round setup
1. A fresh deck is shuffled.
2. The **table card** is chosen at random from Ace / King / Queen.
3. Every *active* player (see 1.7) is dealt 5 cards.
4. Turn order is randomised among active players; the first player in it starts.

### 1.3 Turn
- On their turn the current player must do exactly one of:
  - **Play** 1–3 cards from their hand face-down. The claim is always
    "N × table card"; the player may be bluffing.
  - **Call Liar** on the most recent play of this round (only possible if a play exists).
- Only the current player may act. Everyone else waits.
- After a play, the turn passes to the next player in turn order who still holds
  cards. Players with an empty hand are skipped.

### 1.4 Liar call
- The accused is the player who made the most recent play of the round.
- A player can never call liar on their own play.
- The accused's played cards are revealed. The play is *truthful* when every
  revealed card is the table card or a Joker.

| Outcome | Accused | Caller | Every other active player |
|---|---|---|---|
| Correct (accused bluffed) | −1 | +1 + bonus | +1 |
| Wrong (accused truthful) | +1 | −1 | +1 |

- After a liar call the round ends and a new round starts.
- Scores never go below 0.

### 1.5 Round with no liar call
- When every active player's hand is empty, the round ends without a liar call.
- Every active player gains +1 point and the bonus increases by +1.
- **[OPEN]** Whether the final play of a round (the one that empties the last hand)
  may still be challenged by the next player before the round resolves. Current
  behaviour: it cannot; the round resolves immediately.

### 1.6 Bonus modifier
- **[OPEN]** Exact semantics. Current implementation (to be replaced once decided):
  each player has their own bonus value; a no-liar round gives every active player
  +1 bonus; a successful caller gains the *accused's* bonus; after a call only the
  accused's bonus changes (correct call → 0, wrong call → −1, min 0).

### 1.7 Game modes & winning
| Mode | Target | Notes |
|---|---|---|
| standard | 20 points | default |
| short | 10 points | |
| timed | — | `timedMinutes` 1–60; when time runs out the highest score wins |

- A player wins when their score is ≥ target **and** they are the sole top scorer.
- **Tiebreak:** once anyone reaches the target, only the players sharing the top
  score stay active; everyone else becomes a spectator. Rounds continue among the
  active players until one is the sole leader.
- **Timed mode:** when the timer expires, if one player leads they win; otherwise
  the tied leaders play on in tiebreak (target = current top score).

---

## 2. Lobbies & sessions

- Lobby code: 5 characters `A–Z0–9`, unique among live lobbies. Codes are
  case-insensitive on input.
- Player name: trimmed, 1–20 characters. **[OPEN]** uniqueness within a lobby.
- The creator is the host. If the host leaves a waiting lobby, the next player in
  join order becomes host. Only the host can start; start requires 2–4 players.
- A lobby with no players is deleted.
- **Joining a running game:** allowed while fewer than 4 players. The new player
  sits out the current round (no cards) and is dealt in from the next round.
- **Disconnect during a game:** the player has a 120 s grace period. Within it they
  can rejoin with `(lobbyCode, playerId)` and get the full state and their hand
  back. When it expires they are removed from turn order (become spectator). If
  ≤ 1 player remains in turn order, the game ends and that player (if any) wins.
- **Disconnect in a waiting lobby:** the player is removed immediately.
- All state is in memory; a server restart ends every game.

---

## 3. Server-side enforcement

The client is untrusted. The server validates every event and rejects (with
`{ success: false, message }`) anything that breaks the rules — the UI hiding a
button is never the only guard.

- Every event payload is type-checked; malformed input is rejected, never thrown.
- `game:play`
  - sender must be in the game, not a spectator, and the current player;
  - card indices: an array of 1–3 **distinct integers**, each a valid index into the
    sender's hand. Validation happens before the hand is touched — a rejected play
    never changes state.
- `game:callLiar`
  - sender must be in the game, not a spectator, and the current player;
  - a play must exist in this round, and it must not be the sender's own.
- Game events act on the lobby the socket joined; a `lobbyCode` argument that
  differs from the socket's lobby is rejected.
- There is no client event to skip or advance a turn.

---

## 4. Socket protocol

All client → server events take an acknowledgement callback as the last argument,
which receives `{ success: boolean, message?: string, ... }`.

### 4.1 Client → server
| Event | Arguments | Success response |
|---|---|---|
| `lobby:create` | `playerName, settings{mode, timedMinutes}` | `lobbyCode, playerId, players` |
| `lobby:join` | `lobbyCode, playerName` | `lobbyCode, playerId, players` or `joinedRunning: true` |
| `lobby:leave` | — | — |
| `lobby:start` | — (host only) | `gameState, settings, endTime` |
| `lobby:list` | — | `lobbies[{code, playerCount, maxPlayers, status, roundNumber}]` |
| `game:checkRejoin` | `{lobbyCode, playerId}` | `{canRejoin}` |
| `game:rejoin` | `lobbyCode, playerId` | `gameState, hand` |
| `game:play` | `lobbyCode, cardIndices[]` | `gameState` |
| `game:callLiar` | `lobbyCode` | `gameState` |

### 4.2 Server → client
| Event | Payload | Audience |
|---|---|---|
| `lobby:updated` | `{lobbyCode, players}` | lobby |
| `game:started` | `{lobbyCode, gameState, settings, endTime}` | lobby |
| `game:state` | `gameState` (see 4.3) | lobby |
| `game:hand` | `number[]` (own hand only) | single player |
| `game:liar:revealed` | `{truthful, isLiarCorrect, cardsPlayed, accusedName, callerName, scoreDeltas, scores}` | lobby |
| `game:round:noLiar` | `{scores, scoreDeltas}` | lobby |
| `game:timeUp` | `{tiebreak, gameState}` | lobby |
| `game:won` | `{winnerId, winnerName, finalScore}` | lobby |
| `player:disconnected` | `{playerId, playerName, timeoutMs}` | lobby |
| `player:reconnected` | `{playerId}` | lobby |
| `player:left` | `{playerId, playerName}` | lobby |

### 4.3 `gameState`
```
{
  roundNumber, winningCard, currentPlayerId, turnOrder, settings,
  playHistory: [{ playerId, playerName, cardsPlayed, claim }],
  players: [{ id, name, mainScore, bonusModifier, spectator, cardsLeft, cardsPlayedCount }]
}
```
Hands are never included in `gameState`; each player receives only their own hand
via `game:hand`.
