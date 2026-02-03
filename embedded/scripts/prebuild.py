#!/usr/bin/env python3
"""
PlatformIO Pre-Build Script for GraphQL Type Generation

This script runs before each build to ensure GraphQL types are up-to-date.
It checks if the schema has changed and regenerates types if needed.

Usage in platformio.ini:
    extra_scripts = pre:../scripts/prebuild.py
"""

import os
import sys
import subprocess
import hashlib
from pathlib import Path

Import("env")

# Paths
SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent
SCHEMA_PATH = PROJECT_ROOT / "packages" / "shared-schema" / "src" / "schema.ts"
TYPES_PATH = PROJECT_ROOT / "packages" / "shared-schema" / "src" / "types.ts"
OUTPUT_PATH = SCRIPT_DIR.parent / "libs" / "graphql-types" / "src" / "graphql_types.h"
HASH_FILE = SCRIPT_DIR.parent / "libs" / "graphql-types" / ".schema_hash"
CODEGEN_SCRIPT = SCRIPT_DIR / "generate-graphql-types.mjs"


def get_file_hash(filepath: Path) -> str:
    """Calculate SHA256 hash of a file."""
    if not filepath.exists():
        return ""
    with open(filepath, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def get_combined_hash() -> str:
    """Get combined hash of schema and types files."""
    schema_hash = get_file_hash(SCHEMA_PATH)
    types_hash = get_file_hash(TYPES_PATH)
    return hashlib.sha256(f"{schema_hash}{types_hash}".encode()).hexdigest()


def get_stored_hash() -> str:
    """Read previously stored hash."""
    if HASH_FILE.exists():
        return HASH_FILE.read_text().strip()
    return ""


def store_hash(hash_value: str):
    """Store hash for future comparison."""
    HASH_FILE.parent.mkdir(parents=True, exist_ok=True)
    HASH_FILE.write_text(hash_value)


def run_codegen():
    """Run the JavaScript code generator."""
    print("=" * 60)
    print("GraphQL Codegen: Generating C++ types from schema...")
    print("=" * 60)

    try:
        # Run with node (ES module)
        result = subprocess.run(
            ["node", str(CODEGEN_SCRIPT)],
            cwd=str(PROJECT_ROOT),
            capture_output=True,
            text=True,
            timeout=60,
        )

        if result.returncode != 0:
            print(f"Error running codegen:\n{result.stderr}")
            # Don't fail the build, just warn
            print("Warning: GraphQL codegen failed, using existing types")
            return False

        print(result.stdout)
        return True

    except FileNotFoundError:
        print("Warning: Node.js not found. Skipping GraphQL codegen.")
        print("Install Node.js to enable automatic type generation.")
        return False
    except subprocess.TimeoutExpired:
        print("Warning: GraphQL codegen timed out")
        return False
    except Exception as e:
        print(f"Warning: GraphQL codegen error: {e}")
        return False


def before_build(source, target, env):
    """Pre-build hook to check and regenerate types if needed."""
    print("\n[GraphQL Codegen] Checking if types need regeneration...")

    # Check if schema exists
    if not SCHEMA_PATH.exists():
        print(f"[GraphQL Codegen] Schema not found at {SCHEMA_PATH}")
        print("[GraphQL Codegen] Skipping codegen (schema not available)")
        return

    # Check if output exists
    if not OUTPUT_PATH.exists():
        print("[GraphQL Codegen] Output file missing, generating...")
        if run_codegen():
            store_hash(get_combined_hash())
        return

    # Check if schema has changed
    current_hash = get_combined_hash()
    stored_hash = get_stored_hash()

    if current_hash != stored_hash:
        print("[GraphQL Codegen] Schema changed, regenerating types...")
        if run_codegen():
            store_hash(current_hash)
    else:
        print("[GraphQL Codegen] Types are up-to-date")


# Register the pre-build action
env.AddPreAction("buildprog", before_build)

# Also run on first build (library build)
env.AddPreAction("$BUILD_DIR/src/main.cpp.o", before_build)
