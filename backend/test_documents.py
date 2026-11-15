import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.main import app
from rag.ingest import IngestResult


class DocumentApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.storage = tempfile.TemporaryDirectory()
        self.addCleanup(self.storage.cleanup)
        self.storage_patch = patch("backend.documents.UPLOAD_ROOT", Path(self.storage.name))
        self.storage_patch.start()
        self.addCleanup(self.storage_patch.stop)
        self.embedding_patch = patch("backend.documents._get_embedding_model", return_value=object())
        self.embedding_patch.start()
        self.addCleanup(self.embedding_patch.stop)
        self.ingest_patch = patch("backend.documents.ingest_document", side_effect=self.fake_ingest)
        self.ingest = self.ingest_patch.start()
        self.addCleanup(self.ingest_patch.stop)
        self.client = TestClient(app)

    def fake_ingest(self, file_path, original_filename, metadata, college_id, embeddings):
        self.assertTrue(Path(file_path).is_file())
        self.assertEqual(college_id, "kiit")
        self.assertIsNotNone(embeddings)
        return IngestResult(
            status="added",
            document_id="a" * 32,
            document_name=metadata.title or original_filename,
            chunks=3,
        )

    def login(self, email: str, password: str) -> dict[str, str]:
        response = self.client.post(
            "/api/auth/login",
            json={"email": email, "password": password},
        )
        self.assertEqual(response.status_code, 200)
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    def test_admin_upload_is_saved_and_listed(self) -> None:
        headers = self.login("tnp@kiit.ac.in", "admin123")
        response = self.client.post(
            "/api/documents",
            headers=headers,
            data={"doc_type": "tnp_rules", "batch": "2027", "title": "Placement rules"},
            files={"file": ("rules.pdf", io.BytesIO(b"%PDF-1.7\ncontent"), "application/pdf")},
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "added")
        self.assertEqual(response.json()["chunks"], 3)
        saved_pdf = Path(self.storage.name) / "kiit" / f'{"a" * 32}.pdf'
        self.assertEqual(saved_pdf.read_bytes(), b"%PDF-1.7\ncontent")

        listing = self.client.get("/api/documents", headers=headers)
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(listing.json()[0]["document_name"], "Placement rules")
        self.assertEqual(listing.json()[0]["status"], "indexed")

    def test_student_cannot_upload_or_list_documents(self) -> None:
        headers = self.login("rohan.sharma@kiit.ac.in", "student123")
        upload = self.client.post(
            "/api/documents",
            headers=headers,
            data={"doc_type": "tnp_rules", "batch": "2027"},
            files={"file": ("rules.pdf", io.BytesIO(b"%PDF-1.7\ncontent"), "application/pdf")},
        )

        self.assertEqual(upload.status_code, 403)
        self.assertEqual(self.client.get("/api/documents", headers=headers).status_code, 403)
        self.ingest.assert_not_called()

    def test_invalid_pdf_is_rejected_before_ingestion(self) -> None:
        headers = self.login("tnp@kiit.ac.in", "admin123")
        response = self.client.post(
            "/api/documents",
            headers=headers,
            data={"doc_type": "tnp_rules", "batch": "2027"},
            files={"file": ("rules.pdf", io.BytesIO(b"not a PDF"), "application/pdf")},
        )

        self.assertEqual(response.status_code, 422)
        self.ingest.assert_not_called()

    def test_company_notice_metadata_is_persisted(self) -> None:
        headers = self.login("tnp@kiit.ac.in", "admin123")
        response = self.client.post(
            "/api/documents",
            headers=headers,
            data={
                "doc_type": "company_notice",
                "batch": "2027",
                "company": "Contoso",
                "notice_type": "general",
                "job_role": "Engineer",
            },
            files={"file": ("notice.pdf", io.BytesIO(b"%PDF-1.7\ncontent"), "application/pdf")},
        )

        self.assertEqual(response.status_code, 200)
        metadata_path = Path(self.storage.name) / "kiit" / f'{"a" * 32}.json'
        self.assertEqual(
            json.loads(metadata_path.read_text(encoding="utf-8"))["job_role"],
            "Engineer",
        )


if __name__ == "__main__":
    unittest.main()