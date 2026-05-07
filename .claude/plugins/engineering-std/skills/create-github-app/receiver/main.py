import base64
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, HTTPServer

GCP_PROJECT_ID = os.environ["GCP_PROJECT_ID"]
GITHUB_ORG = os.environ["GITHUB_ORG"]
APP_NAME = os.environ["APP_NAME"]
SECRET_PREFIX = os.environ.get("SECRET_PREFIX", "github-app-")
REDIRECT_URL = os.environ.get("REDIRECT_URL", "")
WEBHOOK_URL = os.environ.get("WEBHOOK_URL", "")
PORT = int(os.environ.get("PORT", "8080"))

_permissions_raw = os.environ.get("APP_PERMISSIONS", "e30=")
APP_PERMISSIONS = json.loads(base64.b64decode(_permissions_raw).decode())

_events_raw = os.environ.get("APP_EVENTS", "W10=")
APP_EVENTS = json.loads(base64.b64decode(_events_raw).decode())


def _gcp_token():
    req = urllib.request.Request(
        "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
        headers={"Metadata-Flavor": "Google"},
    )
    with urllib.request.urlopen(req, timeout=5) as r:
        return json.loads(r.read())["access_token"]


def _sm_write(name: str, value: str):
    token = _gcp_token()
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    secret_url = f"https://secretmanager.googleapis.com/v1/projects/{GCP_PROJECT_ID}/secrets/{name}"
    version_url = f"{secret_url}:addVersion"
    payload = {"payload": {"data": base64.b64encode(value.encode()).decode()}}

    # ensure secret container exists
    try:
        req = urllib.request.Request(secret_url, headers=headers)
        urllib.request.urlopen(req, timeout=10)
    except urllib.error.HTTPError as e:
        if e.code == 404:
            create_body = json.dumps({"replication": {"automatic": {}}}).encode()
            create_req = urllib.request.Request(
                f"https://secretmanager.googleapis.com/v1/projects/{GCP_PROJECT_ID}/secrets?secretId={name}",
                data=create_body,
                headers=headers,
                method="POST",
            )
            urllib.request.urlopen(create_req, timeout=10)

    body = json.dumps(payload).encode()
    req = urllib.request.Request(version_url, data=body, headers=headers, method="POST")
    urllib.request.urlopen(req, timeout=10)
    print(f"[SM] wrote {name}", flush=True)


def _sm_exists(name: str) -> bool:
    token = _gcp_token()
    url = f"https://secretmanager.googleapis.com/v1/projects/{GCP_PROJECT_ID}/secrets/{name}/versions/latest"
    try:
        req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
        urllib.request.urlopen(req, timeout=10)
        return True
    except urllib.error.HTTPError:
        return False


def _manifest() -> dict:
    m = {
        "name": APP_NAME,
        "url": f"https://github.com/apps/{APP_NAME.lower().replace(' ', '-')}",
        "hook_attributes": {},
        "redirect_url": REDIRECT_URL,
        "callback_urls": [REDIRECT_URL.replace("/callback", "/install-callback")] if REDIRECT_URL else [],
        "setup_url": REDIRECT_URL.replace("/callback", "/install-callback") if REDIRECT_URL else "",
        "public": True,
        "default_permissions": APP_PERMISSIONS,
        "default_events": APP_EVENTS,
    }
    if WEBHOOK_URL:
        m["hook_attributes"] = {"url": WEBHOOK_URL, "active": True}
    return m


def _manifest_html() -> str:
    post_url = f"https://github.com/organizations/{GITHUB_ORG}/settings/apps/new"
    manifest_json = json.dumps(_manifest())
    return f"""<!DOCTYPE html>
<html>
<head><title>Register GitHub App</title></head>
<body>
<h2>Registering GitHub App: {APP_NAME}</h2>
<p>Click the button below to create the GitHub App in the <strong>{GITHUB_ORG}</strong> org.</p>
<form action="{post_url}" method="post">
  <input type="hidden" name="manifest" value='{manifest_json}'>
  <button type="submit" style="font-size:1.2em;padding:12px 24px;cursor:pointer">
    Create GitHub App
  </button>
</form>
<script>document.querySelector('form').submit();</script>
</body>
</html>"""


def _exchange_code(code: str):
    url = f"https://api.github.com/app-manifests/{code}/conversions"
    req = urllib.request.Request(url, data=b"", method="POST",
                                 headers={"Accept": "application/vnd.github+json",
                                          "X-GitHub-Api-Version": "2022-11-28"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print(f"[HTTP] {fmt % args}", flush=True)

    def _send(self, code: int, body: str, content_type="text/html"):
        encoded = body.encode()
        self.send_response(code)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = dict(urllib.parse.parse_qsl(parsed.query))
        path = parsed.path.rstrip("/") or "/"

        if path in ("/", "/start"):
            self._send(200, _manifest_html())

        elif path == "/health":
            self._send(200, '{"status":"ok"}', "application/json")

        elif path == "/callback":
            code = params.get("code", "")
            if not code:
                self._send(400, "<h2>Missing code parameter</h2>")
                return
            try:
                data = _exchange_code(code)
                app_id = str(data["id"])
                private_key = data.get("pem", "")
                webhook_secret = data.get("webhook_secret", "")

                _sm_write(f"{SECRET_PREFIX}id", app_id)
                if private_key:
                    _sm_write(f"{SECRET_PREFIX}private-key", private_key)
                if webhook_secret:
                    _sm_write(f"{SECRET_PREFIX}webhook-secret", webhook_secret)

                install_url = data.get("installations_url", "").replace(
                    "api.github.com/app/installations",
                    f"github.com/organizations/{GITHUB_ORG}/settings/apps/{data.get('slug','')}/installations"
                )
                body = f"""<h2>App created!</h2>
<p>App ID written to Secret Manager.</p>
<p><a href="{install_url}">Click here to install the app</a> — then select the repositories and click Install.</p>"""
                self._send(200, body)
            except Exception as ex:
                print(f"[callback] error: {ex}", flush=True)
                self._send(500, f"<h2>Error: {ex}</h2>")

        elif path == "/install-callback":
            installation_id = params.get("installation_id", "")
            if not installation_id:
                self._send(400, "<h2>Missing installation_id</h2>")
                return
            try:
                _sm_write(f"{SECRET_PREFIX}installation-id", installation_id)
                self._send(200, "<h2>Installation complete! You can close this tab.</h2>")
            except Exception as ex:
                print(f"[install-callback] error: {ex}", flush=True)
                self._send(500, f"<h2>Error writing installation-id: {ex}</h2>")

        else:
            self._send(404, "<h2>Not found</h2>")


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", PORT), Handler)
    print(f"[receiver] listening on port {PORT}", flush=True)
    server.serve_forever()
