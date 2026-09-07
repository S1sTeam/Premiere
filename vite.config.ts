import cp from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

function premireFsPlugin(): Plugin {
  return {
    name: "premire-fs-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith("/api/proxy")) {
          const parsed = new URL(req.url, "http://localhost:3001");
          const targetUrl = parsed.searchParams.get("url");
          if (!targetUrl) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            return res.end(JSON.stringify({ error: "Missing url parameter" }));
          }

          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
          res.setHeader("Access-Control-Allow-Headers", "*");

          if (req.method === "OPTIONS") {
            res.statusCode = 204;
            return res.end();
          }

          try {
            const fetchHeaders: Record<string, string> = {};
            for (const [key, value] of Object.entries(req.headers)) {
              const lower = key.toLowerCase();
              if (
                lower === "host" ||
                lower === "origin" ||
                lower === "referer" ||
                lower === "connection" ||
                lower === "content-length" ||
                lower.startsWith("sec-")
              ) {
                continue;
              }
              if (typeof value === "string") fetchHeaders[key] = value;
              else if (Array.isArray(value)) fetchHeaders[key] = value.join(", ");
            }

            let body: any = undefined;
            if (req.method !== "GET" && req.method !== "HEAD") {
              const chunks: Buffer[] = [];
              for await (const chunk of req) {
                chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
              }
              body = Buffer.concat(chunks);
            }

            const abortController = new AbortController();
            res.on("close", () => abortController.abort());

            const upstreamRes = await fetch(targetUrl, {
              method: req.method,
              headers: fetchHeaders,
              body,
              signal: abortController.signal,
            });

            res.statusCode = upstreamRes.status;
            upstreamRes.headers.forEach((v, k) => {
              const lower = k.toLowerCase();
              if (
                lower !== "access-control-allow-origin" &&
                lower !== "access-control-allow-methods" &&
                lower !== "access-control-allow-headers" &&
                lower !== "content-encoding" &&
                lower !== "transfer-encoding"
              ) {
                res.setHeader(k, v);
              }
            });

            if (!upstreamRes.body) {
              return res.end();
            }

            const reader = upstreamRes.body.getReader();
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
              }
            } catch {}
            return res.end();
          } catch (err: any) {
            res.statusCode = 502;
            res.setHeader("Content-Type", "application/json");
            return res.end(JSON.stringify({ error: err?.message || "Proxy error" }));
          }
        }

        if (!req.url?.startsWith("/api/fs/")) return next();
        const url = new URL(req.url, "http://localhost:3001");
        const pathname = url.pathname;
        res.setHeader("Content-Type", "application/json");

        try {
          if (pathname === "/api/fs/list") {
            const dirParam = url.searchParams.get("dir") || process.cwd();
            const targetDir = path.resolve(dirParam);
            if (!fs.existsSync(targetDir)) {
              res.statusCode = 404;
              return res.end(JSON.stringify({ error: "Directory not found" }));
            }
            const items = fs.readdirSync(targetDir);
            const entries = items.map((name) => {
              const fullPath = path.join(targetDir, name);
              try {
                const stat = fs.statSync(fullPath);
                return {
                  name,
                  path: fullPath.replace(/\\/g, "/"),
                  is_dir: stat.isDirectory(),
                  is_file: stat.isFile(),
                  is_symlink: stat.isSymbolicLink(),
                  size: stat.size,
                  readonly: false,
                };
              } catch {
                return {
                  name,
                  path: fullPath.replace(/\\/g, "/"),
                  is_dir: false,
                  is_file: true,
                  is_symlink: false,
                  size: 0,
                  readonly: false,
                };
              }
            });
            return res.end(JSON.stringify(entries));
          }

          if (pathname === "/api/fs/read") {
            const filePath = url.searchParams.get("path");
            if (!filePath || !fs.existsSync(filePath)) {
              res.statusCode = 404;
              return res.end(JSON.stringify({ error: "File not found" }));
            }
            const content = fs.readFileSync(filePath, "utf8");
            return res.end(JSON.stringify(content));
          }

          if (pathname === "/api/fs/find" || pathname === "/api/fs/find_all") {
            const rootDir = path.resolve(url.searchParams.get("root") || process.cwd());
            const query = (url.searchParams.get("query") || "").toLowerCase().trim();
            const limit = parseInt(url.searchParams.get("limit") || "50", 10);
            const includeDirs = pathname === "/api/fs/find_all";
            const matches: any[] = [];

            function searchDir(dir: string) {
              if (matches.length >= limit) return;
              try {
                const list = fs.readdirSync(dir);
                for (const item of list) {
                  if (matches.length >= limit) break;
                  if (item === "node_modules" || item === ".git" || item === "dist" || item === ".system_generated") continue;
                  const full = path.join(dir, item);
                  const stat = fs.statSync(full);
                  const isDir = stat.isDirectory();
                  const rel = path.relative(rootDir, full).replace(/\\/g, "/");
                  const itemLower = item.toLowerCase();
                  const relLower = rel.toLowerCase();

                  if (!query || itemLower.includes(query) || relLower.includes(query)) {
                    if (!isDir || includeDirs) {
                      matches.push({
                        path: full.replace(/\\/g, "/"),
                        rel,
                        name: item,
                        isDir,
                      });
                    }
                  }
                  if (isDir) {
                    searchDir(full);
                  }
                }
              } catch {}
            }

            if (fs.existsSync(rootDir)) {
              searchDir(rootDir);
            }
            return res.end(JSON.stringify({ matches }));
          }

          if (pathname === "/api/fs/search_files") {
            const rootDir = path.resolve(url.searchParams.get("root") || process.cwd());
            const query = url.searchParams.get("query") || "";
            if (!query.trim()) {
              return res.end(JSON.stringify({ files: [], totalMatches: 0 }));
            }
            const matchCase = url.searchParams.get("matchCase") === "true";
            const files: any[] = [];
            let totalMatches = 0;

            function scan(dir: string) {
              if (files.length >= 50) return;
              try {
                const list = fs.readdirSync(dir);
                for (const item of list) {
                  if (item === "node_modules" || item === ".git" || item === "dist" || item === ".system_generated") continue;
                  const full = path.join(dir, item);
                  const stat = fs.statSync(full);
                  if (stat.isDirectory()) {
                    scan(full);
                  } else if (stat.isFile() && stat.size < 512 * 1024) {
                    try {
                      const text = fs.readFileSync(full, "utf8");
                      const q = matchCase ? query : query.toLowerCase();
                      const t = matchCase ? text : text.toLowerCase();
                      let count = 0;
                      let idx = 0;
                      while ((idx = t.indexOf(q, idx)) !== -1) {
                        count++;
                        idx += q.length;
                      }
                      if (count > 0) {
                        const rel = path.relative(rootDir, full).replace(/\\/g, "/");
                        files.push({
                          path: full.replace(/\\/g, "/"),
                          rel,
                          relativePath: rel,
                          name: item,
                          matchCount: count,
                        });
                        totalMatches += count;
                      }
                    } catch {}
                  }
                }
              } catch {}
            }

            scan(rootDir);
            return res.end(JSON.stringify({ files, totalMatches }));
          }

          if (pathname === "/api/fs/file_matches") {
            const filePath = url.searchParams.get("filePath") || "";
            const query = url.searchParams.get("query") || "";
            const matchCase = url.searchParams.get("matchCase") === "true";
            if (!filePath || !fs.existsSync(filePath) || !query) {
              return res.end(JSON.stringify({ total: 0, matches: [] }));
            }
            const text = fs.readFileSync(filePath, "utf8");
            const lines = text.split("\n");
            const q = matchCase ? query : query.toLowerCase();
            const matches: any[] = [];
            const fileName = path.basename(filePath);
            const rootDir = process.cwd();
            const rel = path.relative(rootDir, filePath).replace(/\\/g, "/");

            lines.forEach((line, lineIdx) => {
              const checkLine = matchCase ? line : line.toLowerCase();
              let idx = 0;
              while ((idx = checkLine.indexOf(q, idx)) !== -1) {
                matches.push({
                  path: filePath.replace(/\\/g, "/"),
                  rel,
                  name: fileName,
                  line: lineIdx + 1,
                  column: idx + 1,
                  content: line.replace(/\r$/, ""),
                  lineNumber: lineIdx + 1,
                  lineText: line,
                  start: idx,
                  end: idx + query.length,
                });
                idx += q.length;
              }
            });
            return res.end(JSON.stringify({ total: matches.length, matches }));
          }

          if (pathname === "/api/fs/project_info") {
            const dir = url.searchParams.get("dir") || process.cwd();
            const pkgPath = path.join(dir, "package.json");
            if (fs.existsSync(pkgPath)) {
              try {
                const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
                return res.end(JSON.stringify({ name: pkg.name || "Premire", version: pkg.version || "1.0.0" }));
              } catch {}
            }
            return res.end(JSON.stringify({ name: "Premire", version: "1.0.0" }));
          }

          if (pathname === "/api/fs/pick_folder") {
            const title = url.searchParams.get("title") || "Select Project Folder";
            const scriptPath = path.resolve(process.cwd(), "scripts", "pickFolder.ps1");

            if (process.platform === "win32") {
              cp.execFile(
                "powershell.exe",
                ["-NoProfile", "-Sta", "-ExecutionPolicy", "Bypass", "-File", scriptPath, "-Title", title],
                { windowsHide: true, encoding: "utf8" },
                (err, stdout) => {
                  const picked = stdout ? stdout.trim() : "";
                  if (picked) {
                    return res.end(JSON.stringify({ path: picked.replace(/\\/g, "/") }));
                  }
                  return res.end(JSON.stringify({ path: null }));
                },
              );
              return;
            } else if (process.platform === "darwin") {
              cp.execFile(
                "osascript",
                ["-e", `POSIX path of (choose folder with prompt "${title.replace(/"/g, '\\"')}")`],
                (err, stdout) => {
                  const picked = stdout ? stdout.trim() : "";
                  return res.end(JSON.stringify({ path: picked || null }));
                },
              );
              return;
            } else {
              cp.execFile(
                "zenity",
                ["--file-selection", "--directory", `--title=${title}`],
                (err, stdout) => {
                  const picked = stdout ? stdout.trim() : "";
                  return res.end(JSON.stringify({ path: picked || null }));
                },
              );
              return;
            }
          }

          if (req.method === "POST") {
            req.setEncoding("utf8");
            let body = "";
            req.on("data", (chunk) => {
              body += chunk;
            });
            req.on("end", () => {
              try {
                const data = JSON.parse(body || "{}");
                if (pathname === "/api/fs/write") {
                  fs.writeFileSync(data.path, data.content, "utf8");
                  return res.end(JSON.stringify({ ok: true }));
                }
                if (pathname === "/api/fs/create_file") {
                  const target = path.join(data.dir, data.name);
                  fs.writeFileSync(target, "", "utf8");
                  return res.end(JSON.stringify(target.replace(/\\/g, "/")));
                }
                if (pathname === "/api/fs/create_dir") {
                  const target = path.join(data.dir, data.name);
                  fs.mkdirSync(target, { recursive: true });
                  return res.end(JSON.stringify(target.replace(/\\/g, "/")));
                }
                if (pathname === "/api/fs/delete") {
                  fs.rmSync(data.path, { recursive: true, force: true });
                  return res.end(JSON.stringify({ ok: true }));
                }
                if (pathname === "/api/fs/rename") {
                  fs.renameSync(data.from, data.to);
                  return res.end(JSON.stringify({ ok: true }));
                }
                if (pathname === "/api/fs/reveal") {
                  const target = data.path;
                  if (!target) {
                    res.statusCode = 400;
                    return res.end(JSON.stringify({ error: "Missing path" }));
                  }
                  const resolved = path.resolve(target);
                  if (process.platform === "win32") {
                    const winPath = resolved.replace(/\//g, "\\");
                    let isFile = false;
                    try {
                      isFile = fs.statSync(resolved).isFile();
                    } catch {}

                    if (isFile) {
                      cp.spawn("explorer.exe", [`/select,${winPath}`], { detached: true, stdio: "ignore" }).unref();
                    } else {
                      cp.spawn("explorer.exe", [winPath], { detached: true, stdio: "ignore" }).unref();
                    }
                  } else if (process.platform === "darwin") {
                    cp.spawn("open", ["-R", resolved], { detached: true, stdio: "ignore" }).unref();
                  } else {
                    let isDir = false;
                    try {
                      isDir = fs.statSync(resolved).isDirectory();
                    } catch {}
                    const dest = isDir ? resolved : path.dirname(resolved);
                    cp.spawn("xdg-open", [dest], { detached: true, stdio: "ignore" }).unref();
                  }
                  return res.end(JSON.stringify({ ok: true }));
                }
                res.statusCode = 404;
                res.end(JSON.stringify({ error: "Not found" }));
              } catch (e: any) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: e.message || String(e) }));
              }
            });
            return;
          }


          res.statusCode = 404;
          res.end(JSON.stringify({ error: "Endpoint not found" }));
        } catch (err: any) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: err.message || String(err) }));
        }
      });
    },
  };
}

