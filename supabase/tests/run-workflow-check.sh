#!/bin/bash
# Applies every migration to a throwaway local Postgres database and runs the
# end-to-end workflow check under real RLS (supabase/tests/workflow-check.sql).
# Needs a local Postgres (14+) with contrib (btree_gist). Never point this at
# a real project: it drops and recreates the database named below.
#
#   PGHOST=127.0.0.1 PGPORT=5432 PGUSER=postgres supabase/tests/run-workflow-check.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
DB="${CHECK_DB:-ssb_workflow_check}"
psql_q() { psql -v ON_ERROR_STOP=1 -q "$@"; }

psql_q -d postgres -c "drop database if exists \"$DB\"" -c "create database \"$DB\""
psql_q -d "$DB" -f supabase/tests/supabase-stub.sql
for f in supabase/migrations/*.sql; do
  psql_q -d "$DB" -1 -f "$f" >/dev/null
  echo "applied $(basename "$f")"
done
psql_q -d "$DB" -o /dev/null -f supabase/tests/workflow-check.sql 2>&1 | sed -E 's/^psql:[^ ]+ (NOTICE|ERROR):  //'
