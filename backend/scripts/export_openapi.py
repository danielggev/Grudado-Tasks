"""Exporta o schema OpenAPI para o frontend gerar os tipos TypeScript.

Roda no CI antes de `npm run gen:api`. Se o resultado divergir do que esta
commitado em frontend/src/types/api.d.ts, o build falha -- e assim mudanca de
schema no Pydantic nunca chega ao frontend em silencio.
"""

import json
from pathlib import Path

from app.main import app

DESTINO = Path(__file__).resolve().parents[2] / "frontend" / "openapi.json"


def main() -> None:
    conteudo = json.dumps(app.openapi(), indent=2, ensure_ascii=False, sort_keys=True)
    DESTINO.write_text(conteudo + "\n", encoding="utf-8")
    print(f"OpenAPI escrito em {DESTINO}")


if __name__ == "__main__":
    main()
