FROM postgres:16-alpine

RUN apk add --no-cache bash dcron

COPY ops/backup/backup.sh /usr/local/bin/pharma-backup.sh
COPY ops/backup/restore.sh /usr/local/bin/pharma-restore.sh
RUN chmod +x /usr/local/bin/pharma-backup.sh /usr/local/bin/pharma-restore.sh

# Backup diario a las 02:00
RUN echo "0 2 * * * /usr/local/bin/pharma-backup.sh >> /var/log/backup.log 2>&1" > /etc/crontabs/root

CMD ["crond", "-f", "-l", "2"]
