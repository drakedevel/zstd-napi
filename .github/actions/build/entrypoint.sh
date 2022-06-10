#!/bin/bash
set -eu
npm ci --ignore-scripts
# CentOS 7 is too old to support -std=gnu++14
export ZSTD_NAPI_DISABLE_CPP14=1
npm run build-prebuild
