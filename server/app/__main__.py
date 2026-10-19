import argparse

import uvicorn

from app.main import create_app


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the MTG Aggregator API")
    parser.add_argument("mode", nargs="?", choices=["local"], help="Use a persistent local SQLite database")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    uvicorn.run(create_app(local=args.mode == "local"), host=args.host, port=args.port)


if __name__ == "__main__":
    main()
