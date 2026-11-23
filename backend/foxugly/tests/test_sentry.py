"""sentry-sdk 3.0: init, scrubbing and logging through a real client.

The client sends to an in-memory transport, so what is asserted is what would
actually leave the box.
"""

import json
import logging
import warnings

import sentry_sdk
from django.test import SimpleTestCase
from sentry_sdk.transport import Transport

from foxugly.sentry import DATA_COLLECTION, sentry_init_options
from foxugly.sentry_scrub import FILTERED, scrub_event, scrub_span, scrub_text

SECRET = "s3cr3t-value-never-sent"


class _Capture(Transport):
    def __init__(self):
        super().__init__(None)
        self.envelopes = []

    def capture_envelope(self, envelope):
        self.envelopes.append(envelope)

    def payloads(self, kind=None):
        return [
            item.payload.get_bytes()
            for envelope in self.envelopes
            for item in envelope.items
            if kind is None or item.headers.get("type") == kind
        ]


class _SentryClient(SimpleTestCase):
    """`sentry_sdk.init` with the production options, into memory."""

    traces_sample_rate = 0.0

    def setUp(self):
        self.transport = _Capture()
        with warnings.catch_warnings():
            warnings.simplefilter("error")  # no deprecated option, no unknown key
            sentry_sdk.init(
                dsn="https://public@sentry.example.invalid/1",
                transport=self.transport,
                traces_sample_rate=self.traces_sample_rate,
                **sentry_init_options(),
            )
        self.addCleanup(sentry_sdk.get_global_scope().set_client, None)
        self.addCleanup(sentry_sdk.get_client().close)

    def events(self):
        sentry_sdk.flush()
        return [json.loads(raw) for raw in self.transport.payloads("event")]


class SentryClientTests(_SentryClient):
    def test_init_collects_no_more_than_2x(self):
        options = sentry_sdk.get_client().options
        rules = options["data_collection"]
        self.assertIs(rules["user_info"], False)
        self.assertEqual(rules["cookies"]["mode"], "off")
        self.assertEqual(rules["http_bodies"], [])
        self.assertIs(rules["queues"], False)
        self.assertIs(rules["database_query_data"], False)
        self.assertEqual(rules["mcp"], {"inputs": False, "outputs": False})
        self.assertEqual(rules["stack_frame_variables"]["mode"], "denylist")
        self.assertIs(options["attach_stacktrace"], False)
        self.assertIs(options["before_send_span"], scrub_span)

    def test_before_send_masks_extra_and_local_variables(self):
        def view():
            password = SECRET  # noqa: F841 (a local variable Sentry would ship)
            api_token = SECRET  # noqa: F841
            raise ValueError("boom")

        with sentry_sdk.new_scope() as scope:
            scope.set_extra("token", SECRET)
            scope.set_extra("page", 3)
            try:
                view()
            except ValueError:
                sentry_sdk.capture_exception()

        (event,) = self.events()
        self.assertEqual(event["extra"]["token"], FILTERED)
        self.assertEqual(event["extra"]["page"], 3)
        frame = event["exception"]["values"][-1]["stacktrace"]["frames"][-1]
        self.assertEqual(frame["function"], "view")
        self.assertNotIn(SECRET, json.dumps(event))

    def test_logger_error_still_creates_an_event(self):
        logging.getLogger("content").error("contact mail failed for %s", 42)
        events = self.events()
        messages = [e["logentry"]["message"] for e in events]
        self.assertEqual(messages, ["contact mail failed for %s"])
        self.assertNotIn("stacktrace", json.dumps(events))  # attach_stacktrace off


class SentrySpanTests(_SentryClient):
    traces_sample_rate = 1.0

    def test_sent_spans_are_scrubbed(self):
        with sentry_sdk.start_span(
            name="GET /reset?token=" + SECRET,
            attributes={"session_key": SECRET, "page": 2},
        ):
            pass
        sentry_sdk.flush()
        sent = b"".join(self.transport.payloads()).decode("utf-8", "replace")
        self.assertIn("/reset?token=" + FILTERED, sent)
        self.assertNotIn(SECRET, sent)


