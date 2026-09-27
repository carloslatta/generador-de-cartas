@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist ".venv\Scripts\pythonw.exe" (
    echo Creando el entorno virtual e instalando dependencias...
    python -m venv .venv
    ".venv\Scripts\python.exe" -m pip install --quiet -r requirements.txt
)
start "" ".venv\Scripts\pythonw.exe" "tabloide.py"