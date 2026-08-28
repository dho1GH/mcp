def main() -> int:
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

    from memory.zep import ensure_thread

    result = ensure_thread()
    print(result)
    if result.get("ok"):
        return 0
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
