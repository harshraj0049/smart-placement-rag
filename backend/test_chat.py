import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

import httpx
from fastapi.testclient import TestClient
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langchain_google_genai.chat_models import GoogleAPIError

from backend.main import app
from backend.rag_service import get_chat_retriever, invalidate_chat_retrievers
from rag.query import MissingGenerativeApiKeyError, NO_ANSWER, _create_model, query_with_sources


class RetrieverCacheTests(unittest.TestCase):
    def setUp(self) -> None:
        invalidate_chat_retrievers()
        self.addCleanup(invalidate_chat_retrievers)

    def test_retriever_is_reused_and_can_be_invalidated(self) -> None:
        retrievers = [object(), object()]
        with (
            patch("backend.rag_service.get_embedding_model", return_value=object()),
            patch("backend.rag_service.get_vector_store", return_value=object()),
            patch(
                "backend.rag_service.get_hybrid_retriver",
                side_effect=retrievers,
            ) as build_retriever,
        ):
            first = get_chat_retriever("kiit")
            second = get_chat_retriever("kiit")
            self.assertIs(first, second)
            build_retriever.assert_called_once()

            invalidate_chat_retrievers()
            third = get_chat_retriever("kiit")

        self.assertIsNot(first, third)
        self.assertEqual(build_retriever.call_count, 2)


class ChatApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.retriever = object()
        self.retriever_patch = patch("backend.chat._get_retriever", return_value=self.retriever)
        self.retriever_mock = self.retriever_patch.start()
        self.addCleanup(self.retriever_patch.stop)
        self.query_patch = patch(
            "backend.chat.query_with_sources",
            return_value={"answer": "The answer.", "sources": [{"doc": "Rules.pdf", "page": 2}]},
        )
        self.query = self.query_patch.start()
        self.addCleanup(self.query_patch.stop)
        self.client = TestClient(app)

    def login(self, email: str, password: str) -> dict[str, str]:
        response = self.client.post("/api/auth/login", json={"email": email, "password": password})
        self.assertEqual(response.status_code, 200)
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    def test_student_query_uses_authenticated_college_and_history(self) -> None:
        headers = self.login("rohan.sharma@kiit.ac.in", "student123")
        response = self.client.post(
            "/api/query",
            headers=headers,
            json={
                "question": "What about the deadline?",
                "history": [
                    {"role": "user", "content": "When does registration close?"},
                    {"role": "assistant", "content": "The notice says Friday."},
                ],
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["answer"], "The answer.")
        self.assertEqual(response.json()["sources"][0]["doc"], "Rules.pdf")
        args = self.query.call_args.args
        self.assertEqual(args[0], "What about the deadline?")
        self.assertIs(args[1], self.retriever)
        self.assertEqual(args[2][0]["role"], "user")
        self.assertEqual(self.retriever_mock.call_args.args, ("kiit",))

    def test_admin_cannot_use_student_chat(self) -> None:
        headers = self.login("tnp@kiit.ac.in", "admin123")
        response = self.client.post(
            "/api/query",
            headers=headers,
            json={"question": "Question"},
        )

        self.assertEqual(response.status_code, 403)
        self.retriever_mock.assert_not_called()

    def test_history_is_limited_to_five_exchange_messages(self) -> None:
        headers = self.login("rohan.sharma@kiit.ac.in", "student123")
        response = self.client.post(
            "/api/query",
            headers=headers,
            json={
                "question": "Question",
                "history": [{"role": "user", "content": f"Question {i}"} for i in range(11)],
            },
        )

        self.assertEqual(response.status_code, 422)
        self.retriever_mock.assert_not_called()

    def test_missing_gemini_key_is_reported_as_service_unavailable(self) -> None:
        self.query.side_effect = MissingGenerativeApiKeyError("Set GEMINI_API_KEY.")
        headers = self.login("rohan.sharma@kiit.ac.in", "student123")
        response = self.client.post("/api/query", headers=headers, json={"question": "Question"})

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json()["detail"], "Set GEMINI_API_KEY.")

    def test_google_deadline_is_reported_as_gateway_timeout(self) -> None:
        self.query.side_effect = GoogleAPIError(
            code=504,
            response_json={"error": {"status": "DEADLINE_EXCEEDED"}},
        )
        headers = self.login("rohan.sharma@kiit.ac.in", "student123")
        response = self.client.post("/api/query", headers=headers, json={"question": "Question"})

        self.assertEqual(response.status_code, 504)
        self.assertEqual(
            response.json()["detail"],
            "The AI service timed out. Please try again in a moment.",
        )

    def test_client_timeout_is_reported_as_gateway_timeout(self) -> None:
        self.query.side_effect = httpx.ReadTimeout("provider request timed out")
        headers = self.login("rohan.sharma@kiit.ac.in", "student123")
        response = self.client.post("/api/query", headers=headers, json={"question": "Question"})

        self.assertEqual(response.status_code, 504)


class RagQueryTests(unittest.TestCase):
    def test_model_uses_fast_generation_without_a_custom_timeout(self) -> None:
        _create_model.cache_clear()
        self.addCleanup(_create_model.cache_clear)

        model = _create_model("test-api-key")
        request = model._prepare_request([HumanMessage(content="Test question.")])
        config = request["config"]

        self.assertEqual(model.model, "gemini-3.5-flash-lite")
        self.assertEqual(config.thinking_config.thinking_level.value, "MINIMAL")
        self.assertIsNone(config.http_options.timeout)
        self.assertEqual(config.http_options.retry_options.attempts, 1)

    def test_query_uses_history_and_returns_document_sources(self) -> None:
        document = SimpleNamespace(
            page_content="The rule text.",
            metadata={"document_name": "T&P Rules.pdf", "page": 0},
        )

        def retrieve(question):
            self.assertIn("What about this rule?", question)
            self.assertIn("The rule is on page one.", question)
            return [document]

        retriever = SimpleNamespace(invoke=retrieve)
        model = SimpleNamespace(invoke=Mock(return_value=SimpleNamespace(text="The answer.")))

        with patch("rag.query._get_model", return_value=model):
            result = query_with_sources(
                "What about this rule?",
                retriever,
                [
                    {"role": "user", "content": "Tell me about the rules."},
                    {"role": "assistant", "content": "The rule is on page one."},
                ],
            )

        self.assertEqual(result["answer"], "The answer.")
        self.assertEqual(result["sources"], [{"doc": "T&P Rules.pdf", "page": 1}])
        messages = model.invoke.call_args.args[0]
        self.assertIsInstance(messages[0], SystemMessage)
        self.assertIn("[Source: T&P Rules.pdf; page 1]", messages[0].content)
        self.assertIsInstance(messages[1], HumanMessage)
        self.assertIsInstance(messages[2], AIMessage)
        self.assertIsInstance(messages[3], HumanMessage)

    def test_query_without_retrieved_documents_returns_no_answer(self) -> None:
        def retrieve(*args):
            self.assertTrue(args)
            return []

        retriever = SimpleNamespace(invoke=retrieve)
        with patch("rag.query._get_model") as get_model:
            result = query_with_sources("Question", retriever)

        self.assertEqual(result, {"answer": NO_ANSWER, "sources": []})
        get_model.assert_not_called()


if __name__ == "__main__":
    unittest.main()
