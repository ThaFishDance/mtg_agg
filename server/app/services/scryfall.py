import httpx


class ScryfallService:
    def __init__(self) -> None:
        self.client = httpx.AsyncClient(
            headers={
                "Accept": "application/json",
                "User-Agent": "mtg-app/voice-card-flash",
            },
            timeout=10.0,
        )

    async def close(self) -> None:
        await self.client.aclose()

    @staticmethod
    def _get_image(card: dict) -> str | None:
        uris = card.get("image_uris") or {}
        if uris.get("normal"):
            return uris["normal"]
        if uris.get("large"):
            return uris["large"]
        faces = card.get("card_faces") or []
        if faces:
            face_uris = faces[0].get("image_uris") or {}
            if face_uris.get("normal"):
                return face_uris["normal"]
            if face_uris.get("large"):
                return face_uris["large"]
        return None

    async def lookup(self, query: str) -> dict:
        """
        Returns card dict on success.
        Raises httpx.HTTPStatusError on non-2xx from Scryfall.
        Raises ValueError if card has no image.
        """
        response = await self.client.get(
            "https://api.scryfall.com/cards/named",
            params={"fuzzy": query},
        )
        response.raise_for_status()
        card = response.json()
        image_url = self._get_image(card)
        if not image_url:
            raise ValueError("Card image unavailable")
        return {
            "id": card["id"],
            "name": card["name"],
            "typeLine": card["type_line"],
            "imageUrl": image_url,
        }
