# HTTP contract

## Status and conventions

The accepted API uses `/api/v1` and snake_case JSON. Authentication is deferred; all implemented routes are unauthenticated. Generated OpenAPI is available at `/openapi.json`, with interactive documentation at `/docs`.

## Implemented API

| Resource | Create | List / retrieve | Update | Delete |
|---|---|---|---|---|
| Users | POST `/api/v1/users` | GET `/api/v1/users`, GET `/api/v1/users/{user_id}` | PATCH `/api/v1/users/{user_id}` | DELETE `/api/v1/users/{user_id}` |
| Pods | POST `/api/v1/pods` | GET `/api/v1/pods`, GET `/api/v1/pods/{pod_id}` | PUT `/api/v1/pods/{pod_id}` | DELETE `/api/v1/pods/{pod_id}` |
| Members | POST `/api/v1/pods/{pod_id}/members` | Included in pod detail | PUT `/api/v1/pods/{pod_id}/members/{member_id}` | DELETE `/api/v1/pods/{pod_id}/members/{member_id}` |
| Results | POST `/api/v1/games/{game_id}/result` | GET `/api/v1/games/{game_id}/result` | — | Cascades with game deletion |
| Games | POST `/api/v1/games` | GET `/api/v1/games`, GET `/api/v1/games/{game_id}` | PATCH `/api/v1/games/{game_id}` | DELETE `/api/v1/games/{game_id}` |

Creates return 201, reads/updates 200, deletes 204. Missing records return 404; database constraint conflicts return 409; invalid input or cross-pod game players return 422; missing database configuration or connectivity returns 503. Errors currently use FastAPI's `{detail: ...}` format. Unexpected fields are rejected. ID paths require positive integers. Collection responses are `{items, limit, offset}`, ordered by ID, with `limit` default 50 / maximum 100 and `offset` default 0. Game lists optionally filter by `pod_id` and `completed`. Omit `completed` to list all games; `completed=true` selects games with results (wins or draws), and `completed=false` selects games without results. Filters combine before pagination and preserve ascending game-ID ordering. Invalid boolean values return 422.

- User creation requires `first_name`, `last_name`, and `email`. PATCH accepts any nonempty subset of these fields, without null values. Verification/login fields remain server-controlled defaults. Emails must match the documented OpenAPI pattern; uniqueness follows PostgreSQL's existing case-sensitive constraint.
- Pod creation accepts `members` (default empty, maximum 100), each containing `user_id`, `temporary_name`, or both. Registered users may occur only once per pod. PUT replaces the full membership list, creating new member IDs; members referenced by games prevent replacement with 409. Use nested member routes to edit identities or add members while retaining history. Referenced members cannot be deleted. Nested routes enforce pod/member matching.
- Game creation requires `pod_id`, optionally `date_played` and `players` (default empty, maximum 100). Each player requires `pod_member_id`, with optional `main_card`, `secondary_card`, and `color_schema`. Members must belong to the game's pod and cannot appear twice. PATCH accepts `date_played` (including explicit null) and/or a full replacement `players` list; changes are atomic. Timestamp inputs require timezone information. A game's pod is immutable. Replacing players regenerates player IDs and is rejected with 409 whenever a result exists, including a draw. Timestamp-only updates remain allowed.
- User deletion retains the user's name (up to 100 characters) as a temporary member identity before the SQL `SET NULL` action. Pod deletion cascades through its games and members; game deletion cascades through players and results, following the supplied migration.

Results: POST `/api/v1/games/{game_id}/result` requires `{ "player_winner": <pod_game_player_id> }` or `{ "player_winner": null }` for a draw. Omitting the field is invalid (422). Winner IDs must belong to the game (422 otherwise). A first result returns 201 with `{game_result_id, game_id, player_winner}`; an identical repeat returns the same object with 200, and a conflicting repeat returns 409. GET returns that object, or 404 if the game/result is absent. A result marks completion; no result means unfinished. Concurrent result submissions and player replacement serialize on the game row. Result updates/deletion, automatic timestamp changes are outside this scope. Existing game/pod deletion cascades still apply. All game responses (create/list/detail/update) include `result`: null when unfinished, otherwise `{game_result_id, game_id, player_winner}`. A draw is a non-null result with `player_winner: null`. A played timestamp alone does not determine completion.

