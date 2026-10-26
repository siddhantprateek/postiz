FROM ghcr.io/gitroomhq/postiz-app:v2.11.3
COPY patch-linkedin.js /tmp/patch-linkedin.js
RUN node /tmp/patch-linkedin.js && rm /tmp/patch-linkedin.js
