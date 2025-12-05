#!/usr/bin/env bash
set -euo pipefail

# Config - update these as needed
MIGRATIONS_DIR="${1:-supabase/migrations}"   # pass directory as first arg or default
DB_URL="${DATABASE_URL:-}"                   # use env DATABASE_URL if set
USE_SUPABASE_CLI="${USE_SUPABASE_CLI:-true}" # set to "false" to use psql instead
APPLY_CHANGES="${APPLY_CHANGES:-ask}"        # "yes" to auto-apply, "no" to never, "ask" to prompt

# Helper: print and exit
err() { echo "ERROR: $*" >&2; exit 1; }

# Validate migrations dir
if [ ! -d "$MIGRATIONS_DIR" ]; then
  err "Migrations directory not found: $MIGRATIONS_DIR"
fi

# List migration files (only .sql files). Adjust pattern if using different extension.
mapfile -t repo_migs < <(find "$MIGRATIONS_DIR" -maxdepth 1 -type f -name '*.sql' -printf '%f\n' | sort)

if [ "${#repo_migs[@]}" -eq 0 ]; then
  err "No .sql migration files found in $MIGRATIONS_DIR"
fi

echo "Found ${#repo_migs[@]} migration files in repo (showing first 50):"
printf '  %s\n' "${repo_migs[@]:0:50}"

# Get applied migrations from DB
# We prefer using supabase CLI to run a safe read; fallback to psql if DB_URL provided.
get_applied_with_supabase() {
  # supabase db query outputs additional text; we use --raw to get just rows if available
  # Use `supabase db query` if available in your environment (CLI v1.63+). Adjust if necessary.
  if ! command -v supabase >/dev/null 2>&1; then
    return 1
  fi
  supabase db query "SELECT version FROM public.schema_migrations ORDER BY version;" --project-ref "$(supabase projects list --json | jq -r '.[0].ref')" --raw 2>/dev/null || true
}

get_applied_with_psql() {
  if [ -z "$DB_URL" ]; then
    return 1
  fi
  psql "$DB_URL" -t -A -c "SELECT version FROM public.schema_migrations ORDER BY version;" 2>/dev/null || true
}

echo
echo "Querying database for applied migrations..."
applied_raw=""
if applied_raw="$(get_applied_with_supabase)"; then
  : # got applied_raw
else
  applied_raw="$(get_applied_with_psql)" || true
fi

if [ -z "$applied_raw" ]; then
  echo "Warning: could not read applied migrations from DB. Ensure supabase CLI is logged in or DATABASE_URL is set."
  echo "If using supabase CLI, ensure the project is set and supabase is authenticated."
  exit 1
fi

# Normalize applied migration names into an array
IFS=$'\n' read -r -d '' -a applied_migs <<< "$(echo "$applied_raw" | sed '/^$/d' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' )" || true

echo "Applied migrations in DB (${#applied_migs[@]}):"
printf '  %s\n' "${applied_migs[@]:0:50}"

# Compute missing migrations: files present in repo but not in applied_migs.
# We assume migration filename (exact) matches the version stored.
declare -A applied_map
for v in "${applied_migs[@]}"; do applied_map["$v"]=1; done

missing=()
for f in "${repo_migs[@]}"; do
  # depending on your migration tool, version might be filename or filename without extension
  base="$f"
  noext="${f%.sql}"
  if [ -z "${applied_map[$base]:-}" ] && [ -z "${applied_map[$noext]:-}" ]; then
    missing+=( "$f" )
  fi
done

if [ "${#missing[@]}" -eq 0 ]; then
  echo
  echo "All migrations present in repo are already applied to the DB."
  exit 0
fi

echo
echo "Migrations present in repo but missing from DB (${#missing[@]}):"
printf '  %s\n' "${missing[@]}"

# Prompt to apply
if [ "$APPLY_CHANGES" = "no" ]; then
  echo
  echo "Not applying missing migrations (APPLY_CHANGES=no)."
  exit 0
fi

apply_confirm() {
  read -r -p "Apply the ${#missing[@]} missing migration(s) now? This may modify your DB. (y/N): " ans
  case "$ans" in
    [yY][eE][sS]|[yY]) return 0;;
    *) return 1;;
  esac
}

if [ "$APPLY_CHANGES" = "ask" ]; then
  if ! apply_confirm; then
    echo "Aborting. No changes made."
    exit 0
  fi
fi

echo
echo "Applying migrations in order..."

for mig in "${missing[@]}"; do
  filepath="$MIGRATIONS_DIR/$mig"
  echo
  echo "Applying $mig ..."
  if [ "$USE_SUPABASE_CLI" = "true" ] ; then
    if ! command -v supabase >/dev/null 2>&1; then
      err "supabase CLI not found. Set USE_SUPABASE_CLI=false to use psql or install supabase CLI."
    fi
    # supabase db push executes schema from folder; many toolchains don't support applying single sql files.
    # We'll use psql if DB_URL is available; otherwise try supabase db query to run file contents.
    if [ -n "$DB_URL" ]; then
      psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$filepath"
    else
      # fallback: stream file to supabase db query
      supabase db query < "$filepath"
    fi
  else
    # Use psql
    if [ -z "$DB_URL" ]; then
      err "DATABASE_URL not set; cannot use psql. Set DATABASE_URL env var or set USE_SUPABASE_CLI=true to use supabase CLI."
    fi
    psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$filepath"
  fi

  echo "Applied $mig"
done

echo
echo "Done. Re-querying DB for applied migrations..."
if applied_raw="$(get_applied_with_supabase)"; then
  :
else
  applied_raw="$(get_applied_with_psql)" || true
fi
IFS=$'\n' read -r -d '' -a applied_migs <<< "$(echo "$applied_raw" | sed '/^$/d' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//' )" || true
echo "Now applied migrations (${#applied_migs[@]}):"
printf '  %s\n' "${applied_migs[@]:0:200}"
