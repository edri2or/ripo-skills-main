#!/usr/bin/env python3
"""
verify_schema.py — PostgreSQL schema verification helper for the db-migration skill.

Usage:
    python verify_schema.py --table <table_name> [--column <column_name>] [--dsn <dsn>]

Environment variables:
    DATABASE_URL  — PostgreSQL DSN (overrides --dsn flag).
                    Format: postgresql://user:password@host:port/dbname

Exit codes:
    0 — Schema verified successfully (or table/column exists as expected).
    1 — Verification failed (table or column not found, or connection error).
"""

import argparse
import os
import sys

try:
    import psycopg2
except ImportError:
    print("ERROR: psycopg2 is not installed. Run: pip install psycopg2-binary", file=sys.stderr)
    sys.exit(1)


def get_dsn(args_dsn: str | None) -> str:
    dsn = os.environ.get("DATABASE_URL") or args_dsn
    if not dsn:
        print(
            "ERROR: No database DSN provided. Set DATABASE_URL or use --dsn.",
            file=sys.stderr,
        )
        sys.exit(1)
    return dsn


def verify_table(cursor, table_name: str) -> bool:
    cursor.execute(
        """
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public'
              AND table_name = %s
        );
        """,
        (table_name,),
    )
    return cursor.fetchone()[0]


def _fetch_columns(cursor, table_name: str, column_name: str | None = None) -> list[tuple]:
    """Query information_schema.columns for a table, optionally filtered to one column."""
    query = """
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = %s
    """
    params: list = [table_name]
    if column_name is not None:
        query += "  AND column_name = %s\n"
        params.append(column_name)
    else:
        query += "  ORDER BY ordinal_position\n"
    cursor.execute(query, params)
    return cursor.fetchall()


def verify_column(cursor, table_name: str, column_name: str) -> dict | None:
    rows = _fetch_columns(cursor, table_name, column_name)
    if not rows:
        return None
    row = rows[0]
    return {
        "column_name": row[0],
        "data_type": row[1],
        "is_nullable": row[2],
        "column_default": row[3],
    }


def print_table_columns(cursor, table_name: str) -> None:
    rows = _fetch_columns(cursor, table_name)
    if not rows:
        print(f"  (no columns found for table '{table_name}')")
        return
    print(f"  {'COLUMN':<30} {'TYPE':<20} {'NULLABLE':<10} DEFAULT")
    print(f"  {'-'*30} {'-'*20} {'-'*10} -------")
    for col, dtype, nullable, default in rows:
        print(f"  {col:<30} {dtype:<20} {nullable:<10} {default or ''}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Verify PostgreSQL schema state for a given table."
    )
    parser.add_argument("--table", required=True, help="Table name to inspect.")
    parser.add_argument("--column", default=None, help="Specific column to verify exists.")
    parser.add_argument("--dsn", default=None, help="PostgreSQL DSN (fallback if DATABASE_URL not set).")
    args = parser.parse_args()

    dsn = get_dsn(args.dsn)

    try:
        conn = psycopg2.connect(dsn)
    except psycopg2.OperationalError as exc:
        print(f"ERROR: Cannot connect to database — {exc}", file=sys.stderr)
        sys.exit(1)

    with conn:
        with conn.cursor() as cur:
            # Verify table exists
            if not verify_table(cur, args.table):
                print(f"FAIL: Table '{args.table}' does not exist in schema 'public'.", file=sys.stderr)
                sys.exit(1)

            print(f"OK: Table '{args.table}' exists.")

            if args.column:
                col_info = verify_column(cur, args.table, args.column)
                if col_info is None:
                    print(
                        f"FAIL: Column '{args.column}' does not exist on table '{args.table}'.",
                        file=sys.stderr,
                    )
                    sys.exit(1)
                print(
                    f"OK: Column '{args.column}' exists — "
                    f"type={col_info['data_type']}, "
                    f"nullable={col_info['is_nullable']}, "
                    f"default={col_info['column_default']}"
                )
            else:
                print(f"\nColumns in '{args.table}':")
                print_table_columns(cur, args.table)

    sys.exit(0)


if __name__ == "__main__":
    main()
