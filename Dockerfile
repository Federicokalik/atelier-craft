FROM python:3.12-alpine

RUN apk add --no-cache nginx

LABEL org.opencontainers.image.source="https://github.com/Federicokalik/atelier-homelab" \
      org.opencontainers.image.description="Independent self-hosted launcher for Craft web apps"

COPY nginx.conf /etc/nginx/http.d/default.conf
COPY web/ /srv/web/
COPY updater/ /srv/updater/
COPY docker/entrypoint.sh /usr/local/bin/atelier-entrypoint

RUN chmod 755 /usr/local/bin/atelier-entrypoint && nginx -t

EXPOSE 8080
VOLUME ["/srv/data"]
ENTRYPOINT ["/usr/local/bin/atelier-entrypoint"]
