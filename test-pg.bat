@echo off
echo Testing PostgreSQL connection...

cd "C:\Program Files\PostgreSQL\18\bin"

echo Attempting with empty password...
psql.exe -U postgres -h localhost -c "SELECT 1;" 2>nul
if %errorlevel% equ 0 (
    echo SUCCESS: Empty password works
    echo DATABASE_URL=postgresql://postgres:@localhost:5432/postgres?schema=public
    goto :eof
)

echo Attempting with password 'postgres'...
psql.exe -U postgres -h localhost -c "SELECT 1;" 2>nul
if %errorlevel% equ 0 (
    echo SUCCESS: Password 'postgres' works
    echo DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres?schema=public
    goto :eof
)

echo Attempting with password 'password'...
psql.exe -U postgres -h localhost -c "SELECT 1;" 2>nul
if %errorlevel% equ 0 (
    echo SUCCESS: Password 'password' works
    echo DATABASE_URL=postgresql://postgres:password@localhost:5432/postgres?schema=public
    goto :eof
)

echo FAILED: Could not connect with any common credentials
pause
