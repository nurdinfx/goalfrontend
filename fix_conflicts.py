import os
import re

files = [
    'src/pages/Dashboard.jsx',
    'src/pages/Zones.jsx',
    'src/pages/Workers.jsx',
    'src/pages/Cars.tsx',
    'src/pages/Reports.jsx'
]

base_dir = '/home/cismaankayse377/downloads/new-version-gool-system/goalfrontend-main/'

def fix_file(filepath):
    print(f"Processing {filepath}...")
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return

    # Regex to find conflict blocks and keep HEAD
    # Matches:
    # <<<<<<< HEAD (newline)
    # (content A)
    # (newline) ======= (optional text) (newline)
    # (content B)
    # (newline) >>>>>>> (text) (newline or end of string)
    
    pattern = re.compile(
        r'<<<<<<< HEAD\r?\n(.*?)\r?\n=======(?:.*)?\r?\n(.*?)\r?\n>>>>>>> .*?(\r?\n|$)',
        re.DOTALL
    )
    
    def replacer(match):
        # We keep group 1 (HEAD content). 
        # We append a newline because the match consumes the newline after the content.
        return match.group(1) + '\n'

    new_content = pattern.sub(replacer, content)
    
    if content != new_content:
        # Check if any markers remain (in case of malformed markers not caught by regex)
        if '<<<<<<< HEAD' in new_content:
            print(f"Warning: Conflict markers still present in {filepath} after replacement.")
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Fixed {filepath}")
    else:
        print(f"No changes for {filepath} (no standard conflicts found or regex mismatch)")

for f in files:
    full_path = os.path.join(base_dir, f)
    if os.path.exists(full_path):
        fix_file(full_path)
    else:
        print(f"File not found: {full_path}")
