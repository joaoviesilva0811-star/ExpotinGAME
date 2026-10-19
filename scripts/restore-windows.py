#!/usr/bin/env python3
"""Restore the exact verified Windows ZIP from GitHub-safe binary parts."""
import argparse
import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path, default=root / 'release' / 'IronCrown-Windows-x64.zip')
args = parser.parse_args()
manifest = json.loads((root / 'windows-package' / 'manifest.json').read_text())
target = args.output.resolve()
target.parent.mkdir(parents=True, exist_ok=True)
temporary = target.with_suffix(target.suffix + '.partial')
full_hash = hashlib.sha256()
total = 0
try:
    with temporary.open('wb') as output:
        for entry in manifest['parts']:
            if Path(entry['name']).name != entry['name']:
                raise ValueError('Unsafe manifest filename')
            part_hash = hashlib.sha256()
            size = 0
            with (root / 'windows-package' / entry['name']).open('rb') as part:
                while chunk := part.read(1024 * 1024):
                    part_hash.update(chunk)
                    full_hash.update(chunk)
                    output.write(chunk)
                    size += len(chunk)
            if part_hash.hexdigest() != entry['sha256'] or size != entry['size']:
                raise ValueError('Part integrity verification failed: ' + entry['name'])
            total += size
    if total != manifest['size'] or full_hash.hexdigest() != manifest['sha256']:
        raise ValueError('Complete ZIP integrity verification failed')
    temporary.replace(target)
    target.with_suffix(target.suffix + '.sha256').write_text(manifest['sha256'] + '  ' + target.name + '\n')
    print('Verified Windows package:', target)
    print('SHA-256:', manifest['sha256'])
except BaseException:
    temporary.unlink(missing_ok=True)
    raise
