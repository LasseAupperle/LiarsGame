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
3. Every eligible player is dealt 5 cards: all non-spectators, or only the tied
   leaders during a tiebreak (see 1.7).
4. Turn order is randomised among the dealt players; the first player in it starts.

The players dealt in at round start are that round's **participants**. Only
participants who haven't been removed (§2.1) count as *active players* for that
round's scoring. Players who join, rejoin after removal, or are spectating sit the
round out and score nothing from it (decided 2026-11-08).

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
- The final play of a round (the one that empties the last hand) **cannot** be
  challenged: the round resolves immediately as a no-liar round. (Decided
  2026-11-08 — deliberate: emptying your hand last is a reward.)

### 1.6 Bonus pot
- There is **one shared bonus pot per game**, starting at 0.
- Each round that ends with no liar call: pot +1.
- A **correct** liar call pays the caller +1 + pot (the pot value before the call).
- After **any** liar call (correct or wrong): pot = max(0, pot − 1).
- The pot is public (part of `gameState`).

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
- Player name: trimmed, 1–20 characters, unique within the lobby (case-insensitive).
  Applies to joining a waiting lobby and joining a running game.
- The creator is the host. The host is always a human. If the host leaves a waiting
  lobby, the next human in join order becomes host. Only the host can start; start
  requires 2–4 players (bots count).
- A lobby with no human players left is deleted (bots alone never keep it alive).
- **Joining a running game:** allowed while fewer than 4 players. The new player
  sits out the current round (no cards) and is dealt in from the next round.
- All state is in memory; a server restart ends every game.

### 2.1 Presence, disconnects & rejoin
- Each player has a public `playerId` (visible to everyone in lobby/game state) and a
  secret `token` (UUID returned only to that player on create/join, stored by the
  client). **Rejoining requires the token**; knowing someone's `playerId` is never
  enough to act as them. One player may have several sockets over time; only the
  **most recent** socket counts. A disconnect of an older socket is ignored (mobile
  clients often reconnect before the old socket times out).
- Each player has a `connected` flag, visible to everyone (lobby `players` and
  `gameState.players`).
- **Disconnect in a waiting lobby:** the player stays in the lobby, marked
  disconnected, for a **60 s** grace period, then is removed (host passes on as
  usual). If the game starts during that window, they are dealt in and the in-game
  grace period starts.
- **Disconnect during a game:** **120 s** grace period. While disconnected, whenever
  it is their turn the server **auto-plays one random card** for them after **15 s**,
  announced with `game:autoPlayed`. Connected players have no turn limit.
- **Grace period expires, or the player leaves a running game (`lobby:leave`):** the
  player is removed from turn order and becomes a spectator, keeping their score.
  - If ≤ 1 player remains in turn order, the game ends; that player (if any) wins.
  - If the removed player was the current player, the turn passes to the next
    player in order who holds cards.
  - If no remaining active player holds cards, the round ends without scoring and
    a new round starts.
- **Rejoin** (`game:rejoin` with `lobbyCode, token`) works in both phases:
  - waiting lobby → `phase: 'lobby'`, the lobby's players and settings;
  - running game → `phase: 'game'`, full `gameState`, own hand, settings, `endTime`.
  - A player removed after their grace period may rejoin a still-running game: they
    are dealt back in from the next round (like a mid-game join), keeping their score.
    A player who left on purpose (`lobby:leave`) has given up their session and
    cannot rejoin with it.
  - A tiebreak spectator stays a spectator after rejoining.
  - If the game finished within the last 10 minutes the response is
    `{ success: false, ended: true, winner }` so the client can show the result.
- **Client behaviour:** reconnect forever (backoff ≤ 5 s); on every (re)connect,
  and on app load when a stored session exists, call `game:rejoin` automatically.
  On failure, clear the stored session and return to the main menu.


### 2.2 Bots
- The host can add bots to a **waiting** lobby (`lobby:addBot`) while it has fewer than
  4 players, and remove them (`lobby:removeBot`). This enables solo play (1 human +
  1–3 bots) and filling up a half-empty table.
- Bots get distinct names from a fixed list (e.g. "Ada (bot)"), have `isBot: true`
  in lobby and game state, are always `connected`, and never time out.
- A human joining a **full waiting** lobby that contains a bot takes the most recently
  added bot's seat. Running games can't be joined when full.
- On its turn a bot acts after a short think delay (1–2.5 s). It plays by the same
  rules as everyone, using only information a human in its seat would have (its own
  hand and plays, the public history and scores). Strategy: play matching cards
  truthfully when it has them, sometimes bluffs, must bluff without them; calls liar
  when the odds, from counting matching cards, make a call worthwhile, weighing in
  the bonus pot.
