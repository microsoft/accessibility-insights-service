@echo off
echo delete temp folders...

for /r %%R in (node_modules) do (if exist %%R (rd /s /q "%%R"))
for /r %%R in (dist) do (if exist %%R (rd /s /q "%%R"))
for /r %%R in (out) do (if exist %%R (rd /s /q "%%R"))
for /r %%R in (test-results) do (if exist %%R (rd /s /q "%%R"))

echo completed