import argparse
import json
import os
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse


def normalize_and_validate_items(raw):
    if not isinstance(raw, list):
        raise ValueError("JSON root must be an array.")

    normalized = []
    for item in raw:
        if not isinstance(item, dict):
            continue

        text = item.get("text")
        count = item.get("count")

        if not isinstance(text, str):
            continue
        text = text.strip()
        if not text:
            continue
        if not isinstance(count, int) or count <= 0:
            continue

        normalized.append({"text": text, "count": count})
    return normalized


class CardRequestHandler(SimpleHTTPRequestHandler):
    server_version = "CardServer/1.0"

    def __init__(self, *args, directory=None, **kwargs):
        self.base_dir = Path(directory or os.getcwd()).resolve()
        super().__init__(*args, directory=str(self.base_dir), **kwargs)

    def _send_json(self, status, payload):
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _target_path_from_query(self):
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)
        requested = query.get("path", ["./cards.json"])[0].strip() or "./cards.json"
        candidate = (self.base_dir / requested).resolve()

        if self.base_dir != candidate and self.base_dir not in candidate.parents:
            raise ValueError("Path escapes working directory.")
        if candidate.suffix.lower() != ".json":
            raise ValueError("Only .json files are allowed.")
        return candidate

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path != "/api/cards":
            return super().do_GET()

        try:
            file_path = self._target_path_from_query()
        except ValueError as error:
            return self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})

        if not file_path.exists():
            return self._send_json(HTTPStatus.NOT_FOUND, {"error": "JSON file not found."})

        try:
            data = json.loads(file_path.read_text(encoding="utf-8"))
            normalized = normalize_and_validate_items(data)
            return self._send_json(HTTPStatus.OK, normalized)
        except json.JSONDecodeError:
            return self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Invalid JSON content."})
        except OSError as error:
            return self._send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(error)})

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path != "/api/cards":
            return self._send_json(HTTPStatus.NOT_FOUND, {"error": "Endpoint not found."})

        try:
            file_path = self._target_path_from_query()
        except ValueError as error:
            return self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})

        try:
            content_length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            content_length = 0

        if content_length <= 0:
            return self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Empty request body."})

        raw = self.rfile.read(content_length)
        try:
            payload = json.loads(raw.decode("utf-8"))
            normalized = normalize_and_validate_items(payload)
        except json.JSONDecodeError:
            return self._send_json(HTTPStatus.BAD_REQUEST, {"error": "Invalid JSON body."})
        except ValueError as error:
            return self._send_json(HTTPStatus.BAD_REQUEST, {"error": str(error)})

        try:
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_text(json.dumps(normalized, ensure_ascii=False, indent=2), encoding="utf-8")
            relative = file_path.relative_to(self.base_dir)
            return self._send_json(HTTPStatus.OK, {"ok": True, "path": str(relative)})
        except OSError as error:
            return self._send_json(HTTPStatus.INTERNAL_SERVER_ERROR, {"error": str(error)})


def main():
    parser = argparse.ArgumentParser(description="Card app local server")
    parser.add_argument("--host", default="127.0.0.1", help="Bind host (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Bind port (default: 8000)")
    parser.add_argument(
        "--dir",
        default=".",
        help="Working directory to serve and store JSON files (default: current directory).",
    )
    args = parser.parse_args()

    base_dir = Path(args.dir).resolve()
    handler = lambda *h_args, **h_kwargs: CardRequestHandler(*h_args, directory=str(base_dir), **h_kwargs)
    server = ThreadingHTTPServer((args.host, args.port), handler)

    print(f"Serving {base_dir} at http://{args.host}:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
