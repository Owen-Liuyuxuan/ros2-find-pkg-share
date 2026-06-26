import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

// $(find-pkg-share pkg_name)/launch/foo.launch.xml
const FIND_PKG_SHARE_RE =
  /\$\(find-pkg-share\s+([a-zA-Z0-9_]+)\)(\/[^\s"'<>]+)?/g;

type PackageIndex = Map<string, string>;

let packageIndex: PackageIndex | undefined;
let indexPromise: Promise<PackageIndex> | undefined;

function parsePackageName(packageXml: string): string | undefined {
  const match = packageXml.match(/<name>([^<]+)<\/name>/);
  return match?.[1]?.trim();
}

async function buildPackageIndex(): Promise<PackageIndex> {
  const index: PackageIndex = new Map();
  const uris = await vscode.workspace.findFiles(
    "**/package.xml",
    "{**/node_modules/**,**/build/**,**/install/**,**/log/**}"
  );

  for (const uri of uris) {
    try {
      const bytes = await vscode.workspace.fs.readFile(uri);
      const name = parsePackageName(Buffer.from(bytes).toString("utf8"));
      if (!name) {
        continue;
      }
      index.set(name, path.dirname(uri.fsPath));
    } catch {
      // skip unreadable package.xml files
    }
  }

  return index;
}

async function getPackageIndex(): Promise<PackageIndex> {
  if (packageIndex) {
    return packageIndex;
  }
  if (!indexPromise) {
    indexPromise = buildPackageIndex().then((index) => {
      packageIndex = index;
      return index;
    });
  }
  return indexPromise;
}

function invalidatePackageIndex(): void {
  packageIndex = undefined;
  indexPromise = undefined;
}

function findMatchAtCursor(
  document: vscode.TextDocument,
  position: vscode.Position
): RegExpExecArray | undefined {
  const text = document.getText();
  const offset = document.offsetAt(position);

  FIND_PKG_SHARE_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = FIND_PKG_SHARE_RE.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (offset >= start && offset <= end) {
      return match;
    }
  }

  return undefined;
}

function resolveTarget(
  index: PackageIndex,
  packageName: string,
  relPath: string | undefined
): vscode.Location | undefined {
  const packageRoot = index.get(packageName);
  if (!packageRoot || !relPath) {
    return undefined;
  }

  const targetPath = path.normalize(
    path.join(packageRoot, relPath.replace(/^\//, ""))
  );
  try {
    if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
      return undefined;
    }
  } catch {
    return undefined;
  }

  return new vscode.Location(
    vscode.Uri.file(targetPath),
    new vscode.Position(0, 0)
  );
}

export function activate(context: vscode.ExtensionContext): void {
  void getPackageIndex();

  const provider: vscode.DefinitionProvider = {
    async provideDefinition(
      document: vscode.TextDocument,
      position: vscode.Position
    ): Promise<vscode.Definition | undefined> {
      const match = findMatchAtCursor(document, position);
      if (!match) {
        return undefined;
      }

      const packageName = match[1];
      const relPath = match[2];
      const index = await getPackageIndex();
      const location = resolveTarget(index, packageName, relPath);
      if (location) {
        return location;
      }

      // Stay on the reference so VS Code does not fall back to document links
      // and try to open a directory or invalid path.
      return new vscode.Location(document.uri, position);
    },
  };

  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      [{ language: "xml", scheme: "file" }],
      provider
    )
  );

  const watcher = vscode.workspace.createFileSystemWatcher("**/package.xml");
  watcher.onDidCreate(invalidatePackageIndex);
  watcher.onDidChange(invalidatePackageIndex);
  watcher.onDidDelete(invalidatePackageIndex);
  context.subscriptions.push(watcher);
}

export function deactivate(): void {
  invalidatePackageIndex();
}
