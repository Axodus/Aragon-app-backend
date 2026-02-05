@echo off
setlocal enableextensions

REM Shim to avoid WSL dependency for Codacy CLI MCP executions on Windows.
REM The Codacy MCP currently invokes: wsl .codacy/cli.sh analyze ...
REM We intercept that specific case and run via bash (e.g., Git Bash) instead.

set "first=%~1"
if /I "%first%"==".codacy/cli.sh" goto :run_codacy
if /I "%first%"=="./.codacy/cli.sh" goto :run_codacy

REM Fall back to the real WSL if this isn't a Codacy CLI call.
if exist "%SystemRoot%\System32\wsl.exe" (
  "%SystemRoot%\System32\wsl.exe" %*
  exit /b %errorlevel%
)

echo wsl.exe not found and call is not Codacy CLI.
exit /b 127

:run_codacy
where bash >nul 2>nul
if errorlevel 1 (
  echo bash not found in PATH. Install Git for Windows (Git Bash) or add bash.exe to PATH.
  exit /b 127
)

bash %*
exit /b %errorlevel%
