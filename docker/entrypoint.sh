#!/bin/sh
set -u

python /srv/updater/update.py --loop &
updater_pid=$!
nginx -g 'daemon off;' &
nginx_pid=$!

stop() {
  trap - TERM INT
  kill "$nginx_pid" "$updater_pid" 2>/dev/null || true
  wait "$nginx_pid" "$updater_pid" 2>/dev/null || true
}

trap 'stop; exit 143' TERM INT
wait -n "$nginx_pid" "$updater_pid"
status=$?
stop
exit "$status"
