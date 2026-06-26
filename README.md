# ROS2 find-pkg-share Navigation

Navigate from `$(find-pkg-share …)` references in ROS 2 launch XML files to the corresponding file in your workspace.

## What it does

This extension registers a **Go to Definition** provider for XML files. When your cursor is on a `$(find-pkg-share package_name)/relative/path` expression, you can jump directly to that file—similar to Ctrl+Click on an import in source code.

It works by:

1. Scanning the workspace for `package.xml` files and building a package-name → package-root index.
2. Resolving the path after `$(find-pkg-share package_name)` relative to that package root.
3. Opening the target file if it exists on disk and is a file (not a directory).

**No build or ROS 2 install required** — The extension reads source trees directly. You do not need to run `colcon build`, source an underlay/overlay, or have ROS 2 installed on the machine. As long as the package folders and target files are present in the workspace you opened in the editor, navigation works.

**Supported pattern:**

```xml
$(find-pkg-share my_package)/launch/foo.launch.xml
$(find-pkg-share my_package)/config/params.yaml
```

The cursor must be anywhere inside the `$(find-pkg-share …)/…` expression for navigation to trigger.

## Usage

### VS Code

1. Install the extension (see [Installation](#installation) below).
2. Open a workspace that contains your ROS 2 packages (e.g. an Autoware `src/` tree).
3. Open a launch XML file that uses `$(find-pkg-share …)`.
4. Place the cursor on a `$(find-pkg-share package_name)/path` reference.
5. Use **Go to Definition**:
   - **Ctrl+Click** (Windows/Linux) or **Cmd+Click** (macOS), or
   - **F12**, or
   - Right-click → **Go to Definition**

If the package is indexed and the target path resolves to an existing **file**, the editor opens it. Navigation is skipped silently when the path does not exist or points to a directory.

### Cursor

Cursor uses the same VS Code extension API, so usage is identical:

1. Install the extension into Cursor (see [Installation](#installation)).
2. Open your ROS 2 workspace folder.
3. Ctrl+Click (or F12) on `$(find-pkg-share package_name)/path` in any launch XML file.

## Limitations

1. **No variable substitution** — The extension does not evaluate ROS launch substitutions. Paths must be written literally as `$(find-pkg-share package_name)/relative/path`. References that embed or depend on other substitutions will not resolve, for example:
   - `$(find-pkg-share $(var pkg))/launch/foo.launch.xml`
   - `$(find-pkg-share my_pkg)/launch/$(var launch_file).xml`

2. **Workspace scope only** — Navigation only works for packages whose `package.xml` is inside the **currently opened workspace**. It cannot jump to files from externally installed ROS packages (e.g. under `/opt/ros/humble/share/…`) unless those packages are part of the workspace you have open.

## Installation

### From this repository (local)

```bash
cd /path/to/ros2-find-pkg-share
npm install
npm run compile
```

**VS Code:** Run **Extensions: Install from VSIX…** after packaging, or add the folder to your extensions path. For development, use **Run Extension** from the Debug panel (F5).

**Cursor:** Install the compiled extension the same way—point Cursor at this extension directory or package it as a VSIX and install via **Extensions: Install from VSIX…**.

Ensure the workspace root you open in the editor contains the ROS 2 packages you want to navigate (typically the monorepo root or `src/` parent directory).

## Development

```bash
npm install
npm run compile   # or npm run watch
```

Press **F5** in VS Code/Cursor to launch an Extension Development Host and test against a ROS 2 workspace.

The package index is rebuilt automatically when `package.xml` files are created, changed, or deleted in the workspace.
