import os
import pyperclip
import sys
import fnmatch

# Allowed extensions
EXTENSIONS = {".ts", ".tsx", ".json", ".css", ".html", ".js", ".jsx", ".mjs", ".cjs", ".sql", ".prisma", ".env"}

# Directories to skip inside each workspace
SKIP_DIRS = {".git", "node_modules", "vendor", "dist", "build", "__pycache__", "coverage", ".next", "out", ".turbo", "dumps", "services"}

# Files to skip (exact name)
SKIP_FILES = {"package-lock.json", "yarn.lock", "pnpm-lock.yaml", "tsconfig.tsbuildinfo"}

# Which top-level directories to scan under /apps/
TARGET_WORKSPACES = []  # Empty means scan all workspaces in /apps/
# Or specify specific workspaces:
# TARGET_WORKSPACES = {"frontend", "backend", "api"}

# Also scan packages directory
SCAN_PACKAGES = True
PACKAGES_DIR = "packages"


def should_include_file(file_path, include_patterns, exclude_patterns):
    """Determine if a file should be included based on glob patterns."""
    normalized_path = file_path.replace("\\", "/")

    if include_patterns:
        included = any(fnmatch.fnmatch(normalized_path, pattern) for pattern in include_patterns)
        if not included:
            return False

    if exclude_patterns:
        excluded = any(fnmatch.fnmatch(normalized_path, pattern) for pattern in exclude_patterns)
        if excluded:
            return False

    return True


def scan_directory(base_path, rel_base, output, include_patterns, exclude_patterns):
    """Scan a directory and add matching files to output."""
    if not os.path.isdir(base_path):
        return

    for root, dirs, files in os.walk(base_path):
        # Skip unwanted directories
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]

        for file in files:
            if file in SKIP_FILES:
                continue

            file_path = os.path.join(root, file)
            rel_path = os.path.relpath(file_path, rel_base).replace("\\", "/")

            # Only include files with allowed extensions
            _, ext = os.path.splitext(file)
            if ext.lower() not in EXTENSIONS:
                continue

            # Apply optional include/exclude filters
            if include_patterns or exclude_patterns:
                if not should_include_file(rel_path, include_patterns, exclude_patterns):
                    continue

            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    lines = f.readlines()
                # Remove a potential "// src/" header (optional)
                if lines and lines[0].startswith("// src/"):
                    lines = lines[1:]
                contents = "".join(lines)
                output.append(f"{rel_path}:\n{contents}\n")
            except (UnicodeDecodeError, PermissionError, OSError):
                continue


def copy_files_to_clipboard(base_dir=None, include_patterns=None, exclude_patterns=None):
    """Copy relevant files from apps/ and packages/ to clipboard."""
    if base_dir is None:
        base_dir = os.getcwd()

    output = []

    if include_patterns and isinstance(include_patterns, str):
        include_patterns = [p.strip() for p in include_patterns.split(",")]
    if exclude_patterns and isinstance(exclude_patterns, str):
        exclude_patterns = [p.strip() for p in exclude_patterns.split(",")]

    # Scan apps directory
    apps_path = os.path.join(base_dir, "apps")
    if os.path.isdir(apps_path):
        if TARGET_WORKSPACES:
            # Scan only specified workspaces
            for workspace in TARGET_WORKSPACES:
                workspace_path = os.path.join(apps_path, workspace)
                scan_directory(workspace_path, base_dir, output, include_patterns, exclude_patterns)
        else:
            # Scan all workspaces
            for workspace in os.listdir(apps_path):
                workspace_path = os.path.join(apps_path, workspace)
                if os.path.isdir(workspace_path) and workspace not in SKIP_DIRS:
                    scan_directory(workspace_path, base_dir, output, include_patterns, exclude_patterns)

    # Scan packages directory
    if SCAN_PACKAGES:
        packages_path = os.path.join(base_dir, PACKAGES_DIR)
        scan_directory(packages_path, base_dir, output, include_patterns, exclude_patterns)

    if not output:
        print("⚠️  No files found to copy.")
        return

    pyperclip.copy("\n".join(output))
    print(f"✅ Copied {len(output)} files to clipboard!")

    if include_patterns or exclude_patterns:
        filter_info = []
        if include_patterns:
            filter_info.append(f"Include: {', '.join(include_patterns)}")
        if exclude_patterns:
            filter_info.append(f"Exclude: {', '.join(exclude_patterns)}")
        print(f"📁 Filtering: {'; '.join(filter_info)}")


def get_filter_input(prompt, default=""):
    response = input(prompt).strip()
    return response if response else default


if __name__ == "__main__":
    # The script itself can be placed in the project root (/src/)
    base_dir = os.path.dirname(os.path.abspath(__file__))
    print(f"📂 Scanning monorepo root: {base_dir}")
    print(f"📁 Workspaces: /apps/*")
    if SCAN_PACKAGES:
        print(f"📦 Packages: /{PACKAGES_DIR}/*")

    print("\n📁 File Filtering Options:")
    print("   - Leave blank to include all files")
    print("   - Use glob patterns (e.g., 'apps/*/src/**/*', 'packages/**/*.test.*')")
    print("   - Separate multiple patterns with commas")

    include_input = get_filter_input("Files to include (patterns): ")
    exclude_input = get_filter_input("Files to exclude (patterns): ")

    include_patterns = [p.strip() for p in include_input.split(",")] if include_input else None
    exclude_patterns = [p.strip() for p in exclude_input.split(",")] if exclude_input else None

    copy_files_to_clipboard(base_dir, include_patterns, exclude_patterns)
