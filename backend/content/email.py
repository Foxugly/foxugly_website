"""Envoi d'emails via Microsoft Graph API (flux client credentials).

Configuration par variables d'environnement :
  GRAPH_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET  — app Azure AD
  GRAPH_SENDER       — boîte d'envoi (UPN), p.ex. contact@foxugly.com
  CONTACT_RECIPIENT  — destinataire des messages (défaut : GRAPH_SENDER)

L'app Azure AD doit avoir la permission applicative Mail.Send (consentie admin).
"""
import json
import os
import urllib.parse
import urllib.request

_TOKEN_URL = "https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"
_SENDMAIL_URL = "https://graph.microsoft.com/v1.0/users/{sender}/sendMail"


def graph_configured() -> bool:
    """Vrai si les variables Graph nécessaires sont présentes."""
    return all(
        os.environ.get(k)
        for k in ("GRAPH_TENANT_ID", "GRAPH_CLIENT_ID", "GRAPH_CLIENT_SECRET", "GRAPH_SENDER")
    )


def _access_token() -> str:
    data = urllib.parse.urlencode({
        "client_id": os.environ["GRAPH_CLIENT_ID"],
        "client_secret": os.environ["GRAPH_CLIENT_SECRET"],
        "scope": "https://graph.microsoft.com/.default",
        "grant_type": "client_credentials",
    }).encode()
    url = _TOKEN_URL.format(tenant=os.environ["GRAPH_TENANT_ID"])
    req = urllib.request.Request(
        url, data=data, headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.load(resp)["access_token"]


def send_contact_email(name: str, email: str, subject: str, message: str) -> None:
    """Envoie un message de contact via Graph. Lève une exception en cas d'échec."""
    sender = os.environ["GRAPH_SENDER"]
    recipient = os.environ.get("CONTACT_RECIPIENT", sender)
    body = f"Nom : {name}\nEmail : {email}\n\n{message}"
    payload = {
        "message": {
            "subject": subject or f"Contact foxugly — {name}",
            "body": {"contentType": "Text", "content": body},
            "toRecipients": [{"emailAddress": {"address": recipient}}],
            "replyTo": [{"emailAddress": {"address": email}}],
        },
        "saveToSentItems": False,
    }
    url = _SENDMAIL_URL.format(sender=urllib.parse.quote(sender))
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={
            "Authorization": f"Bearer {_access_token()}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    # Graph renvoie 202 Accepted ; urlopen lève une HTTPError sur 4xx/5xx.
    with urllib.request.urlopen(req, timeout=15):
        return