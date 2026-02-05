@echo off
setlocal enableextensions

REM Shim to avoid environment-specific breakages when tools invoke `wsl`.
REM IMPORTANT: For Codacy CLI MCP executions, prefer the real `wsl.exe`.
REM Running `.codacy/cli.sh` under Git Bash changes `uname`/platform detection and breaks downloads.

if exist "%SystemRoot%\System32\wsl.exe" (
  "%SystemRoot%\System32\wsl.exe" %*
  exit /b %errorlevel%
)

echo wsl.exe not found.
exit /b 127
