import os
import re
import sys

WRITE = '--write' in sys.argv
ROOT = os.getcwd()
EXTENSIONS = {'.ts', '.tsx', '.js', '.jsx'}
IGNORED_DIRS = {'.git', 'node_modules', '.expo'}
DEFAULT_GAP = '4'
TAG_PATTERN = re.compile(r'<(Row|Column)\b[^>]*>', re.S)
GAP_PROP_PATTERN = re.compile(r'\s+gap\s*=\s*\{\s*(-?\d+(?:\.\d+)?)\s*\}')
CLASSNAME_PATTERN = re.compile(r'\bclassName\s*=\s*("[^"]*"|\'[^\']*\'|\{`[\s\S]*?`\}|\{[^}]*\})', re.S)
GAP_TOKEN_PATTERN = re.compile(r'^gap(?:-[xy])?-(?:\[[^\]]+\]|\S+)$')


def iter_files():
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [name for name in dirnames if name not in IGNORED_DIRS]
        for filename in filenames:
            if os.path.splitext(filename)[1] in EXTENSIONS:
                yield os.path.join(dirpath, filename)


def sanitize_tokens(text):
    return ' '.join(token for token in text.split() if not GAP_TOKEN_PATTERN.match(token)).strip()


def merge_tokens(gap_token, text):
    cleaned = sanitize_tokens(text)
    return f'{gap_token} {cleaned}'.strip()


def split_template(content):
    pieces = []
    start = 0
    while True:
        expr_start = content.find('${', start)
        if expr_start == -1:
            pieces.append(('text', content[start:]))
            break
        if expr_start > start:
            pieces.append(('text', content[start:expr_start]))
        i = expr_start + 2
        depth = 1
        quote = None
        escaped = False
        while i < len(content) and depth > 0:
            ch = content[i]
            if quote:
                if escaped:
                    escaped = False
                elif ch == '\\':
                    escaped = True
                elif ch == quote:
                    quote = None
                i += 1
                continue
            if ch in ('"', "'", '`'):
                quote = ch
            elif ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
            i += 1
        pieces.append(('expr', content[expr_start:i]))
        start = i
    return pieces


def merge_template(gap_token, content):
    pieces = split_template(content)
    first_text = None
    merged = []
    for kind, value in pieces:
        if kind == 'text':
            value = sanitize_tokens(value)
            if first_text is None:
                first_text = len(merged)
        merged.append([kind, value])
    if first_text is None:
        merged.insert(0, ['text', gap_token + ' '])
    else:
        merged[first_text][1] = merge_tokens(gap_token, merged[first_text][1])
    return ''.join(value for _, value in merged).strip()


def replace_classname(tag, gap_token):
    match = CLASSNAME_PATTERN.search(tag)
    if not match:
        return tag[:-1] + f" className='{gap_token}'>"
    raw = match.group(1)
    if raw.startswith(('"', "'")):
        quote = raw[0]
        value = raw[1:-1]
        new_attr = f'className={quote}{merge_tokens(gap_token, value)}{quote}'
    elif raw.startswith('{`'):
        value = raw[2:-2]
        new_attr = 'className={`' + merge_template(gap_token, value) + '`}'
    else:
        expression = raw[1:-1].strip()
        new_attr = "className={`" + gap_token + " ${" + expression + " ?? ''}`.trim()}"
    return tag[:match.start()] + new_attr + tag[match.end():]


def transform_tag(tag):
    gap_match = GAP_PROP_PATTERN.search(tag)
    gap_value = gap_match.group(1) if gap_match else DEFAULT_GAP
    if gap_value.endswith('.0'):
        gap_value = gap_value[:-2]
    gap_token = f'gap-{gap_value}'
    next_tag = GAP_PROP_PATTERN.sub('', tag, count=1)
    return replace_classname(next_tag, gap_token)


def main():
    changed_files = []
    changed_tags = 0
    for file_path in iter_files():
        with open(file_path, 'r', encoding='utf-8') as file:
            original = file.read()
        changed_here = 0
        def replacer(match):
            nonlocal changed_here
            tag = match.group(0)
            new_tag = transform_tag(tag)
            if new_tag != tag:
                changed_here += 1
            return new_tag
        updated = TAG_PATTERN.sub(replacer, original)
        if changed_here:
            changed_files.append(os.path.relpath(file_path, ROOT))
            changed_tags += changed_here
            if WRITE:
                with open(file_path, 'w', encoding='utf-8') as file:
                    file.write(updated)
    mode = 'write' if WRITE else 'check'
    print(f'{mode}: files={len(changed_files)} tags={changed_tags}')
    for path in changed_files[:50]:
        print(path)
    if not WRITE and changed_files:
        sys.exit(1)


if __name__ == '__main__':
    main()
