#!/bin/bash
# Start MySQL if stopped
sudo service mysql start

# Start PHP Backend
echo "Starting PHP Backend on http://localhost:8000..."
/usr/bin/php -S 0.0.0.0:8000 -t public/backend > public/backend/php_server.log 2>&1 &

echo "Backend started. Logs: public/backend/php_server.log"
