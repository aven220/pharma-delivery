FROM alpine:3.20

RUN apk add --no-cache bash dcron postgresql16-client

COPY ops/backup/backup.sh /usr/local/bin/pharma-backup.sh
COPY ops/backup/restore.sh /usr/local/bin/pharma-restore.sh
RUN chmod +x /usr/local/bin/pharma-backup.sh /usr/local/bin/pharma-restore.sh

RUN mkdir -p /backups /var/log \
  && echo "0 2 * * * /usr/local/bin/pharma-backup.sh >> /var/log/backup.log 2>&1" > /etc/crontabs/root

CMD ["crond", "-f", "-l", "2"]
