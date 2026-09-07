// Typed Tauri adapter for code search commands (owned by the search feature).
import { invoke } from "@tauri-apps/api/core";
import { type Result, wrap } from "@/platform/native/common/nativeResult";
import type { ContentMatch, FileGroupEntry } from "@/workbench/services/files/common/files";

export interface SearchFilesResult {
  files: FileGroupEntry[];
  totalMatches: number;
}

export interface SearchFileMatchesResult {
  total: number;
  matches: ContentMatch[];
}

export interface SearchOptions {
  matchCase: boolean;
  matchWholeWord: boolean;
  useRegex: boolean;
  include?: string;
  exclude?: string;
}

import { isBrowserDevPreview } from "@/workbench/browser/desktopPreview";

export const searchService = {
  /** Search file contents; returns per-file match counts. */
  searchFiles: (
    root: string,
    query: string,
    options: SearchOptions,
    maxFiles?: number,
  ): Promise<Result<SearchFilesResult>> => {
    if (isBrowserDevPreview) {
      const params = new URLSearchParams({
        root,
        query,
        matchCase: String(options.matchCase),
        matchWholeWord: String(options.matchWholeWord),
        useRegex: String(options.useRegex),
        include: options.include || "",
        exclude: options.exclude || "",
      });
      return fetch(`/api/fs/search_files?${params.toString()}`)
        .then((res) => (res.ok ? res.json() : { files: [], totalMatches: 0 }))
        .then((data) => ({ ok: true as const, ...data }))
        .catch((e) => ({ ok: false as const, error: String(e) }));
    }
    return wrap(
      () =>
        invoke<SearchFilesResult>("fs_search_content_files", {
          root,
          query,
          matchCase: options.matchCase,
          matchWholeWord: options.matchWholeWord,
          useRegex: options.useRegex,
          include: options.include,
          exclude: options.exclude,
          maxFiles,
        }),
      (result) => ({ files: result.files, totalMatches: result.totalMatches }),
    );
  },

  /** Load individual matches for a single file from the current search. */
  fileMatches: (
    root: string,
    query: string,
    options: SearchOptions,
    filePath: string,
    offset: number,
    limit: number,
  ): Promise<Result<SearchFileMatchesResult>> => {
    if (isBrowserDevPreview) {
      const params = new URLSearchParams({
        filePath,
        query,
        matchCase: String(options.matchCase),
      });
      return fetch(`/api/fs/file_matches?${params.toString()}`)
        .then((res) => (res.ok ? res.json() : { total: 0, matches: [] }))
        .then((data) => ({ ok: true as const, ...data }))
        .catch((e) => ({ ok: false as const, error: String(e) }));
    }
    return wrap(
      () =>
        invoke<SearchFileMatchesResult>("fs_search_content_file_matches", {
          root,
          query,
          matchCase: options.matchCase,
          matchWholeWord: options.matchWholeWord,
          useRegex: options.useRegex,
          include: options.include ?? "",
          exclude: options.exclude ?? "",
          filePath,
          offset,
          limit,
        }),
      (result) => ({ total: result.total, matches: result.matches }),
    );
  },
};
