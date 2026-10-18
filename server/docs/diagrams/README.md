# Endpoint diagrams

One sequence diagram per implemented method/path, plus the endpoint map and shared transaction flow. Based on `app/api.py`, `app/main.py`, and `app/db.py`; excludes deferred legacy endpoints.

- [Endpoint map](endpoints.puml)
- [Shared transaction and errors](transaction.puml)
- [Clerk identity and permissions](auth.puml)
- [PATCH `/api/v1/pods/{pod_id}/visibility`](set_visibility.puml)
- [PUT `/api/v1/pods/{pod_id}/admins/{user_id}`](set_admin.puml)
- [GET `/api/v1/pods/{pod_id}/stats/colors`](color_stats.puml)

- [POST `/api/v1/users`](create_user.puml)
- [GET `/api/v1/users`](list_users.puml)
- [GET `/api/v1/users/{user_id}`](get_user.puml)
- [PATCH `/api/v1/users/{user_id}`](patch_user.puml)
- [DELETE `/api/v1/users/{user_id}`](delete_user.puml)
- [POST `/api/v1/pods`](create_pod.puml)
- [GET `/api/v1/pods`](list_pods.puml)
- [GET `/api/v1/pods/{pod_id}`](get_pod.puml)
- [GET `/api/v1/pods/{pod_id}/stats/players`](player_stats.puml)
- [GET `/api/v1/pods/{pod_id}/stats/commanders`](commander_stats.puml)
- [PUT `/api/v1/pods/{pod_id}`](replace_pod.puml)
- [DELETE `/api/v1/pods/{pod_id}`](delete_pod.puml)
- [POST `/api/v1/pods/{pod_id}/members`](create_member.puml)
- [PUT `/api/v1/pods/{pod_id}/members/{member_id}`](replace_member.puml)
- [DELETE `/api/v1/pods/{pod_id}/members/{member_id}`](delete_member.puml)
- [POST `/api/v1/games`](create_game.puml)
- [GET `/api/v1/games`](list_games.puml)
- [GET `/api/v1/games/{game_id}`](get_game.puml)
- [PATCH `/api/v1/games/{game_id}`](patch_game.puml)
- [DELETE `/api/v1/games/{game_id}`](delete_game.puml)
- [POST `/api/v1/games/{game_id}/result`](record_result.puml)
- [GET `/api/v1/games/{game_id}/result`](get_result.puml)
- [GET `/api/health`](health_legacy.puml)
- [GET `/api/v1/health`](health_v1.puml)

Render with a PlantUML editor extension, or run from `server/` with PlantUML installed:

```sh
plantuml -tsvg docs/diagrams/*.puml
```

Generated SVGs are optional local previews. `/docs`, `/redoc`, and `/openapi.json` are framework-provided documentation routes and appear in the endpoint map.
