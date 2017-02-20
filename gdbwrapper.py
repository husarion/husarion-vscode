#!/usr/bin/env python
import sys, subprocess

tty_fn = None

for arg in sys.argv[1:]:
    if arg.startswith('--tty='):
        tty_fn = arg[6:]

if not tty_fn:
    sys.exit('expected --tty argument')

tty = open(tty_fn, 'rw')

if os.environ.get('GDBWRAPPER_FLASH') == 'true':
    if subprocess.call(['make'], stdin=tty, stdout=tty, stderr=tty) == 0:
        sys.exit(1)

gdb_cmd = 'target remote localhosts"' % tty_fn
args = ['gdb', '--eval-command', gdb_cmd]

sys.exit(subprocess.call(args))