# MySQL Setup Guide (Team)

This guide covers MySQL setup for this Django project, including common Windows errors we hit during setup.

## 1) Install MySQL Server (Windows)

Install MySQL Server 8.x (example):

```powershell
winget install Oracle.MySQL
```

Check binaries:

```cmd
where mysql
```

If `where mysql` does not find it, use full path:

```cmd
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" --version
```

## 2) Initialize Data Directory

If MySQL service is not created automatically, initialize manually:

```cmd
mkdir "C:\ProgramData\MySQL\MySQL Server 8.4\Data"
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe" --initialize-insecure --basedir="C:\Program Files\MySQL\MySQL Server 8.4" --datadir="C:\ProgramData\MySQL\MySQL Server 8.4\Data" --console
```

## 3) Create and Start Windows Service

Create `my.ini`:

```cmd
mkdir "C:\ProgramData\MySQL\MySQL Server 8.4" 2>nul
(
echo [mysqld]
echo basedir=C:/Program Files/MySQL/MySQL Server 8.4/
echo datadir=C:/ProgramData/MySQL/MySQL Server 8.4/Data
echo port=3306
echo bind-address=127.0.0.1
) > "C:\ProgramData\MySQL\MySQL Server 8.4\my.ini"
```

Install and start service (run in **Administrator CMD**):

```cmd
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe" --remove MySQL84
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe" --install MySQL84 --defaults-file="C:\ProgramData\MySQL\MySQL Server 8.4\my.ini"
sc start MySQL84
sc query MySQL84
```

Expected state:
- `STATE : 4 RUNNING`

## 4) Create DB and User

Connect:

```cmd
"C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe" -u root
```

Run SQL:

```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY 'CHANGE_ROOT_PASSWORD';
FLUSH PRIVILEGES;

CREATE DATABASE cartel_lab
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

CREATE USER 'cartel_user'@'%' IDENTIFIED BY 'CHANGE_TEAM_PASSWORD';
GRANT ALL PRIVILEGES ON cartel_lab.* TO 'cartel_user'@'%';
FLUSH PRIVILEGES;
```

## 5) Django `.env` Configuration

Create/update `Cartel_Lab/.env`:

```env
DB_ENGINE=django.db.backends.mysql
DB_NAME=cartel_lab
DB_USER=cartel_user
DB_PASSWORD=CHANGE_TEAM_PASSWORD
DB_HOST=127.0.0.1
DB_PORT=3306
```

Run migrations:

```cmd
py manage.py migrate
py manage.py runserver
```

## 6) Troubleshooting (Common Errors)

1. `'mysql' is not recognized as an internal or external command`
- Cause: PATH is missing MySQL `bin`.
- Fix: Use full path command, or add:
  - `C:\Program Files\MySQL\MySQL Server 8.4\bin`

2. `ERROR 2003 (HY000): Can't connect to MySQL server on 'localhost:3306' (10061)`
- Cause: MySQL service is not running, or service was never installed.
- Fix:
  - `sc query MySQL84`
  - If not installed, run service install commands in section 3.
  - If installed but stopped, `sc start MySQL84`.

3. `[SC] OpenService FAILED 1060: specified service does not exist`
- Cause: Wrong service name or service not installed.
- Fix:
  - Reinstall service with `--install MySQL84`.
  - Query actual services:
    - `sc query type= service state= all | findstr /I mysql`

4. `Install/Remove of the Service Denied!`
- Cause: command prompt is not elevated.
- Fix: open **Administrator CMD** and retry.

5. `& was unexpected at this time`
- Cause: PowerShell syntax used in CMD (`& "path\app.exe"`).
- Fix:
  - In CMD: `"path\app.exe"`
  - In PowerShell: `& "path\app.exe"`

6. `Access denied for user ...`
- Cause: wrong DB user/password or missing grants.
- Fix:
  - Check `.env` credentials.
  - Re-run `GRANT ALL PRIVILEGES ...` and `FLUSH PRIVILEGES`.

7. `Unknown database 'cartel_lab'`
- Cause: DB not created.
- Fix:
  - Run `CREATE DATABASE cartel_lab ...`.

## 7) Team Rules

- Do not commit `.env`.
- Share only required DB connection values with teammates.
- Keep schema changes in migrations and review via PR.
