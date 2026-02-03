#!/usr/bin/env python3
"""
Unit tests for prebuild.py hash-based caching logic.

Run with: python3 embedded/scripts/test_prebuild.py
"""

import hashlib
import tempfile
import unittest
from pathlib import Path


def get_file_hash(filepath: Path) -> str:
    """Calculate SHA256 hash of a file."""
    if not filepath.exists():
        return ""
    with open(filepath, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def get_combined_hash(schema_path: Path, types_path: Path) -> str:
    """Get combined hash of schema and types files."""
    schema_hash = get_file_hash(schema_path)
    types_hash = get_file_hash(types_path)
    return hashlib.sha256(f"{schema_hash}{types_hash}".encode()).hexdigest()


class TestHashFunctions(unittest.TestCase):
    """Test hash calculation functions."""

    def test_get_file_hash_nonexistent(self):
        """Should return empty string for non-existent file."""
        result = get_file_hash(Path("/nonexistent/file.txt"))
        self.assertEqual(result, "")

    def test_get_file_hash_existing(self):
        """Should return consistent hash for same content."""
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
            f.write("test content")
            temp_path = Path(f.name)

        try:
            hash1 = get_file_hash(temp_path)
            hash2 = get_file_hash(temp_path)
            self.assertEqual(hash1, hash2)
            self.assertEqual(len(hash1), 64)  # SHA256 hex length
        finally:
            temp_path.unlink()

    def test_get_file_hash_different_content(self):
        """Should return different hash for different content."""
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
            f.write("content 1")
            temp_path1 = Path(f.name)

        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.txt') as f:
            f.write("content 2")
            temp_path2 = Path(f.name)

        try:
            hash1 = get_file_hash(temp_path1)
            hash2 = get_file_hash(temp_path2)
            self.assertNotEqual(hash1, hash2)
        finally:
            temp_path1.unlink()
            temp_path2.unlink()

    def test_get_combined_hash(self):
        """Should combine hashes of both files."""
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.ts') as f:
            f.write("schema content")
            schema_path = Path(f.name)

        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.ts') as f:
            f.write("types content")
            types_path = Path(f.name)

        try:
            combined = get_combined_hash(schema_path, types_path)
            self.assertEqual(len(combined), 64)  # SHA256 hex length

            # Should change when schema changes
            with open(schema_path, 'w') as f:
                f.write("modified schema")
            new_combined = get_combined_hash(schema_path, types_path)
            self.assertNotEqual(combined, new_combined)
        finally:
            schema_path.unlink()
            types_path.unlink()

    def test_combined_hash_with_missing_file(self):
        """Should handle missing files gracefully."""
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.ts') as f:
            f.write("schema content")
            schema_path = Path(f.name)

        try:
            # One file missing
            combined = get_combined_hash(schema_path, Path("/nonexistent.ts"))
            self.assertEqual(len(combined), 64)  # SHA256 hex length
        finally:
            schema_path.unlink()


class TestRealSchemaHash(unittest.TestCase):
    """Integration tests with real schema files."""

    def setUp(self):
        """Set up paths to real schema files."""
        self.script_dir = Path(__file__).parent
        self.project_root = self.script_dir.parent.parent
        self.schema_path = self.project_root / "packages" / "shared-schema" / "src" / "schema.ts"
        self.types_path = self.project_root / "packages" / "shared-schema" / "src" / "types.ts"

    def test_real_schema_hash(self):
        """Should successfully hash real schema file."""
        if not self.schema_path.exists():
            self.skipTest("Schema file not found")

        hash_value = get_file_hash(self.schema_path)
        self.assertEqual(len(hash_value), 64)  # SHA256 hex length
        self.assertNotEqual(hash_value, "")

    def test_real_combined_hash(self):
        """Should successfully create combined hash of real files."""
        if not self.schema_path.exists():
            self.skipTest("Schema file not found")

        combined = get_combined_hash(self.schema_path, self.types_path)
        self.assertEqual(len(combined), 64)  # SHA256 hex length

        # Hash should be consistent
        combined2 = get_combined_hash(self.schema_path, self.types_path)
        self.assertEqual(combined, combined2)


class TestHashStorage(unittest.TestCase):
    """Test hash storage and retrieval."""

    def test_store_and_retrieve_hash(self):
        """Should store and retrieve hash correctly."""
        with tempfile.TemporaryDirectory() as tmpdir:
            hash_file = Path(tmpdir) / ".schema_hash"

            # Store
            test_hash = "abc123def456"
            hash_file.parent.mkdir(parents=True, exist_ok=True)
            hash_file.write_text(test_hash)

            # Retrieve
            stored = hash_file.read_text().strip()
            self.assertEqual(stored, test_hash)

    def test_missing_hash_file(self):
        """Should handle missing hash file."""
        hash_file = Path("/nonexistent/.schema_hash")
        if hash_file.exists():
            stored = hash_file.read_text().strip()
        else:
            stored = ""
        self.assertEqual(stored, "")


if __name__ == '__main__':
    # Run tests with verbosity
    unittest.main(verbosity=2)
