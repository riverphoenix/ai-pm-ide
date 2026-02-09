"""
Framework definition loader for AI generation
"""

import json
import os
from typing import Dict, Optional
from pathlib import Path

# Path to framework definitions (relative to this file)
FRAMEWORKS_DIR = Path(__file__).parent.parent / "src" / "frameworks"


class FrameworkLoader:
    """Loads and caches framework definitions"""

    def __init__(self):
        self._frameworks_cache: Dict[str, dict] = {}
        self._categories_cache: Optional[list] = None

    def load_categories(self) -> list:
        """Load all framework categories"""
        if self._categories_cache is None:
            categories_path = FRAMEWORKS_DIR / "categories.json"
            with open(categories_path, 'r') as f:
                self._categories_cache = json.load(f)
        return self._categories_cache

    def load_framework(self, framework_id: str) -> Optional[dict]:
        """
        Load a specific framework definition by ID

        Returns None if framework not found
        """
        # Check cache first
        if framework_id in self._frameworks_cache:
            return self._frameworks_cache[framework_id]

        # Search for framework in category directories
        categories = self.load_categories()

        for category in categories:
            category_dir = FRAMEWORKS_DIR / category["id"]
            if not category_dir.exists():
                continue

            # Try to find the framework file
            framework_path = category_dir / f"{framework_id}.json"
            if framework_path.exists():
                with open(framework_path, 'r') as f:
                    framework = json.load(f)
                    self._frameworks_cache[framework_id] = framework
                    return framework

        # Framework not found
        return None

    def get_all_frameworks(self) -> list:
        """Load all framework definitions"""
        frameworks = []
        categories = self.load_categories()

        for category in categories:
            category_dir = FRAMEWORKS_DIR / category["id"]
            if not category_dir.exists():
                continue

            # Load all JSON files in category directory
            for framework_path in category_dir.glob("*.json"):
                with open(framework_path, 'r') as f:
                    framework = json.load(f)
                    frameworks.append(framework)
                    self._frameworks_cache[framework["id"]] = framework

        return frameworks


# Global loader instance
_loader = FrameworkLoader()


def get_framework(framework_id: str) -> Optional[dict]:
    """Get a framework definition by ID"""
    return _loader.load_framework(framework_id)


def get_all_frameworks() -> list:
    """Get all framework definitions"""
    return _loader.get_all_frameworks()


def get_categories() -> list:
    """Get all framework categories"""
    return _loader.load_categories()
