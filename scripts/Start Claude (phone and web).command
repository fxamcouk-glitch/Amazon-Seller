#!/bin/bash
# Double-click on a Mac to start Claude for TheCable.Store.
# Lets you chat from the Claude app (phone or claude.ai/code) while Claude
# works on this Mac: it can use this Mac's Chrome and edit this project.
# Close this window, or press Ctrl+C, to stop.

cd "$(dirname "$0")/.." || exit 1

echo "Getting the latest project files from GitHub..."
git pull --ff-only || echo "Could not update from GitHub. Carrying on with the files already here."

echo
echo "Starting Remote Control with Chrome turned on."
echo "Open the Claude app on your phone or go to claude.ai/code."
echo "Look for the session called 'TheCable.Store'."
echo "Keep this window, Chrome and the Mac awake while you use it."
echo

# caffeinate stops the Mac sleeping while Claude is running.
exec caffeinate -i claude remote-control --chrome --name "TheCable.Store"