Player statistics: GET `/api/v1/pods/{pod_id}/stats/players` returns `{items, limit, offset}`; each item has `pod_member_id`, `games_played`, `wins`, `draws`, and `win_rate`. All current pod members are included, ordered by member ID, with normal list bounds (default 50, maximum 100). Only appearances in games with a result count; each participant in a drawn game gains one draw. Win rate is `100 * wins / games_played`, rounded to two decimals, or 0 for zero appearances. Draws remain in the denominator. Duplicate names are distinct members; registered-user deletion preserves the member statistics. Existing empty pods return an empty page; missing pods return 404; invalid IDs/pagination return 422. This endpoint remains unauthenticated under the accepted initial access policy.

Commander statistics: GET `/api/v1/pods/{pod_id}/stats/commanders` returns `{items, limit, offset}`. Items contain `main_card`, nullable `secondary_card`, `appearances`, `wins`, `draws`, and `win_rate`. Only player appearances in completed games of this pod count; null or blank main cards are excluded. Each player counts separately, even when several players use the same pair in one game. Pairs use exact stored strings, are case-sensitive, and retain main/secondary order; no card resolution or pair canonicalization occurs. Results sort by main card then secondary card (ascending database text ordering, null secondary first), before standard bounded pagination. Win rate is `100 * wins / appearances`, rounded to two decimals, including draws in the denominator. Empty/no-qualifying pods return an empty page; missing pods return 404 and invalid IDs/pagination return 422. Access remains unauthenticated.

Example sequence:

```json
POST /api/v1/users
{"first_name": "Ada", "last_name": "Lovelace", "email": "ada@example.com"}

POST /api/v1/pods
{"members": [{"user_id": 1}, {"temporary_name": "Guest"}]}

POST /api/v1/games
{"pod_id": 1, "players": [{"pod_member_id": 1, "main_card": "Sol Ring"}]}
```

Use IDs returned by earlier calls; the example IDs are illustrative. `GET /api/v1/health` and `/api/health` return 200 with `{status: "ok", timestamp: "<UTC ISO-8601>"}` without external dependencies. Admin APIs, authentication, and color statistics are deferred.

## Legacy reference and deferred proposals

The following table records **legacy** endpoints relative to `client/src/app/api/`; the remaining legacy features are deferred. The new API intentionally changes formats; client migration will happen later. Use `{id}` notation for legacy dynamic segments.

| Method | Legacy path | Purpose | Legacy status | FastAPI status |
|---|---|---|---|---|
| GET | `/api/health` | Liveness | Existing | Implemented |
| GET, POST | `/api/games` | Completed history; create game | Existing | Proposed |
| GET | `/api/games/{id}` | Game and participants | Existing | Proposed |
| POST | `/api/games/{id}/complete` | Final results | Existing | Proposed |
| GET | `/api/games/stats/colors` | Color/combination win rates | Existing | Proposed |
| GET | `/api/games/stats/leaderboard` | Player/commander rankings | Existing | Proposed |
| GET, POST | `/api/decks` | Owner's decks; create | Existing | Proposed |
| GET, PUT, DELETE | `/api/decks/{id}` | Owned deck CRUD | Existing | Proposed |
| POST | `/api/decks/{id}/cards` | Add card | Existing | Proposed |
| POST | `/api/decks/{id}/cards/bulk` | Bulk add | Existing | Proposed |
| DELETE | `/api/decks/{id}/cards/{cardId}` | Remove card | Existing | Proposed |
| GET, POST | `/api/inventory` | Owner's collection; add | Existing | Proposed |
| PUT, DELETE | `/api/inventory/{cardId}` | Update/remove owned entry | Existing | Proposed |
| GET | `/api/cards/autocomplete?query=...` | Up to eight suggestions | Existing | Proposed |
| GET | `/api/cards/lookup?query=...` | Fuzzy card lookup | Existing | Proposed |
| GET | `/api/cards/prints?name=...` | Printing search | Existing | Proposed |