class ScrubTests(SimpleTestCase):
    def test_scrub_event_masks_request_data_headers_and_user(self):
        event = scrub_event(
            {
                "request": {
                    "data": {"password": SECRET, "nested": {"refresh_token": SECRET}},
                    "headers": {"Authorization": SECRET, "X-Real-Ip": SECRET},
                    "cookies": {"sessionid": SECRET},
                    "query_string": "token=" + SECRET + "&page=2",
                },
                "extra": {"secret": SECRET},
                "user": {"id": "7", "ip_address": SECRET},
                "breadcrumbs": {"values": [{"data": {"api_key": SECRET, "n": 1}}]},
                "exception": {
                    "values": [
                        {"stacktrace": {"frames": [{"vars": {"passwd": SECRET}}]}}
                    ]
                },
            },
            {},
        )
        self.assertNotIn(SECRET, json.dumps(event))
        self.assertEqual(event["request"]["query_string"], "token=[Filtered]&page=2")
        self.assertNotIn("ip_address", event["user"])
        self.assertEqual(event["breadcrumbs"]["values"][0]["data"]["n"], 1)

    def test_scrubbers_survive_odd_shapes(self):
        """In 3.0 an exception in an event callback drops the event."""
        for event in ({}, {"request": "x"}, {"exception": {"values": [None]}}):
            self.assertIs(scrub_event(event, {}), event)
        self.assertEqual(scrub_span({"attributes": None}, {}), {"attributes": None})

    def test_scrub_span_masks_name_and_attributes(self):
        span = scrub_span(
            {
                "name": "GET /reset?token=" + SECRET,
                "attributes": {
                    "http.request.header.authorization": [SECRET],
                    "url.full": "https://x.invalid/?api_key=" + SECRET + "&page=2",
                    "http.request.method": "GET",
                },
            },
            {},
        )
        self.assertNotIn(SECRET, json.dumps(span))
        self.assertEqual(span["name"], "GET /reset?token=[Filtered]")
        self.assertEqual(span["attributes"]["http.request.method"], "GET")


class ScrubSecurityReviewTests(SimpleTestCase):
    """Contexts, embedded spans, URLs and response headers."""

    jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjF9.c2lnbmF0dXJlMTIz"

    def test_contexts_are_scrubbed_recursively(self):
        event = scrub_event(
            {
                "contexts": {
                    "response": {"headers": {"Set-Cookie": SECRET, "X-Ok": "y"}},
                    "trace": {"data": {"url.full": "https://h.invalid/?token=" + SECRET}},
                }
            },
            {},
        )
        self.assertNotIn(SECRET, json.dumps(event))
        self.assertEqual(event["contexts"]["response"]["headers"]["X-Ok"], "y")

    def test_embedded_spans_are_scrubbed(self):
        event = scrub_event(
            {
                "spans": [
                    {
                        "description": "GET /reset-password/" + SECRET + "/",
                        "data": {"authorization": SECRET, "http.query": "token=" + SECRET},
                    }
                ]
            },
            {},
        )
        self.assertNotIn(SECRET, json.dumps(event))
        self.assertEqual(
            event["spans"][0]["description"], "GET /reset-password/[Filtered]/"
        )

    def test_url_userinfo_is_dropped(self):
        text = scrub_text("fetch https://bob:" + SECRET + "@h.invalid/a?page=2")
        self.assertEqual(text, "fetch https://h.invalid/a?page=2")

    def test_secret_path_segments_are_masked(self):
        self.assertEqual(
            scrub_text("GET /auth/magic-link/abc123/"), "GET /auth/magic-link/[Filtered]/"
        )
        self.assertEqual(
            scrub_text("GET /invitation/xyz/accept"), "GET /invitation/[Filtered]/accept"
        )
        self.assertEqual(scrub_text("GET /f/" + self.jwt + "/"), "GET /f/[Filtered]/")
        # Route templates and ordinary paths stay readable.
        self.assertEqual(scrub_text("GET /api/reset/<token>/"), "GET /api/reset/<token>/")
        self.assertEqual(scrub_text("GET /api/news/42/"), "GET /api/news/42/")

    def test_span_url_attributes_are_masked(self):
        url = "https://u:p@h.invalid/activate/" + SECRET
        span = scrub_span({"name": "GET", "attributes": {"url.full": url}}, {})
        self.assertEqual(
            span["attributes"]["url.full"], "https://h.invalid/activate/[Filtered]"
        )

    def test_response_headers_are_never_collected(self):
        self.assertEqual(DATA_COLLECTION["http_headers"]["response"], {"mode": "off"})
        client = sentry_sdk.Client(
            dsn=None, default_integrations=False, data_collection=DATA_COLLECTION
        )
        # 3.0.0 has no response-header setting (it collects none); if a release
        # adds one, it must resolve to "off".
        headers = client.options["data_collection"]["http_headers"]
        self.assertEqual(headers.get("response", {"mode": "off"})["mode"], "off")


class ScrubSecondReviewTests(SimpleTestCase):
    """Exception values, query and fragment, userinfo, fail closed."""

    jwt = ScrubSecurityReviewTests.jwt

    def test_exception_and_thread_values_are_scrubbed(self):
        event = scrub_event(
            {
                "exception": {
                    "values": [{"value": "GET https://h.invalid/x?token=" + SECRET}]
                },
                "threads": {"values": [{"value": "retry with api_key=" + SECRET}]},
            },
            {},
        )
        self.assertNotIn(SECRET, json.dumps(event))

    def test_query_and_fragment_values_are_masked(self):
        url = "https://h.invalid/cb?page=2&ticket=t&sig=AbCdEfGhIjKlMnOp#access_token=x"
        self.assertEqual(
            scrub_text(url),
            "https://h.invalid/cb?page=2&ticket=[Filtered]&sig=[Filtered]#[Filtered]",
        )
        self.assertEqual(
            scrub_text("next=/a&code=0123456789abcdef"), "next=/a&code=[Filtered]"
        )
        event = scrub_event({"request": {"query_string": "page=2&k=" + self.jwt}}, {})
        self.assertEqual(event["request"]["query_string"], "page=2&k=[Filtered]")

    def test_userinfo_is_stripped_robustly(self):
        self.assertEqual(scrub_text("https://u:pa@ss@h.invalid/"), "https://h.invalid/")
        self.assertEqual(scrub_text("https://u:p/w@h.invalid/x"), "https://h.invalid/x")
        self.assertEqual(
            scrub_text("https://user:" + SECRET + "/x"), "https://[Filtered]/x"
        )
        self.assertEqual(
            scrub_text("https://h.invalid:8443/a"), "https://h.invalid:8443/a"
        )
        self.assertEqual(scrub_text("http://[::1]:8000/a"), "http://[::1]:8000/a")

    def test_scrubbing_fails_closed(self):
        deep = SECRET
        for _ in range(30):
            deep = [deep]
        event = scrub_event(
            {
                "extra": {
                    "t": ("a?token=" + SECRET,),
                    "s": {"x?password=" + SECRET},
                    "d": deep,
                }
            },
            {},
        )
        self.assertNotIn(SECRET, json.dumps(event))