- If no human remains in a running game (all left or removed), the game ends with no
  winner and the lobby is closed.


### 2.3 Rematch
- When a game ends **with a winner** and at least one human is still in it, the lobby
  is kept: it returns to `waiting` with the same code, settings, bots and every
  player who hadn't left (scores reset when the next game starts). The host stays
  host if still present, otherwise the first human becomes host.
- `game:won` carries `rematch: true` and the final scores. Each client shows the
  result with **Rematch** (go to the lobby room) or **Leave** (`lobby:leave`).
  Players still in the lobby when the host starts are dealt in, even if they are
  still looking at the result screen.
- Humans who are disconnected when the game ends keep their seat for the lobby
  grace period (§2.1).
- The lobby remembers `lastResult` (winner + final scores), included in its view and
  in rejoin responses.
- A game that ends without a winner (no humans left) closes the lobby as before.

### 2.4 Chat
- Every player in a lobby or game (including spectators) can send chat messages with
  `chat:send`; everyone in that lobby receives `chat:message`.
- Text is trimmed, control characters removed, 1–200 characters. Rate limit: at most
  5 messages per 10 s per player; extra messages are rejected with a message.
- The lobby keeps the last 50 messages. They are returned on join and rejoin (`chat`),
  survive a rematch, and disappear when the lobby closes.
- Messages are `{ id, playerId, playerName, text, ts, isBot }`. Bots occasionally
  comment after a liar call they were part of.
- Chat is plain text; clients must render it as text (never as HTML).
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
| `lobby:create` | `playerName, settings{mode, timedMinutes}` | `lobbyCode, playerId, token, players, host` |
| `lobby:join` | `lobbyCode, playerName` | `lobbyCode, playerId, token, players, host, chat` or `joinedRunning: true` |
| `lobby:leave` | — (in a running game: leave immediately, see §2.1) | — |
| `lobby:start` | — (host only) | `gameState, settings, endTime` |
| `lobby:list` | — | `lobbies[{code, playerCount, maxPlayers, status, roundNumber}]` |
| `lobby:addBot` | — (host only, waiting lobby) | — (`lobby:updated` follows) |
| `lobby:removeBot` | `botId` (host only, waiting lobby) | — (`lobby:updated` follows) |
| `chat:send` | `text` | — (`chat:message` follows) |
| `game:checkRejoin` | `{lobbyCode, token}` | `{canRejoin}` |
| `game:rejoin` | `lobbyCode, token` | `playerId, chat` plus — `phase:'lobby'`: `lobbyCode, players, host, settings` · `phase:'game'`: `gameState, hand, settings, endTime` · finished: `{success:false, ended:true, winner}` |
| `game:play` | `lobbyCode, cardIndices[]` | `gameState` |
| `game:callLiar` | `lobbyCode` | `gameState` |

### 4.2 Server → client
| Event | Payload | Audience |
|---|---|---|
| `lobby:updated` | `{lobbyCode, host, settings, lastResult, players[{id, name, connected, isBot}]}` | lobby |
| `game:started` | `{lobbyCode, gameState, settings, endTime}` | lobby |
| `game:state` | `gameState` (see 4.3) | lobby |
| `game:hand` | `number[]` (own hand only) | single player |
| `game:liar:revealed` | `{truthful, isLiarCorrect, cardsPlayed, accusedName, callerName, scoreDeltas, scores, bonusPaid}` | lobby |
| `game:round:noLiar` | `{scores, scoreDeltas}` | lobby |
| `game:autoPlayed` | `{playerId, playerName}` — server played for a disconnected player | lobby |
| `game:timeUp` | `{tiebreak, gameState}` | lobby |
| `chat:message` | `{id, playerId, playerName, text, ts, isBot}` | lobby |
| `game:won` | `{winnerId, winnerName, finalScore, finalScores[{id, name, mainScore, isBot}], rematch}` | lobby |
| `player:disconnected` | `{playerId, playerName, timeoutMs}` | lobby |
| `player:reconnected` | `{playerId}` | lobby |
| `player:left` | `{playerId, playerName}` | lobby |

`scoreDeltas` maps **every** player whose score changed to the actual change
(after clamping at 0).

### 4.3 `gameState`
```
{
  roundNumber, winningCard, currentPlayerId, turnOrder, settings,
  playHistory: [{ playerId, playerName, cardsPlayed, claim }],
  bonus,                       // shared bonus pot (§1.6)
  players: [{ id, name, isBot, mainScore, spectator, connected, cardsLeft, cardsPlayedCount }]
}
```
Hands are never included in `gameState`; each player receives only their own hand
via `game:hand`.
