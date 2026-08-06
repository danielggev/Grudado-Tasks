from functools import lru_cache
from typing import Annotated

from fastapi import Depends

from app.config import get_settings
from app.storage.arquivos import ArmazenamentoDeArquivos, ArmazenamentoLocal


@lru_cache
def get_armazenamento() -> ArmazenamentoDeArquivos:
    return ArmazenamentoLocal(get_settings().upload_dir)


ArmazenamentoDep = Annotated[ArmazenamentoDeArquivos, Depends(get_armazenamento)]
