"""Minimal MCP server — Math tools.

Implements JSON-RPC 2.0 over HTTP POST /mcp.

Tools:
  add(a, b)       -> a + b
  subtract(a, b)  -> a - b
  multiply(a, b)  -> a * b
  divide(a, b)    -> a / b  (raises if b == 0)
"""
import json
import operator
import sys
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, HTTPServer

PORT = 8080


def _log(level: str, msg: str) -> None:
    ts = datetime.now(timezone.utc).strftime("%H:%M:%S.%f")[:-3]
    print(f"[mcp-math] [{ts}] {level}: {msg}", flush=True)

TOOLS = [
    {
        "name": "add",
        "description": "Add two numbers together.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "a": {"type": "number", "description": "First operand"},
                "b": {"type": "number", "description": "Second operand"},
            },
            "required": ["a", "b"],
        },
    },
    {
        "name": "subtract",
        "description": "Subtract b from a.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "a": {"type": "number"},
                "b": {"type": "number"},
            },
            "required": ["a", "b"],
        },
    },
    {
        "name": "multiply",
        "description": "Multiply two numbers.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "a": {"type": "number"},
                "b": {"type": "number"},
            },
            "required": ["a", "b"],
        },
    },
    {
        "name": "divide",
        "description": "Divide a by b. Returns an error if b is zero.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "a": {"type": "number"},
                "b": {"type": "number"},
            },
            "required": ["a", "b"],
        },
    },
]

OPS = {
    "add": operator.add,
    "subtract": operator.sub,
    "multiply": operator.mul,
    "divide": operator.truediv,
}


def handle_rpc(body: dict) -> dict:
    method = body.get("method", "")
    req_id = body.get("id", 1)

    if method == "tools/list":
        _log("INFO", "tools/list → returning 4 tools")
        return {"jsonrpc": "2.0", "id": req_id, "result": {"tools": TOOLS}}

    if method == "tools/call":
        params = body.get("params", {})
        tool_name = params.get("name", "")
        args = params.get("arguments", {})

        _log("CALL", f"tools/call  tool={tool_name!r}  args={args}")

        if tool_name not in OPS:
            err = f"Tool '{tool_name}' not found"
            _log("ERROR", err)
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32601, "message": err},
            }

        try:
            a = float(args["a"])
            b = float(args["b"])
        except (KeyError, TypeError, ValueError) as exc:
            err = f"Invalid arguments: {exc}"
            _log("ERROR", err)
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32602, "message": err},
            }

        if tool_name == "divide" and b == 0:
            _log("ERROR", "Division by zero")
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32000, "message": "Division by zero"},
            }

        result = OPS[tool_name](a, b)
        _log("RESULT", f"{tool_name}({a}, {b}) = {result}")
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "content": [{"type": "text", "text": str(result)}],
            },
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
            body = b'{"status":"ok","server":"mcp-math"}'
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