## Legacy schema summaries

- Health returns `{status, timestamp}`.
- Create game accepts `startingLife` and `players[{name, commanderName, colorIdentity}]`; returns `{gameId, players:[{id,name}]}` with 200. Game detail/history use snake_case fields for timestamps, life, duration, winner, and participant outcomes. Completion accepts `winnerName` and `players[{id,finalLife,finalPoison,eliminated,commanderDamageDealt}]`; returns `{success,durationSeconds}`.
- Color statistics return `{totalGames,colors,combinations}`; entries include wins, appearances, and integer percentage `winRate`. Leaderboard returns `{players,commanders}` with names and the same metrics.
- Deck creation accepts `name`, optional commander metadata; returns `{id}` with 201. Update accepts optional `name`, `commanderName`, `commanderColors`, returning `{id,name}`. Detail includes snake_case metadata and `cards[{id,card_name,quantity,category}]`. Lists include card counts. Single add accepts `cardName,category`; bulk accepts `cards` entries and returns `{added}` with 201. Deletes return `{success:true}`.
- Inventory creation accepts camelCase card/printing metadata, quantity, foil, condition, and optional prices. Responses expose snake_case fields, timestamps, and IDs. Update permits quantity, foil, and condition. Creation returns 201; delete returns `{success:true}`.
- Autocomplete returns a name array. Lookup returns `{id,name,typeLine,imageUrl,colorIdentity}`. Prints return a raw Scryfall result array from the first fetched page; comprehensive print pagination is not implemented in the legacy adapter.

Legacy validation generally returns 400 with `{error,details}`; missing resources return 404, deck/inventory unauthenticated requests 401, and internal errors 500. Existing card routes inconsistently mask upstream failures as empty results or 404. These behaviors are reference, not an error policy for the rebuild.

## Proposed FastAPI contract

Explicit models, positive IDs, timezone-aware timestamps, snake_case JSON, and null optional fields are implemented for the CRUD API above. The remaining domain conventions below are deferred proposals; no frontend migration is part of this pass.

Proposed statuses: 200 reads/updates/completion, 201 creation/import, 204 deletion, 401 invalid/missing identity, 404 absent or non-owned resource, 409 lifecycle/concurrency conflict, 422 malformed JSON or invalid request fields, 502 upstream failure, 503 throttled/unavailable dependency, 504 upstream timeout, and sanitized 500 unexpected failure. Error envelope: `{ "error": { "code": "validation_error", "message": "Invalid request", "details": [] } }`; validation details contain safe field locations and reasons, never credentials or full input values. This requires explicit handlers and is not yet implemented.

Proposed collection convention: `limit` default 50, maximum 100, `offset` default 0; response `{items,limit,offset}` with deterministic ordering including ID as tie-breaker. Exact filters, stats bounds, print pagination, and total counts are TBD. Bulk and input bounds follow [requirements](REQUIREMENTS.md) once accepted.

Deck/inventory routes require verified identity and ownership; provider is TBD. Legacy game/card routes have no explicit auth checks; rebuilt game visibility and card access policy remain TBD. CORS alone is not authentication.

FastAPI's generated OpenAPI (`/openapi.json`) and interactive docs (`/docs`) are implemented. The health schema requires `status` (constant `ok`) and `timestamp` (date-time). Proposed domain schemas and error handlers above remain unimplemented. See [tasks](TASKS.md) and [conventions](CONVENTIONS.md).
