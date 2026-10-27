# Imagen propia de PocketBase a partir del binario oficial, con versión y suma de
# comprobación fijas (PocketBase no publica una imagen oficial).

FROM alpine:3.22 AS descarga
ARG PB_VERSION
ARG PB_SHA256
RUN apk add --no-cache unzip
ADD https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip /tmp/pocketbase.zip
RUN echo "${PB_SHA256}  /tmp/pocketbase.zip" | sha256sum -c - \
 && unzip /tmp/pocketbase.zip pocketbase -d /tmp/pb

FROM alpine:3.22
RUN apk add --no-cache ca-certificates \
 && addgroup -S pocketbase && adduser -S -G pocketbase -H -h /pb pocketbase \
 && mkdir -p /pb/pb_data/backups /pb/pb_migrations \
 && chown -R pocketbase:pocketbase /pb
COPY --from=descarga --chown=pocketbase:pocketbase /tmp/pb/pocketbase /pb/pocketbase
USER pocketbase
EXPOSE 8090
ENV PB_AUTOMIGRATE=false
ENTRYPOINT ["/bin/sh", "-c", "exec /pb/pocketbase serve --http=0.0.0.0:8090 --dir=/pb/pb_data --migrationsDir=/pb/pb_migrations --automigrate=${PB_AUTOMIGRATE}"]
