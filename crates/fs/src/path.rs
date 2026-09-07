use std::path::{Component, Path, PathBuf};

pub fn normalize_path(path: &Path) -> PathBuf {
    let mut components = Vec::new();
    for comp in path.components() {
        match comp {
            Component::CurDir => {}
            Component::ParentDir => {
                if let Some(last) = components.last() {
                    if matches!(last, Component::Normal(_)) {
                        components.pop();
                        continue;
                    }
                }
                components.push(comp);
            }
            _ => components.push(comp),
        }
    }
    components.iter().collect()
}

pub fn is_subpath(base: &Path, target: &Path) -> bool {
    let base_comps: Vec<_> = base.components().collect();
    let target_comps: Vec<_> = target.components().collect();

    if target_comps.len() < base_comps.len() {
        return false;
    }

    for (b, t) in base_comps.iter().zip(target_comps.iter()) {
        let b_str = b.as_os_str().to_string_lossy();
        let t_str = t.as_os_str().to_string_lossy();
        if cfg!(windows) {
            if b_str.to_lowercase() != t_str.to_lowercase() {
                return false;
            }
        } else if b_str != t_str {
            return false;
        }
    }

    true
}

pub fn resolve_safe_path(cwd: &str, p: &str) -> Result<String, String> {
    let trimmed = p.trim();
    if trimmed.is_empty() {
        return Err("Path cannot be empty".to_string());
    }

    let cwd_path = if Path::new(cwd).is_absolute() {
        normalize_path(Path::new(cwd))
    } else {
        match std::env::current_dir() {
            Ok(curr) => normalize_path(&curr.join(cwd)),
            Err(_) => normalize_path(Path::new(cwd)),
        }
    };

    let target_path = if Path::new(trimmed).is_absolute() {
        normalize_path(Path::new(trimmed))
    } else {
        normalize_path(&cwd_path.join(trimmed))
    };

    if !is_subpath(&cwd_path, &target_path) {
        return Err(format!(
            "Access denied: Path '{}' is outside workspace '{}'",
            trimmed, cwd
        ));
    }

    Ok(target_path.to_string_lossy().to_string())
}

pub fn resolve_path(cwd: &str, p: &str) -> String {
    let path = Path::new(p);
    if path.is_absolute() {
        p.to_string()
    } else {
        Path::new(cwd).join(p).to_string_lossy().to_string()
    }
}

pub fn relative_path(path: &Path, base: &Path) -> String {
    if let Ok(relative) = path.strip_prefix(base) {
        return relative.to_string_lossy().replace('\\', "/");
    }

    let path = path.to_string_lossy().replace('\\', "/");
    let base = base.to_string_lossy().replace('\\', "/");
    if path.to_lowercase().starts_with(&base.to_lowercase()) {
        return path[base.len()..].trim_start_matches('/').to_string();
    }
    path
}

pub fn clip(text: &str, max: usize) -> String {
    if text.len() <= max {
        text.to_string()
    } else {
        let mut end = max;
        while !text.is_char_boundary(end) {
            end -= 1;
        }
        format!(
            "{}\n…[truncated, {} more chars]",
            &text[..end],
            text.len() - max
        )
    }
}

pub fn glob_to_regex(pattern: &str) -> String {
    let owned;
    let p = if pattern.starts_with('.') {
        owned = format!("*{}", pattern);
        &owned
    } else {
        pattern
    };
    let mut re = String::with_capacity(p.len() * 2);
    let mut chars = p.chars().peekable();
    while let Some(ch) = chars.next() {
        match ch {
            '*' if chars.peek() == Some(&'*') => {
                chars.next();
                re.push_str(".*");
            }
            '*' => re.push_str(".*"),
            '?' => re.push('.'),
            '.' | '+' | '(' | ')' | '|' | '^' | '$' | '[' | ']' | '{' | '}' | '\\' => {
                re.push('\\');
                re.push(ch);
            }
            _ => re.push(ch),
        }
    }
    re
}

pub fn compile_patterns(patterns: &str) -> Vec<regex::Regex> {
    patterns
        .split(',')
        .map(|p| p.trim())
        .filter(|p| !p.is_empty())
        .filter_map(|p| regex::Regex::new(&glob_to_regex(p)).ok())
        .collect()
}

pub fn matches_any(path: &str, patterns: &[regex::Regex]) -> bool {
    if patterns.is_empty() {
        return true;
    }
    patterns.iter().any(|re| re.is_match(path))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_resolve_safe_path_valid() {
        let cwd = if cfg!(windows) { "C:\\projects\\my_app" } else { "/projects/my_app" };
        let res = resolve_safe_path(cwd, "src/main.rs").unwrap();
        assert!(res.contains("src"));
        assert!(res.contains("main.rs"));
    }

    #[test]
    fn test_resolve_safe_path_rejects_traversal() {
        let cwd = if cfg!(windows) { "C:\\projects\\my_app" } else { "/projects/my_app" };
        let err = resolve_safe_path(cwd, "../../etc/passwd").unwrap_err();
        assert!(err.contains("outside workspace"));
    }

    #[test]
    fn test_resolve_safe_path_rejects_foreign_absolute() {
        let cwd = if cfg!(windows) { "C:\\projects\\my_app" } else { "/projects/my_app" };
        let foreign = if cfg!(windows) { "C:\\Windows\\System32\\calc.exe" } else { "/var/log/syslog" };
        let err = resolve_safe_path(cwd, foreign).unwrap_err();
        assert!(err.contains("outside workspace"));
    }
}
