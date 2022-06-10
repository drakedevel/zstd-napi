#!/bin/bash
set -eu
npm ci --ignore-scripts
npm run build-prebuild