class ScrubThirdReviewTests(SimpleTestCase):
    """Value-less and opaque-name query chunks, encoding, non-string types."""

    opaque = "0123456789abcdefXYZ"

    def test_query_masks_bare_chunks_and_opaque_names(self):
        self.assertEqual(
            scrub_text("https://h.invalid/cb?" + self.opaque + "&page=2"),
            "https://h.invalid/cb?[Filtered]&page=2",
        )
        event = scrub_event(
            {"request": {"query_string": "page=2&" + self.opaque + "=1&debug"}}, {}
        )
        self.assertEqual(
            event["request"]["query_string"], "page=2&[Filtered]=[Filtered]&debug"
        )

    def test_query_is_checked_decoded_and_kept_encoded(self):
        event = scrub_event(
            {"request": {"query_string": "%74oken=abc&next=%2Fa%3Fx%3D1"}}, {}
        )
        self.assertEqual(
            event["request"]["query_string"], "%74oken=[Filtered]&next=%2Fa%3Fx%3D1"
        )

    def test_non_string_query_strings_fail_closed(self):
        for query in (
            b"token=" + SECRET.encode(),
            ["token=" + SECRET],
            ("api_key=" + SECRET,),
        ):
            event = scrub_event({"request": {"query_string": query}}, {})
            self.assertNotIn(SECRET, json.dumps(event))

        class Opaque:
            def __repr__(self):
                return "Opaque(https://u:" + SECRET + "@h.invalid/?token=" + SECRET + ")"

        event = scrub_event({"extra": {"o": Opaque()}}, {})
        self.assertNotIn(SECRET, json.dumps(event))


# --- Every event field, one planted token: it must appear nowhere.


def _planted_event(token: str) -> dict:
    url = "https://u:" + token + "@h.invalid/reset/" + token + "/?k=" + token
    return {
        "request": {
            "url": url,
            "query_string": ["token=" + token, token.encode()],
            "headers": {"Authorization": token, "X-Custom": "id " + token},
            "cookies": {"sessionid": token},
            "data": {"password": token, "note": "see " + token},
            "env": {"REMOTE_ADDR": token, "SERVER_NAME": "h " + token},
        },
        "message": "failed for " + token,
        "logentry": {
            "message": "failed for %s " + token,
            "formatted": "failed for " + token,
            "params": [token, {"token": token}],
        },
        "exception": {
            "values": [
                {
                    "type": "Err" + token,
                    "value": "bad token " + token,
                    "stacktrace": {"frames": [{"vars": {"x": token, "token": token}}]},
                }
            ]
        },
        "threads": {
            "values": [
                {
                    "value": token,
                    "type": token,
                    "stacktrace": {"frames": [{"vars": {"y": [token]}}]},
                }
            ]
        },
        "breadcrumbs": {
            "values": [{"message": "GET " + url, "data": {"url": url, "x": token}}]
        },
        "extra": {"x": token, "nested": {"deep": (token,)}},
        "tags": {"t": token, "token": token},
        "contexts": {"trace": {"data": {"u": url}}, "response": {"headers": [token]}},
        "user": {"id": token, "ip_address": token, "email": "e " + token},
        "transaction": "/reset/" + token + "/",
        "culprit": "view " + token,
        "spans": [
            {"description": "GET " + url, "data": {"x": token}},
            {"name": "q " + token, "attributes": {"a": token}},
        ],
    }


class EveryFieldTests(SimpleTestCase):
    def test_a_token_planted_in_every_event_field_appears_nowhere(self):
        event = scrub_event(_planted_event(SECRET), {})
        self.assertNotIn(SECRET, json.dumps(event, default=repr))

    def test_a_token_in_a_span_name_or_attribute_appears_nowhere(self):
        span = scrub_span(
            {
                "name": "GET /x/" + SECRET,
                "attributes": {"a": SECRET, "b": [SECRET], "url.full": "h?" + SECRET},
            },
            {},
        )
        self.assertNotIn(SECRET, json.dumps(span))
