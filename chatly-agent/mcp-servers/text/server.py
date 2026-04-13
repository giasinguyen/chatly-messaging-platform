"""Minimal MCP server — Text-utility tools.

Implements JSON-RPC 2.0 over HTTP POST /mcp.

Tools:
  word_count(text)       -> number of words
  char_count(text)       -> number of characters
  reverse(text)          -> reversed string
  uppercase(text)        -> uppercased string
  lowercase(text)        -> lowercased string
  title_case(text)       -> Title Cased string
"""
import json
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer

PORT = 8080


def _log(level: str, msg: str) -> None:
    ts = datetime.now(timezone.utc).strftime("%H:%M:%S.%f")[:-3]
    print(f"[mcp-text] [{ts}] {level}: {msg}", flush=True)

TOOLS = [
    {
        "name": "word_count",
        "description": "Count the number of words in a text string.",
        "inputSchema": {
            "type": "object",
            "properties": {"text": {"type": "string", "description": "Input text"}},
            "required": ["text"],
        },
    },
    {
        "name": "char_count",
        "description": "Count the number of characters (including spaces) in a text string.",
        "inputSchema": {
            "type": "object",
            "properties": {"text": {"type": "string"}},
            "required": ["text"],
        },
    },
    {
        "name": "reverse",
        "description": "Reverse a text string.",
        "inputSchema": {
            "type": "object",
            "properties": {"text": {"type": "string"}},
            "required": ["text"],
        },
    },
    {
        "name": "uppercase",
        "description": "Convert text to UPPERCASE.",
        "inputSchema": {
            "type": "object",
            "properties": {"text": {"type": "string"}},
            "required": ["text"],
        },
    },
    {
        "name": "lowercase",
        "description": "Convert text to lowercase.",
        "inputSchema": {
            "type": "object",
            "properties": {"text": {"type": "string"}},
            "required": ["text"],
        },
    },
    {
        "name": "title_case",
        "description": "Convert text to Title Case.",
        "inputSchema": {
            "type": "object",
            "properties": {"text": {"type": "string"}},
            "required": ["text"],
        },
    },
]


def _apply_tool(tool_name: str, args: dict) -> str:
    text = str(args.get("text", ""))
    match tool_name:
        case "word_count":
            return str(len(text.split()))
        case "char_count":
            return str(len(text))
        case "reverse":
            return text[::-1]
        case "uppercase":
            return text.upper()
        case "lowercase":
            return text.lower()
        case "title_case":
            return text.title()
        case _:
            raise KeyError(tool_name)


def handle_rpc(body: dict) -> dict:
    method = body.get("method", "")
    req_id = body.get("id", 1)

    if method == "tools/list":
        _log("INFO", "tools/list → returning 6 tools")
        return {"jsonrpc": "2.0", "id": req_id, "result": {"tools": TOOLS}}

    if method == "tools/call":
        params = body.get("params", {})
        tool_name = params.get("name", "")
        args = params.get("arguments", {})

        _log("CALL", f"tools/call  tool={tool_name!r}  args={args}")

        try:
            result = _apply_tool(tool_name, args)
        except KeyError:
            err = f"Tool '{tool_name}' not found"
            _log("ERROR", err)
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32601, "message": err},
            }

        _log("RESULT", f"{tool_name}(…) = {result!r}")
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {"content": [{"type": "text", "text": result}]},
        }

    _log("WARN", f"Unknown method: {method!r}")
    return {
        "jsonrpc": "2.0",
        "id": req_id,
        "error": {"code": -32601, "message": f"Method '{method}' not found"},
    }


class MCPHandler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args: object) -> None:  # silence default httpd log
        pass

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/mcp":
            self.send_response(404)
            self.end_headers()
            return

        client = f"{self.client_address[0]}:{self.client_address[1]}"
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length)
        _log("HTTP", f"POST /mcp  from={client}  body={raw.decode(errors='replace')}")

        try:
            body = json.loads(raw)
        except json.JSONDecodeError:
            _log("ERROR", "Invalid JSON body")
            self.send_response(400)
            self.end_headers()
            return

        response = handle_rpc(body)
        payload = json.dumps(response).encode()

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/health":
            body = b'{"status":"ok","server":"mcp-text"}'
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
        else:
            self.send_response(404)
            self.end_headers()


if __name__ == "__main__":
    _log("INFO", f"Listening on :{PORT} — POST /mcp")
    HTTPServer(("0.0.0.0", PORT), MCPHandler).serve_forever()
