from pathlib import Path
import base64
import zlib

parts = [Path(__file__).with_name(f"qa239_apply.{i}").read_text(encoding="utf-8") for i in range(5)]
source = zlib.decompress(base64.b64decode("".join(parts))).decode("utf-8")
exec(compile(source, "qa239_apply.py", "exec"))
