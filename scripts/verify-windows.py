"""Verify restored portable ZIP, PE architecture and exact shipped game files."""
from pathlib import Path
import hashlib, json, struct, zipfile

root = Path(__file__).resolve().parent.parent
manifest = json.loads((root / 'windows-package/manifest.json').read_text())
archive = root / 'release/IronCrown-Windows-x64.zip'
with archive.open('rb') as source:
    digest = hashlib.file_digest(source, 'sha256').hexdigest()
result = {'version': manifest['version'], 'size': archive.stat().st_size,
          'sha256': digest, 'parts': len(manifest['parts'])}
assert result['size'] == manifest['size'] and digest == manifest['sha256']
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None, 'ZIP CRC failure'
    checked = 0
    prefix = 'IronCrown-Windows-x64/'
    for folder in ['public', 'server', 'desktop']:
        for path in (root / folder).rglob('*'):
            if path.is_file():
                relative = path.relative_to(root).as_posix()
                assert z.read(prefix + 'resources/app/' + relative) == path.read_bytes(), relative
                checked += 1
    assert z.read(prefix + 'LEIA-ME.txt') == (root / 'docs/PC-LEIA-ME.txt').read_bytes()
    package = json.loads(z.read(prefix + 'resources/app/package.json'))
    assert package['version'] == manifest['version']
    binary = z.read(prefix + 'Shadows of the Iron Crown.exe')
    assert binary[:2] == b'MZ'
    offset = struct.unpack_from('<I', binary, 60)[0]
    assert binary[offset:offset+4] == b'PE\0\0'
    assert struct.unpack_from('<H', binary, offset+4)[0] == 0x8664
    result.update(entries=len(z.namelist()), sourceFilesVerified=checked,
                  crc='all entries passed', executable='PE x64', sourceMatches=True)
(root / 'artifacts').mkdir(exist_ok=True)
(root / 'artifacts' / ('windows-verified-v' + manifest['version'] + '.json')).write_text(
    json.dumps(result, indent=2) + '\n')
print(json.dumps(result))