export default defineConfig({
  root: "src",
  publicDir: "../public",
  base: "./",
  plugins: [react(), premireFsPlugin()],
  resolve: {
    // The local @zazaru/ui package has its own development node_modules.
    // Always resolve hooks through the application's React instance; otherwise
    // Radix providers loaded from the linked package receive a second dispatcher.
    dedupe: ["react", "react-dom"],
    alias: [
      { find: "@zazaru/ui/styles.css", replacement: fileURLToPath(new URL("./packages/zazaru-ui/src/styles.css", import.meta.url)) },
      { find: "@zazaru/ui/recipes", replacement: fileURLToPath(new URL("./packages/zazaru-ui/src/recipes/index.ts", import.meta.url)) },
      { find: "@zazaru/ui", replacement: fileURLToPath(new URL("./packages/zazaru-ui/src/index.ts", import.meta.url)) },
      { find: "@zazaru/core", replacement: fileURLToPath(new URL("./packages/zazaru-core/src/index.ts", import.meta.url)) },
      { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
    ],
  },
  build: {
    outDir: "../dist/src",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
            return "vendor";
          }
          if (
            id.includes("node_modules/react-markdown") ||
            id.includes("node_modules/react-syntax-highlighter") ||
            id.includes("node_modules/katex") ||
            id.includes("node_modules/remark-gfm") ||
            id.includes("node_modules/remark-math") ||
            id.includes("node_modules/rehype-katex")
          ) {
            return "markdown";
          }
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3001,
    strictPort: true,
  },
});
