#!/bin/bash
# Double-click on a Mac to start Claude in this window, with Chrome control.
cd "$(dirname "$0")/.." || exit 1
git pull --ff-only || echo "Could not update from GitHub. Carrying on with the files already here."
exec claude --chrome
