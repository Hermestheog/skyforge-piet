FROM node:22-alpine
RUN apk add --no-cache build-base libpng-dev
COPY vendor/npiet-1.3h.c /tmp/npiet.c
RUN cc -O2 -DHAVE_PNG_H /tmp/npiet.c -lpng -o /usr/local/bin/npiet
WORKDIR /work
ENTRYPOINT ["npiet"]
