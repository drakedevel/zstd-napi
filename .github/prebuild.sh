#!/bin/bash
set -eu -o pipefail
cd "$(dirname "$0")/.."

mkdir -p prebuilds
platform="$(node -p process.platform)"
arch="${1:-$(node -p process.arch)}"
template="$(jq -r '"\(.name)-v\(.version)"' package.json)-napi-vNAPI_VER-${platform}-${arch}.tar.gz"
for napi_ver in $(jq .binary.napi_versions[] package.json); do
  ./node_modules/.bin/node-gyp rebuild --napi_build_version="$napi_ver" --target_arch="$arch"
  tar c --format pax --numeric-owner build/Release/{*.node,LICENSE*,NOTICE*} |
    gzip -9 -n > "prebuilds/${template/NAPI_VER/${napi_ver}}"
done
